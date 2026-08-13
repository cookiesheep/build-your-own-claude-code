# Codex 开发任务：API Key 管理系统重构

## 项目背景

BYOCC (Build Your Own Claude Code) 是一个教学平台，学习者通过 6 个 Lab 逐步实现 Coding Agent 的核心模块。每个 Lab 运行在独立的 Docker 容器中，容器内的代码需要调用 Anthropic API（或兼容服务）。

当前后端：Express + SQLite (better-sqlite3) + Dockerode
当前前端：Next.js 15 (App Router) + React 19

## 当前系统的问题

### 问题 1：默认 API Key 可被提取

当前 `resolveContainerApiConfig()` 将真实的 `DEFAULT_API_KEY` 作为环境变量注入容器：
```typescript
// container-manager.ts:249-264
const container = await docker.createContainer({
  Env: [`ANTHROPIC_API_KEY=${apiConfig.apiKey}`, ...]
});
```
用户在容器内执行 `echo $ANTHROPIC_API_KEY` 即可获取平台共享 Key，然后在外部滥用。

### 问题 2：用户不知道需要配置 Key

当前的 Key 配置入口藏在 Navbar 下拉菜单的 "API Key 设置" 里。用户第一次进入 Lab 时：
1. 点击"启动实验环境"
2. 后端注入默认 Key 到容器
3. 如果默认 Key 无效或用户想用自己的，用户根本不知道去哪里改

### 问题 3：解密失败 = 500 错误

如果 `ENCRYPTION_KEY` 环境变量变更，数据库里已加密的 Key 无法解密：
```typescript
// container-manager.ts:140
apiKey: decrypt(settings.apiKeyEncrypted),  // 抛出 ERR_OSSL_BAD_DECRYPT
```
整个容器启动失败，用户只看到 500。

### 问题 4：改 Key 后旧容器不更新

用户在设置中改了 Key，但如果旧容器还在运行，旧容器的 ENV 里还是旧 Key。代码只是返回已有容器：
```typescript
// container-manager.ts:232-240
const existingContainer = await resolveContainer(sessionId);
if (existingContainer) {
  return existingContainer.info.Id;  // 直接返回，不更新 ENV
}
```

### 问题 5：无限流无配额

所有用默认 Key 的用户共享一个 Key，没有任何限流机制。一个用户可以无限调用直到额度耗尽。

### 问题 6：SettingsModal 定位问题

SettingsModal 虽然用了 `z-[80]` 和 `fixed inset-0`，但用户反馈 "被遮挡了一部分位置太上了"。需要检查实际渲染效果。

---

## 解决方案设计

### 核心架构变更：LLM 代理

**目标**：真实 API Key 永远不进入 Docker 容器。

#### 工作原理

```
┌─────────────────────────────────┐
│        Docker Container          │
│                                  │
│  Lab 代码 (Anthropic SDK)        │
│  ANTHROPIC_BASE_URL=http://      │
│    host.docker.internal:3001     │
│       /api/llm                   │
│  ANTHROPIC_API_KEY=session-token │  ← 不是真实 Key
│                                  │
└──────────────┬──────────────────┘
               │ HTTP request
               ▼
┌─────────────────────────────────┐
│     Express Server (port 3001)    │
│                                  │
│  /api/llm/* 代理路由             │
│    1. 验证 session-token         │
│    2. 查出 user → 确定用哪个 Key │
│    3. 注入真实 API Key            │
│    4. 转发到 api.anthropic.com   │
│    5. 流式返回响应               │
│    6. 记录用量 → 检查限额        │
│                                  │
└──────────────┬──────────────────┘
               │
               ▼
        Anthropic API
     (或用户指定的 Base URL)
```

**关键点**：
- 容器内的 SDK 只是把 `baseURL` 改成我们的代理地址，其余调用方式完全不变
- 代理需要支持流式响应（SSE），因为 Claude API 使用 `stream: true`
- 代理需要转发所有 Anthropic API 端点（主要是 `/v1/messages`）
- 用户自带 Key 时，代理使用用户的 Key（从数据库解密），但 Key 仍然不进入容器

---

## 具体开发任务

### 任务 1：LLM 代理路由（新文件）

**文件**：`server/src/routes/llm-proxy.ts`

