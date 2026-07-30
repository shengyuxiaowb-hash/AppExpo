# Apple 商城游戏展位分析工具

AppExpo 是一个本地运行的 Apple App Store 游戏展位分析工具，用于查看游戏在不同国家 / 地区的 Today、Games、轮播、游戏活动和本地历史数据。

启动后在浏览器打开：

```text
http://localhost:4173
```

## 环境要求

- macOS / Linux
- Python 3.9+
- Node.js 可选，仅用于 `npm start` 开发启动方式
- 需要联网访问 App Store 公开页面数据

实时分析不需要额外接口 Key，也不需要 Apple 账号。

## 启动项目

推荐给普通使用者的启动方式：

```bash
python3 server.py
```

看到类似内容表示启动成功：

```text
Apple Store placement analyzer running at http://localhost:4173
```

然后打开：

```text
http://localhost:4173
```

开发或调试时也可以用：

```bash
npm start
```

`npm start` 会运行 `scripts/dev_runner.py`，监听文件变化并自动重启服务。

## 关闭项目

在运行服务的终端按：

```text
Control + C
```

即可关闭项目。

如果找不到终端，可以查看并停止 `4173` 端口进程：

```bash
lsof -nP -iTCP:4173 -sTCP:LISTEN
kill <PID>
```

## 端口占用处理

服务默认端口是 `4173`。如果启动时出现：

```text
OSError: [Errno 48] Address already in use
```

说明端口已经被旧进程占用。执行：

```bash
lsof -nP -iTCP:4173 -sTCP:LISTEN
kill <PID>
python3 server.py
```

如果电脑上有多个 AppExpo 副本，先确认当前监听进程来自哪个目录：

```bash
lsof -a -p <PID> -d cwd -Fn
```

## 页面功能

### 实时分析

实时查询某个游戏在指定国家 / 地区 App Store 页面中的命中情况。

使用方式：

1. 搜索并选择游戏。
2. 选择一个或多个国家 / 地区。
3. 选择 Today / Games 等页面。
4. 点击开始分析。

结果以 Apple 当前公开页面返回为准，页面展位会随时间变化。

### 本地同步

按配置采集游戏和国家 / 地区数据，并写入本地历史数据库。用于后续历史记录和历史分析。

### 历史记录

查看已经写入本地数据库的采集记录，包括国家、页面、展位、标题、图片等信息。

### 历史分析

基于本地数据库做统计分析，例如国家排行、Total / Today / Icon / Banner 维度对比。

历史分析只分析数据库中已有的数据。比如选择近 7 天，但数据库里只有近 3 天记录，就只分析这 3 天，不会强行补空数据。

### 每周一更

每天自动采集各国家 / 地区 App Store Games 页面中的：

- 轮播内容
- 游戏活动内容
- 图片、视频封面和视频地址
- 游戏图标、游戏名、标题、简介等信息

页面可以按国家 / 地区、当前周次、周一到周日查看当天入库内容。轮播和游戏活动支持横向拖动浏览。

## 每周一更自动采集规则

`每周一更` 的数据由 `server.py` 后台自动采集，并写入 `data/appexpo_local.db` 的 `weekly_games_items` 表。

规则如下：

1. 项目启动后，后台线程约 3 秒后开始工作，但本地时间 **06:00 前不会自动抓取**，避免凌晨日期边界导致写到前一天。
2. 每天本地时间 **06:00** 后检查当天是否已采满所有国家 / 地区。
3. 如果当天已采集国家数小于配置国家数，会自动补采缺失国家。
4. 06:00 后如果还没有抓完整，后台会 **每小时检查一次**，直到当天全部国家 / 地区抓满。
5. 当天全部国家 / 地区抓满后，当天不再重复抓取，下一次等第二天 06:00 后再检查。
6. 进入 `每周一更` 页面时，如果当天没有采满所有国家 / 地区，会立即触发全国家补采，不需要等下一小时。
7. 默认跳过当天已经入库的国家，避免重复抓取；只有调试或修复时才 force 重抓。
8. 单个国家失败不会阻断全部任务；遇到 Apple 限流或临时网络中断会自动补抓 1 轮。
9. 每周一更入库日期按本机当天日期计算，不按 UTC 日期截取。

查看采集状态：

```bash
curl -sS 'http://localhost:4173/api/weekly-games/status' | python3 -m json.tool
```

