# Lab 文档面板内嵌优化 — 开发提示词

> 给新的 Claude Code 会话使用。
> 工作目录：D:\code\build-your-own-claude-code
> 分支建议：从 main 新建 `feat/docs-panel-optimization`

---

## 项目背景

**Build Your Own Claude Code (BYOCC)** 教学平台。当前 Lab 工作台布局为左文档 + 右编辑器+终端。

### 本次任务

**优化 Lab 文档面板的展示方式**：将当前的"全量 Markdown 渲染"改为"核心要点摘要 + 外链完整文档"，让学习者在有限的面板空间内快速获取关键信息，而不必阅读大段文档。

---

## 当前代码状态

### `platform/src/components/DocsPanel.tsx`（完整文件）

```tsx
"use client";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

type DocsPanelProps = {
  labId?: number;
  content: string;        // 完整 Markdown 内容（从服务端读取）
};

export default function DocsPanel({ content }: DocsPanelProps) {
  return (
    <div className="flex h-full flex-col overflow-hidden border-r border-[var(--border)] bg-[var(--bg-panel)]">
      <div className="flex items-center gap-2 border-b border-[var(--border)] px-5 py-3">
        <span className="text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">
          📖 文档
        </span>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
        <div className="markdown-body">
          <Markdown remarkPlugins={[remarkGfm]}>{content}</Markdown>
        </div>
      </div>
    </div>
  );
}
```

**现状问题**：
- 文档面板只占屏幕 30% 宽度，全量 Markdown 在窄空间里阅读体验差
- 当前直接渲染完整 markdown（包含代码块、表格、admonition 等），信息密度高
- 没有外部文档链接——学习者不知道可以去 docs 站点看更详细的版本

### `platform/src/app/lab/[id]/page.tsx`

Lab 页面在服务端读取 markdown 文件：
```typescript
async function readLabMarkdown(labId: number): Promise<string> {
  const filePath = path.resolve(
    process.cwd(), "..", "docs", "labs",
    `lab-${String(labId).padStart(2, "0")}`, "index.md"
  );
  try {
    return await fs.readFile(filePath, "utf8");
  } catch {
    return `# Lab ${labId}\n\n文档暂未准备好。`;
  }
}
```

然后将 `content` 传给 `LabLayout` → `DocsPanel`。

### `platform/src/components/LabLayout.tsx`

```
水平分割：DocsPanel(30%) | LabRightArea(70%)
DocsPanel 可折叠
```

### 外部文档站点

文档已部署在 GitHub Pages：
```
https://cookiesheep.github.io/build-your-own-claude-code/labs/lab-00/
https://cookiesheep.github.io/build-your-own-claude-code/labs/lab-01/
...（lab-00 到 lab-05）
```

### 现有文档内容结构（以 lab-01/index.md 为例）

每个 Lab 的 index.md 结构基本一致：
```markdown
# Lab N：标题

!!! tip/danger "一句话价值主张"

## 实验目的
1. ...
2. ...
3. ...

## 背景知识
### 小节标题
代码示例 + 解释
!!! warning "关键理解"

## 实验任务
详见 [实验任务](./tasks.md)。
```

---

## 优化方案

### 核心思路

```
Before:                          After:
┌──────────────┐                ┌──────────────┐
│ 📖 文档       │                │ 📖 Lab 3 文档  │
│              │                │              │
│ # Lab 3：    │                │ ★ 核心要点    │
│ Agent Loop   │                │ ───────────── │
│              │                │ • while(true) │
│ !!! danger   │                │   循环是      │
│ "这是最重要   │                │   Agent 核心  │
│  的Lab"      │                │ • observe →   │
│              │                │   think →    │
│ ## 实验目的   │                │   act → repeat│
│ 1. 深入理解  │                │ • stop_reason │
│ ...          │                │   驱动控制    │
│              │                │              │
│ ## 背景知识  │                │ 📋 实验目的   │
│ (大段代码)   │                │ ───────────── │
│ ...          │                │ 1. 理解 Loop  │
│ ...          │                │ 2. 实现循环   │
│ ...          │                │ 3. 看到自主   │
│              │                │    决策       │
│ ## 实验任务  │                │              │
│ 详见 tasks   │                │ 🔗 阅读完整文档│
│              │                │    → 外链     │
└──────────────┘                └──────────────┘
```

### 设计原则

1. **信息分层**：面板内只显示"你现在需要知道什么"，完整文档在外部
2. **快速扫读**：要点用 bullet list，不用大段文字
3. **行动引导**："实验目的"直接告诉学习者要做什么
4. **外链自然**：底部放"阅读完整文档"链接，指向 docs 站点对应页面

---

## 实现步骤

### Step 1: 创建 Lab 摘要数据

新建 `platform/src/lib/lab-summaries.ts`：

```typescript
export interface LabSummary {
  /** Lab 编号 */
  labId: number;
  /** 核心要点（3-5 条，每条 15-30 字） */
  keyPoints: string[];
  /** 实验目的（从 index.md 的"实验目的"节提取） */
  objectives: string[];
  /** 外部文档链接 */
  docUrl: string;
  /** 一句话描述（从 labs.ts 的 desc 字段可引用） */
  oneLiner: string;
}