创建一个 Express 路由，拦截发往 `/api/llm/*` 的请求并代理到 Anthropic API。

#### 1.1 路由定义

```typescript
import { Router } from 'express';

export const llmProxyRouter = Router();

// 拦截所有 /api/llm/* 请求
llmProxyRouter.all('/api/llm/*', async (req, res) => {
  // ...
});
```

#### 1.2 认证：验证 session-token

容器通过环境变量 `ANTHROPIC_API_KEY` 发送一个 session-token。这个 token 在容器创建时生成，格式为 `byocc-session:{sessionId}:{random}`。

代理从请求头中提取 `Authorization: Bearer {session-token}`，验证 sessionId 对应的容器是否正在运行。

```typescript
// 验证逻辑
function extractSessionToken(req: Request): string | null {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return null;
  return auth.slice(7);
}

function validateSessionToken(token: string): { sessionId: string; userId: string } | null {
  // 验证 token 格式和有效性
  // 查数据库确认 session 存在且环境在运行
}
```

#### 1.3 Key 解析

验证 session 后，查出 userId，然后调用 `resolveContainerApiConfig(userId)` 获取真实 API Key 和 Base URL。

**重要**：`resolveContainerApiConfig` 中的 `decrypt` 失败需要优雅降级，不能抛错导致 500。改法见任务 4。

#### 1.4 请求转发

将原始请求转发到真实的 Anthropic API：

```typescript
async function proxyRequest(req: Request, res: Response, apiKey: string, baseUrl: string) {
  const targetUrl = `${baseUrl}${req.path.replace('/api/llm', '/v1')}`;

  const headers = {
    'Content-Type': req.headers['content-type'] || 'application/json',
    'x-api-key': apiKey,
    'anthropic-version': req.headers['anthropic-version'] || '2023-06-01',
  };

  const response = await fetch(targetUrl, {
    method: req.method,
    headers,
    body: req.method !== 'GET' ? JSON.stringify(req.body) : undefined,
  });

  // 流式响应
  if (response.headers.get('content-type')?.includes('text/event-stream')) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const reader = response.body?.getReader();
    if (reader) {
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(decoder.decode(value, { stream: true }));
      }
    }
    res.end();
  } else {
    const data = await response.json();
    res.status(response.status).json(data);
  }
}
```

#### 1.5 挂载路由

**文件**：`server/src/index.ts`

在路由挂载区域添加：
```typescript
import { llmProxyRouter } from './routes/llm-proxy.js';
app.use(llmProxyRouter);
```

#### 1.6 用量记录

每次成功代理后，记录用量：

```typescript
// 在代理成功后调用
function recordApiUsage(userId: string, sessionId: string, model: string, inputTokens: number, outputTokens: number): void {
  // 写入 api_usage 表
}
```

---

### 任务 2：API 用量追踪与限流

**文件**：`server/src/db/database.ts`（修改）+ `server/src/services/rate-limit.ts`（修改）

#### 2.1 数据库表

在 `initDatabase()` 中新增：

```sql
CREATE TABLE IF NOT EXISTS api_usage (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  model TEXT,
  input_tokens INTEGER DEFAULT 0,
  output_tokens INTEGER DEFAULT 0,
  key_source TEXT NOT NULL DEFAULT 'default',  -- 'default' 或 'user'
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_api_usage_user_date ON api_usage(user_id, date(created_at));
```

#### 2.2 限流逻辑

对使用平台共享 Key（`key_source='default'`）的用户实行每日限额：

```typescript
// 环境变量
// BYOCC_DEFAULT_KEY_DAILY_LIMIT=500  （每日请求上限，默认 500）
// BYOCC_DEFAULT_KEY_SESSION_LIMIT=100 （单 session 上限，默认 100）

function checkRateLimit(userId: string, sessionId: string, keySource: string): { allowed: boolean; remaining: number } {
  if (keySource === 'user') {
    return { allowed: true, remaining: Infinity };  // BYOK 用户不限
  }

  const dailyLimit = parseInt(process.env.BYOCC_DEFAULT_KEY_DAILY_LIMIT ?? '500', 10);
  const sessionLimit = parseInt(process.env.BYOCC_DEFAULT_KEY_SESSION_LIMIT ?? '100', 10);

  const todayUsage = getTodayUsage(userId);
  const sessionUsage = getSessionUsage(sessionId);

  if (todayUsage >= dailyLimit) {
    return { allowed: false, remaining: 0 };
  }
  if (sessionUsage >= sessionLimit) {
    return { allowed: false, remaining: 0 };
  }

  return { allowed: true, remaining: Math.min(dailyLimit - todayUsage, sessionLimit - sessionUsage) };
}
```

