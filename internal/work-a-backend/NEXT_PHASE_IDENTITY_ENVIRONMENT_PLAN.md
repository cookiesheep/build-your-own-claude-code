# 下一阶段规划：身份、环境与学习状态持久化

> 状态：规划稿  
> 日期：2026-04-12  
> 背景：本地 E2E 闭环已跑通，当前需要从“能跑”转向“资源可控、状态可恢复、流程可交接”。

---

## 1. 当前结论

Claude Code 的最新评估里，有两点我认可：

1. **“打开 Lab 页面就创建容器”需要改。**  
   浏览文档和启动实验环境应该分开，否则用户只是浏览页面也会消耗 Docker 资源。

2. **“轻量身份 + 持久化学习状态”不等于完整用户系统。**  
   用户真正需要的是 progress、代码草稿、个性化配置可恢复；登录只是为了给这些状态一个稳定归属。

但我会修正一个实现顺序：

> 不建议下一步直接上完整 GitHub OAuth。  
> 更稳妥的路线是：先拆 session/environment，再做匿名用户身份与持久化模型，最后再接 GitHub OAuth 绑定。

这样能避免一个 PR 同时改：

- 容器生命周期
- 数据库模型
- 登录授权
- 前端状态机
- 代码草稿保存

这对当前团队经验来说风险太高。

---

## 2. 核心概念重新定义

### User

“这个学习者是谁”。

未来 progress、code snapshot、customization 应绑定到 `user_id`。

### Session

“这个浏览器当前的一次访问会话”。

Session 不应该等同于容器，也不应该是 progress 的最终归属。

### Environment / Container

“这个用户当前启动的一台临时实验机”。

容器应该按需创建、可 reset、可 TTL 回收。容器销毁后，用户代码和进度仍应保留在数据库中。

### Workspace / Code Snapshot

“用户在某个 Lab 里写到一半的代码”。

它应该比容器更持久。容器可以删除，但 workspace code 不应该因为容器删除而丢失。

---

## 3. 对 Claude Code 方案的判断

### 同意的部分

- GitHub OAuth 对开发者学习平台是自然选择。
- 容器应该临时化，状态应该进入数据库。
- progress 应绑定 user，而不是长期绑定 session。
- Lab 0 个性化更适合保存配置 JSON，而不是保存 patch 或构建产物。
- session/environment 拆分应优先于登录。

### 需要收敛的部分

Claude Code 建议 PR-2 直接做“匿名用户 + GitHub OAuth + JWT auth”。  
我建议拆成两步：

1. **身份模型基础：匿名 user + 本地 token/JWT + user_id 数据迁移**
2. **GitHub OAuth：把匿名 user 绑定到 github_id**

理由：

- 匿名 user 能先统一数据模型，让 progress/code snapshot 立即从 session 迁移到 user。
- GitHub OAuth 涉及 OAuth App、callback、安全 state、token 存储、前端登录态等，应该独立 review。
- 这样能先解决“代码/进度持久化”的大部分工程结构，再接跨设备登录。

---

## 4. 推荐实施顺序

### PR 1：拆分 session 和 environment

目标：打开 Lab 页面不再立即创建 Docker 容器。

后端改动：

- `server/src/routes/session.ts`
  - 只创建/恢复 session 记录
  - 不再调用 `createContainer`
- 新增 `server/src/routes/environment.ts`
  - `POST /api/environment/start`
  - `GET /api/environment/status`
  - `POST /api/environment/reset`
- `server/src/db/database.ts`
  - sessions 表增加 `environment_status`
  - 或在当前阶段用已有 `container_id + Docker inspect` 推导状态，避免一次迁移太大
- `server/src/index.ts`
  - 注册 environment router

前端改动：

- `platform/src/lib/api.ts`
  - 新增 `startEnvironment`
  - 新增 `getEnvironmentStatus`
  - `resetSession` 改为调用 environment reset 或保留兼容层
- `platform/src/components/LabWorkspace.tsx`
  - 打开页面只拿 session，不创建容器
  - 增加“启动实验环境”按钮
  - 只有 environment running 后才连接 terminal

验收标准：

- 打开 `/lab/3` 不创建 `lab-*` 容器
- 点击“启动实验环境”后才创建容器
- `GET /api/environment/status` 能返回 `not_started / starting / running / expired / error` 中的 MVP 子集
- submit 仍能成功
- terminal 仍能连接

建议分支：

```bash
git switch main
git pull
git switch -c codex/session-environment-split
```

---

### PR 2：匿名 user 身份基础

目标：先建立 user_id 作为 progress/code 的长期归属，不急着接 GitHub OAuth。

后端改动：

- `users` 表
  - `id`
  - `kind`：`anonymous` / `github`
  - `github_id` nullable
  - `nickname` nullable
  - `avatar_url` nullable
  - `created_at`
- `sessions` 表增加 `user_id`
- 新增 auth route：
  - `POST /api/auth/anonymous`
  - `GET /api/me`
- 简单 token：
  - 可以先用 signed token / JWT
  - token 存 localStorage

前端改动：

