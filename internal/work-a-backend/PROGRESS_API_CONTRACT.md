# Progress API Contract

> 状态：后端已实现 user 级 progress，前端现有调用可继续兼容  
> 日期：2026-04-13  
> 目标：让 Lab 完成进度跟随 user，而不是只跟随 session。

---

## 核心语义

现在系统里有两种 progress：

- `progress`：旧表，按 `session_id + lab_number` 保存
- `user_progress`：新表，按 `user_id + lab_number` 保存

后端读取策略：

```text
如果请求带有效 Authorization token
→ 优先返回 user_progress
→ 同时合并 session progress 作为迁移期兼容

如果请求不带 token
→ 继续按 session_id 返回旧 progress
```

这样可以平滑迁移：

- 老流程不会坏
- 新登录/匿名 user 流程可以跨 session 恢复进度

---

## GET /api/progress

### 请求

```http
GET /api/progress?sessionId=<session-id>
Authorization: Bearer <byocc-auth-token>
```

### 返回

```json
{
  "labs": [
    { "labNumber": 3, "completed": true }
  ]
}
```

### 前端注意事项

- 当前 `platform/src/lib/api.ts` 的 `getProgress(sessionId)` 已经使用 `authorizedFetch`，所以会自动带 token。
- 第一版前端可以继续传 `sessionId`，不必马上改为无参 `getProgress()`。
- 后续可以再把前端接口简化为 `getProgress()`，完全由 token 决定 user。

---

## POST /api/submit

submit 成功时：

- 始终继续写旧 session progress，保持兼容
- 如果请求带有效 token，同时写 user_progress

这意味着同一个 user 后续换了新 session，仍能通过 `/api/progress` 看到已经 completed 的 Lab。

---

## 手动验证

不依赖 Docker 的最小验证：

```powershell
$auth = Invoke-RestMethod 'http://127.0.0.1:3001/api/auth/anonymous' -Method Post -ContentType 'application/json' -Body '{}'
$headers = @{ Authorization = "Bearer $($auth.token)" }

# 用脚本模拟写入 user progress
@"
import { initDatabase, updateUserProgress } from './src/db/database.ts';
initDatabase();
updateUserProgress('$($auth.user.id)', 3, true);
"@ | npx tsx -

Invoke-RestMethod 'http://127.0.0.1:3001/api/progress?sessionId=fresh-session-without-progress' -Headers $headers
```

应返回：

```json
{
  "labs": [
    { "labNumber": 3, "completed": true }
  ]
}
```
