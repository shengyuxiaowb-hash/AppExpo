---
name: appexpo-startup
description: Start, stop, verify, and troubleshoot the local AppExpo project on macOS/MacBook. Use when Codex is given this AppExpo folder, when the user says "启动项目" or "关闭项目", asks to start/stop the project, migrate it to a new Mac, handle missing Python/npm, resolve port 4173 conflicts, or safely run the app without modifying business code or deleting the local SQLite database.
---

# AppExpo Startup

## Trigger Phrases

- `启动项目`: start AppExpo and provide `http://localhost:4173`.
- `关闭项目`: stop the AppExpo process listening on port `4173`.

## Goal

Start the AppExpo local web app from this project folder and give the user:

```text
http://localhost:4173
```

If the user only asks to start or use the project, do not edit business code.

## Safety Rules

- Do not delete `data/appexpo_local.db`; it is the local history database.
- Do not manually delete `data/appexpo_local.db-shm` or `data/appexpo_local.db-wal` while the server is running.
- Do not clear `data/`, `public/`, `scripts/`, or `scripts/app_data.json`.
- If port `4173` is occupied, stop the old process first. Do not change the project port unless the user asks.
- If unrelated user changes exist, leave them alone.
- `appexpo_server.pid` is only a stale helper file when it does not match the current listener PID; it is not required for startup.
- Keep `CODEX_START_HERE.md` and `codex-skills/appexpo-startup/` when handing the folder to another Codex.

## Startup Workflow

1. Confirm the current folder is the project root:

   ```bash
   pwd
   ls
   ```

   It should contain `server.py`, `public/`, `scripts/`, and `data/`.

2. Check port `4173`:

   ```bash
   lsof -nP -iTCP:4173 -sTCP:LISTEN || true
   ```

   If an old AppExpo server is already running and usable, report `http://localhost:4173`. If it blocks startup, stop that PID with `kill <PID>`.

   If there are multiple AppExpo folders, verify the listener's working directory before killing or reusing it:

   ```bash
   lsof -a -p <PID> -d cwd -Fn
   ```

3. Check Python:

   ```bash
   python3 --version
   ```

   Python 3.9+ is expected. If `python3` is missing, tell the user to install Python 3 first. On macOS, common options are `xcode-select --install`, Python.org, or Homebrew.

4. Start the app:

   ```bash
   python3 server.py
   ```

   Run this in a persistent Codex terminal session. Keep the process in the foreground; do not use a one-shot background command for long-running service startup.

5. Verify:

   ```bash
   curl -sS -o /tmp/appexpo_home.html -w '%{http_code} %{content_type} %{size_download}\n' http://localhost:4173
   ```

   If it responds, tell the user the app is ready at `http://localhost:4173`.

   Do not use `curl -I http://localhost:4173` as the only check. This server may return `501 Unsupported method ('HEAD')` because HEAD is not implemented.

## Optional npm Startup

Use npm only if the user asks or the repo workflow requires it:

```bash
node -v
npm -v
npm start
```

If npm is missing, use `python3 server.py`; npm is not required for basic startup.

## Common Fixes

### Address Already In Use

```bash
lsof -nP -iTCP:4173 -sTCP:LISTEN
kill <PID>
python3 server.py
```

### python3 Not Found

Do not edit the project. Tell the user Python 3 must be installed first.

### Page Does Not Open

Check that the server is still running and the user is visiting:

```text
http://localhost:4173
```

## Page Map

- Realtime Analysis: reads App Store public page/catalog data through the local `server.py`; no API key or extra account is required.
- Local Sync: runs manual or scheduled collection and writes local history.
- History Records: shows local sync records.
- History Analysis: analyzes local DB records by game, country, and date range.
- Weekly Update (`每周一更`): reads the local weekly table populated from each country's App Store Games page. It shows carousel content and game activity content by country, available week, and day.

## Weekly Update Collection

The weekly updater is automatic and runs inside `server.py`.

- On server startup, a background thread waits about 3 seconds, but it does not automatically capture before local time `06:00`.
- From local time `06:00`, it checks today's weekly capture.
- If today's captured country count is less than the configured country count, it captures only missing countries.
- After `06:00`, if today's capture is still incomplete, it checks once per hour until all configured countries are captured.
- After all configured countries are captured for today, it does not capture again until the next day.
- Opening the `每周一更` page also checks today's capture. If today's countries are not fully captured, the page triggers capture immediately.
- By default it skips countries already captured today. Force capture is only for deliberate repair/debug work.
- It stores Games-page carousel items and game activity items in `data/appexpo_local.db`.
- Capture dates use the local machine date, so early runs should not be written to the previous UTC day.
- Video activities are supported: the app stores the video URL plus the video preview frame, and the frontend renders video when present.
- Status endpoint:

  ```bash
  curl -sS 'http://localhost:4173/api/weekly-games/status' | python3 -m json.tool
  ```

Successful status should show `todayCapturedCountries` approaching `countryCount`; `partial` usually means a few Apple requests failed or were rate-limited.

If the user asks to clear weekly test data, delete only rows from `weekly_games_items` for the requested `capture_date`; do not delete `data/appexpo_local.db`.

## Data Source Wording

When explaining realtime analysis to users, avoid saying they need an "Apple API" or an "interface key". Use this wording instead:

```text
实时分析不需要额外接口 Key，也不需要配置账号；它通过本地 server.py 获取 App Store 公开页面/目录数据。其他电脑只要能联网并启动本地服务即可使用。
```

If a request fails, describe it as a network/App Store public data request issue, not as a missing private API credential.

## Final Response

When startup succeeds:

```text
项目已启动，可以打开 http://localhost:4173 使用。
停止服务就在当前终端按 Control + C。
```

## Shutdown Workflow

When the user says `关闭项目`, first stop the persistent terminal session running `python3 server.py`, equivalent to pressing:

```text
Control + C
```

If that session is not available, stop the AppExpo server on port `4173`:

```bash
lsof -nP -iTCP:4173 -sTCP:LISTEN || true
```

If a process is listening, stop it:

```bash
kill <PID>
```

Verify it is closed:

```bash
lsof -nP -iTCP:4173 -sTCP:LISTEN || true
```

If no process remains, respond:

```text
项目已关闭，4173 端口没有 AppExpo 服务在运行。
```
