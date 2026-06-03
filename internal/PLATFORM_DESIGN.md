# 教学平台设计文档

> 本文档记录了教学平台形式的决策过程、技术方案和实现路线。
> 状态：P0，新会话 AI 必须读此文档后才能开始任何开发。

---

## 一、问题与决策

### 旧方案的根本缺陷

之前规划的 Monaco Editor + 浏览器内 eval 方案：

```
学习者写代码 → 浏览器 eval → 测试 pass/fail → 模拟动画
```

**根本问题**：学习者看到的是"模拟出来的 agent 行为动画"，而不是真实的 Claude Code TUI 在响应。

本项目最核心的价值主张是：**"完成 Lab 3 后，你能看到真实的 Claude Code TUI 由你写的代码驱动"**。Monaco + 浏览器 eval 无法实现这个承诺。

### 新方案：Web Terminal + Docker（pwn.college 模式）

```
学习者在 Monaco 写代码
    → 点「提交」
    → 后端注入代码到容器
    → 触发 node build.mjs --lab 3
    → 学习者在浏览器终端输入 node cli.js
    → 看到真实 Claude Code TUI 启动！
    → 和它对话，看到 Agent 多轮调用工具
```

这是唯一能实现"真实反馈"的方案。

### 为什么这也满足课程要求

软件工程课程大作业需要的完整工程实践：

| 层次 | 内容 |
|------|------|
| 前端 | Next.js / React，Lab 页面 + Monaco 编辑器 + xterm.js 终端 |
| 后端 API | Node.js Express，容器生命周期管理 + 代码注入 + 进度追踪 |
| 数据库 | SQLite / PostgreSQL，用户进度、会话状态 |
| 基础设施 | Docker 容器隔离，每个学习者一个独立环境 |
| 安全 | 签名 URL 路由、容器网络隔离、资源限制 |

这是一个完整的全栈 + 基础设施项目，不是静态网页。

---

## 二、参考：pwn.college 的实现方式

（来自 GPT 对 pwn.college dojo 开源仓库的调研，2026-04）

### 核心架构五层

```
第 1 层：课程平台
  CTFd + dojo 插件 → 题目/挑战/计分/用户系统

第 2 层：学习者隔离环境
  每个用户一个独立 Docker 容器
  home 目录持久化

第 3 层：容器内服务
  Terminal: ttyd（端口 7681）
  Editor:   code-server（端口 8080）
  Desktop:  TigerVNC + noVNC（端口 6080）

第 4 层：反向代理与权限
  nginx 按签名 URL 路由到对应容器端口
  WebSocket upgrade 支持

第 5 层：浏览器端 UI
  Terminal 标签 → 连接容器内 ttyd
  Code 标签     → 连接容器内 code-server
  Desktop 标签  → 连接容器内 noVNC
```

### 关键源码位置

```
workspace/services/terminal.nix       # ttyd 启动配置
workspace/services/code.nix           # code-server 配置
nginx-workspace/templates/workspace.conf.template  # 代理路由
```

### 核心技术组件

| 组件 | 用途 | 项目地址 |
|------|------|---------|
| ttyd | 把 shell 暴露为 WebSocket 服务 | github.com/tsl0922/ttyd |
| xterm.js | 浏览器端终端 UI 组件 | github.com/xtermjs/xterm.js |
| code-server | VS Code in browser | github.com/coder/code-server |
| dockerode | Node.js Docker 管理 | npm dockerode |

---

## 三、我们的实现方案（适配课程团队规模）

pwn.college 是全球教育平台，我们是 5 人课程项目。我们不需要 1000 并发用户，只需要：
- 课程答辩演示（3-5 人同时使用）
- 团队开发测试
- 可选的少量外部体验者

### 页面结构（2026-04-16 更新）

网站分为三层页面：

