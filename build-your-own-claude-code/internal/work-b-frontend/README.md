# 方向 B：前端页面开发

> **负责人**：待定
> **技术栈**：Next.js + React + Tailwind CSS + Monaco Editor + xterm.js

---

## 你要做什么（一句话）

搭建教学平台的网页界面——学习者打开浏览器就能看到 Lab 文档、写代码、看终端输出。

## 为什么你要做这个

学习者的整个体验都在网页上：
- 左边看教学文档和知识讲解
- 右上角用 Monaco 编辑器写代码
- 右下角用 xterm.js 终端看到真实的 Claude Code TUI
- 点「提交」按钮把代码发到后端

你负责的就是让这个网页好看、好用、流畅。

---

## 页面布局（你要实现的）

```
┌─────────────────────────────────────────────────────────────┐
│  导航栏：Logo + Lab 0 | Lab 1 | Lab 2 | Lab 3 | ...        │
├──────────────────────┬──────────────────────────────────────┤
│                      │  ┌─ 代码编辑器 ─────────────────┐   │
│  📖 Lab 文档区       │  │  Monaco Editor               │   │
│                      │  │  显示 TODO 骨架代码            │   │
│  - 知识讲解          │  │  学习者在这里补全              │   │
│  - 实验目的          │  └───────────────────────────────┘   │
│  - 背景知识          │  [✅ 提交代码] [🔄 重置]             │
│  - 提示/Hints        │  ┌─ 终端 ──────────────────────┐   │
│                      │  │  xterm.js                    │   │
│  📊 进度:            │  │  连接容器内 ttyd              │   │
│  Lab 0 ✅            │  │                              │   │
│  Lab 1 ✅            │  │ $ node cli.js                │   │
│  Lab 2 🔄            │  │ > Claude Code TUI 启动！      │   │
│  Lab 3 ⬜            │  └──────────────────────────────┘   │
├──────────────────────┴──────────────────────────────────────┤
│  状态栏：构建状态 | 容器状态 | 连接状态                       │
└─────────────────────────────────────────────────────────────┘
```

---

## 技术栈

| 技术 | 用途 | 学习资源 |
|------|------|---------|
| **Next.js 14** | React 全栈框架 | [Next.js 官方教程](https://nextjs.org/learn) |
| **Tailwind CSS** | 样式（不用写 CSS） | [Tailwind 文档](https://tailwindcss.com/docs) |
| **Monaco Editor** | 代码编辑器（VS Code 同款） | npm: `@monaco-editor/react` |
| **xterm.js** | 终端模拟器 | npm: `xterm` + `xterm-addon-fit` + `xterm-addon-attach` |
| **TypeScript** | 类型安全 | 项目已配置好 |

---

## 起步指南（Step by Step）

### Step 1：初始化 Next.js 项目（30 分钟）

```bash
# 在项目根目录
cd D:\code\build-your-own-claude-code
npx create-next-app@latest platform --typescript --tailwind --app --src-dir
```

生成的目录结构：
```
platform/
├── src/
│   ├── app/
│   │   ├── layout.tsx         # 全局布局（导航栏在这里）
│   │   ├── page.tsx           # 首页
│   │   └── lab/
│   │       └── [id]/
│   │           └── page.tsx   # Lab 页面（动态路由）
│   ├── components/
│   │   ├── Navbar.tsx         # 导航栏
│   │   ├── LabSidebar.tsx     # 左侧文档区
│   │   ├── CodeEditor.tsx     # Monaco 编辑器封装
│   │   ├── Terminal.tsx       # xterm.js 终端封装
│   │   ├── SubmitButton.tsx   # 提交按钮
│   │   └── ProgressTracker.tsx # 进度追踪
│   └── lib/
│       └── api.ts             # 后端 API 调用封装
```

### Step 2：实现 Lab 页面布局（2-3 小时）

这是最重要的页面。用 Tailwind 实现左右分栏：

```tsx
// src/app/lab/[id]/page.tsx
export default function LabPage({ params }: { params: { id: string } }) {
  const labId = parseInt(params.id);

  return (
    <div className="flex h-screen">
      {/* 左侧：文档区 */}
      <div className="w-1/3 border-r overflow-y-auto p-6">
        <LabSidebar labId={labId} />
      </div>

      {/* 右侧：编辑器 + 终端 */}
      <div className="w-2/3 flex flex-col">
        {/* 上半部分：代码编辑器 */}
        <div className="h-1/2 border-b">
          <CodeEditor labId={labId} />
        </div>

        {/* 提交按钮 */}
        <div className="p-2 border-b flex gap-2">
          <SubmitButton labId={labId} />
          <button className="px-4 py-1 bg-gray-200 rounded">重置</button>
        </div>

        {/* 下半部分：终端 */}
        <div className="h-1/2">
          <Terminal />
        </div>
      </div>
    </div>
  );
}
```

### Step 3：集成 Monaco Editor（2 小时）

```bash
npm install @monaco-editor/react
```

```tsx
// src/components/CodeEditor.tsx
'use client';
import Editor from '@monaco-editor/react';
import { useState } from 'react';

// 每个 Lab 的初始骨架代码（从文件加载或硬编码）
const LAB_SKELETONS: Record<number, string> = {
  3: `// Lab 3: Agent Loop
// 补全下面的 TODO，实现 Agent 核心循环

export async function* agentLoop(
  client: LLMClient,
  executor: ToolExecutor,
  systemPrompt: string,
  userMessage: string,
  options?: { maxTurns?: number }
): AsyncGenerator<AgentEvent> {

  // TODO 1: 初始化对话历史
  // ...
}`,
};

export default function CodeEditor({ labId }: { labId: number }) {
  const [code, setCode] = useState(LAB_SKELETONS[labId] || '// Loading...');

  return (
    <Editor
      height="100%"
      language="typescript"
      theme="vs-dark"
      value={code}
      onChange={(value) => setCode(value || '')}
      options={{
        minimap: { enabled: false },
        fontSize: 14,
        wordWrap: 'on',
      }}
    />
  );
}
```

### Step 4：集成 xterm.js 终端（2-3 小时）

```bash
npm install xterm xterm-addon-fit xterm-addon-attach
```

```tsx
// src/components/Terminal.tsx
'use client';
import { useEffect, useRef } from 'react';
import { Terminal as XTerm } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { AttachAddon } from 'xterm-addon-attach';
import 'xterm/css/xterm.css';

export default function Terminal({ wsUrl }: { wsUrl?: string }) {
  const termRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!termRef.current) return;

    const term = new XTerm({
      cursorBlink: true,
      fontSize: 14,
      theme: { background: '#1e1e1e' },
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(termRef.current);
    fitAddon.fit();

    // 如果有 WebSocket URL，连接到容器终端
    if (wsUrl) {
      const ws = new WebSocket(wsUrl);
      const attachAddon = new AttachAddon(ws);
      term.loadAddon(attachAddon);
    } else {
      term.writeln('等待连接到容器...');
      term.writeln('请先提交代码并等待构建完成。');
    }

    // 窗口大小变化时自适应
    const onResize = () => fitAddon.fit();
    window.addEventListener('resize', onResize);

    return () => {
      term.dispose();
      window.removeEventListener('resize', onResize);
    };
  }, [wsUrl]);

  return <div ref={termRef} className="h-full w-full" />;
}
```

### Step 5：实现 API 调用（1 小时）

```typescript
// src/lib/api.ts
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export async function submitCode(sessionId: string, code: string, labNumber: number) {
  const res = await fetch(`${API_BASE}/api/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, code, labNumber }),
  });
  return res.json();
}

