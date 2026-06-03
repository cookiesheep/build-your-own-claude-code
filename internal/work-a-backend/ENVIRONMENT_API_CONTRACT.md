# Environment API Contract

> 状态：已实现后端第一版  
> 日期：2026-04-12  
> 用途：给前端接入 `session/environment split` 使用。

---

## 核心语义

这次拆分以后：

- `session` 只表示浏览器会话，不再自动创建 Docker 容器。
- `environment` 表示真实 Docker 实验环境，只有用户点击“启动实验环境”后才创建。
- `terminalUrl` 只有 environment 处于 `running` 时才应该使用。
- environment API 现在必须带 `Authorization: Bearer <byocc-auth-token>`，并且该 token 必须拥有对应 `sessionId`。
- `terminalUrl` 会带一个短期 `token` query 参数；前端应直接使用后端返回的完整 URL，不要自己拼 `/api/terminal/:sessionId`。
- 后端现在会启动容器 TTL 后台回收；超过 TTL 且没有活跃 terminal 连接的容器会被删除，session 的 environment 会被标记为 `expired`。

也就是说：

```text
打开 Lab 页面
→ POST /api/session
→ 不创建容器
→ 用户点击“启动实验环境”
→ POST /api/environment/start
→ 创建容器
→ 返回 terminalUrl
```

---

## POST /api/session

创建或恢复浏览器 session。

### 请求

```json
{}
```

或：

```json
{
  "sessionId": "existing-session-id"
}
```

### 返回：新 session

```json
{
  "sessionId": "c19aec43-f33f-45f6-9741-7070bd7d4a92",
  "status": "created",
  "environmentStatus": "not_started"
}
```

### 返回：已有 session

```json
{
  "sessionId": "c19aec43-f33f-45f6-9741-7070bd7d4a92",
  "status": "restored",
  "environmentStatus": "running"
}
```

### 前端注意事项

- 页面 mount 时可以调用这个接口。
- 调这个接口后不应该期待 Docker 容器已经存在。
- 不应该立刻连接 terminal。

---

## POST /api/environment/start

为 session 创建或恢复 Docker 容器。

### 请求头

```text
Authorization: Bearer <byocc-auth-token>
```

### 请求

```json
{
  "sessionId": "c19aec43-f33f-45f6-9741-7070bd7d4a92"
}
```

### 返回

```json
{
  "success": true,
  "sessionId": "c19aec43-f33f-45f6-9741-7070bd7d4a92",
  "environmentStatus": "running",
  "containerId": "060141c36e4d...",
  "terminalUrl": "ws://127.0.0.1:3001/api/terminal/c19aec43-f33f-45f6-9741-7070bd7d4a92?token=<terminal-token>"
}
```

### 前端注意事项

- 点击“启动实验环境”时调用。
- 返回 `environmentStatus: "running"` 后可以连接 `terminalUrl`。
- 当前后端实现中，`createContainer()` 返回时容器已经启动，因此第一版直接返回 `running`。

---

## GET /api/environment/status?sessionId=...

查询当前 session 对应的 Docker 环境状态。

### 请求头

```text
Authorization: Bearer <byocc-auth-token>
```

### 返回：未启动

```json
{
  "success": true,
  "sessionId": "c19aec43-f33f-45f6-9741-7070bd7d4a92",
  "environmentStatus": "not_started",
  "containerId": null
}
```

### 返回：运行中

```json
{
  "success": true,
  "sessionId": "c19aec43-f33f-45f6-9741-7070bd7d4a92",
  "environmentStatus": "running",
  "containerId": "060141c36e4d...",
  "terminalUrl": "ws://127.0.0.1:3001/api/terminal/c19aec43-f33f-45f6-9741-7070bd7d4a92?token=<terminal-token>"
}
```

### 返回：容器已丢失

```json
{
  "success": true,
  "sessionId": "c19aec43-f33f-45f6-9741-7070bd7d4a92",
  "environmentStatus": "expired",
  "containerId": null
}
```