当限流触发时，代理返回 HTTP 429：
```json
{
  "type": "error",
  "error": {
    "type": "rate_limit_error",
    "message": "今日平台共享 Key 额度已用完，请使用自己的 API Key 或明天再试。"
  }
}
```

#### 2.3 新增数据库函数

在 `database.ts` 中新增：
- `recordApiUsage(userId, sessionId, model, inputTokens, outputTokens, keySource)` — 插入一条记录
- `getTodayUsage(userId)` — 返回今日总请求数
- `getSessionUsage(sessionId)` — 返回 session 总请求数
- `getUserDailyRemaining(userId)` — 返回今日剩余额度

---

### 任务 3：容器 ENV 改造

**文件**：`server/src/services/container-manager.ts`

#### 3.1 生成 session-token

容器不再持有真实 API Key，改为持有代理地址 + session-token：

```typescript
function generateSessionToken(sessionId: string): string {
  // 格式：byocc:{sessionId}:{32位随机hex}
  const random = randomBytes(16).toString('hex');
  return `byocc:${sessionId}:${random}`;
}
```

#### 3.2 修改 createContainer

```typescript
// 修改前：
const apiConfig = resolveContainerApiConfig(userId);
const env = [`ANTHROPIC_API_KEY=${apiConfig.apiKey}`, ...];

// 修改后：
const sessionToken = generateSessionToken(sessionId);
// 存储 sessionToken → sessionId 映射，供代理验证
sessionTokenCache.set(sessionToken, { sessionId, userId });

const proxyBaseUrl = getProxyBaseUrl();  // http://host.docker.internal:3001/api/llm
const env = [
  `ANTHROPIC_API_KEY=${sessionToken}`,
  `ANTHROPIC_BASE_URL=${proxyBaseUrl}`,
];
```

`getProxyBaseUrl()` 的值：
- 本地开发：`http://host.docker.internal:3001/api/llm`（Docker 容器通过 host.docker.internal 访问宿主机）
- 公网部署：`http://<server-host>:3001/api/llm`（从环境变量读取）

新增环境变量：`BYOCC_LLM_PROXY_URL`（可选，默认自动检测）

#### 3.3 session-token 缓存

用内存 Map 缓存 token → session 映射：
```typescript
const sessionTokenCache = new Map<string, { sessionId: string; userId?: string }>();
```

#### 3.4 去掉 resolveContainerApiConfig 在 createContainer 中的调用

`resolveContainerApiConfig` 的职责转移到 LLM 代理。`createContainer` 不再需要知道用哪个 Key。

保留 `resolveContainerApiConfig` 函数本身不变，它在代理路由中使用。

---

### 任务 4：解密失败优雅降级

**文件**：`server/src/services/container-manager.ts` 和 `server/src/routes/llm-proxy.ts`

#### 4.1 resolveContainerApiConfig 降级

```typescript
function resolveContainerApiConfig(userId?: string): ContainerApiConfig {
  const defaultConfig = resolveDefaultApiConfig();
  if (!userId) return defaultConfig;

  const settings = getUserSettings(userId);
  if (settings?.apiKeyEncrypted && settings.apiKeySource === 'user') {
    try {
      return {
        apiKey: decrypt(settings.apiKeyEncrypted),
        apiBaseUrl: settings.apiBaseUrl ?? defaultConfig.apiBaseUrl,
      };
    } catch (error) {
      // 解密失败 → 降级到默认 Key，记录警告
      console.warn(
        `[container-manager] Failed to decrypt API key for user ${userId}, falling back to default. Error: ${error instanceof Error ? error.message : String(error)}`
      );
      return defaultConfig;
    }
  }

  return defaultConfig;
}
```

#### 4.2 代理路由中的降级