```
/                     → 营销首页（展示项目、团队、资源）
  ├── /docs           → 文档站（MkDocs，已部署 GitHub Pages）
  ├── /platform       → Lab 选择页（6 个 Lab 卡片）
  │   └── /lab/:id    → 实验工作台
  ├── /team           → 团队介绍
  └── /resources      → 相关资源
```

- `/` 营销首页参考 yatcc-ai.com 设计：项目亮点 + CTA 按钮 + 团队 + 资源
- `/platform` 是原首页内容搬迁，作为"进入平台"后的 Lab 选择页
- 点击「🚀 进入平台」从 `/` 跳转到 `/platform`

### 实验工作台布局（2026-04-16 更新）

Lab 页面从固定双栏改为四区域可调整布局，参考 VS Code + LeetCode：

```
┌──────────────────────────────────────────────────────────────┐
│ Navbar                                                        │
├────────┬─────────────────────────────────────────────────────┤
│        │  ┌─ 代码编辑器 ──────────────────────────────────┐ │
│ 文件树  │  │  Monaco Editor                                │ │
│ (可折叠) │  │                                                │ │
│  ▸ src/ │  └────────────────────────────────────────────────┘ │
│   ▸ ... │  ──── 拖拽分割线（可调高度）────                     │
│        │  ┌─ 终端 ────────────────────────────────────────┐ │
│ ────── │  │  xterm.js                                     │ │
│        │  │  $ node cli.js ← TUI!                          │ │
│ 文档区  │  └────────────────────────────────────────────────┘ │
│ (可折叠) │                                                    │
│  📖 Lab  │                                                    │
│  核心要点 │                                                    │
└────────┴─────────────────────────────────────────────────────┘
```

关键交互：
- 文件树和文档区可各自折叠（点按钮收起/展开）
- 编辑器和终端之间可拖拽调整高度
- 文件树折叠后文档区占左侧全部宽度
- 文档区折叠后编辑器和终端占全部宽度
- 技术：`react-resizable-panels`

文件目录树设计（MVP）：
- 预生成静态 `file-tree.json`（claude-code-diy 源码结构固定）
- 每个 Lab 配置 `editableFiles`，其他文件显示 🔒 只读
- 当前 Lab 目标文件高亮 + 闪烁引导
- 点击只读文件 → Monaco 以只读模式显示（需要容器运行，通过 `GET /api/files/:path` 读取）
- 点击目标文件 → 加载 workspace snapshot 或默认骨架

### 后端架构（已实现，12 个 PR 已合并）

后端 API 完整列表：
- `POST /api/auth/anonymous` — 匿名身份创建
- `GET /api/me` — 当前用户信息
- `POST /api/session` — 创建会话（不创建容器）
- `POST /api/environment/start` — 启动 Docker 容器
- `GET /api/environment/status` — 容器状态查询
- `POST /api/environment/reset` — 重置容器
- `POST /api/submit` — 注入代码 + 触发构建
- `GET /api/progress` — Lab 进度
- `GET /api/labs/:id/workspace` — 读取代码草稿
- `PUT /api/labs/:id/workspace` — 保存代码草稿
- `WS /api/terminal/:sessionId?token=` — 终端代理

安全特性：HMAC token auth、session ownership 校验、terminal 短期 token、CORS 白名单、容器 TTL 自动回收。

详细后端状态见 `internal/work-a-backend/` 目录。
              ↕ Docker API
┌─────────────────────────────────────────────────────────────────┐
│                  Docker 容器（每个学习者一个）                     │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Base Image: node:18 + claude-code-diy（预克隆）         │   │
│  │                                                          │   │
│  │  /workspace/                                            │   │
│  │    ├── src/query-lab.ts  ← 学习者代码注入到这里          │   │
│  │    ├── build.mjs         ← 触发构建                      │   │
│  │    └── cli.js            ← 运行 Claude Code             │   │
│  │                                                          │   │
│  │  ttyd 运行在 :7681 → WebSocket → 浏览器终端              │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### 学习者完整体验流程（2026-04-16 更新）

