# AI Agent 上下文文档 — Lab 1 + Lab 2 扩展内容

> 把这份文档发给你的 AI 工具（Codex、Copilot、ChatGPT 等），它就能理解整个项目并帮你完成任务。

---

## 项目概览

**项目名称**：Build Your Own Claude Code (BYOCC)

**一句话介绍**：渐进式教学平台，学习者通过 6 个 Lab 实现 AI Agent 核心模块。你负责 Lab 1（消息协议）和 Lab 2（工具系统）。

## Lab 1 和 Lab 2 在整个项目中的位置

```
Lab 0: 环境搭建（无代码）
Lab 1: 消息协议 ← 你负责（Agent 的"血液"—— 消息格式）
Lab 2: 工具系统 ← 你负责（Agent 的"手脚"—— 工具执行）
Lab 3: Agent Loop（核心循环，另一个人负责）
Lab 4+: 高级功能
```

Lab 1 教学习者理解 LLM 对话的数据结构。Lab 2 教学习者实现工具系统。它们是 Lab 3 的基础。

## 共享类型（所有代码必须使用）

文件位置：`shared/types.ts`

```typescript
type Role = 'user' | 'assistant';
interface TextBlock { type: 'text'; text: string; }
interface ToolUseBlock { type: 'tool_use'; id: string; name: string; input: Record<string, unknown>; }
interface ToolResultBlock { type: 'tool_result'; tool_use_id: string; content: string; is_error?: boolean; }
type ContentBlock = TextBlock | ToolUseBlock | ToolResultBlock;
interface Message { role: Role; content: string | ContentBlock[]; }
interface JSONSchema { type: string; properties?: Record<string, unknown>; required?: string[]; description?: string; }
interface ToolDefinition { name: string; description: string; input_schema: JSONSchema; }
interface ToolResult { content: string; is_error?: boolean; }
type AgentEvent = { type: 'text'; content: string } | { type: 'tool_call'; name: string; input: Record<string, unknown> } | { type: 'tool_result'; name: string; output: string; is_error?: boolean } | { type: 'done'; finalMessage: string } | { type: 'error'; error: string };
```

## 你的任务

### Lab 1：消息协议（labs/lab-01-messages/）

需要创建的文件：

```
labs/lab-01-messages/
├── src/
│   ├── types.ts          ← 骨架：2 个辅助函数 TODO
│   ├── conversation.ts   ← 骨架：Conversation 类 5 个方法 TODO
│   └── llm-client.ts     ← 骨架：LLMClient 类 2 个 TODO
├── tests/
│   ├── types.test.ts     ← 2 个测试
│   ├── conversation.test.ts ← 3 个测试
│   └── llm-client.test.ts  ← 1 个测试（Mock Anthropic SDK）
├── solution/             ← 完整参考实现
│   ├── types.ts
│   ├── conversation.ts
│   └── llm-client.ts
└── demo.ts              ← 可运行 Demo（展示消息结构）
```

**Lab 1 核心知识点**：
- Message 的 role 只有 'user' 和 'assistant'
- content 可以是字符串或 ContentBlock 数组
- **tool_result 的 role 是 'user'**（最反直觉！这是 Agent 能循环的关键）
- Conversation 类管理消息历史

### Lab 2：工具系统（labs/lab-02-tools/）

需要创建的文件：

```
labs/lab-02-tools/
├── src/
│   ├── tool-registry.ts  ← 骨架：ToolRegistry 类 4 个方法 TODO
│   ├── tools/
│   │   ├── read-file.ts  ← 骨架：1 个 TODO
│   │   ├── write-file.ts ← 骨架：1 个 TODO
│   │   └── bash-execute.ts ← 骨架：1 个 TODO（超时机制已提供）
│   └── tool-executor.ts  ← 骨架：ToolExecutor 类 3 个方法 TODO
├── tests/
│   ├── tool-registry.test.ts ← 2 个测试
│   ├── tools.test.ts         ← 4 个测试
│   └── tool-executor.test.ts ← 2 个测试
├── solution/
└── demo.ts
```

