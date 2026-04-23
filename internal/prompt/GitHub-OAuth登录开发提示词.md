# Codex 开发任务：GitHub OAuth 登录

## 项目背景

BYOCC (Build Your Own Claude Code) 教学平台，学习者通过浏览器编辑代码、在 Docker 容器中构建运行。

当前认证系统有两种用户：
- **anonymous**：自动创建，token 24h 过期，换浏览器丢失进度
- **password**：管理员手动建数据库，有登录页，cookie 7 天有效

需要新增 **GitHub OAuth** 作为第三种登录方式。

## 必须阅读的文件

开始前先完整阅读这些文件，理解当前架构：

```
后端：
  server/src/routes/auth.ts            — 认证路由（anonymous + password login）
  server/src/services/auth-token.ts     — 轻量 token（anonymous 用户用）
  server/src/services/session-cookie.ts — JWT session cookie（password 用户用）
  server/src/middleware/auth.ts         — 认证中间件（getOptionalAuthUser）
  server/src/db/database.ts             — users 表、getUser、createPasswordUser
  server/src/index.ts                   — 路由挂载

前端：
  platform/src/lib/auth.ts             — 登录/登出/checkAuth
  platform/src/app/login/page.tsx      — 登录页面
  platform/src/components/AuthGuard.tsx — 路由守卫
```

## 当前认证架构详解

### 后端三件套

```
1. auth-token.ts — 给 anonymous 用户的轻量 token
   格式：base64url({userId, kind:"anonymous", issuedAt}).hmac签名
   用途：前端 localStorage 存着，每次请求带 Authorization: Bearer {token}
   验证：verifyUserToken() 只接受 kind === 'anonymous' 的 token

2. session-cookie.ts — 给 password 用户的 JWT session
   格式：标准 JWT，存在 httpOnly cookie 'byocc_session'
   payload：{sub: userId, username, role}
   用途：浏览器自动带 cookie，服务端 jwt.verify() 解析
   验证：getSessionUserFromRequest() 只接受 kind === 'password' 的用户

3. middleware/auth.ts — 统一认证入口
   getOptionalAuthUser(req):
     先查 session cookie → 找到 password 用户 → 返回
     再查 Bearer token → 找到 anonymous 用户 → 返回
     都没有 → 返回 null
```

### 数据库 users 表

```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,           -- UUID
  kind TEXT NOT NULL DEFAULT 'anonymous',  -- 'anonymous' | 'password' | 'github'
  github_id TEXT UNIQUE,         -- GitHub 用户 ID（目前未使用）
  username TEXT,
  password_hash TEXT,
  role TEXT DEFAULT 'user',      -- 'user' | 'admin'
  nickname TEXT,
  avatar_url TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
```

**注意**：`kind` 字段已经有 `'github'` 值，`github_id` 字段已存在。数据库 schema 不需要改。

### 前端认证流

```
checkAuth() → GET /api/auth/me → 返回 { authenticated, user }
login()     → POST /api/auth/login → set cookie → 返回 { success, user }
logout()    → POST /api/auth/logout → clear cookie
```

前端 auth.ts 的 User 类型：
```typescript
export interface User {
  id: string;
  username: string;   // 显示名称
  role: string;       // 'user' | 'admin'
}
```

---

## GitHub OAuth 完整流程

### 什么是 OAuth

```
用户点"GitHub 登录"
  → 跳到 github.com/login/oauth/authorize?client_id=xxx
  → 用户在 GitHub 授权
  → GitHub 回调你的后端 /api/auth/github/callback?code=xxx
  → 后端用 code 换 access_token
  → 后端用 access_token 调 GitHub API 拿用户信息
  → 后端创建/查找本地用户 → 设置 session cookie → 跳回前端
```

### 需要的前置准备