```
1. 打开 / 营销首页 → 了解项目 → 点击「进入平台」
2. /platform Lab 选择页 → 点击 Lab 3
3. /lab/3 实验工作台
   → 阅读左侧文档（核心要点 + 外链完整文档）
   → 浏览文件目录树，找到目标文件（高亮引导）
   → 文件树中 🔒 表示只读，✏️ 表示可编辑

4. 点击「启动实验环境」→ 后端创建 Docker 容器
   → 容器启动后终端连接 ttyd

5. 在 Monaco 编辑器中补全 TODO

6. 点击「提交代码」
   → 后端注入代码到容器 src/query-lab.ts
   → 触发 node build.mjs --lab 3
   → 成功后进度标记 Lab 3 ✓

7. 在终端运行 node cli.js → 看到真实 Claude Code TUI！
```

---

## 四、MVP 实现范围（课程 12 周可交付）

### Must Have（答辩必须有）

```
✅ Docker 容器启动/停止/重置
✅ 学习者代码提交 → 注入容器文件 → 触发构建
✅ 浏览器内终端（xterm.js + ttyd）能运行 node cli.js
✅ 匿名用户身份 + workspace 持久化 + progress 持久化
✅ 容器 TTL 自动回收
✅ Cloudflare Tunnel 公网访问
□ 营销首页 / + Lab 选择页 /platform
□ 实验工作台可调整面板（文件树 + 文档 + 编辑器 + 终端）
□ 文件目录树（MVP：结构展示 + 目标文件高亮 + 其他文件只读）
□ 至少 3 个 Lab 的内容和代码骨架（Lab 0-3）
□ Lab 3 完整体验（教学核心）
□ API Key 注入机制（用户自带或默认 DeepSeek）
□ byocc.cc 固定域名部署
```

### Nice to Have（Bonus）

```
□ 文件目录悬浮提示（file-descriptions.json）
□ 自由探索模式（解锁所有文件）
□ GitHub OAuth 身份绑定
□ Lab 0 个性化 Claude Code
□ Lab 4-5 内容
□ 移动端适配
□ 管理面板
```

### 明确不做

```
✗ 千人并发
✗ VS Code in browser（code-server，太重）
✗ 完整用户管理系统（RBAC、管理后台、邮件验证）
✗ GitHub OAuth 优先于 UI 优化
```

---

## 五、技术选型

| 层次 | 选型 | 理由 |
|------|------|------|
| 前端框架 | Next.js 14 | 前后端同构，团队熟悉 React |
| 终端前端 | xterm.js | 业界标准，文档完善 |
| 代码编辑器 | Monaco Editor | VS Code 同款，TypeScript 支持好 |
| 终端后端 | ttyd | 最简单，二进制，一行命令启动 |
| 容器管理 | dockerode (npm) | Node.js 原生 Docker SDK |
| 数据库 | SQLite (better-sqlite3) | 零配置，够用，易备份 |
| 样式 | Tailwind CSS | 快速开发 |
| 部署 | 单台 VPS 或团队成员服务器 | 答辩时本地也可以跑 |

---

## 六、GPT 调研结论摘要

来自 GPT 对 pwn.college 的详细分析：

- pwn.college 没有自己写 terminal emulator，而是用 ttyd 这个成熟项目
- 核心是：Docker 容器 + ttyd + nginx WebSocket 反代 三层
- 浏览器里的 Terminal 标签就是连到 ttyd 的 WebSocket 连接
- 最快复现路线：ttyd + Docker + nginx（不用自己搞 xterm.js）
- 真正的价值不是"有个 terminal"，而是：题目 + 环境 + 隔离 + 可重置

推荐最优复现顺序：
1. ttyd + Docker + 基础反代 → 有可用终端
2. 接上题目系统和代码注入 → 有教学逻辑
3. 如需更多交互 → 换 xterm.js + 自己的 WebSocket
