# API Key 管理系统 — 开发提示词

> 给新的 Claude Code 会话使用。建议在认证系统（AUTH_SYSTEM_PROMPT.md）完成后执行。
> 工作目录：D:\code\build-your-own-claude-code
> 分支建议：`feat/api-key-management`

---

## 项目背景

**Build Your Own Claude Code (BYOCC)** 教学平台已完成认证系统（用户名/密码登录）。

实验工作台的 Docker 容器需要 API Key 才能调用 LLM（Anthropic / DeepSeek / 其他兼容 API）。

**当前状态**：API Key 硬编码在 Docker 环境变量或配置文件中。

**本次任务**：实现 API Key 管理系统——服务端提供默认共享 Key，用户可选填自己的 Key。

---

## 方案设计

### API Key 来源优先级

```
1. 用户自己提供的 Key（user_settings.api_key_encrypted 有值且 api_key_source='user'）
2. 服务端默认 Key（环境变量 DEFAULT_API_KEY）
```

### 数据流

```
用户在设置面板填入 Key
  → 前端 PUT /api/settings/api-key { apiKey: "sk-xxx" }
  → 后端 AES 加密 → 存入 user_settings 表
  → 容器启动时：
     1. 查用户是否有自定义 Key
     2. 有 → 解密 → 注入 ENV
     3. 无 → 用 DEFAULT_API_KEY
  → 容器 ENV: ANTHROPIC_API_KEY=xxx
```

### 加密方案

```
算法: AES-256-CBC
密钥: 环境变量 ENCRYPTION_KEY（32 字节 hex）
IV: 随机生成，与密文一起存储（IV:密文 格式）
存储: user_settings.api_key_encrypted = "iv_hex:ciphertext_hex"
```

---

## 后端实现

### 新增文件

#### `server/src/routes/settings.ts`

```typescript
import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { Database } from '../db/database';
import { encrypt, decrypt } from '../services/encryption';

const router = Router();

// GET /api/settings/api-key
// 返回: { source: 'default' | 'user', hasKey: boolean, maskedKey?: string }
// maskedKey 示例: "sk-ant-***...***xyz"（只显示前6后3位）
// 不返回完整 Key

// PUT /api/settings/api-key
// Body: { apiKey: string }
// 1. 验证 apiKey 非空且长度 > 10
// 2. AES 加密
// 3. 存入 user_settings
// 4. 返回 { source: 'user', maskedKey: '...' }

// DELETE /api/settings/api-key
// 清除用户自定义 Key，恢复使用默认 Key
// 返回 { source: 'default' }
```

#### `server/src/services/encryption.ts`

```typescript
import crypto from 'crypto';

const ALGORITHM = 'aes-256-cbc';

// encrypt(plaintext: string): string
// 返回 "iv:ciphertext" hex 格式

// decrypt(ivCiphertext: string): string
// 解密 "iv:ciphertext" 返回明文

// 需要 ENCRYPTION_KEY 环境变量（32 字节 hex = 256 bit）
```

### 修改文件

#### `server/src/db/database.ts`

```typescript
// 新增方法（如果 users 表和 user_settings 表已在认证 PR 中创建，则跳过建表）：
//   getUserSettings(userId: string): UserSettings | undefined
//   upsertUserSettings(userId: string, settings: Partial<UserSettings>): void
//   clearUserApiKey(userId: string): void
```

#### `server/src/services/container-manager.ts`

```typescript
// 修改 createContainer 方法：
// 1. 新增参数 userId
// 2. 查 user_settings 获取用户的 API Key
// 3. 决定使用哪个 Key：
//    const userSettings = db.getUserSettings(userId);
//    let apiKey: string;
//    if (userSettings?.api_key_encrypted && userSettings.api_key_source === 'user') {
//      apiKey = decrypt(userSettings.api_key_encrypted);
//    } else {
//      apiKey = process.env.DEFAULT_API_KEY || '';
//    }
// 4. 注入容器 ENV:
//    Env: [`ANTHROPIC_API_KEY=${apiKey}`, ...其他 ENV]
```

#### `server/src/routes/environment.ts`

```typescript
// POST /api/environment/start
// 从 req.user.id 获取 userId
// 传给 containerManager.createContainer({ ..., userId })
```

#### `server/src/index.ts`

```typescript
// 注册 settingsRouter: app.use('/api/settings', requireAuth, settingsRouter)
```

---

## 前端实现

### 新增文件

#### `platform/src/components/SettingsModal.tsx`