export const LAB_SUMMARIES: Record<number, LabSummary> = {
  0: {
    labId: 0,
    keyPoints: [
      "安装并运行完整 Claude Code TUI",
      "这是你最终要驱动的东西——先跑起来，后面再拆解",
      "Lab 0 不需要写代码，纯体验",
    ],
    objectives: [
      "安装 Node.js 18+ 和 Docker",
      "克隆 claude-code-diy 仓库",
      "运行 node cli.js 看到完整 TUI",
    ],
    docUrl: "https://cookiesheep.github.io/build-your-own-claude-code/labs/lab-00/",
    oneLiner: "安装运行完整 Claude Code，看到你最终要驱动的东西",
  },
  1: {
    labId: 1,
    keyPoints: [
      "消息不是字符串——是结构化的 Message + ContentBlock",
      "四种 ContentBlock：text、tool_use、tool_result、thinking",
      "tool_result 的 role 是 user 但不是用户发的——是 Harness 自动构造的",
      "LLM API 调用的核心参数：model、max_tokens、messages、tools",
    ],
    objectives: [
      "理解 Anthropic Messages API 的消息格式",
      "掌握四种 Content Block 类型",
      "实现对话历史管理（Conversation 类）",
      "封装 LLM API 客户端，完成一次真实 API 调用",
    ],
    docUrl: "https://cookiesheep.github.io/build-your-own-claude-code/labs/lab-01/",
    oneLiner: "理解 LLM 对话的数据结构，建立 Agent 的输入输出语言",
  },
  2: {
    labId: 2,
    keyPoints: [
      "每个工具是一个标准对象：{ name, description, inputSchema, execute }",
      "registry 统一管理所有工具，给 LLM 提供 tools 列表",
      "工具执行是同步的——拿到结果后喂回 LLM",
      "本 Lab 实现三个核心工具：read_file、write_file、bash",
    ],
    objectives: [
      "理解工具系统的架构设计",
      "实现 read_file / write_file / bash 三个工具",
      "理解 inputSchema（JSON Schema）如何约束工具输入",
    ],
    docUrl: "https://cookiesheep.github.io/build-your-own-claude-code/labs/lab-02/",
    oneLiner: "实现 read_file / write_file / bash，给 Agent 装上手脚",
  },
  3: {
    labId: 3,
    keyPoints: [
      "Agent Loop 就是 while(true)：callLLM → parseToolUse → execute → feedBack",
      "没有循环，LLM 只能说话不能做事——循环让它变成 Agent",
      "退出条件：无 tool_use / 超过最大迭代 / API 报错 / 用户中断",
      "判断工具调用看 toolUseBlocks.length，不看 stop_reason（不可靠）",
      "AgentEvent（AsyncGenerator）向外部报告进展",
    ],
    objectives: [
      "深入理解 Agent Loop 的核心机制：observe → think → act → repeat",
      "实现完整的 Agent Loop（约 100 行核心逻辑）",
      "理解 stop_reason 驱动的循环控制",
      "实现最大迭代次数保护",
      "看到 Agent 自主决策、循环调用工具",
    ],
    docUrl: "https://cookiesheep.github.io/build-your-own-claude-code/labs/lab-03/",
    oneLiner: "while(true) 循环，chatbot 变成 agent 的那一行代码",
  },
  4: {
    labId: 4,
    keyPoints: [
      "TodoWrite：让 Agent 先列计划再执行，类似人类列 Todo",
      "Subagent：把复杂任务拆成子任务，每个有自己的 Agent Loop",
      "规划能力让 Agent 从"反应式"变成"主动式"",
    ],
    objectives: [
      "理解规划能力对 Agent 的重要性",
      "实现 TodoWrite 工具",
      "实现 Subagent 机制",
    ],
    docUrl: "https://cookiesheep.github.io/build-your-own-claude-code/labs/lab-04/",
    oneLiner: "让 Agent 先想再做，TodoWrite 为复杂任务建立节奏",
  },
  5: {
    labId: 5,
    keyPoints: [
      "长对话时 token 会超限——上下文压缩解决这问题",
      "三层压缩策略：滑动窗口 + 摘要 + 关键信息保留",
      "压缩是透明的——Agent 不知道历史被压缩了",
    ],
    objectives: [
      "理解上下文窗口的限制和挑战",
      "实现三层压缩策略",
      "验证长对话场景下的稳定性",
    ],
    docUrl: "https://cookiesheep.github.io/build-your-own-claude-code/labs/lab-05/",
    oneLiner: "三层压缩策略，让 Agent 处理长任务时更稳",
  },
};
```

### Step 2: 重写 `platform/src/components/DocsPanel.tsx`

```tsx
"use client";

import { LAB_SUMMARIES } from "@/lib/lab-summaries";

