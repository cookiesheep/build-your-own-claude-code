# 全面 Code Review + 文件读取 API — 开发提示词

> 给新的 Claude Code 会话使用。
> 工作目录：D:\code\build-your-own-claude-code
> 当前分支：从 main 新建 `feat/file-read-api`

---

## 项目背景

**Build Your Own Claude Code (BYOCC)** 是一个基于真实 Claude Code 源码的渐进式教学平台。

### 项目架构

```
platform/          — Next.js 14 前端（App Router + Tailwind CSS）
  src/app/
    page.tsx             — 营销首页（Canvas 粒子动画 + 琥珀金配色）
    platform/page.tsx    — Lab 选择页（6 个 Lab 卡片）
    login/page.tsx       — 登录页（生成式流场动效）
    lab/[id]/page.tsx    — 实验工作台（四区域可调整面板）
  src/components/
    Navbar.tsx           — 导航栏（Landing + Lab 两种模式，含登录状态）
    SettingsModal.tsx    — API Key 设置弹窗
    AuthGuard.tsx        — 认证守卫
    FileTree.tsx         — 文件目录树
    DocsPanel.tsx        — 文档面板
    LabRightArea.tsx     — 编辑器 + 终端区域
    LabLayout.tsx        — Lab 页面布局
    ThemeProvider.tsx    — 明暗模式切换
    HeroParticles.tsx    — 首页粒子动画
    LandingSections.tsx  — 首页各 section
  src/lib/
    api.ts               — 后端 API 客户端
    auth.ts              — 认证状态管理
    settings.ts          — API Key 设置客户端
    labs.ts              — Lab 配置数据
    file-tree-data.ts    — 文件目录树静态数据

server/             — Express + SQLite 后端
  src/
    index.ts             — 服务入口 + 路由注册
    db/database.ts       — SQLite 数据库（users / sessions / progress / user_settings 表）
    routes/
      auth.ts            — 认证路由（login / logout / me）
      session.ts         — 会话管理
      environment.ts     — Docker 容器生命周期
      submit.ts          — 代码提交 + 构建
      settings.ts        — API Key 设置
      terminal.ts        — WebSocket 终端代理
    services/
      container-manager.ts  — Docker 容器管理（创建/注入/构建/销毁）
      encryption.ts         — AES-256-CBC 加解密
      auth-token.ts         — 匿名 token 管理
      session-cookie.ts     — JWT cookie 会话管理
      ws-proxy.ts           — WebSocket 代理
    middleware/
      auth.ts              — 认证中间件（requireAuth / optionalAuth）
    scripts/
      create-user.ts       — CLI 创建用户工具
```

### 技术栈

- 前端：Next.js 14（App Router）+ Tailwind CSS + Monaco Editor + xterm.js
- 后端：Express + better-sqlite3 + dockerode + bcryptjs + jsonwebtoken
- 容器：Docker + ttyd（每个用户一个隔离容器）
- 部署：Cloudflare Tunnel（byocc.cc）

### 核心用户流程

```
1. 访问 / 首页 → 点击"进入平台"
2. /platform 选择 Lab → 检测登录 → 未登录跳转 /login
3. /login 输入用户名密码 → cookie 认证
4. /lab/:id 实验工作台
   - 左侧：文件目录树 + 文档
   - 右侧：Monaco 编辑器 + 终端
5. 点击"启动环境" → 后端创建 Docker 容器（注入 API Key ENV）
6. 编辑代码 → 点击"提交" → 注入容器 → 构建
7. 终端运行 node cli.js → 看到真实 Claude Code TUI
```

### 最近完成的两个复杂系统

**1. 认证系统（已合并 main）**
- 用户名/密码登录，管理员 CLI 创建账号
- JWT httpOnly cookie 会话管理
- bcrypt 密码哈希 + 时序安全比较
- /platform 和 / 首页可匿名浏览，/lab/:id 需登录
- 匿名 token 保留兼容，可通过 BYOCC_ANONYMOUS_AUTH_ENABLED=false 关闭

**2. API Key 管理（当前 feat/api-key-management 分支）** 也已经合并进main
- 用户自定义 API Key + Base URL（AES-256-CBC 加密存储）
- 平台默认 Key（环境变量 DEFAULT_API_KEY）作为回退
- 容器创建时注入 ANTHROPIC_API_KEY + ANTHROPIC_BASE_URL ENV
- 前端 SettingsModal 设置弹窗

### 环境变量

```
server/.env 包含：
  BYOCC_AUTH_SECRET          — HMAC 签名密钥
  SERVER_SESSION_SECRET      — JWT 签名密钥
  ENCRYPTION_KEY             — API Key 加密密钥（64 hex 字符）
  DEFAULT_API_KEY            — 平台默认 API Key
  DEFAULT_API_BASE_URL       — 平台默认 API Base URL
  BYOCC_ANONYMOUS_AUTH_ENABLED — 是否允许匿名访问
  HOST / PORT                — 服务器绑定
  CORS_ORIGINS               — 允许的前端域名
```

---

## 本次任务（分两阶段）

### 阶段 1：全面 Code Review

**先读以下文件，理解项目全貌，然后做 review：**