1. 在 GitHub 创建 OAuth App：
   - Settings → Developer settings → OAuth Apps → New OAuth App
   - Application name: BYOCC
   - Homepage URL: `https://你的域名`
   - Authorization callback URL: `https://你的域名/api/auth/github/callback`
   - 拿到 Client ID 和 Client Secret

2. 环境变量：
   ```
   GITHUB_CLIENT_ID=你的client_id
   GITHUB_CLIENT_SECRET=你的client_secret
   GITHUB_OAUTH_CALLBACK_URL=https://你的域名/api/auth/github/callback
   ```

---

## 具体开发任务

### 任务 1：后端 — GitHub OAuth 服务

**新建文件**：`server/src/services/github-oauth.ts`

```typescript
/**
 * GitHub OAuth 服务
 *
 * 职责：
 * 1. 生成 GitHub 授权 URL（前端跳转用）
 * 2. 用授权码换 access_token
 * 3. 用 access_token 获取 GitHub 用户信息
 */

const GITHUB_AUTHORIZE_URL = 'https://github.com/login/oauth/authorize';
const GITHUB_TOKEN_URL = 'https://github.com/login/oauth/access_token';
const GITHUB_API_USER_URL = 'https://api.github.com/user';

type GitHubUser = {
  id: number;          // GitHub 的数字 ID
  login: string;       // 用户名
  avatar_url: string;  // 头像 URL
  name: string | null; // 显示名
};

type GitHubTokenResponse = {
  access_token: string;
  token_type: string;
  scope: string;
};

export function getGitHubAuthorizeUrl(state: string): string {
  const clientId = process.env.GITHUB_CLIENT_ID;
  if (!clientId) {
    throw new Error('GITHUB_CLIENT_ID is not configured.');
  }

  const callbackUrl = process.env.GITHUB_OAUTH_CALLBACK_URL
    ?? `${process.env.HOST ?? '127.0.0.1'}:${process.env.PORT ?? '3001'}/api/auth/github/callback`;

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: callbackUrl,
    scope: 'read:user,user:email',
    state,
  });

  return `${GITHUB_AUTHORIZE_URL}?${params.toString()}`;
}

export async function exchangeCodeForToken(code: string): Promise<string> {
  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error('GitHub OAuth credentials are not configured.');
  }

  const response = await fetch(GITHUB_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
    }),
  });

  const data = await response.json() as GitHubTokenResponse;
  if (!data.access_token) {
    throw new Error('GitHub OAuth: failed to exchange code for token.');
  }

  return data.access_token;
}

export async function fetchGitHubUser(accessToken: string): Promise<GitHubUser> {
  const response = await fetch(GITHUB_API_USER_URL, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/vnd.github.v3+json',
    },
  });

  if (!response.ok) {
    throw new Error(`GitHub API error: ${response.status}`);
  }

  return response.json() as Promise<GitHubUser>;
}
```

### 任务 2：后端 — GitHub OAuth 路由

**修改文件**：`server/src/routes/auth.ts`

新增 3 个端点：

