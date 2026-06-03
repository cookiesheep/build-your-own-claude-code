# claude 写的初始化提示词

前端设计可以使用gemini效果非常好,可以查询一个skill叫:frontend-design  有了这个claude或者gpt也有非常好的前端审美:



```
请读取 @internal/work-b-frontend/AGENT_CONTEXT.md 了解项目背景。

## 任务：搭建 BYOCC 教学平台前端 MVP（追求专业设计感）

### 设计风格定位

参考 Cursor IDE、Linear、Vercel Dashboard 的设计语言：
- 整体深色主题，极简专业
- 强调对比度，信息层次分明
- 带有微交互感（hover 过渡、状态反馈）
- 有科技感但不花哨

### 颜色系统（必须统一使用）

```css
背景层次：
  页面背景    #0a0a0a
  面板背景    #111111
  卡片/边栏   #161616
  悬停高亮    #1c1c1c

边框：
  主边框      #262626
  高亮边框    #333333

文字：
  主要文字    #e5e5e5
  次要文字    #888888
  禁用文字    #444444

强调色（Claude 蓝绿）：
  主强调      #22d3ee   (cyan-400)
  强调暗      #0891b2   (cyan-600)
  按钮背景    #164e63   (cyan-950)
  按钮文字    #22d3ee

状态色：
  成功        #10b981   (emerald-500)
  警告        #f59e0b   (amber-500)
  错误        #ef4444   (red-500)
  进行中      #3b82f6   (blue-500)
```

## Step 1：安装依赖

```
cd platform
npm install @monaco-editor/react xterm xterm-addon-fit xterm-addon-attach react-markdown remark-gfm
react-syntax-highlighter @types/react-syntax-highlighter
```

## Step 2：创建全局 CSS 变量（platform/src/app/globals.css）

在现有文件末尾添加：

```
:root {
  --bg-page: #0a0a0a;
  --bg-panel: #111111;
  --bg-card: #161616;
  --border: #262626;
  --border-hover: #333333;
  --text-primary: #e5e5e5;
  --text-secondary: #888888;
  --accent: #22d3ee;
}

* { box-sizing: border-box; }
body { background: var(--bg-page); color: var(--text-primary); }