export async function getProgress(sessionId: string) {
  const res = await fetch(`${API_BASE}/api/progress?sessionId=${sessionId}`);
  return res.json();
}
```

---

## 开发方式（不需要后端也能开发！）

你可以用 **Mock 模式** 独立开发前端：

```tsx
// 在后端还没好之前，用假数据开发 UI
const MOCK_PROGRESS = [
  { labNumber: 0, completed: true },
  { labNumber: 1, completed: true },
  { labNumber: 2, completed: false },
  { labNumber: 3, completed: false },
];

// Terminal 组件不连 WebSocket 时显示欢迎信息
// Monaco 编辑器加载骨架代码
// 提交按钮点击后显示 "构建中..." 动画
```

**等后端好了之后**，把 Mock 数据替换为真实 API 调用即可。

---

## AI 工具使用指南

### 给 Codex/Copilot 的提示词

**创建页面布局时：**
```
在 Next.js 14 App Router 项目中，创建一个 Lab 教学页面。

布局要求：
- 左侧 1/3：Markdown 文档渲染区（Lab 知识讲解）
- 右上 1/3：Monaco Editor 代码编辑器（TypeScript）
- 右下 1/3：xterm.js 终端模拟器
- 底部状态栏

技术栈：Tailwind CSS，TypeScript strict。
页面路由：/lab/[id]（动态路由，id 为 Lab 编号 0-5）

请创建所有必需的组件文件。
```

**集成 xterm.js 时：**
```
我需要在 Next.js 中集成 xterm.js 终端组件。

要求：
1. 使用 xterm + xterm-addon-fit + xterm-addon-attach
2. 通过 WebSocket 连接到后端的 ttyd 服务
3. 支持自适应窗口大小
4. 深色主题
5. 是 Client Component（'use client'）

注意：xterm.js 只能在浏览器环境运行，需要动态 import 或 useEffect。
```

**遇到样式问题时：**
```
我在用 Tailwind CSS 实现一个左右分栏布局。

左侧固定 1/3 宽度，可滚动。
右侧 2/3 宽度，上下分两半（代码编辑器和终端）。
整个页面高度 100vh，不出现滚动条。

当前代码：[粘贴你的代码]
问题：[描述问题]
```

---

## 交付清单（Sprint 1 结束时）

- [ ] Next.js 项目初始化完成
- [ ] Lab 页面布局实现（左右分栏）
- [ ] Monaco Editor 集成（能显示和编辑 TypeScript 代码）
- [ ] xterm.js 终端集成（至少能显示欢迎信息）
- [ ] 提交按钮（Mock 模式能点击）
- [ ] 导航栏（Lab 0-5 切换）
- [ ] 基本响应式（不要求移动端，但不能在 1080p 下溢出）

## 进度记录

---

### 工作日志

> 每次完成工作后在这里添加记录，格式：
> `### YYYY-MM-DD`
> `- ✅ 完成了什么`
> `- 🔄 正在做什么`
> `- ⚠️ 遇到什么问题`
