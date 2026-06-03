# Lab Workspace API Contract

> 状态：后端已实现，前端待接入  
> 日期：2026-04-12  
> 目标：让用户在 Monaco 中写到一半的代码可以保存到后端，刷新页面后恢复。

---

## 核心语义

Workspace 指：

```text
某个 user 在某个 Lab 中的最新代码草稿
```

它和 Docker 容器无关：

- 容器可以 reset / TTL 回收
- workspace code 仍然保存在 SQLite
- 用户下次启动环境时，可以把保存的代码重新注入容器

当前第一版只保存最新版，不做历史版本。

---

## Auth 要求

所有 workspace API 都需要：

```text
Authorization: Bearer <byocc-auth-token>
```

前端应先按 [AUTH_API_CONTRACT.md](./AUTH_API_CONTRACT.md) 确保有 anonymous user token。

---

## GET /api/labs/:id/workspace

读取某个 Lab 的代码草稿。

### 请求

```http
GET /api/labs/3/workspace
Authorization: Bearer <token>
```

### 有草稿时返回

```json
{
  "labNumber": 3,
  "code": "export async function* query(...) { ... }",
  "updatedAt": "2026-04-12 14:18:44"
}
```

### 没有草稿时返回

```json
{
  "labNumber": 3,
  "code": null,
  "updatedAt": null
}
```

前端看到 `code === null` 时，应继续使用默认 skeleton。

---

## PUT /api/labs/:id/workspace

保存某个 Lab 的最新代码草稿。

### 请求

```http
PUT /api/labs/3/workspace
Authorization: Bearer <token>
Content-Type: application/json
```

```json
{
  "code": "export const answer = 42;"
}
```

### 返回

```json
{
  "labNumber": 3,
  "code": "export const answer = 42;",
  "updatedAt": "2026-04-12 14:18:44"
}
```

---

## submit 兜底保存

`POST /api/submit` 仍保持原请求结构：

```json
{
  "sessionId": "...",
  "code": "...",
  "labNumber": 3
}
```

submit 现在要求有效 `Authorization` token，并且 token 必须拥有提交请求里的 `sessionId`。
后端会在构建前自动保存一份 workspace snapshot。

这不是替代前端自动保存，而是兜底：

- 前端应在编辑时 debounce 保存
- submit 前也应保存一次
- 后端 submit 再兜底保存一次

---

## 前端接入建议

建议 local state 仍然以 Monaco 为准，后端 workspace 是持久化备份。

页面加载顺序：

```text
ensureAnonymousUser()
→ createSession(existingSessionId)
→ getWorkspace(labId)
→ 如果 code 不为 null，用后端 code 覆盖默认 skeleton
```

编辑器变更：

```text
onChange
→ 更新本地 React state
→ debounce 1-2 秒后 PUT /api/labs/:id/workspace
```

submit：

```text
PUT /api/labs/:id/workspace
→ POST /api/submit
```

---

## 手动验证

```powershell
$auth = Invoke-RestMethod 'http://127.0.0.1:3001/api/auth/anonymous' -Method Post -ContentType 'application/json' -Body '{}'

$headers = @{
  Authorization = "Bearer $($auth.token)"
}

$body = @{
  code = "draft one"
} | ConvertTo-Json -Compress

Invoke-RestMethod 'http://127.0.0.1:3001/api/labs/3/workspace' -Method Put -ContentType 'application/json' -Headers $headers -Body $body

Invoke-RestMethod 'http://127.0.0.1:3001/api/labs/3/workspace' -Headers $headers
```
