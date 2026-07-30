# Codex Start Here

This AppExpo folder includes a portable Codex skill at:

```text
codex-skills/appexpo-startup/SKILL.md
```

After AppExpo is cloned or copied to a new MacBook, Codex should first read that file and follow its workflow.

If the user only provides the external handoff document and the GitHub repository, Codex should clone the repository first. The whole `AppExpo` folder does not need to be manually copied to a new computer.

User command mapping:

- `安装项目`: clone AppExpo from GitHub to `~/Desktop/AppExpo`, read `codex-skills/appexpo-startup/SKILL.md`, then start it.
- `启动项目`: read `codex-skills/appexpo-startup/SKILL.md`, then start this AppExpo project and make it available at `http://localhost:4173`.
- `关闭项目`: read `codex-skills/appexpo-startup/SKILL.md`, then stop the AppExpo process listening on port `4173`.
- `更新项目`: pull/update project files from GitHub, but keep this computer's current `data/appexpo_local.db`.
- `更新数据库`: replace this computer's `data/appexpo_local.db` with the database from GitHub after backing up the current local database.

Important:

- Do not delete `data/appexpo_local.db`.
- Do not edit project code if the user only asks to start the project.
- If port `4173` is occupied, stop the old process first.
- Prefer `python3 server.py` for startup, running in a persistent Codex terminal session. Do not rely on one-shot background startup for a long-running service.
- Realtime analysis does not need an API key or account. It uses the local `server.py` to read App Store public page/catalog data, so the Mac only needs network access.
- GitHub repository: `git@github.com:shengyuxiaowb-hash/AppExpo.git`.
- New computer handoff: provide only the handoff document plus GitHub repository access. Codex can install from GitHub; copying the whole project folder is optional fallback, not the normal path.
- The main computer pushes updates. Other computers should normally use `更新项目`; use `更新数据库` only when the user explicitly wants to overwrite the local database with the GitHub database.

Suggested user prompt:

```text
安装项目
```

After the project already exists locally:

```text
启动项目
```

Shutdown prompt:

```text
关闭项目
```

Update prompts:

```text
更新项目
更新数据库
```