type DocsPanelProps = {
  labId: number;
  content: string;   // 保留，用于可能的"展开完整文档"模式
};

export default function DocsPanel({ labId, content }: DocsPanelProps) {
  const summary = LAB_SUMMARIES[labId];

  // 如果没有摘要数据，fallback 到原始 markdown 渲染
  if (!summary) {
    // 保留原有的 Markdown 渲染逻辑作为 fallback
    return <FallbackDocsPanel content={content} />;
  }

  return (
    <div className="flex h-full flex-col overflow-hidden border-r border-[var(--border)] bg-[var(--bg-panel)]">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-[var(--border)] px-5 py-3">
        <span className="text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">
          📖 文档
        </span>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
        {/* 核心要点 */}
        <section className="mb-6">
          <h3 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-[var(--accent)]">
            <span>★</span> 核心要点
          </h3>
          <ul className="space-y-2">
            {summary.keyPoints.map((point, i) => (
              <li
                key={i}
                className="flex gap-2 text-[0.82rem] leading-relaxed text-[var(--text-secondary)]"
              >
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent)]" />
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* 实验目的 */}
        <section className="mb-6">
          <h3 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-[var(--text-primary)]">
            <span>📋</span> 实验目的
          </h3>
          <ol className="space-y-1.5 pl-1">
            {summary.objectives.map((obj, i) => (
              <li
                key={i}
                className="flex gap-2 text-[0.82rem] leading-relaxed text-[var(--text-secondary)]"
              >
                <span className="shrink-0 text-[var(--text-muted)]">{i + 1}.</span>
                <span>{obj}</span>
              </li>
            ))}
          </ol>
        </section>

        {/* 外链 */}
        <div className="border-t border-[var(--border)] pt-4">
          <a
            href={summary.docUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-2 text-[0.8rem] text-[var(--accent)] transition-colors hover:bg-[var(--surface-hover)]"
          >
            <span>🔗</span>
            <span>阅读完整文档</span>
            <svg
              className="h-3 w-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
              />
            </svg>
          </a>
        </div>
      </div>
    </div>
  );
}
```

### Step 3: 修改 `platform/src/components/LabLayout.tsx`

确保 `labId` 正确传递给 DocsPanel（当前已传递 `content`，需要额外传 `lab.id`）：

```tsx
<DocsPanel labId={lab.id} content={content} />
```

当前 `DocsPanelProps` 的 `labId` 是 optional（`labId?: number`），需要改为 required。

### Step 4: 保留 Fallback

如果 `LAB_SUMMARIES` 中没有某个 lab 的数据，fallback 到原有的 Markdown 渲染。这确保即使摘要数据不完整，文档面板也能正常工作。

---

## 样式要求

- 核心要点标题用琥珀金色（`var(--accent)`），与平台主色调一致
- bullet point 用琥珀金圆点
- 实验目的标题用主文字色
- 外链按钮用边框 + accent 色，hover 时加背景
- 整体 padding 和间距与现有 DocsPanel 一致
- 字号 0.82rem，与平台其他小文字一致
- 不要添加任何动画——这是文档面板，信息优先

---

## 验证步骤

```bash
# 1. 类型检查
cd platform && npx tsc --noEmit --project tsconfig.json

# 2. 构建
cd platform && npm run build

# 3. 手动验证
# 访问 /lab/0 到 /lab/5，检查每个 Lab 的文档面板：
# - 核心要点正确显示
# - 实验目的正确显示
# - 外链指向正确的 docs 站点 URL
# - fallback 模式（如果删除 LAB_SUMMARIES 中某个条目）

# 4. 响应式验证
# 文档面板在 15%-100% 宽度范围内内容正常显示
# 折叠后重新展开，内容不丢失
```

---

## 不动的文件

```
不要修改：
  platform/src/components/HeroParticles.tsx
  platform/src/components/ThemeProvider.tsx
  platform/src/components/LandingSections.tsx
  platform/src/components/Navbar.tsx
  platform/src/components/SettingsModal.tsx
  platform/src/components/LabRightArea.tsx
  platform/src/components/FileTree.tsx
  platform/src/components/CodeEditor.tsx
  platform/src/lib/api.ts
  platform/src/lib/auth.ts
  platform/src/lib/labs.ts
  platform/src/lib/file-tree-data.ts
  platform/src/app/page.tsx
  platform/src/app/globals.css
  platform/src/app/login/page.tsx
  server/ 目录下的所有文件
```

---

## 完成标准

```
1. platform/src/lib/lab-summaries.ts 创建，6 个 Lab 的摘要数据完整
2. DocsPanel 组件重写，显示核心要点 + 实验目的 + 外链
3. Fallback 逻辑正确——无摘要数据时回退到 Markdown 渲染
4. 外链指向正确的 GitHub Pages URL
5. 所有 Lab 的文档面板正常显示
6. npm run build 无报错
7. 不破坏 LabLayout 的折叠/展开功能
```
