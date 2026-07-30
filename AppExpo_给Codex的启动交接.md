# AppExpo 给 Codex 的启动交接指令

新电脑现在不需要手动提交或拷贝整个 `AppExpo` 项目文件夹。推荐先从 GitHub 拉取项目，项目里已经包含这份交接文档，Codex 拉完后直接读取本文件即可继续配置和启动。

GitHub 仓库：

```text
git@github.com:shengyuxiaowb-hash/AppExpo.git
```

目标不是让使用者手动操作，而是让 Codex 读取本文档后，自动检查环境、安装或更新项目、启动项目、处理常见问题。

如果新电脑还没有项目，可以先给 Codex 仓库地址并输入“安装项目”；如果已经 `git clone` 完成，就直接打开项目内这份 `AppExpo_给Codex的启动交接.md`，再输入“启动项目”。

首次从 GitHub 拉取项目时，`data/appexpo_local.db` 会跟项目文件一起下载到新电脑。也就是说，新电脑首次安装会自带 GitHub 上的数据库；后续才按需求选择“更新项目”或“更新数据库”。

## Codex 任务目标

你正在接手一个本地 Apple App Store 展位分析项目。当前项目通常位于 `~/Desktop/AppExpo`。

如果新电脑还没有 `~/Desktop/AppExpo`，先从 GitHub 克隆项目；如果项目已经存在，先确认实际目录，再启动项目，让用户可以访问：

```text
http://localhost:4173
```

优先保证项目跑起来，不要改业务代码，除非用户明确要求。

## 重要保护规则

- 不要删除 `data/appexpo_local.db`，这是本地历史数据库。
- 不要在服务运行中手动删除 `data/appexpo_local.db-shm` 或 `data/appexpo_local.db-wal`。
- 不要随意清空 `data/`、`scripts/app_data.json`、`public/`。
- 如果只是启动项目，不要修改代码。
- 遇到端口占用，优先停止旧的 `4173` 服务进程，不要改项目端口。
- 如果电脑上存在 `AppExpo-XD1` 等旧副本，必须确认 4173 端口进程的工作目录，不要误启动旧副本。
- 修复 HTTPS 问题时不要关闭 SSL 证书校验。

## 项目关键文件

| 路径 | 作用 |
| --- | --- |
| `server.py` | Python HTTP 服务和后端接口 |
| `public/` | 前端页面 |
| `scripts/app_data.json` | 游戏、国家 / 地区、App ID 映射配置 |
| `data/appexpo_local.db` | 本地历史记录数据库，不能删 |
| `README.md` | 项目说明 |
| `CODEX_START_HERE.md` | 给新 Codex 的入口说明，可保留 |
| `codex-skills/appexpo-startup/SKILL.md` | 给 Codex 使用的启动/关闭 skill，可保留 |

说明：

- `appexpo_server.pid` 不是项目运行必需文件。如果里面的 PID 和当前 4173 监听进程不一致，它就是旧文件，可以忽略或删除。
- `.DS_Store` 是 macOS Finder 生成文件，不影响项目运行。

## GitHub 安装和更新规则

当前项目通过 GitHub 分发和更新：

```text
git@github.com:shengyuxiaowb-hash/AppExpo.git
```

### 新电脑推荐交接方式

推荐流程是先拉项目，再读项目内交接文档。使用者只需要给 Codex 仓库地址，或直接让 Codex 执行：

```bash
cd ~/Desktop
git clone git@github.com:shengyuxiaowb-hash/AppExpo.git AppExpo
cd AppExpo
```

拉取完成后，项目根目录里会有：

```text
AppExpo_给Codex的启动交接.md
CODEX_START_HERE.md
codex-skills/appexpo-startup/SKILL.md
```

然后使用者输入：

```text
安装项目
```

如果项目还没 clone，Codex 应先执行“新电脑首次安装”流程，把项目克隆到 `~/Desktop/AppExpo`，再检查 Python 并启动项目。如果项目已经 clone，直接进入项目目录启动即可。

注意：首次克隆会把 `data/appexpo_local.db` 一起拉下来，不需要再单独执行“更新数据库”。

约定：

