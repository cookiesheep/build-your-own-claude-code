# AI Agent 上下文文档 — 前端开发

> 把这份文档发给你的 AI 工具（Codex、Copilot、ChatGPT 等），它就能理解整个项目并帮你完成任务。

---

## 项目概览

**项目名称**：Build Your Own Claude Code (BYOCC)

**一句话介绍**：一个基于真实 Claude Code 源码（416,500 行 TypeScript）的渐进式教学平台。学习者通过 6 个 Lab 逐步实现 AI Agent 的核心模块（消息协议→工具系统→Agent 循环→规划→压缩），最终在浏览器里看到真实的 Claude Code TUI 由自己写的代码驱动。

**核心价值**：学习者在浏览器中写代码 → 点提交 → 代码注入 Docker 容器 → 容器内构建 → 浏览器终端显示真实 Claude Code TUI。零本地安装。

## 架构概览

```
用户浏览器
├── Next.js 前端（你负责的！）
│   ├── Lab 页面（左文档 + 右编辑器 + 右终端）
│   ├── Monaco Editor（代码编辑）
│   └── xterm.js（终端，WebSocket 连接到容器 ttyd）
│
├── HTTP/WebSocket ↕
│
├── Express 后端（另一个人负责）
│   ├── POST /api/session — 创建会话
│   ├── POST /api/submit — 提交代码 → 注入容器 → 构建
│   ├── GET /api/progress — 查询进度
│   └── WS /api/terminal/:id — WebSocket 代理到容器
│
└── Docker 容器（每个用户一个）
    ├── Node.js 18 + claude-code-diy 源码
    ├── ttyd（终端 WebSocket 服务，端口 7681）
    └── 学习者代码被注入到这里
```

## 你的任务：前端开发

### 需要创建/修改的文件

项目中已经初始化了 Next.js 脚手架：`platform/` 目录。

你需要实现以下组件：

```
platform/src/
├── app/
│   ├── layout.tsx          ← 修改：添加全局导航栏
│   ├── page.tsx            ← 修改：首页，展示项目介绍和 Lab 列表
│   └── lab/
│       └── [id]/
│           └── page.tsx    ← 新建：Lab 页面（核心！左右分栏布局）
├── components/
│   ├── Navbar.tsx          ← 新建：顶部导航（Lab 0-5 切换）
│   ├── LabSidebar.tsx      ← 新建：左侧面板（渲染 Markdown 文档）
│   ├── CodeEditor.tsx      ← 新建：Monaco Editor 封装
│   ├── Terminal.tsx         ← 新建：xterm.js 终端封装
│   ├── SubmitButton.tsx    ← 新建：提交代码按钮
│   └── ProgressTracker.tsx ← 新建：Lab 完成进度追踪
└── lib/
    └── api.ts              ← 新建：后端 API 调用封装
```

### 关键技术要求

1. **Next.js 14 App Router**（不是 Pages Router）
2. **TypeScript strict 模式**
3. **Tailwind CSS** 做样式
4. **Monaco Editor**：`npm install @monaco-editor/react`
5. **xterm.js**：`npm install xterm xterm-addon-fit xterm-addon-attach`
6. **Markdown 渲染**：`npm install react-markdown remark-gfm`（左侧文档面板）

### Lab 页面布局要求

```
┌─────────────── 导航栏 ─────────────────────┐
├──────────────┬─────────────────────────────┤
│              │  Monaco Editor (上半)        │
│  Markdown    │  [提交] [重置]              │
│  文档面板    │  xterm.js Terminal (下半)    │
│  (可滚动)    │                             │
├──────────────┴─────────────────────────────┤
│  状态栏：构建状态 | 容器状态                  │
└────────────────────────────────────────────┘
```

- 左侧占 1/3 宽度，右侧占 2/3
- 右侧上下各占 50%（编辑器和终端）
- 整页 100vh，不出现页面级滚动条
- 深色主题（代码编辑器和终端都是深色背景）

### 后端 API（你需要调用的）

后端跑在 `http://localhost:3001`，API 如下：

```typescript
// POST /api/session — 创建会话
// 请求：{} 或 { sessionId: "existing-id" }
// 响应：{ sessionId: string, status: "running" | "creating" }

// POST /api/submit — 提交代码
// 请求：{ sessionId: string, code: string, labNumber: number }
// 响应：{ success: boolean, buildLog: string }

// GET /api/progress?sessionId=xxx — 查询进度
// 响应：{ labs: [{ labNumber: 0, completed: boolean }, ...] }

// POST /api/reset — 重置容器
// 请求：{ sessionId: string }
// 响应：{ success: boolean }

// WebSocket: ws://localhost:3001/api/terminal/{sessionId}
// → 连接到容器内的终端
```

