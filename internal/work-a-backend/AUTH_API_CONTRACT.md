# Auth API Contract

> 状态：已实现 anonymous token + username/password cookie auth
> 更新：2026-04-17
> 目标：先建立稳定 `user_id`，并在公开 demo 前用内部账号保护 Lab / container 资源。

---

## 核心语义

当前有两条认证路径：

1. **用户名/密码 cookie auth**：给内部成员使用，保护 `/lab/:id` 与容器资源。
2. **anonymous HMAC token**：保留为兼容 / E2E 降级路径，后续可以在公开 demo 中通过 `BYOCC_ANONYMOUS_AUTH_ENABLED=false` 关闭。

这还不是 GitHub OAuth，也不是完整用户管理后台。

---

## 用户名/密码认证

### 创建用户

管理员在后端目录运行：

```powershell
cd D:\code\build-your-own-claude-code\server
npx tsx src/scripts/create-user.ts --username byocc_team --password 2024cs --role admin
```

脚本会：

- 校验用户名 / 密码
- 使用 bcryptjs hash 密码
- 写入 `users` 表
- 如果用户已存在，则打印已有用户信息并退出

### POST /api/auth/login

登录并写入 httpOnly cookie。

请求：

```http
POST /api/auth/login
Content-Type: application/json
```

```json
{
  "username": "byocc_team",
  "password": "2024cs"
}
```

成功：

```json
{
  "success": true,
  "user": {
    "id": "...",
    "username": "byocc_team",
    "role": "admin"
  }
}
```

响应会设置：

```text
Set-Cookie: byocc_session=<jwt>; HttpOnly; SameSite=Strict; Path=/; Max-Age=604800
```

失败：

```http
401
```

```json
{
  "success": false,
  "error": "用户名或密码错误。"
}
```

### GET /api/auth/me

读取当前 cookie 登录状态。

成功：

```json
{
  "authenticated": true,
  "user": {
    "id": "...",
    "username": "byocc_team",
    "role": "admin"
  }
}
```

未登录：

```http
401
```

```json
{
  "authenticated": false,
  "user": null
}
```

### POST /api/auth/logout

清除登录 cookie。

```json
{
  "success": true
}
```

---

## Cookie 配置

| 名称 | 默认值 | 说明 |
| --- | --- | --- |
| `SERVER_SESSION_SECRET` | 无 | 签名 `byocc_session` 的推荐 secret |
| `BYOCC_AUTH_SECRET` | dev fallback | 若 `SERVER_SESSION_SECRET` 未设置，会回退到该值 |
| `BYOCC_COOKIE_SECURE` | `NODE_ENV=production` 时 true | 可显式控制 cookie `Secure` |
| `BYOCC_ANONYMOUS_TOKEN_TTL_SECONDS` | `86400` | anonymous HMAC token 有效期，默认 24 小时 |

公开 demo 建议：

```powershell
$env:SERVER_SESSION_SECRET="<真实随机 secret>"
$env:BYOCC_COOKIE_SECURE="true"
```

本地开发可用：

```powershell
$env:BYOCC_COOKIE_SECURE="false"
```

---

## Anonymous User API

第一版支持匿名 user：

- 后端创建 `users` 记录
- 后端签发轻量 token
- 前端把 token 存在 localStorage
- 后续请求带 `Authorization: Bearer <token>`
- `/api/session` 会把 session 绑定到 user_id
- anonymous token 默认 24 小时过期，可通过 `BYOCC_ANONYMOUS_TOKEN_TTL_SECONDS` 调整

公开 demo 如果只允许内部账号访问，可以关闭匿名创建：

```powershell
$env:BYOCC_ANONYMOUS_AUTH_ENABLED="false"
```

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