查看某国家有数据的周：

```bash
curl -sS 'http://localhost:4173/api/weekly-games/weeks?country=CN' | python3 -m json.tool
```

查看某国家某周数据：

```bash
curl -sS 'http://localhost:4173/api/weekly-games?country=CN&weekStart=2026-07-20' | python3 -m json.tool
```

清理某天的每周一更测试数据时，只删除 `weekly_games_items` 对应日期的记录，不要删除整个数据库。例如清理本机今天：

```bash
sqlite3 data/appexpo_local.db "DELETE FROM weekly_games_items WHERE capture_date = date('now','localtime');"
```

## 数据来源

项目使用 Apple App Store 公开数据：

- App / 开发者游戏信息：`https://itunes.apple.com/{country}/lookup`
- Today：`https://apps.apple.com/api/apps/v1/editorial/{country}/today`
- Games：`https://apps.apple.com/api/apps/v1/editorial/{country}/groupings?name=games`

Games 接口中部分榜单节点只返回 App ID 和 href，例如：

```json
{
  "id": "1528917194",
  "type": "apps",
  "href": "/v1/catalog/cn/apps/1528917194?l=zh-Hans-CN"
}
```

这种情况下项目会按 App ID 判断命中，并通过 Apple lookup 接口补 App 图标。若补图也失败，则该命中不会展示，也不会写入本地库。

视频活动会保留 `video` 字段和视频预览帧，页面会优先展示视频。

## 本地数据

本地数据库位于：

```text
data/appexpo_local.db
```

GitHub 中同步的数据库也使用同名文件：

```text
data/appexpo_local.db
```

其他电脑首次拉取后可以直接启动项目。如果某台电脑不想使用 GitHub 上的数据库，而是保留自己的本地历史库，替换或拉取前先备份：

```bash
cp data/appexpo_local.db data/appexpo_local.mybackup.db
```

如果后续只想更新代码，不想让 Git 更新本机数据库，可以在该电脑执行：

```bash
git update-index --skip-worktree data/appexpo_local.db
```

需要重新接收 GitHub 数据库更新时，再执行：

```bash
git update-index --no-skip-worktree data/appexpo_local.db
git pull
```

SQLite 运行时可能生成：

```text
data/appexpo_local.db-shm
data/appexpo_local.db-wal
```

这些是 SQLite 正常运行文件。服务运行时不要删除数据库、`-shm` 或 `-wal` 文件。

其他常见文件：

- `data/scheduler_trace.log`：同步任务日志
- `server_runtime.log`：服务运行日志
- `data/fetched/`：手动抓取接口或图片时生成的临时结果
- `appexpo_server.pid`：旧启动辅助文件，不是项目运行必需文件；如果 PID 不匹配当前监听进程，可以忽略或删除
- `CODEX_START_HERE.md`：给 Codex 接手项目的入口说明
- `codex-skills/appexpo-startup/`：给 Codex 使用的启动/关闭 skill

## 常用命令

语法检查：

```bash
python3 -m py_compile server.py
node --check public/app.js
node --check public/weekly.js
```

查看端口：

```bash
lsof -nP -iTCP:4173 -sTCP:LISTEN
```

启动：

```bash
python3 server.py
```

主电脑上传更新：

```bash
git add .
git commit -m "update appexpo"
git push
```

其他电脑拉取更新：

```bash
git pull
python3 server.py
```

## 项目结构

```text
server.py                         Python HTTP 服务和 API 逻辑
public/                           前端页面、样式和脚本
scripts/dev_runner.py             开发启动器，自动重启服务
scripts/app_data.json             国家、页面类型、游戏等基础配置
data/appexpo_local.db             本地 SQLite 数据库
CODEX_START_HERE.md               给 Codex 的接手入口
codex-skills/appexpo-startup/     给 Codex 的启动/关闭 skill
```

## 注意事项

- 不要删除 `data/appexpo_local.db`。
- 服务运行时不要删除 `data/appexpo_local.db-shm` 或 `data/appexpo_local.db-wal`。
- Apple 公开接口可能临时限流，页面会提示接口失败或稍后重试。
- 实时分析和本地同步都以 Apple 当前接口返回为准，榜单和位置会随时间变化。
- 历史分析只分析本地数据库中已有的采集数据。
- 如果只是启动项目，不需要修改代码。
