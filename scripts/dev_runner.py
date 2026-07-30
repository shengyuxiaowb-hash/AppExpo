#!/usr/bin/env python3
import os
import signal
import subprocess
import sys
import time
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent
SERVER_CMD = [sys.executable, "server.py"]
WATCH_DIRS = [
    ROOT / "public",
    ROOT / "scripts",
    ROOT,
]
WATCH_SUFFIXES = {".py", ".js", ".css", ".html", ".json"}
WATCH_FILES = {
    ROOT / "server.py",
    ROOT / "package.json",
}
POLL_INTERVAL = 0.8


def should_watch(path: Path) -> bool:
    if path.name.startswith("."):
        return False
    if path in WATCH_FILES:
        return True
    return path.suffix.lower() in WATCH_SUFFIXES


def iter_watch_files():
    seen = set()
    for file_path in WATCH_FILES:
        if file_path.exists():
            seen.add(file_path)
            yield file_path
    for directory in WATCH_DIRS:
        if not directory.exists():
            continue
        for file_path in directory.rglob("*"):
            if not file_path.is_file():
                continue
            if file_path in seen:
                continue
            if should_watch(file_path):
                seen.add(file_path)
                yield file_path


def snapshot():
    state = {}
    for file_path in iter_watch_files():
        try:
            state[str(file_path)] = file_path.stat().st_mtime
        except FileNotFoundError:
            continue
    return state


def start_server():
    print("[AppExpo] starting server...")
    return subprocess.Popen(SERVER_CMD, cwd=ROOT)


def stop_server(process):
    if not process or process.poll() is not None:
        return
    print("[AppExpo] stopping server...")
    process.terminate()
    try:
        process.wait(timeout=5)
    except subprocess.TimeoutExpired:
        process.kill()
        process.wait(timeout=2)


def diff_files(before, after):
    changed = []
    all_keys = set(before) | set(after)
    for key in sorted(all_keys):
        if before.get(key) != after.get(key):
            changed.append(key)
    return changed


def main():
    process = start_server()
    previous = snapshot()

    def shutdown(_signum=None, _frame=None):
        stop_server(process)
        raise SystemExit(0)

    signal.signal(signal.SIGINT, shutdown)
    signal.signal(signal.SIGTERM, shutdown)

    while True:
        time.sleep(POLL_INTERVAL)
        if process.poll() is not None:
            print("[AppExpo] server exited, restarting...")
            process = start_server()
            previous = snapshot()
            continue

        current = snapshot()
        changed = diff_files(previous, current)
        if not changed:
            continue

        display = ", ".join(Path(item).name for item in changed[:5])
        if len(changed) > 5:
            display += f" ... (+{len(changed) - 5})"
        print(f"[AppExpo] detected changes: {display}")
        stop_server(process)
        process = start_server()
        previous = current


if __name__ == "__main__":
    main()