必须读的文件（按顺序）：
```
1. CLAUDE.md                              — 项目概述
2. server/src/index.ts                    — 后端入口，看路由注册
3. server/src/routes/auth.ts              — 认证路由
4. server/src/middleware/auth.ts           — 认证中间件
5. server/src/services/encryption.ts      — 加密服务
6. server/src/routes/settings.ts          — API Key 设置路由
7. server/src/services/container-manager.ts — 容器管理
8. server/src/db/database.ts              — 数据库
9. platform/src/lib/api.ts                — 前端 API 客户端
10. platform/src/lib/auth.ts              — 前端认证
11. platform/src/lib/settings.ts          — 前端设置
12. platform/src/components/Navbar.tsx    — 导航栏（含登录状态）
13. platform/src/components/SettingsModal.tsx — 设置弹窗
14. platform/src/app/lab/[id]/page.tsx    — Lab 页面
```

**Review 重点关注：**

| 类别 | 检查项 |
|------|--------|
| **安全** | SQL 注入、XSS、CSRF、密码处理、JWT 安全、cookie 属性、timing attack |
| **一致性** | 前后端 API 契约是否对齐（接口路径、请求/响应格式、错误码） |
| **错误处理** | 加密失败、容器启动失败、网络超时的处理是否优雅 |
| **代码质量** | 死代码、未使用的 import、类型安全、重复逻辑 |
| **localhost 策略** | api.ts / auth.ts / settings.ts 的 localhost 检测逻辑是否一致 |
| **环境变量** | 是否所有必需的 env var 都有校验和默认值 |
| **前端状态** | 登录状态在路由切换时是否可靠更新 |

**Review 输出格式：**

```
[CRITICAL] 问题简述
  文件：xxx.ts:行号
  说明：...
  建议：...

[HIGH] 问题简述
  ...

[MEDIUM] 问题简述
  ...

[POSITIVE] 做得好的地方
  ...
```

**Review 后的修复：**
- CRITICAL 和 HIGH 级别问题必须在本会话中修复
- MEDIUM 级别问题尽量修复
- 修复后运行验证：
  ```bash
  npx tsc --noEmit --project server/tsconfig.json
  npx tsc --noEmit --project platform/tsconfig.json
  cd server && npm run build
  cd platform && npm run build
  ```

### 阶段 2：文件读取 API

Review 修复完成后，实现 `GET /api/files/:path` 接口。

**需求**：
- 前端文件目录树中，用户点击 🔒（只读）文件时，需要从容器内读取文件内容
- 需要容器处于 running 状态

**后端实现**：

新建 `server/src/routes/files.ts`：

```
GET /api/files/:path?sessionId=xxx

功能：
1. requireAuth 中间件保护
2. 校验 path 参数（只允许 /workspace/ 下的文件，防止路径穿越）
3. 校验 session ownership（该 session 属于当前用户）
4. 查找容器 → docker exec cat /workspace/:path
5. 返回 { path: string, content: string, language: string }

安全校验：
  - path 不能包含 ..（路径穿越）
  - path 只能匹配 ^[a-zA-Z0-9_/.-]+$
  - path 不能以 / 开头（相对路径）
  - 文件大小限制（超过 100KB 返回 413）

language 推断：
  - .ts → typescript
  - .js → javascript
  - .json → json
  - .mjs → javascript
  - 其他 → plaintext
```

修改 `server/src/index.ts` 注册 files 路由。

**前端对接**：

修改 `platform/src/components/LabRightArea.tsx` 或相关组件：
- 文件目录树中点击只读文件时，调用 GET /api/files/:path
- Monaco 编辑器以只读模式显示文件内容

**验证**：
```bash
# 先启动环境
curl "http://127.0.0.1:3001/api/files/src/cli.ts?sessionId=xxx" \
  -b "byocc_session=JWT"
# → 返回文件内容

# 路径穿越测试
curl "http://127.0.0.1:3001/api/files/../../../etc/passwd?sessionId=xxx" \
  -b "byocc_session=JWT"
# → 返回 400
```

---

## 不动的文件

```
不要修改：
  platform/src/components/HeroParticles.tsx
  platform/src/components/ThemeProvider.tsx
  platform/src/components/LandingSections.tsx
  platform/src/app/page.tsx              （营销首页）
  platform/src/app/globals.css           （可以新增样式，不要改现有变量）
  platform/src/app/login/page.tsx        （登录页已由前端同学完成）
  server/src/routes/terminal.ts          （WebSocket 终端代理）
```

---

## 验证命令

```bash
# 阶段 1 验证
npx tsc --noEmit --project server/tsconfig.json
npx tsc --noEmit --project platform/tsconfig.json
cd server && npm run build && npm test
cd platform && npm run build

# 阶段 2 验证（需要后端运行 + 容器运行）
# 文件读取 API smoke test
# 前端只读文件点击测试
```

---

## 完成标准

```
1. Code review 完成，CRITICAL/HIGH 问题已修复
2. GET /api/files/:path 接口实现
3. 路径穿越防护测试通过
4. 前端可以查看容器内只读文件
5. npm run build 前后端无报错
6. 不破坏已有功能（认证、API Key 管理、终端连接）
```
