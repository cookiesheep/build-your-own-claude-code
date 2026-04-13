# E2E Regression Gate

> 目标：把已经手动跑通的 BYOCC 后端链路固化成可重复验证入口，避免后续 TTL / OAuth 改动破坏核心闭环。

---

## 1. 什么时候跑

每次修改下面任意模块后，都应该至少跑一次 regression：

- auth / token
- session
- environment
- submit
- progress
- terminal WebSocket proxy
- container cleanup

如果只是文档改动，可以不跑 full Docker mode。

---

## 2. 前置条件

先启动后端：

```powershell
cd D:\code\build-your-own-claude-code\server
$env:BYOCC_AUTH_SECRET="local-test-secret"
npm run dev
```

另开一个 PowerShell 运行 regression 命令。

---

## 3. Boundary mode（默认，快）

这个模式不创建 Docker 容器，适合每次 PR 前快速验证 session / user 边界。

```powershell
cd D:\code\build-your-own-claude-code\server
npm run e2e:regression
```

如果后端不是跑在 `http://127.0.0.1:3001`，先设置：

```powershell
$env:BYOCC_E2E_BASE_URL="http://127.0.0.1:3019"
npm run e2e:regression
```

它会验证：

- `/api/health` 返回 ok
- 能创建 anonymous user A / user B
- user A 能创建自己的 session
- 无 token 恢复 user A 的 session 返回 401
- user B 恢复 user A 的 session 返回 403
- user B 调 user A 的 environment status / start / reset 返回 403
- user B 调 user A 的 submit / legacy reset / progress 返回 403
- 带 token 查询旧无 owner session 的 progress 返回 403
- user A 查询自己的 environment status 返回 200

成功时最后应看到：

```text
PASS BYOCC E2E regression checks completed.
```

---

## 4. Full Docker mode（慢，完整后端链路）

这个模式会真的创建 Lab 容器、提交代码、触发 `node build.mjs --lab`，需要 Docker Desktop 正在运行且 `byocc-lab` 镜像已构建。

```powershell
cd D:\code\build-your-own-claude-code\server
npm run e2e:regression:full
```

如果后端不是跑在默认端口，同样先设置 `BYOCC_E2E_BASE_URL`。

默认代码文件：

```text
D:\test-claude-code\claude-code\src\query-lab.ts
```

如果你的 sister repo 不在默认路径，用：

```powershell
$env:BYOCC_E2E_CODE_FILE="D:\path\to\claude-code\src\query-lab.ts"
npm run e2e:regression:full
```

它会额外验证：

- `/api/environment/start` 成功并返回 `running`
- `terminalUrl` 包含短期 `token=...`
- `/api/submit` 返回 `success: true`
- `/api/progress` 返回 Lab 3 completed
- WebSocket 不带 token 会被拒绝
- WebSocket 带 terminal token 能完成 upgrade 到 ttyd
- 默认会在结束时删除本次 regression 创建的测试容器

如果 WebSocket raw upgrade 在你的环境里不稳定，但前端浏览器终端可以连，可以先跳过自动 WS 检查：

```powershell
npx tsx src/scripts/e2e-regression.ts --full-docker --skip-websocket
```

如果你想保留测试容器做人工排查，可以显式加：

```powershell
npx tsx src/scripts/e2e-regression.ts --full-docker --keep-container
```

---

## 5. 浏览器人工补充验证

自动脚本不会替代真实浏览器终端体验。完整 release 前仍建议跑一次：

```powershell
cd D:\code\build-your-own-claude-code\platform
$env:NEXT_PUBLIC_API_URL="http://127.0.0.1:3001"
npm run dev
```

浏览器打开：

```text
http://localhost:3000/lab/3
```

人工确认：

1. 页面加载后有 session / user。
2. 点击“启动实验环境”。
3. 终端连接成功。
4. 点击“提交代码”。
5. 终端输入：

```bash
pwd
node cli.js
```

期望：

```text
/workspace
cookiesheep's claude-code v2.1.88
```

---

## 6. Cleanup dry-run

每次跑 full Docker mode 后，可以 dry-run 看看 cleanup 会不会误删：

```powershell
cd D:\code\build-your-own-claude-code\server
npx tsx src/scripts/cleanup-containers.ts --dry-run --max-idle-minutes=999999
```

dry-run 不会删除容器。  
如果输出 skipped orphan / mismatch，先人工确认，不要直接 execute。

---

## 7. 常见问题

### Temporary BYOCC server did not become ready

确认后端是否在运行：

```powershell
Invoke-RestMethod 'http://127.0.0.1:3001/api/health'
```

### Docker image "byocc-lab" was not found

先重建镜像：

```powershell
cd D:\code\build-your-own-claude-code
pwsh -NoProfile -ExecutionPolicy Bypass -File .\infrastructure\build-lab-image.ps1
```

### submit 构建失败

先确认 code file 是字符串读取，且 sister repo 路径正确：

```powershell
[System.IO.File]::Exists('D:\test-claude-code\claude-code\src\query-lab.ts')
```
