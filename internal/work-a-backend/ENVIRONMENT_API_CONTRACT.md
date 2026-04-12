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
  "terminalUrl": "ws://127.0.0.1:3001/api/terminal/c19aec43-f33f-45f6-9741-7070bd7d4a92"
}
```

### 前端注意事项

- 点击“启动实验环境”时调用。
- 返回 `environmentStatus: "running"` 后可以连接 `terminalUrl`。
- 当前后端实现中，`createContainer()` 返回时容器已经启动，因此第一版直接返回 `running`。

---

## GET /api/environment/status?sessionId=...

查询当前 session 对应的 Docker 环境状态。

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
  "terminalUrl": "ws://127.0.0.1:3001/api/terminal/c19aec43-f33f-45f6-9741-7070bd7d4a92"
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

---

## POST /api/environment/reset

删除旧容器并创建新容器。

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
  "terminalUrl": "ws://127.0.0.1:3001/api/terminal/c19aec43-f33f-45f6-9741-7070bd7d4a92"
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

### WS /api/terminal/:sessionId

保持不变。

前端应使用 `environment/start` 或 `environment/status` 返回的 `terminalUrl`，不要自己拼路径。

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