- 主电脑负责修改、提交、推送。
- 其他电脑通常只拉取更新。
- `data/appexpo_local.db` 在 GitHub 中存在一份同名数据库。
- 新电脑首次 `git clone` 会同时获得项目代码和这份数据库。
- 其他电脑可以选择只更新项目，不覆盖本机数据库；也可以单独更新数据库。

### 用户指令：更新项目

含义：从 GitHub 更新项目代码、页面、脚本、文档和 skill，但不覆盖当前电脑的 `data/appexpo_local.db`。

执行前如服务正在运行，先关闭项目。然后在项目根目录执行：

```bash
db_keep="/tmp/appexpo_local.keep.$(date +%Y%m%d_%H%M%S).db"
[ -f data/appexpo_local.db ] && cp data/appexpo_local.db "$db_keep"
git fetch origin main
git reset --hard origin/main
[ -f "$db_keep" ] && cp "$db_keep" data/appexpo_local.db
git update-index --skip-worktree data/appexpo_local.db || true
```

完成后再按“启动项目”流程启动。

### 用户指令：更新数据库

含义：只用 GitHub 上的 `data/appexpo_local.db` 覆盖当前电脑数据库，不更新其他业务文件。

必须先关闭项目。然后在项目根目录执行：

```bash
db_backup="data/appexpo_local.localbackup-$(date +%Y%m%d_%H%M%S).db"
[ -f data/appexpo_local.db ] && cp data/appexpo_local.db "$db_backup"
git update-index --no-skip-worktree data/appexpo_local.db || true
git fetch origin main
git checkout origin/main -- data/appexpo_local.db
rm -f data/appexpo_local.db-wal data/appexpo_local.db-shm
git update-index --skip-worktree data/appexpo_local.db || true
```

完成后告诉用户备份文件路径，再按“启动项目”流程启动。

### 新电脑首次安装

如果新电脑还没有项目文件夹，可以由 Codex 执行：

```bash
cd ~/Desktop
git clone git@github.com:shengyuxiaowb-hash/AppExpo.git AppExpo
cd AppExpo
python3 server.py
```

首次 clone 后，`data/appexpo_local.db` 已经存在于本地项目中；除非用户明确说“更新数据库”，否则不要再覆盖它。

如果 SSH 没有配置，先让用户在 GitHub 添加本机 SSH key，或在仓库允许的情况下改用 HTTPS 克隆：

```bash
cd ~/Desktop
git clone https://github.com/shengyuxiaowb-hash/AppExpo.git AppExpo
cd AppExpo
python3 server.py
```

## 接手后的执行流程

### 1. 进入项目目录

如果项目在桌面：

```bash
cd ~/Desktop/AppExpo
```

如果路径不同，先确认当前文件夹里有 `server.py`、`public/`、`scripts/`、`data/`。

如果存在多个 AppExpo 副本，启动前检查 4173 端口进程来自哪个目录：

```bash
lsof -nP -iTCP:4173 -sTCP:LISTEN
lsof -a -p <PID> -d cwd -Fn
```

工作目录应指向当前交接的 `AppExpo`，不能是 `AppExpo-XD1` 等旧目录。

### 2. 检查 Python

```bash
python3 --version
```

要求 Python 3.9 或以上。若没有 `python3`，先协助安装 Python 3；macOS 可用以下任一方式：

```bash
xcode-select --install
```

或让用户安装 Python 官网 macOS 包 / Homebrew Python。

### 3. 优先直接启动

如果用户输入：

```text
启动项目
```

Codex 应该开启一个持续终端会话，在项目根目录运行：

```bash
python3 server.py
```

启动成功后告诉用户打开：

```text
http://localhost:4173
```

注意：不要用 Codex 的一次性后台命令长期运行，例如：

```bash
nohup python3 server.py &
```

这种方式在 Codex 临时 shell 结束后可能会被清理，导致项目自动退出。要保持项目一直启动，应让 `python3 server.py` 在一个持续终端会话里前台运行，终端不关闭，服务就不退出。

### 4. 如果用户希望使用 npm

先检查：

```bash
node -v
npm -v
```

如果存在，可以启动：

```bash
npm start
```

但 npm 不是必需；没有 npm 时直接使用 `python3 server.py`。