```typescript
// ============================================
// GET /api/auth/github — 生成授权 URL，前端跳转
// ============================================
authRouter.get('/api/auth/github', (_req, res) => {
  // state 参数防 CSRF，用随机字符串
  const state = randomBytes(16).toString('hex');
  // 临时存 state 到 cookie，回调时验证
  res.cookie('github_oauth_state', state, {
    httpOnly: true,
    secure: shouldUseSecureCookie(),
    sameSite: 'strict',
    maxAge: 10 * 60 * 1000, // 10 分钟
    path: '/',
  });
  const authorizeUrl = getGitHubAuthorizeUrl(state);
  res.redirect(authorizeUrl);
});

// ============================================
// GET /api/auth/github/callback — GitHub 回调
// ============================================
authRouter.get('/api/auth/github/callback', async (req, res) => {
  const { code, state } = req.query as { code?: string; state?: string };
  const savedState = readCookie(req, 'github_oauth_state');

  // 验证 state 防 CSRF
  if (!code || !state || state !== savedState) {
    // 回调失败，重定向到登录页并带错误信息
    res.redirect('/login?error=github_auth_failed');
    return;
  }

  // 清理 state cookie
  res.clearCookie('github_oauth_state', {
    httpOnly: true,
    secure: shouldUseSecureCookie(),
    sameSite: 'strict',
    path: '/',
  });

  try {
    // 1. code → access_token
    const accessToken = await exchangeCodeForToken(code);

    // 2. access_token → GitHub 用户信息
    const githubUser = await fetchGitHubUser(accessToken);

    // 3. 查找或创建本地用户
    const user = findOrCreateGitHubUser({
      githubId: String(githubUser.id),
      username: githubUser.login,
      nickname: githubUser.name ?? githubUser.login,
      avatarUrl: githubUser.avatar_url,
    });

    // 4. 设置 session cookie（跟 password 登录一样的机制）
    const sessionUser = toSessionUser(user);
    if (!sessionUser) {
      res.redirect('/login?error=user_creation_failed');
      return;
    }
    setSessionCookie(res, createSessionToken(sessionUser));

    // 5. 重定向回前端
    res.redirect('/platform');
  } catch (error) {
    console.error('[auth/github] OAuth callback failed:', error);
    res.redirect('/login?error=github_auth_failed');
  }
});
```

**关键设计决策**：

- GitHub 用户登录后，使用和 password 用户一样的 **JWT session cookie** 机制
- `toSessionUser()` 和 `setSessionCookie()` 已有，直接复用
- `getOptionalAuthUser()` 自动识别 session cookie，所以 GitHub 登录后所有现有 API 都能用
- 不需要新的 token 类型

### 任务 3：后端 — 数据库函数

**修改文件**：`server/src/db/database.ts`

新增函数：

```typescript
/**
 * 根据 GitHub ID 查找用户
 */
export function getUserByGitHubId(githubId: string): UserRecord | null {
  const stmt = db.prepare('SELECT * FROM users WHERE github_id = ?');
  const row = stmt.get(githubId) as UserRow | undefined;
  return row ? mapUser(row) : null;
}

/**
 * 查找或创建 GitHub 用户
 *
 * 如果 github_id 已存在 → 返回已有用户（更新昵称和头像）
 * 如果不存在 → 创建新用户
 */
export function findOrCreateGitHubUser(input: {
  githubId: string;
  username: string;
  nickname: string;
  avatarUrl: string;
}): UserRecord {
  const existing = getUserByGitHubId(input.githubId);
  if (existing) {
    // 更新昵称和头像（GitHub 用户可能改了）
    db.prepare(`
      UPDATE users
      SET nickname = ?, avatar_url = ?, username = ?
      WHERE id = ?
    `).run(input.nickname, input.avatarUrl, input.username, existing.id);
    return getUser(existing.id)!;
  }

  // 创建新用户
  const userId = randomUUID();
  db.prepare(`
    INSERT INTO users (id, kind, github_id, username, role, nickname, avatar_url)
    VALUES (?, 'github', ?, ?, 'user', ?, ?)
  `).run(userId, input.githubId, input.username, input.nickname, input.avatarUrl);

  return getUser(userId)!;
}
```

**注意**：`randomUUID` 已在其他测试文件中使用，确保 import。

### 任务 4：后端 — session-cookie.ts 适配

**修改文件**：`server/src/services/session-cookie.ts`

当前 `toSessionUser()` 要求用户有 `username` 和 `role`：

```typescript
export function toSessionUser(user: UserRecord): SessionUser | null {
  if (!user.username || !user.role) {
    return null;  // GitHub 用户没有 username 会返回 null！
  }
  return { id: user.id, username: user.username, role: user.role };
}
```

GitHub 用户有 `username`（存的是 GitHub login），所以这里不需要改。但 `getSessionUserFromRequest()` 需要改：