### 开发方式（后端还没好时）

你可以用 Mock 数据独立开发：

```typescript
// lib/api.ts 里可以加一个 MOCK 模式
const MOCK = true;

export async function submitCode(sessionId: string, code: string, labNumber: number) {
  if (MOCK) {
    await new Promise(r => setTimeout(r, 2000)); // 模拟构建时间
    return { success: true, buildLog: '✅ Build successful!' };
  }
  // 真实 API 调用...
}
```

### Lab 文档来源

左侧面板需要渲染 Markdown 文档。文档文件在项目根目录的 `docs/labs/` 下：

```
docs/labs/lab-00/index.md  ← Lab 0 的知识讲解
docs/labs/lab-01/index.md  ← Lab 1 的知识讲解
docs/labs/lab-03/index.md  ← Lab 3 的知识讲解（最重要）
```

你可以用 Node.js `fs` 在 Server Component 里读取这些文件，然后用 `react-markdown` 渲染。

### 代码骨架来源

Monaco Editor 需要加载每个 Lab 的骨架代码。骨架文件在：

```
labs/lab-01-messages/src/    ← Lab 1 骨架文件
labs/lab-02-tools/src/       ← Lab 2 骨架文件
labs/lab-03-agent-loop/src/  ← Lab 3 骨架文件（最重要）
```

### 编码规范

- 组件用函数式（不用 class）
- 使用 TypeScript，不用 any
- xterm.js 和 Monaco 是浏览器专属库，必须用 `'use client'` 标记或动态 import
- CSS 全部用 Tailwind，不写自定义 CSS 文件
- 命名：组件 PascalCase，文件 PascalCase.tsx，变量 camelCase

### 需要安装的依赖

```bash
cd platform
npm install @monaco-editor/react xterm xterm-addon-fit xterm-addon-attach react-markdown remark-gfm
```

---

## 给 AI 的完整提示词

直接复制以下内容发给你的 AI 工具：

---

**背景**：我在做一个教学平台前端（Next.js 14 App Router + TypeScript + Tailwind CSS）。这个平台让学习者在浏览器里完成编程 Lab，左侧显示教学文档（Markdown），右上有 Monaco 代码编辑器，右下有 xterm.js 终端。学习者写代码后点提交，后端把代码注入 Docker 容器编译运行，终端通过 WebSocket 连接到容器。

**当前状态**：Next.js 项目已用 `create-next-app` 初始化（在 `platform/` 目录下），包含 TypeScript + Tailwind + App Router。需要实现具体的页面和组件。

**你的任务**：

1. 创建 `platform/src/app/lab/[id]/page.tsx` — Lab 动态路由页面
   - 左侧 1/3：渲染 Markdown 文档（从 `docs/labs/lab-{id}/index.md` 读取）
   - 右上 1/3：Monaco Editor（TypeScript 语言模式，深色主题，显示骨架代码）
   - 中间：提交按钮和重置按钮
   - 右下 1/3：xterm.js 终端（WebSocket 连接到 `ws://localhost:3001/api/terminal/{sessionId}`）
   - 整页 100vh，不出现滚动条

2. 创建以下组件（都在 `platform/src/components/`）：
   - `Navbar.tsx` — 顶部导航栏，Lab 0-5 的切换链接，当前 Lab 高亮
   - `CodeEditor.tsx` — 封装 `@monaco-editor/react`，props: `{ code, onChange, language }`
   - `Terminal.tsx` — 封装 `xterm` + `xterm-addon-fit` + `xterm-addon-attach`，props: `{ wsUrl? }`。是 Client Component。
   - `LabSidebar.tsx` — 渲染 Markdown，props: `{ content: string }`。使用 `react-markdown` + `remark-gfm`。
   - `SubmitButton.tsx` — 点击后调用 POST /api/submit，显示加载状态和构建结果

3. 创建 `platform/src/lib/api.ts` — 后端 API 封装
   - `submitCode(sessionId, code, labNumber)` → POST /api/submit
   - `getProgress(sessionId)` → GET /api/progress
   - `createSession()` → POST /api/session
   - 包含 MOCK 模式（后端还没好时用假数据）

**技术约束**：
- Next.js 14 App Router（不是 Pages Router）
- TypeScript strict
- Tailwind CSS（不写自定义 CSS）
- `xterm.js` 和 `@monaco-editor/react` 只能在浏览器运行，用 `'use client'` 或 `dynamic import`
- 后端 API 地址：`http://localhost:3001`（环境变量 `NEXT_PUBLIC_API_URL`）

请逐个文件创建，包含完整的 TypeScript 类型定义。