- 页面启动时：
  - 如果没有 token，调用 `/api/auth/anonymous`
  - 如果有 token，调用 `/api/me`
- `api.ts` 自动带 `Authorization` header

验收标准：

- 新用户打开页面获得匿名 user
- session 绑定 user_id
- 旧的 session-based 流程仍能工作
- 清容器不丢 user 记录

建议分支：

```bash
git switch -c codex/anonymous-user-identity
```

---

### PR 3：代码草稿持久化

目标：用户刷新页面后，Monaco 里的代码不会丢。

后端改动：

- 新增 `code_snapshots` 表：

```sql
CREATE TABLE code_snapshots (
  user_id TEXT NOT NULL,
  lab_number INTEGER NOT NULL,
  code TEXT NOT NULL,
  updated_at TEXT DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, lab_number)
);
```

- 新增 routes：
  - `GET /api/labs/:id/workspace`
  - `PUT /api/labs/:id/workspace`

前端改动：

- Lab 页面加载时先请求 workspace code
- 编辑器变更后 debounce 自动保存
- submit 前也保存一次
- environment/start 时可注入用户保存的最新 code

验收标准：

- 写代码后刷新页面，代码仍在
- 关闭浏览器再打开，同一 token 下代码仍能恢复
- submit 使用最新保存代码

建议分支：

```bash
git switch -c codex/lab-code-snapshots
```

---

### PR 4：GitHub OAuth 绑定

目标：让用户跨浏览器/清缓存后能恢复学习状态。

后端改动：

- GitHub OAuth App 配置
- 新增：
  - `GET /api/auth/github`
  - `GET /api/auth/github/callback`
- callback 后：
  - 用 GitHub profile 查找或创建 user
  - 如果当前是 anonymous user，则把数据迁移/绑定到 github user

前端改动：

- 顶部显示：
  - 匿名用户
  - GitHub 登录按钮
  - 登录后头像/昵称
- 登录成功后刷新 token / user state

验收标准：

- 匿名用户能正常使用
- GitHub 登录后不丢已有 progress/code snapshot
- 清缓存后重新 GitHub 登录能恢复 progress/code snapshot

建议分支：

```bash
git switch -c codex/github-oauth-identity
```

---

### PR 5：容器 TTL 自动回收

目标：容器不再依赖手动 cleanup。

后端改动：

- 复用 `container-cleanup.ts`
- server 启动时注册后台 interval
- 每次环境相关 API 更新 `last_active`
- 超过 TTL 的容器自动删除
- environment status 更新为 expired

前端改动：

- 显示 environment expired
- 提供“重新启动实验环境”按钮

验收标准：

- 可配置 TTL
- dry-run 仍可用
- 活跃容器不被误删
- 过期容器被回收

建议分支：

```bash
git switch -c codex/container-ttl-cleanup
```

---

### PR 6：Lab 0 个性化

状态：暂不做，保留为 Bonus。

原因：

- 这是很好的 demo idea，但它需要改 sister repo 的 `build.mjs` 或运行时代码读取 `.byocc-config.json`
- 它不应阻塞 session/environment、identity、workspace persistence

推荐以后再设计：

- 保存 `user_customizations.config_json`
- 容器启动时注入 `/workspace/.byocc-config.json`
- `build.mjs --lab` 读取配置并应用到 TUI 名称/欢迎语/主题

---

## 5. 关于前后端协作方式

### PR 1 必须前后端同一个分支完成

`session/environment split` 是 API contract 改动。  
如果后端先改完但前端没改，页面就会不可用；如果前端先改完但后端没改，也不可用。

所以 PR 1 建议同一分支、同一 PR 完成：

```bash
codex/session-environment-split
```

### PR 2 / PR 3 也建议同一分支内前后端一起做

身份和代码草稿都涉及 API contract。  
先后端或先前端都可以，但同一个 PR 更容易保证验收闭环。

### 更适合并行的任务

- 文档完善
- Lab 内容
- UI 视觉细节
- 后端 cleanup/observability

这些可以开独立分支。

---

## 6. 是否现在做 GitHub 登录

建议：**不要作为下一步立刻做，但应该作为本周重要任务。**

更稳的顺序：

```text
先 PR 1：拆 session/environment
再 PR 2：匿名 user_id 身份基础
再 PR 3：代码草稿持久化
再 PR 4：GitHub OAuth
```

原因：

- GitHub OAuth 依赖清晰的数据归属模型。
- 现在 session 和 container 还绑得太紧，先拆开更关键。
- 匿名 user_id 能先把数据模型统一起来，OAuth 只是把 anonymous user 绑定到 GitHub 身份。

---

## 7. 一句话推荐

下一步最应该做：

> 拆分 session 和 environment，让“浏览 Lab”不创建容器，“启动实验环境”才创建容器。

理由：

- 这是当前最大资源浪费点。
- 它会让用户流程更清楚。
- 它是 TTL、身份、代码草稿持久化的前置设计。
- 前后端都需要同步改，所以应该作为一个明确 PR 来做。

建议下一分支：

```bash
git switch main
git pull
git switch -c codex/session-environment-split
```
