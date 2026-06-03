# AI Agent 上下文文档 — Lab 3 核心内容

> 把这份文档发给你的 AI 工具（Codex、Copilot、ChatGPT 等），它就能理解整个项目并帮你完成任务。

---

## 项目概览

**项目名称**：Build Your Own Claude Code (BYOCC)

**一句话介绍**：一个基于真实 Claude Code 源码（416,500 行 TypeScript）的渐进式教学平台。学习者通过 6 个 Lab 逐步实现 AI Agent 的核心模块，最终看到真实的 Claude Code TUI 由自己写的代码驱动。

**你负责 Lab 3（Agent Loop）— 这是整个项目最重要的部分。**

## Agent Loop 是什么

```
普通聊天机器人：
  用户 → LLM 回复 → 结束（一问一答）

Agent：
  用户 → LLM "我要读文件" → 执行 read_file → 结果喂回 LLM
       → LLM "我要写文件" → 执行 write_file → 结果喂回 LLM
       → LLM "搞定了" → 结束
  （自主循环，直到任务完成）
```

这个「LLM → 工具 → 喂回 → LLM → ...」的 while(true) 循环就是 Agent Loop。Claude Code 的 query.ts 有 1,729 行，但核心循环只有 ~15 行。

## 项目结构（与你相关的部分）

```
build-your-own-claude-code/
├── shared/
│   └── types.ts              ← 所有 Lab 共享的类型定义（必读！）
├── labs/
│   └── lab-03-agent-loop/    ← 你要在这里创建文件
│       ├── src/
│       │   └── agent-loop.ts     ← 骨架代码（6 个 TODO）
│       ├── tests/
│       │   ├── mock-llm.ts       ← Mock LLM 和 Mock ToolExecutor
│       │   └── agent-loop.test.ts ← 12 个测试用例
│       ├── solution/
│       │   └── agent-loop.ts     ← 参考实现（完整答案）
│       └── demo.ts              ← 可运行 Demo
└── internal/
    └── LAB_DESIGN.md         ← 完整设计文档（必读第五节！）
```

## shared/types.ts 内容（你的代码必须使用这些类型）

```typescript
type Role = 'user' | 'assistant';

interface TextBlock { type: 'text'; text: string; }
interface ToolUseBlock { type: 'tool_use'; id: string; name: string; input: Record<string, unknown>; }
interface ToolResultBlock { type: 'tool_result'; tool_use_id: string; content: string; is_error?: boolean; }
type ContentBlock = TextBlock | ToolUseBlock | ToolResultBlock;

interface Message { role: Role; content: string | ContentBlock[]; }

interface ToolDefinition { name: string; description: string; input_schema: JSONSchema; }
interface ToolResult { content: string; is_error?: boolean; }

// Agent 事件流（agentLoop 用 yield 输出的事件类型）
type AgentEvent =
  | { type: 'text'; content: string }
  | { type: 'tool_call'; name: string; input: Record<string, unknown> }
  | { type: 'tool_result'; name: string; output: string; is_error?: boolean }
  | { type: 'done'; finalMessage: string }
  | { type: 'error'; error: string };

type StopReason = 'end_turn' | 'tool_use' | 'max_tokens';
```

## 你的任务：4 个文件

### 文件 1：`tests/mock-llm.ts` — Mock 测试基础设施

创建一个假的 LLM 和假的 ToolExecutor，用于测试。

需要导出：
- `createMockLLM(responses: ChatResponse[])` — 按顺序返回预定义回复
- `createMockExecutor(results?: Record<string, string>)` — 所有工具调用返回成功
- 预定义场景常量：SCENARIO_SIMPLE_CHAT, SCENARIO_SINGLE_TOOL, SCENARIO_CHAIN_TOOLS, SCENARIO_PURE_TOOL_USE, SCENARIO_EMPTY_CONTENT, createInfiniteToolScenario(n)

ChatResponse 接口：
```typescript
interface ChatResponse {
  content: ContentBlock[];
  stopReason: StopReason;
}
```

### 文件 2：`tests/agent-loop.test.ts` — 12 个测试

使用 Vitest。测试列表：

| # | 名称 | Mock 行为 | 验证 |
|---|------|----------|------|
| 1 | 简单问答 | 返回 text 无 tool_use | events: [text, done] |
| 2 | 单工具调用 | 第1轮 text+tool_use，第2轮 text | events 包含 tool_call + tool_result |
| 3 | 链式工具 | 3 轮工具调用 | 3 次 tool_call |
| 4 | 单轮多工具 | 1 轮返回 2 个 tool_use | 2 个 tool_call + 2 个 tool_result |
| 5 | maxTurns 边界(=3) | 每轮返回 tool_use | 恰好第 4 轮 yield error |
| 6 | LLM 报错 | chat() throws | yield error |
| 7 | 工具失败 | tool 返回 is_error | LLM 第2轮看到错误 |
| 8 | 对话历史正确性 | 2 轮工具 | messages 顺序正确 |
| 9 | 空 content | content: [] | yield done 不崩溃 |
| 10 | 纯 tool_use 无 text | 只有 tool_use 无 text | 正常执行 |
| 11 | is_error 传播 | tool 返回 is_error: true | messages 中保留 is_error |
| 12 | maxTurns=1 | 1 轮后 tool_use | 第 2 轮 error |

### 文件 3：`src/agent-loop.ts` — 骨架（6 个 TODO）

