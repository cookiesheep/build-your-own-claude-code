# 后端 E2E Smoke Test

> 目标：用最少步骤验证 BYOCC 平台核心闭环是否仍然可用。

这份文档验证的是完整本地链路：

```text
浏览器 /lab/3
→ POST /api/session
→ 不创建容器
→ POST /api/environment/start
→ Docker 创建 lab-* 容器
→ POST /api/submit
→ 注入 /workspace/src/query-lab.ts
→ 容器内执行 node build.mjs --lab 3
→ 浏览器终端连接 ttyd
→ 手动运行 node cli.js
→ 看到真实 Claude Code TUI
```

## 0. 前置条件

- Docker Desktop 正在运行
- 当前仓库在 `D:\code\build-your-own-claude-code`
- sister repo 在 `D:\test-claude-code\claude-code`
- `D:\test-claude-code\claude-code\src\query-lab.ts` 存在

## 1. 重建 Lab 镜像

在项目根目录运行：

```powershell
pwsh -NoProfile -ExecutionPolicy Bypass -File .\infrastructure\build-lab-image.ps1
```

成功时应看到：

```text
Build complete.
You can now run: docker image inspect byocc-lab
```

这个命令会从 sister repo 组装临时 Docker build context。
临时目录在：

```text
.tmp\lab-image-context
```

## 2. 启动后端

新开一个 PowerShell：

```powershell
cd D:\code\build-your-own-claude-code\server
npm run dev
```

成功时应看到：

```text
Database initialized
WebSocket proxy: ready for /api/terminal/:sessionId
BYOCC Server running at http://127.0.0.1:3001
```

另开一个 PowerShell 验证：

```powershell
Invoke-RestMethod 'http://127.0.0.1:3001/api/health'
```

应返回：

```text
status : ok
```

## 3. 启动前端

新开一个 PowerShell：

```powershell
cd D:\code\build-your-own-claude-code\platform
$env:NEXT_PUBLIC_API_URL="http://127.0.0.1:3001"
npm run dev
```

浏览器打开：

```text
http://localhost:3000/lab/3
```

## 4. 浏览器人工验证

在 `/lab/3` 页面执行：

1. 确认页面右侧显示 session id。
2. 点击“启动实验环境”。
3. 确认终端连接成功。
4. 点击“提交代码”。
5. 等待构建完成。
6. 在终端输入：

```bash
pwd
```

应输出：

```text
/workspace
```

继续输入：

```bash
ls
```

应能看到：

```text
build.mjs
cli.js
src
dist
node_modules
```

最后输入：

```bash
node cli.js
```

应看到：

```text
cookiesheep's claude-code v2.1.88
```

## 5. API 级验证（可选）

如果浏览器联调失败，可以先绕过前端验证后端。

```powershell
$auth = Invoke-RestMethod 'http://127.0.0.1:3001/api/auth/anonymous' -Method Post -ContentType 'application/json' -Body '{}'
$headers = @{
  Authorization = "Bearer $($auth.token)"
}

$session = Invoke-RestMethod 'http://127.0.0.1:3001/api/session' -Method Post -ContentType 'application/json' -Headers $headers -Body '{}'

# session 现在只创建会话，不创建 Docker 容器。
$environmentBody = @{ sessionId = $session.sessionId } | ConvertTo-Json -Compress
$environment = Invoke-RestMethod 'http://127.0.0.1:3001/api/environment/start' -Method Post -ContentType 'application/json' -Headers $headers -Body $environmentBody

$code = [System.IO.File]::ReadAllText('D:\test-claude-code\claude-code\src\query-lab.ts')

$body = @{
  sessionId = $session.sessionId
  code = $code
  labNumber = 3
} | ConvertTo-Json -Compress

$submit = Invoke-RestMethod 'http://127.0.0.1:3001/api/submit' -Method Post -ContentType 'application/json' -Headers $headers -Body $body
$submit.success
```

应输出：

```text
True
```

验证进度：

```powershell
Invoke-RestMethod ("http://127.0.0.1:3001/api/progress?sessionId=" + $session.sessionId) -Headers $headers
```

应看到 Lab 3：

```text
completed : True
```

## 6. 清理测试容器

先 dry-run，看会清理什么：

```powershell
cd D:\code\build-your-own-claude-code\server
npx tsx src/scripts/cleanup-containers.ts --dry-run --max-age-minutes=0
```

确认列表只包含 BYOCC 的 `lab-*` 容器后，再执行：

```powershell
npx tsx src/scripts/cleanup-containers.ts --execute --max-age-minutes=0
```

如果只想清理某一类测试容器，可以用前缀限制：

```powershell
npx tsx src/scripts/cleanup-containers.ts --dry-run --max-age-minutes=0 --session-prefix=cleanup-smoke-
npx tsx src/scripts/cleanup-containers.ts --execute --max-age-minutes=0 --session-prefix=cleanup-smoke-
```

注意：cleanup 现在按 session 的 `last_active` 判断空闲时间，不再按 Docker 容器创建时间判断。dry-run 输出中的 `inactiveMinutes` 才是本次清理阈值依据。新命令可以用更准确的 `--max-idle-minutes`，旧的 `--max-age-minutes` 暂时保留兼容。

如果 dry-run 输出 `Skipped BYOCC-managed containers that are not safe to auto-remove`，说明这些容器带有 BYOCC label，但缺少匹配的 DB session、session label，或 DB `container_id` 不一致。当前自动 cleanup 不会删除它们，避免误删；需要人工确认后再手动处理。

## 7. 常见问题

### 前端报 Failed to fetch

先检查后端是否运行：

```powershell
Invoke-RestMethod 'http://127.0.0.1:3001/api/health'
```

如果不通，先启动 `server`。

### 页面能打开，但终端不能输入

先绕过平台前端，直接打开 ttyd 端口：

```powershell
docker ps --format "table {{.Names}}\t{{.Ports}}"
```

找到对应 `lab-*` 容器的宿主机端口，例如：

```text
0.0.0.0:32791->7681/tcp
```

然后浏览器打开：

```text
http://localhost:32791
```

如果直接 ttyd 页面能输入，问题多半在前端 `Terminal.tsx` 或 websocket 协议解析。

### submit 返回 code must be a string

不要用会返回 PowerShell 对象的方式读取文件。
推荐：

```powershell
$code = [System.IO.File]::ReadAllText('D:\test-claude-code\claude-code\src\query-lab.ts')
```

### 构建长时间没有返回

后端现在给 `node build.mjs --lab` 加了 180 秒超时。
如果超时，`buildLog` 会返回：

```text
Build timed out after 180 seconds.
```