## 端口占用处理

如果启动时报错：

```text
OSError: [Errno 48] Address already in use
```

说明 `4173` 端口已有服务。执行：

```bash
lsof -nP -iTCP:4173 -sTCP:LISTEN
```

找到 PID 后停止：

```bash
kill <PID>
```

然后重新启动：

```bash
python3 server.py
```

## 启动后快速检查

启动后访问或请求：

```bash
curl -sS -o /tmp/appexpo_home.html -w '%{http_code} %{content_type} %{size_download}\n' http://localhost:4173
```

或让用户在浏览器打开：

```text
http://localhost:4173
```

如果页面打开正常，回复用户项目已启动，并给出访问地址。

不要使用 `curl -I http://localhost:4173` 作为唯一判断标准，因为当前本地服务没有实现 HEAD 请求，可能返回 `501 Unsupported method ('HEAD')`。这不代表项目启动失败。

页面能打开只代表本地 Python 服务正常，不代表 Apple API 一定可用。还要在“实时分析”中选择一个游戏和一个国家 / 地区，点击“开始分析”，确认 Today 或 Games 至少返回正常结果，而不是统一显示“接口失败”。

## 每周一更自动采集逻辑

当前项目有一个“每周一更”页面，位于导航中“历史分析”后面。它展示每个国家 / 地区 App Store Games 页面中的：

- 轮播内容
- 游戏活动内容
- 图片、视频封面和视频地址
- 游戏图标、游戏名、标题、简介等信息

这些数据不是页面打开时临时抓，而是由 `server.py` 后台自动写入 `data/appexpo_local.db`。

自动采集规则：

1. `python3 server.py` 启动后，后台线程约 3 秒后开始工作，但 **本地时间 06:00 前不会自动抓取**，避免凌晨日期边界导致写到前一天。
2. 每天本地时间 **06:00** 后开始检查当天是否已采满所有国家 / 地区。
3. 如果当天已采集国家数小于配置国家数，会自动补采缺失国家。
4. 06:00 后如果还没有抓完整，后台会 **每小时检查一次**，直到当天全部国家 / 地区抓满。
5. 当天全部国家 / 地区抓满后，当天不再重复抓取，下一次等第二天 06:00 后再检查。
6. 进入 `每周一更` 页面时，如果当天没有采满所有国家 / 地区，会立即触发全国家补采，不需要等下一小时。
7. 默认不会重复抓当天已入库的国家；只有调试或修复时才 force 重抓。
8. 单个国家失败不会阻断全部采集；遇到 Apple 限流或临时网络中断会自动补抓 1 轮。
9. 每周一更入库日期按本机当天日期计算，不按 UTC 日期截取。

可用这个接口查看状态：

```bash
curl -sS 'http://localhost:4173/api/weekly-games/status' | python3 -m json.tool
```

正常完成时应看到类似：

```json
{
  "scheduler": {
    "running": false,
    "lastStatus": "completed"
  },
  "todayCapturedCountries": 18,
  "countryCount": 18
}
```

每周一更相关接口：

```bash
# 查询某国家有数据的周
curl -sS 'http://localhost:4173/api/weekly-games/weeks?country=CN' | python3 -m json.tool

# 查询某国家某周数据
curl -sS 'http://localhost:4173/api/weekly-games?country=CN&weekStart=2026-07-20' | python3 -m json.tool
```

如果需要清理某天的每周一更测试数据，只删除 `weekly_games_items` 对应 `capture_date` 的记录，不要删库。例如清理本机今天：

```bash
sqlite3 data/appexpo_local.db "DELETE FROM weekly_games_items WHERE capture_date = date('now','localtime');"
```

注意：视频活动要保留 `video` 字段和视频预览帧，不能把 App 图标当成活动图。中国大陆“三国杀 / 神马超返场”这类活动就是视频活动。

## 关闭项目

如果用户输入：

```text
关闭项目
```

优先停止 Codex 持续终端会话里的 `python3 server.py`，相当于在该终端按：

```text
Control + C
```

如果找不到对应终端会话，再检查 4173 端口：

```bash
lsof -nP -iTCP:4173 -sTCP:LISTEN
```

找到 PID 后停止：

