# API Key Settings Contract

> 状态：已实现第一版  
> 日期：2026-04-18  
> 目标：为已登录用户提供 API Key 管理，容器启动时把可用 Key 注入为 `ANTHROPIC_API_KEY`。

---

## 核心语义

API Key 来源优先级：

```text
用户自定义 Key
→ 平台默认 Key（DEFAULT_API_KEY）
→ 空字符串（仅保底，不保证 LLM 可用）
```

API Base URL 来源优先级：

```text
用户自定义 Base URL
→ 平台默认 Base URL（DEFAULT_API_BASE_URL 或 ANTHROPIC_BASE_URL）
→ SDK 默认 endpoint
```

API Key 的持久化策略：

- 自定义 Key 只保存在后端 SQLite。
- 数据库里保存的是 AES 加密后的密文。
- API Base URL 不是 secret，明文保存在 `user_settings.api_base_url`。
- 前端永远不显示完整 Key。
- 删除自定义 Key 后，用户回退到平台默认 Key。
- 已经运行中的容器不会自动更新 ENV；重启 / reset 实验环境后生效。

---

## 环境变量

```text
ENCRYPTION_KEY=<64位hex字符串>
DEFAULT_API_KEY=<平台共享 API Key>
DEFAULT_API_BASE_URL=https://api.anthropic.com
```

生成 `ENCRYPTION_KEY`：

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

注意：

- `ENCRYPTION_KEY` 必须是 64 个 hex 字符，也就是 32 字节。
- `ENCRYPTION_KEY` 不能提交到 Git。
- 如果用户保存了自定义 Key，之后换了 `ENCRYPTION_KEY`，旧密文将无法解密。

---

## GET /api/settings/api-key

读取当前登录用户的 API Key 设置。

认证：

```text
需要 byocc_session cookie
```

返回：默认 Key

```json
{
  "source": "default",
  "hasKey": false,
  "apiBaseUrl": "https://api.anthropic.com"
}
```

返回：自定义 Key

```json
{
  "source": "user",
  "hasKey": true,
  "maskedKey": "已保存自定义 Key",
  "apiBaseUrl": "https://open.bigmodel.cn/api/anthropic"
}
```

---

## PUT /api/settings/api-key

保存当前登录用户的自定义 API Key。

请求：

```json
{
  "apiKey": "sk-ant-test-key-12345",
  "apiBaseUrl": "https://open.bigmodel.cn/api/anthropic"
}
```

校验：

- `apiKey` 必须是字符串。
- trim 后长度必须大于 10。

返回：

```json
{
  "source": "user",
  "hasKey": true,
  "maskedKey": "sk-ant***345",
  "apiBaseUrl": "https://open.bigmodel.cn/api/anthropic"
}
```

---

## DELETE /api/settings/api-key

删除当前登录用户的自定义 API Key，并回退到平台默认 Key。

返回：

```json
{
  "source": "default",
  "hasKey": false
}
```

---

## 容器 ENV 注入

创建容器时：

```text
server/src/services/container-manager.ts
```

会解析当前 user 的 API Key：

```text
user_settings.api_key_source = user 且 api_key_encrypted 存在
→ 解密用户 Key
否则
→ 使用 process.env.DEFAULT_API_KEY
```

最终注入：

```text
ANTHROPIC_API_KEY=<resolved key>
ANTHROPIC_BASE_URL=<resolved base url, 如果存在>
```

验证容器 ENV：

```powershell
docker inspect <container_id> --format "{{range .Config.Env}}{{println .}}{{end}}"
```

应能看到：

```text
ANTHROPIC_API_KEY=...
ANTHROPIC_BASE_URL=...
```

---

## 前端入口

已登录后，Navbar 用户菜单中有：

```text
API Key 设置
```

弹窗能力：

- 读取当前 Key 来源
- 读取当前 API Base URL
- 保存自定义 Key
- 保存第三方 Anthropic 兼容 API Base URL
- 恢复默认 Key
- 提示“重启实验环境后生效”

---

## 不做

本阶段不做：

- API Key 有效性校验
- API Key 使用统计
- 多 Key 轮转
- 管理员查看所有用户 Key
- 支持多 provider Key