/* Markdown 渲染样式 */
.markdown-body { line-height: 1.7; }
.markdown-body h1 { font-size: 1.5rem; font-weight: 700; color: #f5f5f5; margin: 1.5rem 0 0.75rem; }
.markdown-body h2 { font-size: 1.2rem; font-weight: 600; color: #e5e5e5; margin: 1.25rem 0 0.5rem; border-bottom: 1px solid #262626; padding-bottom: 0.5rem; }
.markdown-body h3 { font-size: 1rem; font-weight: 600; color: #d4d4d4; margin: 1rem 0 0.4rem; }
.markdown-body p { color: #a3a3a3; margin: 0.5rem 0; }
.markdown-body code { background: #1c1c1c; color: #22d3ee; padding: 0.1em 0.4em; border-radius: 4px; font-family: 'JetBrains Mono', 'Fira Code', monospace; font-size: 0.85em; }
.markdown-body pre { background: #111111; border: 1px solid #262626; border-radius: 8px; padding: 1rem; overflow-x: auto; margin: 0.75rem 0; }
.markdown-body pre code { background: none; color: #e5e5e5; padding: 0; }
.markdown-body ul, .markdown-body ol { color: #a3a3a3; padding-left: 1.5rem; }
.markdown-body li { margin: 0.2rem 0; }
.markdown-body table { width: 100%; border-collapse: collapse; margin: 0.75rem 0; }
.markdown-body th { background: #161616; color: #e5e5e5; padding: 0.5rem 0.75rem; text-align: left; border: 1px solid #262626; font-size: 0.85rem; }
.markdown-body td { padding: 0.5rem 0.75rem; border: 1px solid #1c1c1c; color: #a3a3a3; font-size: 0.85rem; }
.markdown-body blockquote { border-left: 3px solid #22d3ee; padding-left: 1rem; color: #888; margin: 0.75rem 0; font-style: italic; }
.markdown-body strong { color: #e5e5e5; }
.markdown-body a { color: #22d3ee; text-decoration: none; }
.markdown-body a:hover { text-decoration: underline; }

/* 告示框 (MkDocs admonition) */
.admonition { border-radius: 6px; padding: 0.75rem 1rem; margin: 0.75rem 0; border-left: 4px solid; }
.admonition.danger { background: #1a0505; border-color: #ef4444; }
.admonition.warning { background: #1a1205; border-color: #f59e0b; }
.admonition.note { background: #051a1a; border-color: #22d3ee; }
.admonition.success { background: #051a0d; border-color: #10b981; }
```

## Step 3：全局布局（platform/src/app/layout.tsx）

创建导航栏，风格如下：

```
┌─────────────────────────────────────────────────────────────┐
│  ⚗️ Build Your Own Claude Code      [●] [●] [●] [●] [●] [●] │
│  (logo + tagline, 左对齐)           Lab 0  1  2  3  4  5    │
└─────────────────────────────────────────────────────────────┘
```

Navbar 设计细节：

- 背景 #0a0a0a，底部边框 1px #1c1c1c
- 左侧：⚗️ 图标 + "Build Your Own Claude Code"（白色粗体）+ 副标题 "Learn Agent Harness Engineering"（#888，小字）
- 右侧：Lab 0-5 的 tab，当前激活的 tab 有 #22d3ee 底部指示线
- 已完成的 Lab 显示 ✓ 前缀，颜色 #10b981
- 高度 56px，fixed 定位，backdrop-blur

```
// platform/src/app/layout.tsx
import type { Metadata } from 'next';
import './globals.css';
import Navbar from '@/components/Navbar';

export const metadata: Metadata = {
  title: 'Build Your Own Claude Code',
  description: 'Learn Agent Harness Engineering by building Claude Code from scratch',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body style={{ fontFamily: "'Inter', sans-serif", margin: 0, background: '#0a0a0a' }}>
        <Navbar />
        <main style={{ paddingTop: '56px', height: '100vh' }}>
          {children}
        </main>
      </body>
    </html>
  );
}
```

## Step 4：Navbar 组件（platform/src/components/Navbar.tsx）

```
'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LABS = [
  { id: 0, name: '环境', emoji: '🔧' },
  { id: 1, name: '消息', emoji: '📨' },
  { id: 2, name: '工具', emoji: '⚙️' },
  { id: 3, name: 'Agent Loop', emoji: '🔄', highlight: true },
  { id: 4, name: '规划', emoji: '📋' },
  { id: 5, name: '压缩', emoji: '🗜️' },
];

export default function Navbar() {
  const pathname = usePathname();

  return (
    <nav
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
        height: '56px', background: 'rgba(10,10,10,0.95)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid #1c1c1c',
        display: 'flex', alignItems: 'center',
        padding: '0 1.5rem', gap: '2rem',
      }}
    >
      {/* Logo */}
      <Link
        href="/"
        style={{
          display: 'flex',
          flexDirection: 'column',
          textDecoration: 'none',
          gap: '1px',
          flexShrink: 0,
        }}
      >
        <span style={{ color: '#e5e5e5', fontSize: '0.95rem', fontWeight: 700, letterSpacing: '-0.01em' }}>
          ⚗️ Build Your Own Claude Code
        </span>
        <span style={{ color: '#555', fontSize: '0.65rem', letterSpacing: '0.05em' }}>
          AGENT HARNESS ENGINEERING
        </span>
      </Link>

      {/* Divider */}
      <div style={{ width: '1px', height: '24px', background: '#262626' }} />

      {/* Lab Tabs */}
      <div style={{ display: 'flex', gap: '0', flexGrow: 1 }}>
        {LABS.map(lab => {
          const isActive = pathname === `/lab/${lab.id}`;
          return (
            <Link
              key={lab.id}
              href={`/lab/${lab.id}`}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '0 1rem', height: '56px',
                fontSize: '0.8rem', fontWeight: isActive ? 600 : 400,
                color: isActive ? '#22d3ee' : '#666',
                borderBottom: isActive ? '2px solid #22d3ee' : '2px solid transparent',
                textDecoration: 'none',
                transition: 'all 0.15s ease',
                whiteSpace: 'nowrap',
                background: lab.highlight && !isActive ? 'rgba(34,211,238,0.03)' : 'transparent',
              }}
            >
              <span style={{ fontSize: '0.75rem' }}>{lab.emoji}</span>
              <span>Lab {lab.id}</span>
              {lab.highlight && (
                <span
                  style={{
                    fontSize: '0.6rem', padding: '1px 5px',
                    background: 'rgba(34,211,238,0.15)', color: '#22d3ee',
                    borderRadius: '999px', border: '1px solid rgba(34,211,238,0.3)',
                  }}
                >
                  CORE
                </span>
              )}
            </Link>
          );
        })}
      </div>

      {/* Status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }} />
        <span style={{ color: '#555', fontSize: '0.75rem' }}>容器未连接</span>
      </div>
    </nav>
  );
}
```

## Step 5：首页（platform/src/app/page.tsx）

展示 6 个 Lab 卡片，每个卡片显示：

- Lab 编号 + emoji + 名称
- 一句话描述（中文）
- 状态标签（未开始/进行中/已完成）
- "开始" 按钮 → 跳转到 /lab/N

卡片风格：

- 背景 #111111，边框 #222222
- Hover 时边框变 #22d3ee，有 0.2s 过渡
- Lab 3 卡片有特殊的 "★ CORE" 标签和微弱的 cyan 光晕
- 网格布局：3列（md 断点以上），2列（sm），1列（xs）

首页顶部 Hero 区：

- 大标题："Build Your Own Claude Code"
- 副标题："通过 6 个渐进式 Lab，从零实现 Agent Harness 核心——最终看到真实 Claude Code TUI 由你的代码驱动"
- 两个行动按钮：「开始 Lab 0」（outline）、「直接看 Lab 3 ★」（filled cyan）
- 背景：细微的网格纹理（CSS 渐变实现）

```
// platform/src/app/page.tsx
// 用以下数据渲染 Lab 卡片列表：
const LABS = [
  { id: 0, emoji: '🔧', name: '环境与体验', desc: '安装运行完整 Claude Code，看到你最终要驱动的东西', tag: '准备' },
  { id: 1, emoji: '📨', name: '消息协议', desc: '理解 LLM 对话的数据结构——Agent 的血液', tag: 'Lab 1' },
  { id: 2, emoji: '⚙️', name: '工具系统', desc: '实现 read_file / write_file / bash，给 Agent 装上手脚', tag: 'Lab 2' },
  { id: 3, emoji: '🔄', name: 'Agent Loop', desc: 'while(true) 循环——chatbot 变成 agent 的那一行代码', tag: '★ 核心', highlight: true },
  { id: 4, emoji: '📋', name: '规划能力', desc: '让 Agent 先想再做，TodoWrite 使完成率翻倍', tag: 'Lab 4' },
  { id: 5, emoji: '🗜️', name: '上下文压缩', desc: '三层压缩策略，让 Agent 处理长任务不崩', tag: 'Lab 5' },
];
```

## Step 6：Lab 页面（platform/src/app/lab/[id]/page.tsx）

这是核心页面。布局如下：

```
┌──────────────────────────────────────────────────────────────────┐
│  Navbar（固定顶部）                                              │
├────────────────────┬─────────────────────────────────────────────┤
│                    │  ┌─ 代码编辑器 ─────────────────────────┐   │
│  📖 Lab 文档       │  │  Monaco Editor                      │   │
│                    │  │  深色主题，TypeScript               │   │
│  【Lab N 的        │  │  顶部 Tab 栏显示文件名              │   │
│  知识讲解          │  └──────────────────────────────────────┘   │
│  以 Markdown       ├──────────────────────────────────────────────┤
│  渲染】            │  [✅ 提交代码]  [🔄 重置]  状态: 等待提交   │
│                    ├──────────────────────────────────────────────┤
│                    │  ┌─ 终端 ──────────────────────────────┐   │
│  进度追踪：        │  │  黑色背景，等宽字体                 │   │
│  ✅ Lab 0          │  │  $ 等待连接到容器...               │   │
│  🔄 Lab 1          │  │  _                                 │   │
│                    │  └─────────────────────────────────────┘   │
│                    │                                             │
└────────────────────┴─────────────────────────────────────────────┘
```

左侧面板设计细节：

- 宽度 380px（固定，不可拖拽），背景 #0f0f0f
- 顶部有 Lab 编号标题（带 emoji 和 CORE 标签）
- Markdown 内容用 .markdown-body 类渲染
- 底部固定显示进度追踪（Lab 0-5 列表）
- 滚动时内容滚动，标题固定

右侧编辑器区域：

- 背景 #111111
- 顶部 tab 栏（文件名、语言图标），高度 36px，背景 #0f0f0f
- Monaco Editor 填满剩余空间
- 用 monaco-themes 的 One Dark Pro 主题（如果没有就用 vs-dark）

提交按钮区域（高度 48px）：

- 背景 #0a0a0a，顶部 + 底部边框 #1c1c1c
- 提交按钮：background #164e63，color #22d3ee，border 1px solid #0891b2，hover 时变亮，有 loading 状态（转圈动画）
- 重置按钮：透明背景，#555 颜色，hover 时变 #888
- 右侧显示状态文字（等待提交 / 构建中... / ✅ 构建成功 / ❌ 构建失败）

终端区域：

- 背景 #0d1117（GitHub 风格）
- 顶部 tab 栏，标题 "TERMINAL"，右侧有 ● 连接状态
- 用黑色 xterm.js 主题，字号 13px
- 目前显示占位文字（真实 WebSocket 连接后续实现）

## Step 7：左侧骨架代码占位

Lab 3 的 Monaco Editor 默认显示以下骨架代码（字符串硬编码在组件里，后续改为读文件）：

```
import type { Message, AgentEvent, ToolDefinition } from '../../../shared/types';

/**
 * Agent Loop — chatbot 变成 agent 的唯一东西。
 *
 * 完成 6 个 TODO，实现 while(true) 核心循环。
 * 完成后运行测试：npx vitest run labs/lab-03-agent-loop/
 */
export async function* agentLoop(
  client: LLMClient,
  executor: ToolExecutor,
  systemPrompt: string,
  userMessage: string,
  options?: { maxTurns?: number }
): AsyncGenerator<AgentEvent> {

  const maxTurns = options?.maxTurns ?? 25;

  // TODO 1: 初始化对话历史
  // 创建 messages 数组，添加初始用户消息
  // { role: 'user', content: userMessage }

  let turnCount = 0;

  while (true) {
    turnCount++;

    // TODO 2: 检查是否超过最大迭代次数
    // if (turnCount > maxTurns) → yield error + return

    // TODO 3: 调用 LLM
    // const response = await client.chat(messages, { ... })

    // TODO 4: 处理响应（yield text，收集 toolUseBlocks）

    // TODO 5: 无工具调用 → yield done + return

    // TODO 6: 执行工具，yield events，更新 messages
  }
}
```

## 完成标准

运行以下命令，确认全部通过：

```
cd platform
npm run dev
# → http://localhost:3000 首页显示 6 个 Lab 卡片，设计专业
# → http://localhost:3000/lab/3 显示三栏布局，Monaco 有骨架代码
# npm run build（无报错）
```

## 注意事项

- 所有颜色使用上方定义的色板，禁止用白色背景
- TypeScript strict，不使用 any
- 组件全部用函数式，使用 React hooks
- xterm.js 和 Monaco 必须是 Client Component
- 图片和图标优先用 emoji 或 SVG inline