```typescript
export function getSessionUserFromRequest(req: Request): UserRecord | null {
  const token = readCookie(req, SESSION_COOKIE_NAME);
  if (!token) return null;

  try {
    const payload = jwt.verify(token, SESSION_SECRET) as jwt.JwtPayload & SessionPayload;
    if (!payload.sub) return null;
    const user = getUser(payload.sub);
    // 之前只允许 password 用户用 session cookie
    // 现在允许 password 和 github 用户
    return user?.kind === 'password' || user?.kind === 'github' ? user : null;
  } catch {
    return null;
  }
}
```

**核心改动**：`user?.kind === 'password'` → `user?.kind === 'password' || user?.kind === 'github'`

这一行改动让 GitHub 用户也能通过 session cookie 认证。

### 任务 5：后端 — .env 新增

**修改文件**：`server/.env` 和 `.env.example`

```env
# GitHub OAuth
GITHUB_CLIENT_ID=你的client_id
GITHUB_CLIENT_SECRET=你的client_secret
GITHUB_OAUTH_CALLBACK_URL=http://127.0.0.1:3001/api/auth/github/callback
```

### 任务 6：前端 — auth.ts 新增 GitHub 登录

**修改文件**：`platform/src/lib/auth.ts`

```typescript
/**
 * 发起 GitHub OAuth 登录
 * 直接跳转到后端 /api/auth/github，后端会重定向到 GitHub
 */
export function loginWithGitHub(): void {
  const apiBase = shouldUseSameOriginApi() ? '' : API_BASE;
  window.location.href = `${apiBase}/api/auth/github`;
}
```

就这么简单。不需要 fetch，直接浏览器跳转。

### 任务 7：前端 — 登录页添加 GitHub 登录按钮

**修改文件**：`platform/src/app/login/page.tsx`

在登录表单的提交按钮下方，添加 GitHub 登录按钮：

```tsx
import { login as loginApi, loginWithGitHub } from "@/lib/auth";

// 在提交按钮后面（大约第 313 行 </button> 之后），加入：

{/* 分隔线 */}
<div className="relative my-5">
  <div className="absolute inset-0 flex items-center">
    <div className="w-full border-t border-[var(--border)]" />
  </div>
  <div className="relative flex justify-center text-xs">
    <span className="bg-[var(--bg-panel)] px-3 text-[var(--text-muted)]">或</span>
  </div>
</div>

{/* GitHub 登录按钮 */}
<button
  type="button"
  onClick={loginWithGitHub}
  className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-hover)]"
>
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
  </svg>
  <span>使用 GitHub 登录</span>
</button>
```

### 任务 8：前端 — 处理回调错误

**修改文件**：`platform/src/app/login/page.tsx`

登录页需要处理 GitHub OAuth 回调带来的错误：

```typescript
// 在 LoginContent 组件顶部：
const errorParam = searchParams.get("error");
// 在表单错误显示区域，优先显示 URL 参数中的错误：
{errorParam === "github_auth_failed" && (
  <div className="mb-4 rounded-lg border border-[#E57373]/30 bg-[#E57373]/10 px-4 py-2.5 text-sm text-[#E57373]">
    GitHub 登录失败，请重试或使用用户名密码登录。
  </div>
)}
```

### 任务 9：前端 — Navbar 显示 GitHub 用户信息

**修改文件**：`platform/src/components/Navbar.tsx`

当前 Navbar 下拉菜单显示 `user.username`。GitHub 用户也有 username（GitHub login），所以这里不需要改。

但可以加一个小标识区分登录方式。在 `Key: 自定义/平台共享` 那一行附近，可选显示头像：

```tsx
{user && (
  <button ...>
    {user.avatarUrl ? (
      <img src={user.avatarUrl} alt="" className="h-5 w-5 rounded-full" />
    ) : (
      <span className="h-2 w-2 rounded-full bg-[var(--status-success)]" />
    )}
    <span>{user.username}</span>
  </button>
)}
```

