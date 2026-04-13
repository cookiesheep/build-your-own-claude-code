# Anonymous User API Contract

> 状态：后端已实现，前端待接入  
> 日期：2026-04-12  
> 目标：先建立稳定 `user_id`，为 progress / code snapshot / GitHub OAuth 打地基。

---

## 核心语义

这一步不是完整登录系统，也不是 GitHub OAuth。

它只解决一个问题：

```text
前端怎样拿到一个稳定 user_id，让后端知道“这个 session 属于哪个学习者”？
```

第一版支持匿名 user：

- 后端创建 `users` 记录
- 后端签发轻量 token
- 前端把 token 存在 localStorage
- 后续请求带 `Authorization: Bearer <token>`
- `/api/session` 会把 session 绑定到 user_id

---

## POST /api/auth/anonymous

创建匿名 user，或在已有有效 token 时复用当前 user。

### 请求

```json
{}
```

### 请求头（可选）

```text
Authorization: Bearer <existing-token>
```

### 返回

```json
{
  "token": "base64urlPayload.base64urlSignature",
  "user": {
    "id": "8c37e38c-27f2-4aa6-a3f2-beaa35d098fe",
    "kind": "anonymous",
    "githubId": null,
    "nickname": null,
    "avatarUrl": null
  }
}
```

---

## GET /api/me

读取当前 token 对应的 user。

### 请求头

```text
Authorization: Bearer <token>
```

### 成功返回

```json
{
  "user": {
    "id": "8c37e38c-27f2-4aa6-a3f2-beaa35d098fe",
    "kind": "anonymous",
    "githubId": null,
    "nickname": null,
    "avatarUrl": null
  }
}
```

### 失败返回

HTTP status：`401`

```json
{
  "message": "Missing or invalid auth token."
}
```

---

## POST /api/session

保持原接口，但现在支持可选身份绑定。

### 带 token 请求

```text
Authorization: Bearer <token>
```

```json
{
  "sessionId": "optional-existing-session-id"
}
```

### 返回

```json
{
  "sessionId": "c4a837a7-d70e-4349-8c6c-03d21de78b1b",
  "status": "created",
  "environmentStatus": "not_started",
  "userId": "8c37e38c-27f2-4aa6-a3f2-beaa35d098fe"
}
```

### 不带 token 请求

创建新 session 仍然可用，用于兼容旧前端：

```json
{
  "sessionId": "d790e472-f0e3-4e0d-9f60-8f92a9854816",
  "status": "created",
  "environmentStatus": "not_started",
  "userId": null
}
```

如果请求体里传入的是一个已经绑定到 user 的旧 `sessionId`，但请求没有携带 token，后端会返回 `401`。如果携带的是另一个 user 的 token，后端会返回 `403`。

前端接入后应优先带 token。

---

## Token 说明

当前 token 是轻量 HMAC token，不是完整 JWT。

格式：

```text
base64url(payload).base64url(signature)
```

payload 包含：

```json
{
  "userId": "...",
  "kind": "anonymous",
  "issuedAt": "..."
}
```

签名 secret：

```text
BYOCC_AUTH_SECRET
```

如果本地没有设置，后端会使用开发默认值，并打印 warning。公开部署前必须设置真实 secret。

### Terminal token

浏览器 WebSocket 连接无法复用 `Authorization: Bearer ...` 请求头，因此后端会在 environment API 的 `terminalUrl` 中签发短期 terminal token：

```text
ws://127.0.0.1:3001/api/terminal/<sessionId>?token=<terminal-token>
```

terminal token 只用于连接容器 ttyd，payload 会绑定：

```json
{
  "purpose": "terminal",
  "sessionId": "...",
  "userId": "...",
  "expiresAt": "..."
}
```

前端不要自己拼 terminal URL，应直接使用 `environment/start` 或 `environment/status` 返回的完整 `terminalUrl`。

---

## 前端接入建议

localStorage key：

```text
byocc-auth-token
```

页面启动时：

1. 读取 `byocc-auth-token`
2. 如果没有 token：
   - `POST /api/auth/anonymous`
   - 保存返回 token
3. 如果有 token：
   - `GET /api/me`
   - 如果 401，再重新 `POST /api/auth/anonymous`
4. 后续 API 请求都带：

```text
Authorization: Bearer <token>
```

---

## 手动验证

```powershell
$auth = Invoke-RestMethod 'http://127.0.0.1:3001/api/auth/anonymous' -Method Post -ContentType 'application/json' -Body '{}'

$headers = @{
  Authorization = "Bearer $($auth.token)"
}

Invoke-RestMethod 'http://127.0.0.1:3001/api/me' -Headers $headers

Invoke-RestMethod 'http://127.0.0.1:3001/api/session' -Method Post -ContentType 'application/json' -Headers $headers -Body '{}'
```
