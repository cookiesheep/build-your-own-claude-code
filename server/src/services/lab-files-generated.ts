/**
 * Auto-generated from platform/src/lib/lab-files.json
 * Do not edit by hand.
 */

export type LabFileDef = {
  path: string;
  editable: boolean;
  skeleton: string;
};

export const LAB_FILES: Record<number, LabFileDef[]> = {
  "0": [
    {
      "path": "src/components/LogoV2/Clawd-lab0.tsx",
      "editable": true,
      "skeleton": "// Lab 0: 定制 Clawd Logo 组件\n// 按照 TODO 提示修改\n"
    },
    {
      "path": "src/components/LogoV2/WelcomeV2-lab0.tsx",
      "editable": true,
      "skeleton": "// Lab 0: 定制 Welcome 页面\n"
    },
    {
      "path": "src/components/LogoV2/LogoV2-lab0.tsx",
      "editable": true,
      "skeleton": "// Lab 0: 定制 Logo 主组件\n"
    },
    {
      "path": "src/components/LogoV2/CondensedLogo-lab0.tsx",
      "editable": true,
      "skeleton": "// Lab 0: 定制紧凑 Logo\n"
    },
    {
      "path": "src/entrypoints/cli-lab0.tsx",
      "editable": true,
      "skeleton": "// Lab 0: 定制 CLI 入口\n"
    },
    {
      "path": "src/main-lab0.tsx",
      "editable": true,
      "skeleton": "// Lab 0: 定制主入口\n"
    }
  ],
  "1": [
    {
      "path": "src/messages-lab1.ts",
      "editable": true,
      "skeleton": "export type Message = {\n  role: 'user' | 'assistant';\n  content: string;\n};\n\n// TODO: 实现消息协议"
    }
  ],
  "2": [
    {
      "path": "src/tools/read-file-lab2.ts",
      "editable": true,
      "skeleton": "// TODO: 实现 read_file 工具"
    },
    {
      "path": "src/tools/write-file-lab2.ts",
      "editable": true,
      "skeleton": "// TODO: 实现 write_file 工具"
    },
    {
      "path": "src/tools/bash-lab2.ts",
      "editable": true,
      "skeleton": "// TODO: 实现 bash 工具"
    }
  ],
  "3": [
    {
      "path": "src/query-lab3.ts",
      "editable": true,
      "skeleton": "import type { Message, AgentEvent, ToolDefinition } from '../../../shared/types';\n\n/**\n * Agent Loop — chatbot 变成 agent 的唯一东西。\n *\n * 完成 6 个 TODO，实现 while(true) 核心循环。\n * 完成后运行测试：npx vitest run labs/lab-03-agent-loop/\n */\nexport async function* agentLoop(\n  client: LLMClient,\n  executor: ToolExecutor,\n  systemPrompt: string,\n  userMessage: string,\n  options?: { maxTurns?: number }\n): AsyncGenerator<AgentEvent> {\n\n  const maxTurns = options?.maxTurns ?? 25;\n\n  // TODO 1: 初始化对话历史\n  // 创建 messages 数组，添加初始用户消息\n\n  let turnCount = 0;\n\n  while (true) {\n    turnCount++;\n\n    // TODO 2: 检查是否超过最大迭代次数\n    // if (turnCount > maxTurns) → yield error + return\n\n    // TODO 3: 调用 LLM\n    // const response = await client.chat(messages, { ... })\n\n    // TODO 4: 处理响应（yield text，收集 toolUseBlocks）\n\n    // TODO 5: 无工具调用 → yield done + return\n\n    // TODO 6: 执行工具，yield events，更新 messages\n  }\n}"
    }
  ],
  "4": [
    {
      "path": "src/agent/subagent-lab4.ts",
      "editable": true,
      "skeleton": "// TODO: 为 Agent 增加 Subagent 能力"
    },
    {
      "path": "src/agent/todo-write-lab4.ts",
      "editable": true,
      "skeleton": "// TODO: 为 Agent 增加 TodoWrite 规划能力"
    }
  ],
  "5": [
    {
      "path": "src/context/compress-lab5.ts",
      "editable": true,
      "skeleton": "// TODO: 为 Agent 增加上下文压缩能力"
    }
  ]
} as const;