```typescript
import type { Message, ContentBlock, ToolUseBlock, ToolResultBlock, AgentEvent, ToolDefinition } from '../../../shared/types';

// 依赖接口（依赖注入模式）
export interface ChatResponse {
  content: ContentBlock[];
  stopReason: 'end_turn' | 'tool_use' | 'max_tokens';
}

export interface LLMClient {
  chat(messages: Message[], options?: { tools?: ToolDefinition[]; systemPrompt?: string }): Promise<ChatResponse>;
}

export interface ToolExecutor {
  executeToolCall(toolUse: ToolUseBlock): Promise<ToolResultBlock>;
  executeToolCalls(toolUses: ToolUseBlock[]): Promise<ToolResultBlock[]>;
  getToolDefinitions(): ToolDefinition[];
}

export async function* agentLoop(
  client: LLMClient,
  executor: ToolExecutor,
  systemPrompt: string,
  userMessage: string,
  options?: { maxTurns?: number }
): AsyncGenerator<AgentEvent> {
  const maxTurns = options?.maxTurns ?? 25;

  // TODO 1: 初始化 messages 数组，添加用户消息
  // TODO 2: while(true) 中检查 turnCount > maxTurns
  // TODO 3: 调用 client.chat(messages, ...)
  // TODO 4: 遍历 response.content，yield text 事件，收集 toolUseBlocks
  // TODO 5: 无 toolUseBlocks → yield done + return
  // TODO 6: 执行工具，yield tool_call/tool_result，更新 messages
}
```

**重要**：每个 TODO 的注释要详细，指导学习者一步步实现。参考 `internal/LAB_DESIGN.md` 第五节的完整 TODO 注释。

### 文件 4：`solution/agent-loop.ts` — 参考实现

把骨架的 6 个 TODO 全部实现。这是"答案"——学习者做完后对比。

### 文件 5：`demo.ts` — 可运行 Demo

```bash
npx tsx labs/lab-03-agent-loop/demo.ts
```

使用 Mock LLM 运行 agentLoop，格式化打印每个事件：
- text → 💬 Agent: "..."
- tool_call → 🔧 Tool: name(input)
- tool_result → ✅ Result: output
- done → 🏁 Agent completed in N turns

## 验证标准

```bash
# 骨架状态 → 12 个测试全失败（throw Error）
npx vitest run labs/lab-03-agent-loop/

# 用 solution 替换 src → 12 个测试全通过
cp labs/lab-03-agent-loop/solution/agent-loop.ts labs/lab-03-agent-loop/src/
npx vitest run labs/lab-03-agent-loop/

# Demo 可运行
npx tsx labs/lab-03-agent-loop/demo.ts
```

## 编码规范

- TypeScript strict，ESM（import/export）
- 所有类型从 `shared/types.ts` 导入
- 不使用 any
- 注释用中文（学习者是中国大学生）
- 测试用 Vitest（`describe`, `it`, `expect`）

---

## 给 AI 的完整提示词

直接复制以下内容发给你的 AI 工具：

---

**背景**：我在做一个 AI Agent 教学项目。需要实现 Lab 3（Agent Loop）的全部文件。

**Agent Loop 是什么**：一个 while(true) 循环，不断调用 LLM → 检查是否需要工具 → 执行工具 → 结果喂回 → 继续循环。没有工具调用时退出。这是 chatbot 变成 agent 的核心。

**共享类型**（所有代码必须使用这些类型）：
```typescript
type Role = 'user' | 'assistant';
interface TextBlock { type: 'text'; text: string; }
interface ToolUseBlock { type: 'tool_use'; id: string; name: string; input: Record<string, unknown>; }
interface ToolResultBlock { type: 'tool_result'; tool_use_id: string; content: string; is_error?: boolean; }
type ContentBlock = TextBlock | ToolUseBlock | ToolResultBlock;
interface Message { role: Role; content: string | ContentBlock[]; }
interface ToolDefinition { name: string; description: string; input_schema: { type: string; properties?: Record<string, unknown>; required?: string[]; }; }
type AgentEvent =
  | { type: 'text'; content: string }
  | { type: 'tool_call'; name: string; input: Record<string, unknown> }
  | { type: 'tool_result'; name: string; output: string; is_error?: boolean }
  | { type: 'done'; finalMessage: string }
  | { type: 'error'; error: string };
type StopReason = 'end_turn' | 'tool_use' | 'max_tokens';
```

**需要创建 5 个文件**，全部在 `labs/lab-03-agent-loop/` 目录下：

1. **tests/mock-llm.ts** — Mock LLM 和 Mock ToolExecutor
   - `createMockLLM(responses)` 按顺序返回预定义回复
   - `createMockExecutor()` 所有工具调用返回成功
   - 6 个预定义场景（简单问答、单工具、链式工具、纯 tool_use、空 content、无限循环）

2. **tests/agent-loop.test.ts** — 12 个 Vitest 测试用例
   测试覆盖：简单问答、单工具、链式工具、多工具、maxTurns 边界、LLM 报错、工具失败、对话历史正确性、空 content、纯 tool_use、is_error 传播、maxTurns=1

3. **src/agent-loop.ts** — 骨架代码（学习者要填的）
   - 导出 agentLoop 函数（AsyncGenerator<AgentEvent>）
   - 6 个 TODO，每个 TODO 有详细中文注释指导实现
   - 接口定义在文件内（LLMClient, ToolExecutor, ChatResponse）
   - 使用依赖注入模式（不直接导入其他 Lab 的代码）

4. **solution/agent-loop.ts** — 完整参考实现（所有 TODO 实现完毕）

5. **demo.ts** — Mock 模式可运行 demo
   - 用 createMockLLM + SCENARIO_SINGLE_TOOL 运行 agentLoop
   - 格式化打印每个事件（💬🔧✅🏁）

**要求**：
- TypeScript strict, ESM
- 注释用中文
- 骨架状态下测试全失败（throw Error('TODO')），solution 替换后全通过
- 类型从 `../../../shared/types` 导入（相对路径）
- Vitest 测试框架

请逐个文件生成完整代码。