### 状态枚举

当前后端可能返回：

- `not_started`
- `starting`
- `running`
- `stopped`
- `expired`
- `error`

前端第一版至少需要处理：

- `not_started`：显示“启动实验环境”按钮
- `running`：连接 terminal
- `expired`：显示“环境已过期，请重新启动”
- `error`：显示错误信息

### TTL cleanup 配置

后端启动时默认启用 TTL cleanup：

| 环境变量 | 默认值 | 含义 |
| --- | --- | --- |
| `BYOCC_CONTAINER_CLEANUP_ENABLED` | `true` | 是否启用后台回收；设为 `false` / `0` / `off` 可关闭 |
| `BYOCC_CONTAINER_TTL_MINUTES` | `120` | session 空闲多少分钟后回收容器 |
| `BYOCC_CONTAINER_CLEANUP_INTERVAL_MINUTES` | `10` | 后台扫描间隔 |
| `BYOCC_CONTAINER_CLEANUP_RUN_ON_START` | `false` | 是否在 server 启动时立即跑一次 cleanup |

cleanup 判断依据：

- 只处理带 `byocc.managed=true` label 的容器。
- 只处理 DB 中 `container_id` 匹配的 session 容器。
- 使用 `sessions.last_active` 计算空闲时间。
- 正在打开 terminal WebSocket 的 session 会被保护。
- `environment_status = "starting"` 的 session 会被保护。
- 被删除后，session 会更新为 `environmentStatus: "expired"`。

---

## POST /api/environment/reset

删除旧容器并创建新容器。

### 请求头

```text
Authorization: Bearer <byocc-auth-token>
```

### 请求

```json
{
  "sessionId": "c19aec43-f33f-45f6-9741-7070bd7d4a92"
}
```

### 返回

```json
{
  "success": true,
  "sessionId": "c19aec43-f33f-45f6-9741-7070bd7d4a92",
  "containerId": "964af8e789...",
  "environmentStatus": "running",
  "terminalUrl": "ws://127.0.0.1:3001/api/terminal/c19aec43-f33f-45f6-9741-7070bd7d4a92?token=<terminal-token>"
}
```

### 前端注意事项

- 旧的 `/api/reset` 目前仍存在，用于兼容旧前端。
- 新前端应优先调用 `/api/environment/reset`。

---

## 保持不变的接口

### POST /api/submit

请求仍然是：

```json
{
  "sessionId": "...",
  "code": "...",
  "labNumber": 3
}
```

但前端应该在 `environmentStatus === "running"` 后才允许 submit。

现在 submit 也必须带 `Authorization: Bearer <byocc-auth-token>`，后端会拒绝 token 与 `sessionId` 不匹配的请求。

### WS /api/terminal/:sessionId

路径保持不变，但授权方式已改变。

前端必须使用 `environment/start` 或 `environment/status` 返回的完整 `terminalUrl`，因为该 URL 里包含短期 terminal token。没有 token 或 token 与 session owner 不匹配时，WebSocket upgrade 会被拒绝。

Cloudflare Tunnel 公开访问时，浏览器页面是 `https://`，terminal URL 必须是 `wss://`。后端会优先读取 `X-Forwarded-Proto`，再回退到 Express `req.protocol` 来决定 `ws` / `wss`。

---

## 手动验证命令

```powershell
$session = Invoke-RestMethod 'http://127.0.0.1:3001/api/session' -Method Post -ContentType 'application/json' -Body '{}'

docker ps --filter "name=lab-$($session.sessionId)" --format "{{.Names}}"
# 应无输出

$body = @{ sessionId = $session.sessionId } | ConvertTo-Json -Compress
$start = Invoke-RestMethod 'http://127.0.0.1:3001/api/environment/start' -Method Post -ContentType 'application/json' -Body $body
$start

docker ps --filter "name=lab-$($session.sessionId)" --format "{{.Names}}|{{.Status}}"
# 应看到 lab-<sessionId>|Up ...
```