```bash
kill <PID>
```

然后确认端口已关闭：

```bash
lsof -nP -iTCP:4173 -sTCP:LISTEN || true
```

关闭成功后回复：

```text
项目已关闭，4173 端口没有 AppExpo 服务在运行。
```

## Apple 接口没有结果或全部失败

### 已遇到的实际问题：Python 缺少 CA 证书

现象：

- `http://localhost:4173` 可以正常打开。
- 点击“开始分析”后，Today / Games 都显示“接口失败”或不断补重试。
- 直接请求本地 `/api/analyze` 时，结果中出现：

```text
SSL: CERTIFICATE_VERIFY_FAILED
unable to get local issuer certificate
```

原因：Python 官网安装包的默认 OpenSSL CA 文件可能不存在，例如：

```text
/Library/Frameworks/Python.framework/Versions/3.12/etc/openssl/cert.pem
```

而 macOS 系统证书文件通常位于：

```text
/etc/ssl/cert.pem
```

先检查：

```bash
python3 -c 'import ssl; print(ssl.get_default_verify_paths())'
ls -l /etc/ssl/cert.pem
```

如果确认是 Python CA 问题，可以安全修复为显式使用 macOS 系统 CA 文件，不要关闭证书校验。参考代码如下：

```python
import ssl

SYSTEM_CA_FILE = Path("/etc/ssl/cert.pem")
HTTPS_CONTEXT = ssl.create_default_context(
    cafile=str(SYSTEM_CA_FILE) if SYSTEM_CA_FILE.is_file() else None
)
```

发起 HTTPS 请求时应传入该上下文：

```python
with urllib.request.urlopen(request, timeout=timeout, context=HTTPS_CONTEXT) as response:
    ...
```

修改后必须重启 Python 服务，再重新执行实时分析。不要使用以下不安全方案：

```python
ssl._create_unverified_context()
```

### 诊断时直接验证本地分析接口

可以用一个国家和一个页面做最小测试：

```bash
curl -sS --max-time 120 \
  -X POST http://localhost:4173/api/analyze \
  -H 'content-type: application/json' \
  --data '{"countries":["AU"],"gameName":"Heartopia / 心动小镇","appId":"6746151928","aliases":["心动小镇","Heartopia"],"pageTypes":["today"],"crossCountry":true}'
```

成功标准：HTTP 200，`results` 至少包含一个对象，并且对象中没有 `error` 字段。`found: false` 只表示当前页面未命中该游戏，不代表 Apple 接口失败。

### 页面未发起请求

重启或刷新页面后，之前选择的游戏和国家 / 地区会被清空。搜索框为空、检测页面为 0 时，前端不会调用 `/api/analyze`，也不会访问 Apple。需要重新选择游戏和地区，再点击“开始分析”。

## 页面功能提醒

| 页面 | 用途 |
| --- | --- |
| 实时分析 | 调 Apple 接口实时分析 Today / Games 展位 |
| 本地同步 | 定时或手动采集并写入本地历史记录 |
| 历史记录 | 查看本地同步入库记录 |
| 历史分析 | 基于本地数据库做国家排行和时间范围分析 |
| 每周一更 | 每天自动采集各国家 Games 页面轮播和游戏活动，并按周/日期查看 |

## 常见异常判断

| 现象 | 处理 |
| --- | --- |
| `python3: command not found` | 需要先安装 Python 3 |
| `npm: command not found` | 不影响启动，直接用 `python3 server.py` |
| `Address already in use` | 杀掉旧的 4173 端口进程后重启 |
| 页面打不开 | 确认服务进程仍在、端口是 4173、访问 localhost |
| 页面正常但没有 Apple 请求 | 确认已选择游戏和地区，并点击“开始分析” |
| Today / Games 全部接口失败 | 检查响应中是否有 `CERTIFICATE_VERIFY_FAILED`，按上方 CA 证书方案处理 |
| Apple 接口偶发失败 | 可能是网络、Apple 限流或单个地区接口异常，稍后重试 |

## 给用户的最终回复模板

```text
项目已启动，可以打开 http://localhost:4173 使用。
如果后面要停止服务，在当前终端按 Control + C 即可。
```
