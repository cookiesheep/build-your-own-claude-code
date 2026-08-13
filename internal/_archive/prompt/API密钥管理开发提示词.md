# API Key 管理 — 开发提示词

> 给新的 Claude Code 会话使用。认证系统已完成，本任务基于其之上开发。
> 工作目录：D:\code\build-your-own-claude-code
> 分支建议：从当前 `feat/auth-system` 新建 `feat/api-key-management`

---

## 项目背景

**Build Your Own Claude Code (BYOCC)** 教学平台已完成认证系统（用户名/密码 + JWT httpOnly cookie）。

实验工作台的 Docker 容器需要 API Key 才能调用 LLM。目前容器创建时**没有注入任何 API Key**。

**本次任务**：实现 API Key 管理系统——服务端提供默认共享 Key，用户可选填自己的 Key。

---

## 当前代码状态（必须先了解）

### 已有的数据库表（不需要重建）

认证系统已在 `server/src/db/database.ts` 中创建了 `user_settings` 表：

```sql
CREATE TABLE IF NOT EXISTS user_settings (
  user_id TEXT PRIMARY KEY,
  api_key_encrypted TEXT,
  api_key_source TEXT DEFAULT 'default',  -- 'default' 或 'user'
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

**你需要在 database.ts 中新增的 DB 方法**（表已存在，只加方法）：
- `getUserSettings(userId: string)` — 查询用户设置
- `upsertUserSettings(userId: string, settings)` — 插入或更新
- `clearUserApiKey(userId: string)` — 清除自定义 Key

### 已有的认证中间件

`server/src/middleware/auth.ts` 提供了 `requireAuth` 中间件，验证 JWT cookie 后将 `req.user` 注入：
```typescript
req.user = { id: string, username: string, role: string }
```

### 当前容器创建（需要改的部分）

`server/src/services/container-manager.ts` 的 `createContainer` 函数目前签名：
```typescript
export async function createContainer(sessionId: string): Promise<string>
```

创建容器时**没有传任何 ENV**：
```typescript
const container = await docker.createContainer({
  Image: LAB_IMAGE,
  name: getContainerName(sessionId),
  ExposedPorts: { [TTYD_PORT_KEY]: {} },
  Labels: { ... },
  HostConfig: { ... },
  // ← 缺少 Env 字段
});
```

你需要在这里加 `Env` 字段注入 `ANTHROPIC_API_KEY`。

### 已有的路由注册

`server/src/index.ts` 已经注册了 `requireAuth` 中间件保护 Lab 相关路由。

---

## 方案设计

### API Key 来源优先级

```
1. 用户自己提供的 Key（user_settings.api_key_source='user' 且 api_key_encrypted 非空）
2. 服务端默认 Key（环境变量 DEFAULT_API_KEY）
```

### 数据流

```
用户在设置面板填入 Key
  → 前端 PUT /api/settings/api-key { apiKey: "sk-xxx" }
  → 后端 AES 加密 → 存入 user_settings 表（api_key_source='user'）
  → 容器启动时：
     1. 查 user_settings 获取用户的 API Key
     2. 有自定义 Key → 解密 → 注入 ENV
     3. 无 → 用 process.env.DEFAULT_API_KEY
  → 容器 ENV: ANTHROPIC_API_KEY=xxx
```

### 加密方案

```
算法: AES-256-CBC
密钥: 环境变量 ENCRYPTION_KEY（32 字节 = 64 hex 字符）
IV: 每次 encrypt 随机生成 16 字节
存储格式: "iv_hex:ciphertext_hex"
解密: 拆分 iv 和 ciphertext，解密返回明文
```

---

## 后端实现

### Step 1: 新建 `server/src/services/encryption.ts`

```typescript
import crypto from 'crypto';

const ALGORITHM = 'aes-256-cbc';

// 获取密钥，启动时检查存在性
function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) throw new Error('ENCRYPTION_KEY environment variable is required');
  return Buffer.from(key, 'hex');  // 32 字节 = 64 hex 字符
}