代理路由调用 `resolveContainerApiConfig` 时，如果 Key 解密失败：
1. 降级到默认 Key
2. 在响应头中添加 `X-BYOCC-Key-Fallback: true`
3. 前端可以检测这个 header，提示用户 "你的自定义 Key 无法解密，已降级到平台共享 Key"

---

### 任务 5：Key 验证端点

**文件**：`server/src/routes/settings.ts`

#### 5.1 新增 POST /api/settings/validate-key

在用户保存 Key 之前，先验证 Key 是否可用：

```typescript
settingsRouter.post('/api/settings/validate-key', async (req, res) => {
  const user = (req as AuthenticatedRequest).user;
  if (user.kind !== 'password') {
    res.status(401).json({ message: 'Please log in.' });
    return;
  }

  const apiKey = readApiKey(req.body);
  const apiBaseUrl = readApiBaseUrl(req.body) ?? getDefaultApiBaseUrl() ?? 'https://api.anthropic.com';

  if (!apiKey) {
    res.status(400).json({ message: 'apiKey is required.' });
    return;
  }

  try {
    // 发一个最小的请求验证 Key
    const response = await fetch(`${apiBaseUrl}/v1/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1,
        messages: [{ role: 'user', content: 'hi' }],
      }),
    });

    if (response.ok || response.status === 400) {
      // 400 可能是 "max_tokens too low" 但说明 Key 是有效的
      res.json({ valid: true });
    } else if (response.status === 401) {
      res.json({ valid: false, message: 'API Key 无效或已过期。' });
    } else if (response.status === 429) {
      // Key 有效但被限流了
      res.json({ valid: true, warning: 'Key 有效但当前被限流，可能影响使用。' });
    } else {
      const body = await response.json().catch(() => ({}));
      res.json({ valid: false, message: body?.error?.message ?? `验证失败 (HTTP ${response.status})` });
    }
  } catch (error) {
    res.json({ valid: false, message: `无法连接到 API 服务：${error instanceof Error ? error.message : 'Unknown error'}` });
  }
});
```

---

### 任务 6：前端 ApiKeyGate 组件（新文件）

**文件**：`platform/src/components/ApiKeyGate.tsx`

这是一个在用户首次进入 Lab 时弹出的 Key 配置弹窗。

#### 6.1 组件接口

```typescript
type ApiKeyGateProps = {
  labId: number;
  children: React.ReactNode;  // Lab 内容
};
```

#### 6.2 组件逻辑

```typescript
export default function ApiKeyGate({ labId, children }: ApiKeyGateProps) {
  const [gateState, setGateState] = useState<'loading' | 'need-setup' | 'ready'>('loading');
  const [settings, setSettings] = useState<ApiKeySettings | null>(null);

  useEffect(() => {
    async function check() {
      try {
        const s = await getApiKeySettings();
        setSettings(s);
        // 用户已有自定义 Key → 直接通过
        if (s.source === 'user' && s.hasKey) {
          setGateState('ready');
          return;
        }
        // 检查用户是否已经选择过"使用平台 Key"
        const choseDefault = localStorage.getItem('byocc-chose-default-key');
        if (choseDefault === 'true') {
          setGateState('ready');
          return;
        }
        // 首次进入 → 需要配置
        setGateState('need-setup');
      } catch {
        // 获取设置失败（可能未登录），放行
        setGateState('ready');
      }
    }
    void check();
  }, []);

  if (gateState === 'loading') {
    return <LoadingSpinner />;
  }

  if (gateState === 'need-setup') {
    return <ApiKeySetupDialog onChoose={handleChoose} settings={settings} />;
  }

  return <>{children}</>;
}
```

#### 6.3 弹窗设计

弹窗应该居中显示，有良好的视觉效果：

```
┌─────────────────────────────────────────────────────────┐
│                                                          │
│            🔑 配置 API Key                               │
│                                                          │
│   开始实验前，你需要配置一个 API Key 来调用 Claude。      │
│                                                          │
│   ┌───────────────────────────────────────────────┐     │
│   │  ○ 使用平台共享 Key（推荐）                    │     │
│   │   平台提供有限的免费额度，适合体验和学习。      │     │
│   │   每日限额：500 次调用                          │     │
│   └───────────────────────────────────────────────┘     │
│                                                          │
│   ┌───────────────────────────────────────────────┐     │
│   │  ● 使用自己的 API Key                          │     │
│   │   输入你的 Anthropic 或兼容服务的 Key。         │     │
│   │                                                │     │
│   │   API Key:  [sk-ant-••••••••••••••••••]  👁    │     │
│   │   Base URL: [https://api.anthropic.com   ▼]   │     │
│   │             预设: Anthropic / 智谱 / 自定义     │     │
│   │                                                │     │
│   │   [验证 Key]  ✅ Key 有效                       │     │
│   └───────────────────────────────────────────────┘     │
│                                                          │
│                        [确认并开始实验]                   │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

**样式要求**：
- `position: fixed; inset: 0;` 全屏遮罩
- `display: flex; align-items: center; justify-content: center;` 完全居中（不是顶部）
- `z-index: 60`（高于 navbar 的 z-50，但不用 z-80 那么夸张）
- 遮罩：`background: rgba(0,0,0,0.6); backdrop-filter: blur(4px);`
- 弹窗最大宽度 `max-width: 540px`，圆角 `border-radius: 1rem`
- 使用 CSS 变量保持与现有主题一致：`var(--bg-panel)`, `var(--border)`, `var(--text-primary)` 等

#### 6.4 Base URL 预设

提供常用服务的预设选项，方便用户选择：

```typescript
const API_PRESETS = [
  { name: 'Anthropic（默认）', url: 'https://api.anthropic.com' },
  { name: '智谱 AI', url: 'https://open.bigmodel.cn/api/anthropic' },
  { name: 'Deepseek', url: 'https://api.deepseek.com' },
  { name: '自定义', url: '' },
];
```

#### 6.5 集成到 Lab 页面

**文件**：`platform/src/app/lab/[id]/page.tsx`

```typescript
// 修改前：
<AuthGuard>
  <LabLayout lab={lab} />
</AuthGuard>

// 修改后：
<AuthGuard>
  <ApiKeyGate labId={lab.id}>
    <LabLayout lab={lab} />
  </ApiKeyGate>
</AuthGuard>
```

---

### 任务 7：修改 SettingsModal

**文件**：`platform/src/components/SettingsModal.tsx`

#### 7.1 修复定位

将 `z-[80]` 改为 `z-[60]`，确保 `items-center` + `justify-center` 生效（检查是否有父元素导致 flex 失效）。

```typescript
// 修改前：
<div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/55 px-4 backdrop-blur-sm">

// 修改后：
<div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm">
```

#### 7.2 增加 Key 验证按钮

在保存前增加一个"验证 Key"按钮：

```typescript
const [validating, setValidating] = useState(false);
const [validationResult, setValidationResult] = useState<{ valid: boolean; message?: string } | null>(null);

const handleValidate = async () => {
  setValidating(true);
  try {
    const result = await validateApiKey(apiKey.trim(), apiBaseUrl.trim() || undefined);
    setValidationResult(result);
  } catch {
    setValidationResult({ valid: false, message: '验证请求失败' });
  } finally {
    setValidating(false);
  }
};
```

在 UI 中：
```tsx
<button onClick={handleValidate} disabled={validating || !apiKey.trim()}>
  {validating ? '验证中...' : '验证 Key'}
</button>
{validationResult && (
  <span style={{ color: validationResult.valid ? 'var(--status-success)' : '#E57373' }}>
    {validationResult.valid ? '✅ Key 有效' : `❌ ${validationResult.message}`}
  </span>
)}
```

#### 7.3 保存前强制验证

修改 `handleSave`：保存前先验证，验证失败则阻止保存并提示。

---

### 任务 8：前端 settings.ts 新增方法

**文件**：`platform/src/lib/settings.ts`

新增：

```typescript
export async function validateApiKey(apiKey: string, apiBaseUrl?: string): Promise<{ valid: boolean; message?: string; warning?: string }> {
  const response = await fetch(apiUrl('/api/settings/validate-key'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ apiKey, apiBaseUrl }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message ?? '验证失败');
  }
  return data;
}

export async function getApiKeyStatus(): Promise<{ source: ApiKeySource; hasKey: boolean; remaining?: number }> {
  const response = await fetch(apiUrl('/api/settings/api-key/status'), {
    credentials: 'include',
  });
  return readJson(response);
}
```

---

### 任务 9：Navbar Key 状态指示

**文件**：`platform/src/components/Navbar.tsx`

在 LabNav 的用户下拉菜单中显示当前 Key 状态：

```tsx
{/* 在 "API Key 设置" 按钮旁边添加状态标签 */}
<div className="flex items-center gap-2">
  <span className="text-xs text-[var(--text-muted)]">
    Key: {keyStatus?.source === 'user' ? '自定义' : '平台共享'}
  </span>
  {keyStatus?.source === 'default' && keyStatus.remaining !== undefined && (
    <span className="text-xs text-[var(--text-muted)]">
      剩余 {keyStatus.remaining} 次
    </span>
  )}
</div>
```

---

### 任务 10：.env 更新

**文件**：`server/.env.example`（修改）+ `server/.env`（修改）

新增环境变量：

```env
# LLM Proxy
BYOCC_LLM_PROXY_URL=                          # 可选，默认自动检测
BYOCC_DEFAULT_KEY_DAILY_LIMIT=500              # 平台 Key 每日请求上限
BYOCC_DEFAULT_KEY_SESSION_LIMIT=100            # 平台 Key 单 session 请求上限
```

---

## 现有代码的重要约束

### 必须保留的行为
1. `ENCRYPTION_KEY` 和 AES-256-GCM 加密机制不变
2. `user_settings` 表结构不变（可以新增字段，不能删改已有字段）
3. 现有的 session/environment/reset API 接口不变
4. anonymous token 兼容路径不变
5. 前端 `authorizedFetch` 和 cookie 认证机制不变
6. 所有现有的 E2E regression 测试必须继续通过

### 代码风格
- TypeScript strict mode，ESM
- 后端：Express router，不使用 class
- 前端：函数式组件 + hooks，不使用 class component
- CSS：使用 CSS 变量 (`var(--xxx)`) 和 Tailwind 的 `className`
- 错误处理：catch 中使用 `console.error` 记录，给用户友好的中文提示
- 注释：中文，简洁

### 数据库
- 使用 better-sqlite3（同步 API）
- 数据库文件：`server/byocc.sqlite`
- 表创建在 `initDatabase()` 函数中

---

## 测试要求

### 单元测试（Vitest）

1. **llm-proxy.test.ts**
   - session-token 验证逻辑
   - 限流检查逻辑
   - 解密失败降级

2. **settings.test.ts（扩展）**
   - Key 验证端点
   - 解密失败时 GET 不返回 500

3. **rate-limit.test.ts（扩展）**
   - 每日限额
   - Session 限额
   - BYOK 用户不限

### 手动验证

1. 启动服务：`cd server && npm run dev`
2. 启动前端：`cd platform && npm run dev`
3. 登录 → 进入 Lab → 确认 ApiKeyGate 弹窗出现
4. 选择"使用平台共享 Key" → 确认 → 进入 Lab → 启动环境
5. 在容器中执行 `echo $ANTHROPIC_API_KEY` → 确认不是真实 Key
6. 在容器中执行代码调用 Claude → 确认通过代理成功
7. 选择"使用自己的 Key" → 输入 Key → 验证 → 保存 → 启动环境 → 调用成功
8. 检查 SettingsModal 是否正确居中显示

### 编译验证

```bash
cd server && npx tsc --noEmit --project tsconfig.json
cd platform && npx tsc --noEmit --project tsconfig.json
cd server && npm run build
cd platform && npm run build
cd server && npm test
```

---

## 实现顺序建议

1. **任务 4**（解密降级）— 最简单且修复现有 bug
2. **任务 2**（用量追踪表）— 数据库基础
3. **任务 3**（容器 ENV 改造）— 改为 session-token
4. **任务 1**（LLM 代理）— 核心新功能
5. **任务 5**（Key 验证端点）— 后端增强
6. **任务 8**（前端 settings.ts）— 前端基础
7. **任务 6**（ApiKeyGate）— 前端核心组件
8. **任务 7**（SettingsModal 修复）— 前端优化
9. **任务 9**（Navbar 指示）— 前端完善
10. **任务 10**（.env 更新）— 配置