**Lab 2 核心知识点**：
- LLM 不执行工具——它只输出 tool_use 块，Harness 负责执行
- 工具通过 JSON Schema 描述接口（告诉 LLM 有哪些参数）
- 错误不 crash，返回 is_error: true（让 LLM 自己纠正）
- 3 个核心工具足够：read_file + write_file + bash_execute

**Tool 接口**：
```typescript
interface Tool {
  name: string;
  description: string;
  inputSchema: JSONSchema;
  execute(input: Record<string, unknown>): Promise<ToolResult>;
}
```

## 验证标准

```bash
# Lab 1：骨架状态下测试全失败，solution 替换后全通过
npx vitest run labs/lab-01-messages/

# Lab 2：同上
npx vitest run labs/lab-02-tools/

# Demo 可运行
npx tsx labs/lab-01-messages/demo.ts
npx tsx labs/lab-02-tools/demo.ts
```

## 编码规范

- TypeScript strict, ESM
- 类型从 `../../../shared/types` 导入
- 注释用中文
- 骨架方法体用 `throw new Error('TODO: 实现 xxx')` 占位
- 测试用 Vitest（describe, it, expect）
- 工具测试用临时文件（vitest 的 beforeEach/afterEach 清理）

---

## 给 AI 的完整提示词

---

**背景**：我在做一个 AI Agent 教学项目，需要实现 Lab 1（消息协议）和 Lab 2（工具系统）的骨架代码、测试和参考实现。

**共享类型定义**（所有代码必须使用）：
```typescript
type Role = 'user' | 'assistant';
interface TextBlock { type: 'text'; text: string; }
interface ToolUseBlock { type: 'tool_use'; id: string; name: string; input: Record<string, unknown>; }
interface ToolResultBlock { type: 'tool_result'; tool_use_id: string; content: string; is_error?: boolean; }
type ContentBlock = TextBlock | ToolUseBlock | ToolResultBlock;
interface Message { role: Role; content: string | ContentBlock[]; }
interface JSONSchema { type: string; properties?: Record<string, unknown>; required?: string[]; }
interface ToolDefinition { name: string; description: string; input_schema: JSONSchema; }
interface ToolResult { content: string; is_error?: boolean; }
```

**Lab 1 需要 7 个文件**（在 `labs/lab-01-messages/` 下）：

骨架文件（src/）：
1. `src/types.ts` — 2 个辅助函数：createTextBlock(text) 和 createToolResultBlock(toolUseId, content, isError?)。骨架用 throw new Error('TODO') 占位。
2. `src/conversation.ts` — Conversation 类，5 个方法：addUserMessage, addAssistantMessage, addToolResults, getMessages（返回副本）, estimateTokens（JSON.stringify/4）
3. `src/llm-client.ts` — LLMClient 类，constructor(apiKey?) + chat(messages, options?)。使用 @anthropic-ai/sdk。

测试（tests/）：
4. `tests/types.test.ts` — 测试两个辅助函数
5. `tests/conversation.test.ts` — 测试 addUserMessage、addToolResults 的 role 是 'user'、getMessages 返回副本
6. `tests/llm-client.test.ts` — Mock Anthropic SDK 测试 chat 方法

参考实现（solution/）+ Demo：
7. solution/ 目录下 3 个完整实现文件 + demo.ts

**Lab 2 需要 10 个文件**（在 `labs/lab-02-tools/` 下）：

骨架文件（src/）：
1. `src/tool-registry.ts` — ToolRegistry 类（register, get, getToolDefinitions, listTools）
2. `src/tools/read-file.ts` — 读文件工具（fs/promises，带行号）
3. `src/tools/write-file.ts` — 写文件工具（自动创建目录）
4. `src/tools/bash-execute.ts` — 执行命令工具（30s 超时，用 execFile + timeout 选项）
5. `src/tool-executor.ts` — ToolExecutor 类（executeToolCall, executeToolCalls, getToolDefinitions）

测试 + 参考实现 + Demo：同 Lab 1 模式。

**要求**：
- TypeScript strict, ESM
- 注释用中文（学习者是中国大学生）
- 骨架状态下测试全失败，solution 替换后全通过
- 类型从 `../../../shared/types` 导入
- Vitest 测试框架
- 工具测试用临时文件目录（beforeEach 创建，afterEach 删除）

请先生成 Lab 1 的全部文件，再生成 Lab 2 的全部文件。