但这需要后端 `/api/auth/me` 返回 `avatarUrl`。目前 `publicUser()` 只返回 `{id, username, role}`。

**决策**：这是可选优化，不在本次开发范围内。先不做。

---

## 文件变更清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `server/src/services/github-oauth.ts` | **新建** | GitHub OAuth 服务 |
| `server/src/routes/auth.ts` | 修改 | 新增 2 个路由（跳转 + 回调） |
| `server/src/db/database.ts` | 修改 | 新增 2 个函数 |
| `server/src/services/session-cookie.ts` | 修改 | 1 行改动（允许 github kind） |
| `server/.env` | 修改 | 新增 3 个环境变量 |
| `.env.example` | 修改 | 同上 |
| `platform/src/lib/auth.ts` | 修改 | 新增 `loginWithGitHub()` |
| `platform/src/app/login/page.tsx` | 修改 | 添加 GitHub 登录按钮 + 错误处理 |

**总共**：1 个新文件 + 7 个修改文件。

---

## 不需要改的部分（已验证）

- `middleware/auth.ts` — `getOptionalAuthUser()` 已经通过 session cookie 自动识别 GitHub 用户（因为 `getSessionUserFromRequest` 改了 kind 检查后，返回的 UserRecord 会带 `kind: 'github'`，而 `getOptionalAuthUser` 不区分 kind）
- `routes/settings.ts` — `user.kind !== 'password'` 检查。GitHub 用户不是 password kind，所以不能管理 API Key。**需要决定**：GitHub 用户是否允许管理 API Key？如果是，改为 `user.kind !== 'password' && user.kind !== 'github'`。如果不是，保持不变。
- `routes/environment.ts` — `createContainer(sessionId, access.user.id)` 只需要 userId，不区分 kind，不用改
- `routes/session.ts` — 创建 session 只需要 userId，不用改
- `routes/progress.ts` — 进度追踪只需要 userId，不用改
- 所有前端组件（FileTree、CodeEditor、ApiKeyGate 等）— 只认 userId，不用改

## 实现顺序

1. 任务 3（数据库函数）— 基础
2. 任务 1（GitHub OAuth 服务）— 核心
3. 任务 4（session-cookie 适配）— 1 行改动
5. 任务 2（GitHub OAuth 路由）— 组合上面三者
6. 任务 5（环境变量）— 配置
7. 任务 6（前端 auth.ts）— 1 个函数
8. 任务 7（登录页 GitHub 按钮）— UI
9. 任务 8（错误处理）— UI

## 验证

### 本地测试步骤

1. 去 GitHub 创建 OAuth App（Settings → Developer settings → OAuth Apps → New）
   - Homepage URL: `http://127.0.0.1:3000`
   - Callback URL: `http://127.0.0.1:3001/api/auth/github/callback`
2. 把 Client ID 和 Client Secret 写入 `server/.env`
3. 启动后端 `cd server && npm run dev`
4. 启动前端 `cd platform && npm run dev`
5. 访问 `http://localhost:3000/login`
6. 点击"使用 GitHub 登录" → 跳转 GitHub → 授权 → 回调 → 跳回 /platform
7. 检查 Navbar 显示 GitHub 用户名
8. 检查数据库 `SELECT * FROM users WHERE kind='github'`

### 编译检查

```bash
cd server && npx tsc --noEmit --project tsconfig.json
cd server && npm run build
cd platform && npx tsc --noEmit --project tsconfig.json
cd platform && npm run build
```

## 安全注意事项

1. **state 参数防 CSRF** — 回调时必须验证 state 和 cookie 里的值一致
2. **Client Secret 绝不暴露给前端** — 只在后端使用
3. **GitHub access_token 不要存数据库** — 每次登录重新授权即可，我们不需要长期调 GitHub API
4. **回调 URL 必须严格匹配** — GitHub OAuth App 设置的 callback URL 和代码中的一致
5. **httpOnly cookie** — session cookie 已经是 httpOnly，前端拿不到