```tsx
'use client';

// 设置弹窗
// Props: { open: boolean, onClose: () => void }
//
// 布局：
// ┌─────────────────────────────┐
// │ 设置                     ✕  │
// ├─────────────────────────────┤
// │                             │
// │ API Key                     │
// │ ┌───────────────────────┐   │
// │ │ 当前：默认共享 Key     │   │
// │ │ sk-ant-***...***xyz   │   │
// │ └───────────────────────┘   │
// │                             │
// │ 使用自己的 Key               │
// │ ┌───────────────────────┐   │
// │ │ sk-ant-...            │   │
// │ └───────────────────────┘   │
// │                             │
// │ [保存 Key]  [恢复默认]       │
// │                             │
// │ ─── 说明 ───                │
// │ 默认 Key 由平台提供，        │
// │ 所有用户共享。你也可以       │
// │ 使用自己的 Key，调用频率     │
// │ 不受其他用户影响。           │
// │                             │
// │ Key 仅存储在服务端，不会     │
// │ 发送到第三方。               │
// └─────────────────────────────┘
//
// 功能：
// 1. 打开时 GET /api/settings/api-key → 显示当前状态
// 2. 输入新 Key → PUT /api/settings/api-key
// 3. 点击"恢复默认" → DELETE /api/settings/api-key
// 4. 保存后 toast 提示成功
// 5. Key 输入框 type=password，旁边有显示/隐藏切换
```

#### `platform/src/lib/settings.ts`

```typescript
// Settings API 客户端

export interface ApiKeySettings {
  source: 'default' | 'user';
  hasKey: boolean;
  maskedKey?: string;
}

// getApiKeySettings(): Promise<ApiKeySettings>
// updateApiKey(apiKey: string): Promise<ApiKeySettings>
// deleteApiKey(): Promise<{ source: 'default' }>
```

### 修改文件

#### `platform/src/components/Navbar.tsx`

```tsx
// 已登录用户的下拉菜单中新增：
// - 设置（齿轮图标）→ 打开 SettingsModal
// - 当前用户名
// - 登出
```

#### `platform/src/components/LabWorkspace.tsx`

```tsx
// ActionBar 区域可选显示 Key 来源指示：
// - 使用默认 Key → 小标签 "默认 Key"
// - 使用自己的 Key → 小标签 "自定义 Key"
// 点击可打开 SettingsModal
```

---

## 实施顺序

```
Step 1: 后端加密工具
  新建 server/src/services/encryption.ts
  测试：encrypt/decrypt 往返正确

Step 2: 后端 settings 路由
  新建 server/src/routes/settings.ts
  修改 server/src/db/database.ts（新增方法）

Step 3: 容器 Key 注入
  修改 server/src/services/container-manager.ts
  修改 server/src/routes/environment.ts

Step 4: 注册路由
  修改 server/src/index.ts

Step 5: 前端设置 API
  新建 platform/src/lib/settings.ts

Step 6: 前端设置弹窗
  新建 platform/src/components/SettingsModal.tsx

Step 7: 前端集成
  修改 Navbar + LabWorkspace

Step 8: 端到端验证
```

---

## 需要安装的 npm 包

```bash
# 后端：crypto 是 Node.js 内置，不需要额外安装
# 前端：不需要新包
```

---

## 环境变量

```bash
# .env 新增
ENCRYPTION_KEY=一个32字节的hex字符串（64个hex字符）
# 生成方法: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

DEFAULT_API_KEY=sk-ant-xxx  # 平台默认共享的 API Key
```

---

## 完成标准

```bash
# 后端验证
cd server && npm run build

# 设置 API Key
curl -X PUT http://localhost:3001/api/settings/api-key \
  -H "Content-Type: application/json" \
  -H "Cookie: byocc_session=JWT" \
  -d '{"apiKey":"sk-ant-test-key-12345"}'
# → { source: "user", hasKey: true, maskedKey: "sk-ant***45" }

# 查询当前设置
curl http://localhost:3001/api/settings/api-key -H "Cookie: byocc_session=JWT"
# → { source: "user", hasKey: true, maskedKey: "sk-ant***45" }

# 恢复默认
curl -X DELETE http://localhost:3001/api/settings/api-key -H "Cookie: byocc_session=JWT"
# → { source: "default" }

# 容器注入验证
# 启动环境后，检查容器 ENV 是否包含正确的 ANTHROPIC_API_KEY
docker inspect <container_id> | jq '.[0].Config.Env'

# 前端验证
cd platform && npm run build

# 浏览器验证
# 1. 登录后点击设置 → 弹出设置弹窗
# 2. 显示当前使用默认 Key
# 3. 输入新 Key → 保存 → 显示 "自定义 Key" + masked
# 4. 恢复默认 → 显示 "默认 Key"
# 5. 启动环境 → 容器使用正确的 Key
```

---

## 不动的文件

```
不要修改：
  platform/src/components/HeroParticles.tsx
  platform/src/components/ThemeProvider.tsx
  platform/src/components/LandingSections.tsx
  platform/src/app/page.tsx
  platform/src/app/globals.css
  server/src/routes/auth.ts    (认证系统已完成)
  server/src/routes/terminal.ts
```

---

## 后续扩展（本次不做）

```
□ Key 余额/配额检查（调用 API 前检查 Key 是否有效）
□ Key 使用统计（每个用户消耗了多少 token）
□ 多 Key 轮转（默认 Key 池，避免单 Key 限流）
□ Key 格式校验（Anthropic / OpenAI / DeepSeek 不同格式）
□ 管理员查看所有用户的 Key 使用情况
```