// encrypt(plaintext: string): string
// 返回 "iv_hex:ciphertext_hex"
// 每次调用生成随机 IV

// decrypt(ivCiphertext: string): string
// 拆分 "iv:ciphertext"，解密返回明文
```

### Step 2: 新建 `server/src/routes/settings.ts`

```typescript
import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
// ... 其他 import

const router = Router();
router.use(requireAuth);  // 所有设置路由都需要登录

// GET /api/settings/api-key
// 从 req.user.id 查 user_settings
// 返回: { source: 'default' | 'user', hasKey: boolean, maskedKey?: string }
// maskedKey 规则：显示前6位 + *** + 后3位（如 "sk-ant***xyz"）
// 如果没有自定义 Key，返回 { source: 'default', hasKey: false }
// 不要返回完整的 Key

// PUT /api/settings/api-key
// Body: { apiKey: string }
// 1. 验证 apiKey 非空且长度 > 10
// 2. AES 加密
// 3. upsert 到 user_settings（api_key_source='user'）
// 4. 返回 { source: 'user', hasKey: true, maskedKey: '...' }

// DELETE /api/settings/api-key
// 清除 api_key_encrypted，设 api_key_source='default'
// 返回 { source: 'default' }
```

### Step 3: 修改 `server/src/db/database.ts`

在现有 database.ts 中新增方法（表已存在，不加建表语句）：

```typescript
getUserSettings(userId: string): { user_id: string; api_key_encrypted: string | null; api_key_source: string; updated_at: string } | undefined
upsertUserSettings(userId: string, settings: { api_key_encrypted?: string; api_key_source?: string }): void
clearUserApiKey(userId: string): void  // 设 api_key_encrypted=null, api_key_source='default'
```

### Step 4: 修改 `server/src/services/container-manager.ts`

关键改动——`createContainer` 函数加 userId 参数 + ENV 注入：

```typescript
// 修改签名（保持向后兼容）：
export async function createContainer(sessionId: string, userId?: string): Promise<string> {

// 在 docker.createContainer 调用前，解析 API Key：
let apiKey = process.env.DEFAULT_API_KEY || '';
if (userId) {
  const settings = db.getUserSettings(userId);
  if (settings?.api_key_encrypted && settings.api_key_source === 'user') {
    apiKey = decrypt(settings.api_key_encrypted);
  }
}

// 在 createContainer 的 config 对象中加 Env：
const container = await docker.createContainer({
  Image: LAB_IMAGE,
  name: getContainerName(sessionId),
  Env: [`ANTHROPIC_API_KEY=${apiKey}`],  // ← 新增
  ExposedPorts: { ... },
  Labels: { ... },
  HostConfig: { ... },
});
```

### Step 5: 修改 `server/src/routes/environment.ts`

`POST /api/environment/start` 路由中，从 `req.user` 取 userId 传给 createContainer：

```typescript
// 找到调用 createContainer 的地方，改为：
const containerId = await createContainer(sessionId, req.user?.id);
```

### Step 6: 修改 `server/src/index.ts`

注册 settings 路由：

```typescript
import settingsRouter from './routes/settings';
// ...
app.use('/api/settings', settingsRouter);
```

---

## 前端实现

### Step 7: 新建 `platform/src/lib/settings.ts`

```typescript
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "";

export interface ApiKeySettings {
  source: 'default' | 'user';
  hasKey: boolean;
  maskedKey?: string;
}

// getApiKeySettings(): Promise<ApiKeySettings>
//   GET /api/settings/api-key, credentials: 'include'

// updateApiKey(apiKey: string): Promise<ApiKeySettings>
//   PUT /api/settings/api-key, credentials: 'include'

// deleteApiKey(): Promise<{ source: 'default' }>
//   DELETE /api/settings/api-key, credentials: 'include'
```

### Step 8: 新建 `platform/src/components/SettingsModal.tsx`

```tsx
'use client';

// 设置弹窗（Modal / Dialog）
// Props: { open: boolean, onClose: () => void }
//
// 功能：
// 1. 打开时 GET /api/settings/api-key → 显示当前状态
//    - 默认 Key → 显示 "当前使用平台共享 Key"
//    - 自定义 Key → 显示 maskedKey（如 "sk-ant***xyz"）
// 2. 输入框（type=password + 显示/隐藏切换）
// 3. "保存" 按钮 → PUT /api/settings/api-key
// 4. "恢复默认" 按钮 → DELETE /api/settings/api-key
// 5. 操作成功后 toast 提示
//
// 样式：
// - 暗色背景 Modal，与平台风格一致
// - 输入框 focus 时边框变琥珀金
// - 保存按钮琥珀金填充
// - 说明文字用 text-secondary 色
```

### Step 9: 集成到 Navbar

在 `platform/src/components/Navbar.tsx` 的已登录用户区域新增设置按钮：

```
用户名 [⚙ 设置] [登出]
       ↓
  打开 SettingsModal
```

### Step 10: 集成到 LabWorkspace（可选）

在 ActionBar 显示 Key 来源标签：
- 默认 Key → 灰色小标签 "默认 Key"
- 自定义 Key → 琥珀金小标签 "自定义 Key"
- 点击标签打开 SettingsModal

---

## 环境变量

```bash
# .env 新增
ENCRYPTION_KEY=<64位hex字符串>
# 生成方法: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

DEFAULT_API_KEY=sk-ant-xxx  # 平台默认共享的 API Key
```

---

## 验证步骤

```bash
# 后端
cd server && npm run build
npx tsc --noEmit --project server/tsconfig.json

# API 测试（需要先登录拿到 cookie）
curl -X PUT http://127.0.0.1:3001/api/settings/api-key \
  -H "Content-Type: application/json" \
  -b "byocc_session=YOUR_JWT" \
  -d '{"apiKey":"sk-ant-test-key-12345"}'
# → { source: "user", hasKey: true, maskedKey: "sk-ant***345" }

curl http://127.0.0.1:3001/api/settings/api-key \
  -b "byocc_session=YOUR_JWT"
# → { source: "user", hasKey: true, maskedKey: "sk-ant***345" }

curl -X DELETE http://127.0.0.1:3001/api/settings/api-key \
  -b "byocc_session=YOUR_JWT"
# → { source: "default" }

# 容器 ENV 验证
# 启动环境后检查容器 ENV 包含 ANTHROPIC_API_KEY
docker inspect <container_id> --format '{{range .Config.Env}}{{println .}}{{end}}' | grep ANTHROPIC

# 前端
cd platform && npm run build

# E2E 回归
npm run e2e:regression
```

---

## 完成标准

```
1. GET/PUT/DELETE /api/settings/api-key 三个接口正常工作
2. API Key 在 user_settings 表中 AES 加密存储
3. maskedKey 不暴露完整 Key
4. 容器创建时正确注入 ANTHROPIC_API_KEY ENV
5. 用户自定义 Key 优先于默认 Key
6. 删除自定义 Key 后回退到默认 Key
7. 前端设置弹窗正常工作
8. npm run build（前后端）无报错
9. e2e:regression 通过
```

---

## 不动的文件

```
不要修改：
  server/src/routes/auth.ts
  server/src/routes/terminal.ts
  server/src/middleware/auth.ts
  server/src/services/auth-token.ts
  platform/src/components/HeroParticles.tsx
  platform/src/components/ThemeProvider.tsx
  platform/src/app/page.tsx
  platform/src/app/globals.css
```

---

## 后续扩展（本次不做）

```
□ Key 有效性校验（调用 API 前检查 Key 是否有效）
□ Key 使用统计（每个用户消耗了多少 token）
□ 多 Key 轮转（默认 Key 池，避免单 Key 限流）
□ Key 格式自动识别（Anthropic / OpenAI / DeepSeek）
□ 管理员查看所有用户的 Key 使用情况
```
