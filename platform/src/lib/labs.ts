export type LabStatus = "not_started" | "in_progress" | "completed";

export type LabMeta = {
  id: number;
  emoji: string;
  name: string;
  desc: string;
  tag: string;
  status: LabStatus;
  highlight?: boolean;
};

export const LABS: LabMeta[] = [
  {
    id: 0,
    emoji: "🔧",
    name: "环境与体验",
    desc: "安装运行完整 Claude Code，看到你最终要驱动的东西",
    tag: "准备",
    status: "completed",
  },
  {
    id: 1,
    emoji: "📨",
    name: "消息协议",
    desc: "理解 LLM 对话的数据结构，建立 Agent 的输入输出语言",
    tag: "Lab 1",
    status: "completed",
  },
  {
    id: 2,
    emoji: "⚙️",
    name: "工具系统",
    desc: "实现 read_file / write_file / bash，给 Agent 装上手脚",
    tag: "Lab 2",
    status: "in_progress",
  },
  {
    id: 3,
    emoji: "🔄",
    name: "Agent Loop",
    desc: "while(true) 循环，chatbot 变成 agent 的那一行代码",
    tag: "★ 核心",
    status: "in_progress",
    highlight: true,
  },
  {
    id: 4,
    emoji: "📋",
    name: "规划能力",
    desc: "让 Agent 先想再做，TodoWrite 为复杂任务建立节奏",
    tag: "Lab 4",
    status: "not_started",
  },
  {
    id: 5,
    emoji: "🗜️",
    name: "上下文压缩",
    desc: "三层压缩策略，让 Agent 处理长任务时更稳",
    tag: "Lab 5",
    status: "not_started",
  },
];

export const STATUS_LABELS: Record<LabStatus, string> = {
  not_started: "未开始",
  in_progress: "进行中",
  completed: "已完成",
};

export const STATUS_COLORS: Record<LabStatus, string> = {
  not_started: "var(--text-disabled)",
  in_progress: "var(--status-progress)",
  completed: "var(--status-success)",
};

export const LAB_SKELETONS: Record<number, string> = {
  0: `# Lab 0\n# 这个 Lab 主要是环境体验与运行验证。\n# 后续会在这里展示安装步骤与检查命令。`,
  1: `export type Message = {\n  role: 'user' | 'assistant';\n  content: string;\n};\n\n// TODO: 实现消息协议`,
  2: `export type ToolDefinition = {\n  name: string;\n  description: string;\n  inputSchema: Record<string, unknown>;\n};\n\n// TODO: 实现工具注册与执行`,
  3: `import type { Message, AgentEvent, ToolDefinition } from '../../../shared/types';\n\n/**\n * Agent Loop — chatbot 变成 agent 的唯一东西。\n *\n * 完成 6 个 TODO，实现 while(true) 核心循环。\n * 完成后运行测试：npx vitest run labs/lab-03-agent-loop/\n */\nexport async function* agentLoop(\n  client: LLMClient,\n  executor: ToolExecutor,\n  systemPrompt: string,\n  userMessage: string,\n  options?: { maxTurns?: number }\n): AsyncGenerator<AgentEvent> {\n\n  const maxTurns = options?.maxTurns ?? 25;\n\n  // TODO 1: 初始化对话历史\n  // 创建 messages 数组，添加初始用户消息\n  // { role: 'user', content: userMessage }\n\n  let turnCount = 0;\n\n  while (true) {\n    turnCount++;\n\n    // TODO 2: 检查是否超过最大迭代次数\n    // if (turnCount > maxTurns) → yield error + return\n\n    // TODO 3: 调用 LLM\n    // const response = await client.chat(messages, { ... })\n\n    // TODO 4: 处理响应（yield text，收集 toolUseBlocks）\n\n    // TODO 5: 无工具调用 → yield done + return\n\n    // TODO 6: 执行工具，yield events，更新 messages\n  }\n}\n`,
  4: `// TODO: 为 Agent 增加 TodoWrite 规划能力`,
  5: `// TODO: 为 Agent 增加上下文压缩能力`,
};

export const LAB_FILE_NAMES: Record<number, string> = {
  0: "README.md",
  1: "messages.ts",
  2: "tools.ts",
  3: "agent-loop.ts",
  4: "planning.ts",
  5: "context-compression.ts",
};
