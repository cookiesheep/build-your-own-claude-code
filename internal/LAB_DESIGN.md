# Lab 设计文档 — 全部 Lab (0-5) Skeleton、测试与反馈机制

> 本文档由 RALPLAN 共识规划生成（Planner → Architect → Critic）。
> 所有设计决策附带原因。这是 Lab 代码实现的唯一权威依据。
> **v2 修订（2026-04-08）**：整合 Architect 审查反馈，修复跨 Lab 导入架构缺陷。

---

## RALPLAN-DR 决策摘要

### 设计原则（Principles）

1. **渐进式能力增长**：每个 Lab 只加一个核心机制，学习者不会被认知过载
2. **双重反馈闭环**：每个 Lab 同时提供 vitest 测试通过 + 可运行 demo/TUI 变化
3. **真实代码映射**：所有接口设计镜像 Claude Code 真实源码（query.ts / QueryDeps / runTools）
4. **Mock-first 离线测试**：所有测试用 Mock LLM，不需要 API Key，任何机器确定性运行
5. **前后衔接**：Lab N 的完成品 = Lab N+1 的起点

### 决策驱动因素（Decision Drivers）

1. **Owner 重视反馈**："vitest pass 太低级了，能多一个反馈就多一个"
2. **开源吸引力**：学习者零门槛体验，每一步都有 wow factor
3. **12 周可交付**：Lab 0-3 为必交付，Lab 4-5 为后续开源迭代

### Lab 总览（修订版，6→7 Labs）

| Lab | 主题 | 学习者实现什么 | 核心文件 | 反馈 |
|-----|------|--------------|---------|------|
| 0 | 环境 + 体验 | 安装运行完整 Claude Code | 无代码 | 看到完整 TUI |
| 1 | 消息协议 | Message 类型 + Conversation + LLMClient | types.ts, conversation.ts, llm-client.ts | vitest + demo + TUI预览 |
| 2 | 工具系统 | ToolRegistry + 3 个工具 + ToolExecutor | tool-registry.ts, tools/, tool-executor.ts | vitest + demo + TUI预览 |
| **3** | **Agent Loop ★** | **while(true) 核心循环** | **agent-loop.ts** | **vitest + demo + 真实 TUI** |
| 4 | 规划（TodoWrite） | TodoManager + todo_write 工具 | todo-manager.ts, todo-tool.ts | vitest + demo + TUI |
| 5 | 子 Agent | 独立 messages[] 的 Subagent | subagent.ts | vitest + demo |
| 6* | 上下文压缩 | micro_compact + auto_compact | compact.ts | vitest + demo |

> *Lab 5-6 为后续开源迭代内容，答辩前不强求完成。Lab 4 从原来的合并拆分为 Lab 4 (TodoWrite) + Lab 5 (Subagent)。

---

## 一、统一目录结构

每个 Lab 采用统一结构：

```
labs/
├── lab-00-environment/
│   └── README.md                    # 安装指南
├── lab-01-messages/
│   ├── src/
│   │   ├── types.ts                 # 骨架：TODO 补全 ContentBlock 联合类型
│   │   ├── conversation.ts          # 骨架：TODO 补全 Conversation 类
│   │   └── llm-client.ts            # 骨架：TODO 补全 LLMClient
│   ├── tests/
│   │   ├── types.test.ts
│   │   ├── conversation.test.ts
│   │   └── llm-client.test.ts
│   ├── solution/                    # 参考实现（完成后对比）
│   │   ├── types.ts
│   │   ├── conversation.ts
│   │   └── llm-client.ts
│   ├── demo.ts                      # Mock 模式可运行 demo
│   └── query-lab-01.ts              # 预置的 TUI 反馈版本
├── lab-02-tools/
│   ├── src/
│   │   ├── tool-registry.ts         # 骨架
│   │   ├── tools/
│   │   │   ├── read-file.ts         # 骨架
│   │   │   ├── write-file.ts        # 骨架
│   │   │   └── bash-execute.ts      # 骨架
│   │   └── tool-executor.ts         # 骨架
│   ├── tests/
│   ├── solution/
│   ├── demo.ts
│   └── query-lab-02.ts              # 预置 TUI 反馈
├── lab-03-agent-loop/               # ★ 核心 Lab
│   ├── src/
│   │   └── agent-loop.ts            # 骨架：6 个 TODO
│   ├── tests/
│   │   └── agent-loop.test.ts       # 8 个 Mock 测试
│   ├── solution/
│   │   └── agent-loop.ts
│   ├── demo.ts                      # Mock + Live 模式
│   └── query-lab-03.ts              # 学习者自己实现的版本注入 TUI
├── lab-04-planning/
│   ├── src/
│   │   ├── todo-manager.ts          # 骨架
│   │   └── todo-tool.ts             # 骨架
│   ├── tests/
│   ├── solution/
│   └── demo.ts
├── lab-05-subagent/
│   ├── src/
│   │   └── subagent.ts              # 骨架
│   ├── tests/
│   ├── solution/
│   └── demo.ts
└── lab-06-context-compression/      # 后续开源
    ├── src/
    │   └── compact.ts
    ├── tests/
    ├── solution/
    └── demo.ts
```

### 设计原因

- **统一结构** → 学习者建立模式识别，不需要每次重新理解目录
- **solution/ 目录** → learn-claude-code 的优势（可运行参考），我们保留
- **demo.ts** → 比"5/5 passed"强 10 倍的获得感（Owner 明确要求）
- **query-lab-XX.ts** → Lab 1-2 的 TUI 预览（预构建好的，学习者不需要自己写）
- **tests/ 和 solution/ 分离** → 学习者先做测试驱动，卡住再看答案

---

## 二、Lab 0：环境与体验

### 目标
让学习者看到"终点"——完整的 Claude Code TUI，建立直觉和动力。

### 内容（无代码）
1. 安装 Node.js 18+, Git
2. Clone build-your-own-claude-code，运行 `npm install && npm test`
3. （可选）Clone claude-code-diy，构建并运行 `node cli.js`
4. TypeScript 基础练习（可选）

### 反馈
- `npm test` 全部通过 → 环境正常
- `node cli.js` → 看到完整 TUI 界面

### 设计原因
- learn-claude-code 没有"先看终点"的环节，学习者不知道自己在做什么
- YatSenOS 的做法：先启动完整系统，再逐步理解内部

---

## 三、Lab 1：消息协议（让 Agent 会说话）

### 学习目标
理解 Anthropic Messages API 的消息格式，这是所有后续 Lab 的基础。

### 骨架设计

**src/types.ts** — 3 个 TODO：
```typescript
import type { Role, ContentBlock, Message } from '../../../shared/types';

// TODO 1: 导出 Role 类型（已在 shared/types 中定义，此处 re-export）
// 学习者需要理解 Role 只有 'user' | 'assistant'

// TODO 2: 定义一个辅助函数 createTextBlock(text: string): TextBlock
// 提示：返回 { type: 'text', text }

// TODO 3: 定义一个辅助函数 createToolResultBlock(toolUseId, content, isError?): ToolResultBlock  
// 提示：tool_result 的 role 是 'user'，但它不是用户发的
```

**src/conversation.ts** — 5 个 TODO：
```typescript
import type { Message, ContentBlock, ToolResultBlock } from '../../../shared/types';

export class Conversation {
  private messages: Message[] = [];

  // TODO 1: addUserMessage(text: string): void
  //   创建 role='user' 的消息，content 为字符串

  // TODO 2: addAssistantMessage(content: ContentBlock[]): void
  //   创建 role='assistant' 的消息

  // TODO 3: addToolResults(results: ToolResultBlock[]): void
  //   创建 role='user' 的消息，content 为 ToolResultBlock[]
  //   ★ 注意：tool_result 的 role 是 'user'！这是 Agent 能循环的关键

  // TODO 4: getMessages(): Message[]
  //   返回消息历史的副本（不可变）

  // TODO 5: estimateTokens(): number
  //   粗略估算 token 数（JSON.stringify 长度 / 4）
}
```

**src/llm-client.ts** — 2 个 TODO：
```typescript
import Anthropic from '@anthropic-ai/sdk';
import type { Message, ToolDefinition, ContentBlock, StopReason } from '../../../shared/types';

export interface ChatResponse {
  content: ContentBlock[];
  stopReason: StopReason;
}

export class LLMClient {
  private client: Anthropic;

  // TODO 1: constructor(apiKey?: string)
  //   初始化 Anthropic client
  //   如果没有 apiKey，从环境变量 ANTHROPIC_API_KEY 读取

  // TODO 2: async chat(messages: Message[], options?: { tools?: ToolDefinition[], systemPrompt?: string }): Promise<ChatResponse>
  //   调用 anthropic.messages.create()
  //   返回 { content, stopReason }
}
```

### 测试用例（6 个）

| # | 测试名 | 验证什么 | Mock 行为 |
|---|--------|---------|----------|
| 1 | `createTextBlock 返回正确格式` | 辅助函数 | 无需 Mock |
| 2 | `createToolResultBlock 包含 tool_use_id` | 辅助函数 | 无需 Mock |
| 3 | `Conversation 添加用户消息` | addUserMessage | 无需 Mock |
| 4 | `Conversation 添加工具结果消息 role 为 user` | addToolResults 的 role | 无需 Mock |
| 5 | `Conversation.getMessages 返回副本` | 不可变性 | 无需 Mock |
| 6 | `LLMClient.chat 返回正确的 ChatResponse` | API 调用 | Mock Anthropic SDK |

### demo.ts 设计
```
$ npx tsx labs/lab-01-messages/demo.ts

📨 构建对话历史...
  [user] "帮我创建 hello.js"
  [assistant] text: "好的" + tool_use: write_file
  [user] tool_result: "文件已创建"         ← 注意：role 是 user！
  [assistant] text: "完成！"

📊 消息统计：
  总消息数: 4
  估算 tokens: ~320
  包含 tool_use: 1 次
  包含 tool_result: 1 次

✅ Lab 1 完成！你已理解 Agent 对话的数据结构。
```

### query-lab-01.ts（TUI 预览）
预构建版本——只调用 LLM 返回文字，不支持工具执行。学习者 `build --lab 1` 后看到：Agent 能回复文字，但说"我来创建文件"后什么也不做。

### 设计原因
- **为什么先教消息格式**：这是 Claude Code 的"血液"，不理解消息格式就无法理解后续的工具调用和循环
- **为什么 tool_result.role = 'user' 要重点强调**：这是最反直觉的设计，但它是 Agent 能循环的关键——工具结果伪装成"用户消息"喂回 LLM
- **为什么 LLMClient 用真实 Anthropic SDK**：让学习者接触真实 API，为后续的 Live 模式做准备

---

## 四、Lab 2：工具系统（给 Agent 一双手）

### 学习目标
理解 Tool Calling 的完整链路：LLM 请求 → Harness 执行 → 结果喂回。

### 骨架设计

**src/tool-registry.ts** — 4 个 TODO：
```typescript
import type { ToolDefinition, ToolResult } from '../../../shared/types';

export interface Tool {
  name: string;
  description: string;
  inputSchema: JSONSchema;
  execute(input: Record<string, unknown>): Promise<ToolResult>;
}

export class ToolRegistry {
  private tools: Map<string, Tool> = new Map();

  // TODO 1: register(tool: Tool): void
  // TODO 2: get(name: string): Tool | undefined
  // TODO 3: getToolDefinitions(): ToolDefinition[]
  //   将所有 Tool 转换为 Anthropic API 所需的 ToolDefinition 格式
  // TODO 4: listTools(): string[]
}
```

**src/tools/read-file.ts** — 1 个 TODO：
```typescript
import type { Tool } from '../tool-registry';
import { readFile } from 'fs/promises';

// TODO: 实现 readFileTool
// name: 'read_file'
// inputSchema: { path: string }
// execute: 读取文件内容，带行号前缀，错误时返回 is_error: true
export const readFileTool: Tool = { /* TODO */ };
```

**src/tools/write-file.ts** — 1 个 TODO（同上模式）

**src/tools/bash-execute.ts** — 1 个 TODO（超时机制已 scaffold）：
```typescript
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);
const TIMEOUT_MS = 30_000; // 30 秒超时，已提供

// TODO: 实现 bashExecuteTool
// name: 'bash_execute'
// inputSchema: { command: string }
// execute: 使用 execFileAsync('bash', ['-c', command], { timeout: TIMEOUT_MS })
//   成功 → 返回 stdout
//   超时/失败 → 返回 is_error: true + stderr 信息
// 提示：execFileAsync 的 timeout 选项会自动杀掉超时进程
```

**src/tool-executor.ts** — 3 个 TODO：
```typescript
import type { ToolUseBlock, ToolResultBlock } from '../../../shared/types';
import type { ToolRegistry } from './tool-registry';

export class ToolExecutor {
  constructor(private registry: ToolRegistry) {}

  // TODO 1: async executeToolCall(toolUse: ToolUseBlock): Promise<ToolResultBlock>
  //   根据 name 找到 tool → 执行 → 包装为 ToolResultBlock
  //   找不到 tool → 返回 is_error: true 的结果（不要 crash！）

  // TODO 2: async executeToolCalls(toolUses: ToolUseBlock[]): Promise<ToolResultBlock[]>
  //   串行执行所有 tool calls（Lab 3 之后再考虑并行）

  // TODO 3: getToolDefinitions(): ToolDefinition[]
  //   转发到 registry
}
```

### 测试用例（8 个）

| # | 测试名 | 验证什么 |
|---|--------|---------|
| 1 | `ToolRegistry 注册和获取工具` | register + get |
| 2 | `ToolRegistry.getToolDefinitions 格式正确` | API 兼容格式 |
| 3 | `read_file 读取存在的文件` | 正常路径 |
| 4 | `read_file 读取不存在的文件返回 is_error` | 错误处理 |
| 5 | `write_file 创建文件并自动创建目录` | mkdir -p 行为 |
| 6 | `bash_execute 返回 stdout` | 正常执行 |
| 7 | `ToolExecutor 执行已知工具` | 正常路径 |
| 8 | `ToolExecutor 执行未知工具返回 is_error` | 优雅降级 |

### demo.ts 设计
```
$ npx tsx labs/lab-02-tools/demo.ts

🔧 注册工具: read_file, write_file, bash_execute
📋 工具定义（发送给 LLM 的格式）:
  [{ name: "read_file", description: "...", input_schema: {...} }, ...]

🎬 模拟工具执行:
  LLM 请求: tool_use { name: "write_file", input: { path: "hello.js", content: "console.log('hi')" } }
  执行结果: ✅ { content: "Successfully wrote to hello.js", is_error: false }

  LLM 请求: tool_use { name: "unknown_tool", input: {} }
  执行结果: ❌ { content: "Tool 'unknown_tool' not found", is_error: true }

✅ Lab 2 完成！Agent 现在有了工具，但还不能自主循环使用它们。
```

### query-lab-02.ts（TUI 预览）
在 Lab 1 基础上加单轮工具执行。Agent 调用一次工具就停了——因为没有循环。

### 设计原因
- **为什么 3 个工具就够**：read_file + write_file + bash 覆盖了 90% 的 coding agent 场景。Claude Code 的核心也是这三个。learn-claude-code s02 也用这个组合
- **为什么错误不 crash 而是返回 is_error**：这是 Claude Code 的关键设计——让 LLM 看到错误，LLM 可以自己纠正。如果 crash 了，循环就断了
- **为什么先串行**：降低 Lab 2 的认知负荷，并行执行留给思考题和 Lab 3

---

## 五、Lab 3：Agent Loop ★（核心循环）

### 学习目标
实现 chatbot → agent 的分界线：while(true) 循环。

### 这是整个项目最重要的 Lab。

### 骨架设计

**src/agent-loop.ts** — 6 个 TODO：
```typescript
import type { Message, ContentBlock, ToolUseBlock, ToolResultBlock, AgentEvent, ToolDefinition } from '../../../shared/types';

/**
 * ===== 依赖接口 =====
 * 
 * agentLoop 不直接导入 Lab 1/Lab 2 的具体实现，而是通过接口接收依赖。
 * 这就是「依赖注入」—— Claude Code 的 QueryDeps 也是同样的模式。
 * 
 * 好处：
 * - 测试时传入 Mock 实现，不需要真实 API Key
 * - Lab 3 可以独立于 Lab 1/2 编译和测试
 * - 运行时可以灵活替换（Mock / DeepSeek / Claude）
 */
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

/**
 * Agent Loop — chatbot 变成 agent 的唯一东西。
 * 
 * 核心循环：
 *   call LLM → 有 tool_use? → 执行工具 → 结果喂回 → 再调 LLM → ...
 *   没有 tool_use → 任务完成，退出循环
 *
 * 对应 Claude Code 的 query.ts:307 的 while(true)
 * 
 * 关于 async generator（AsyncGenerator<AgentEvent>）：
 *   这个函数用 yield 向外部「推送」事件，而不是用 return 一次性返回。
 *   每次 yield，外部（CLI/TUI/测试）就收到一个事件并实时显示。
 *   这就像一个"事件流"——Agent 一边思考，外部一边看到进展。
 *   简单类比：yield 就是 console.log，但结构化且可被程序消费。
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
  //   - 创建 messages 数组: Message[]
  //   - 添加初始用户消息: { role: 'user', content: userMessage }

  let turnCount = 0;

  while (true) {
    turnCount++;

    // TODO 2: 安全保护 — 检查是否超过最大迭代次数
    //   if (turnCount > maxTurns) → yield { type: 'error', error: `超过最大迭代次数 ${maxTurns}` } + return
    //   这防止 Agent 陷入无限循环
    //   对应 Claude Code query-lab.ts 中的 maxTurns 检查
    //   ★ 注意 off-by-one：maxTurns=3 应允许 3 轮，第 4 轮才报错

    // TODO 3: 调用 LLM
    //   使用 client.chat(messages, { tools: executor.getToolDefinitions(), systemPrompt })
    //   获取 response: ChatResponse
    //   对应 Claude Code 中的 deps.callModel()

    // TODO 4: 处理 LLM 响应
    //   初始化 toolUseBlocks: ToolUseBlock[] = []
    //   遍历 response.content（注意：content 可能是空数组！）:
    //     - type === 'text' → yield { type: 'text', content: block.text }
    //     - type === 'tool_use' → 收集到 toolUseBlocks
    //   ★ 不要假设一定有 text 块——LLM 可能只返回 tool_use

    // TODO 5: 判断是否需要继续循环
    //   if (toolUseBlocks.length === 0) → yield done event + return
    //   ★ 这是关键判断：没有工具调用 = LLM 认为任务完成
    //   注意：不要用 stopReason 判断，用 toolUseBlocks.length
    //   对应 Claude Code query.ts:554 的注释：
    //   "stop_reason === 'tool_use' is unreliable"

    // TODO 6: 执行工具并更新对话历史
    //   对每个 toolUseBlock:
    //     - yield { type: 'tool_call', name: block.name, input: block.input }
    //     - const result = await executor.executeToolCall(block)
    //     - yield { type: 'tool_result', name: block.name, output: result.content, is_error: result.is_error }
    //   然后更新 messages（这是循环的"燃料"）：
    //     - messages.push({ role: 'assistant', content: response.content })
    //     - messages.push({ role: 'user', content: toolResults })
    //       其中 toolResults 是 ToolResultBlock[]，每个包含 tool_use_id + content + is_error
    //   ★ 必须保留 is_error 字段！LLM 需要看到错误才能自我纠正
  }
}
```

### 测试用例（12 个，含 Architect 审查补充的 4 个边界用例）

| # | 测试名 | Mock LLM 行为 | 预期 |
|---|--------|-------------|------|
| 1 | 简单问答：无工具调用 | 返回 text，无 tool_use | 1 轮，events: [text, done] |
| 2 | 单工具调用 | 第1轮: text+tool_use，第2轮: text | 2 轮，events: [text, tool_call, tool_result, text, done] |
| 3 | 多工具链式调用 | 第1轮: read，第2轮: write，第3轮: text | 3 轮 |
| 4 | 单轮多工具并行 | 第1轮返回 2 个 tool_use | 2 个 tool_call + 2 个 tool_result |
| 5 | 超过迭代上限（精确边界） | 每轮都返回 tool_use，maxTurns=3 | **恰好在第 4 轮** yield error（验证 off-by-one） |
| 6 | LLM 报错 | chat() throw Error | yield error |
| 7 | 工具执行失败 | tool 返回 is_error | LLM 看到错误，第2轮自我纠正 |
| 8 | 完整对话历史正确性 | 2 轮工具 | 验证 messages 数组包含正确的 user/assistant/tool_result 消息序列 |
| **9** | **空 content 数组** | **返回 `{ content: [], stopReason: 'end_turn' }`** | **yield done（不崩溃）** |
| **10** | **纯 tool_use 无 text** | **返回只有 tool_use 块，无 text 块** | **正常执行工具，不假设必有 text** |
| **11** | **is_error 传播到 messages** | **tool 返回 is_error: true** | **messages 中的 ToolResultBlock 保留 is_error 字段** |
| **12** | **maxTurns=1 边界** | **第1轮返回 tool_use** | **执行 1 轮后第 2 轮 yield error** |

### Mock LLM 实现

```typescript
// tests/mock-llm.ts
export function createMockLLM(responses: ChatResponse[]): LLMClient {
  let callIndex = 0;
  return {
    chat: async () => {
      if (callIndex >= responses.length) {
        throw new Error('Mock LLM: no more responses');
      }
      return responses[callIndex++];
    }
  } as LLMClient;
}

// 预定义场景
export const SCENARIOS = {
  simpleChat: [
    { content: [{ type: 'text', text: '你好！' }], stopReason: 'end_turn' }
  ],
  singleTool: [
    { content: [
        { type: 'text', text: '我来创建文件' },
        { type: 'tool_use', id: 'toolu_01', name: 'write_file', input: { path: 'hello.js', content: "console.log('hi')" } }
      ], stopReason: 'tool_use' },
    { content: [{ type: 'text', text: '文件已创建！' }], stopReason: 'end_turn' }
  ],
  // ... 更多场景
};
```

### demo.ts 设计（核心获得感）

```
$ npx tsx labs/lab-03-agent-loop/demo.ts

🤖 Agent Loop Demo (Mock Mode)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

You: 帮我创建一个 hello.js 并运行它

[Turn 1] 📤 Calling LLM...
[Turn 1] 💬 Agent: "好的，我先创建文件。"
[Turn 1] 🔧 Tool: write_file({ path: "hello.js", content: "console.log('Hello!')" })
[Turn 1] ✅ Result: Successfully wrote to hello.js

[Turn 2] 📤 Calling LLM with tool result...
[Turn 2] 💬 Agent: "文件已创建，现在运行它。"
[Turn 2] 🔧 Tool: bash_execute({ command: "node hello.js" })
[Turn 2] ✅ Result: Hello!

[Turn 3] 📤 Calling LLM with tool result...
[Turn 3] 💬 Agent: "运行成功！输出是 'Hello!'"
[Turn 3] 🏁 Agent completed in 3 turns.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
★ 这就是 Agent Loop！LLM 自主决策了 3 轮操作。
  你只说了"创建并运行"，LLM 自己决定了：
  1. 先 write_file
  2. 再 bash_execute  
  3. 最后报告结果

  Lab 1-2 中这些操作需要你手动触发。
  现在是 Agent 自己在循环！
```

### query-lab-03.ts（真实 TUI）
这是学习者自己实现的版本注入 Claude Code 的产物。不是预构建的——学习者完成 agent-loop.ts 后，代码被编译注入 dist/query.js，启动 `node cli.js` 看到真实 TUI。

### 设计原因
- **为什么 6 个 TODO 而不是更多**：每个 TODO 对应循环的一个步骤，逻辑清晰。learn-claude-code s01 的循环也是 5-6 步
- **为什么 8 个测试**：覆盖正常路径 + 边界条件 + 错误处理。TDD 驱动开发——先跑测试全红，逐个变绿
- **为什么 stopReason 判断要特别说明**：Claude Code 源码 query.ts:554 有明确注释说 stop_reason 不可靠。这是真实世界的教训
- **为什么 messages 更新逻辑要重点标注**：这是循环的"燃料"——不把工具结果喂回，LLM 不知道发生了什么，循环就断了

---

## 六、Lab 4：规划（TodoWrite）

### 学习目标
让 Agent 先想再做——规划能力使任务完成率翻倍。

### 骨架设计

**src/todo-manager.ts** — 4 个 TODO：
```typescript
export interface Todo {
  id: string;
  content: string;
  status: 'pending' | 'in_progress' | 'completed';
}

export class TodoManager {
  private todos: Todo[] = [];

  // TODO 1: create(items: string[]): Todo[]
  //   批量创建 todo，初始状态 pending

  // TODO 2: update(id: string, status: Todo['status']): void

  // TODO 3: list(): Todo[]

  // TODO 4: format(): string
  //   格式化输出，类似：
  //   1. [x] 读取文件
  //   2. [→] 修改代码
  //   3. [ ] 运行测试
}
```

**src/todo-tool.ts** — 2 个 TODO：
```typescript
// TODO 1: 实现 createTodoWriteTool(manager: TodoManager): Tool
//   name: 'todo_write'
//   input: { todos: string[] } 或 { id: string, status: string }
//   功能：创建或更新 todo

// TODO 2: 在 agentLoop 中注册这个工具
//   Agent 在任务开始时自动调用 todo_write 创建计划
```

### 测试用例（5 个）

| # | 测试名 | 验证什么 |
|---|--------|---------|
| 1 | TodoManager 批量创建 | create 返回正确的 todo 列表 |
| 2 | TodoManager 更新状态 | pending → in_progress → completed |
| 3 | TodoManager 格式化输出 | format() 的 markdown 格式 |
| 4 | todo_write 工具创建计划 | Mock LLM 调用 todo_write |
| 5 | Agent 先规划再执行 | Mock LLM: 第1轮 todo_write，第2轮开始执行 |

### demo.ts 设计
```
$ npx tsx labs/lab-04-planning/demo.ts

🗂️ Agent Planning Demo (Mock Mode)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

You: 帮我重构 utils.js

[Turn 1] Agent 创建计划:
  📋 Todo List:
  1. [ ] 读取 utils.js 当前代码
  2. [ ] 分析可优化的部分
  3. [ ] 重构代码
  4. [ ] 运行测试验证

[Turn 2] 开始执行:
  📋 1. [→] 读取 utils.js 当前代码
  🔧 Tool: read_file({ path: "utils.js" })

[Turn 3]
  📋 1. [✓] 读取 utils.js 当前代码
  📋 2. [→] 分析可优化的部分
  ...

★ 有计划的 Agent 不走弯路！
```

### 设计原因
- **为什么从 Lab 4 原来的合并拆出来**：Owner 确认分开，降低认知负荷
- **为什么 TodoWrite 比 Subagent 优先**：每个 coding agent 都有规划，不是每个都有子 agent
- **为什么用工具而不是 system prompt**：工具是显式的、可追踪的。system prompt 里的指令容易被忽略

---

## 七、Lab 5：子 Agent

### 学习目标
理解上下文隔离——大任务拆小，每个子任务用干净的 messages[]。

### 骨架设计

**src/subagent.ts** — 3 个 TODO：
```typescript
// TODO 1: async function* runSubagent(
//   client: LLMClient,
//   executor: ToolExecutor,
//   task: string,
//   options?: { maxTurns?: number }
// ): AsyncGenerator<AgentEvent>
//   创建全新的 messages[]（不继承主 Agent 的历史）
//   运行 agentLoop
//   返回最终结果

// TODO 2: 实现 agent_delegate 工具
//   name: 'agent_delegate'
//   input: { task: string }
//   execute: 调用 runSubagent，返回子 agent 的输出

// TODO 3: 在主 agentLoop 中注册 agent_delegate 工具
```

### 测试用例（4 个）

| # | 测试名 | 验证什么 |
|---|--------|---------|
| 1 | Subagent 有独立的 messages | 不继承主 agent 历史 |
| 2 | Subagent 完成后返回结果 | 最终文本作为 tool_result |
| 3 | 主 Agent 上下文不被污染 | 子 agent 的 messages 不混入主 agent |
| 4 | Subagent 也受 maxTurns 限制 | 防止子 agent 无限循环 |

### 设计原因
- **为什么独立 messages[]**：这是 Subagent 的核心价值——防止上下文污染。learn-claude-code s04 强调"每个子任务干净的上下文"
- **为什么通过工具触发**：Claude Code 的 AgentTool 就是一个工具，LLM 自己决定何时需要子 agent

---

## 八、Lab 6：上下文压缩（后续开源）

### 学习目标
三层压缩策略，让 Agent 处理长对话不崩。

### 骨架设计

**src/compact.ts** — 3 个 TODO：
```typescript
// TODO 1: microCompact(messages: Message[], keepRecent: number = 3): Message[]
//   将 keepRecent 轮之前的 tool_result 替换为占位符
//   "[Previous: used {tool_name}]"
//   例外：read_file 结果保留（因为 LLM 可能需要参考）

// TODO 2: async autoCompact(messages: Message[], client: LLMClient): Promise<Message[]>
//   1. 保存完整对话到文件（.transcripts/{timestamp}.jsonl）
//   2. 请 LLM 生成摘要（做了什么、当前状态、关键决策）
//   3. 用摘要替换所有历史消息

// TODO 3: 集成到 agentLoop
//   每轮运行 microCompact
//   当 estimateTokens() > 50000 时触发 autoCompact
```

### 测试用例（5 个）

| # | 测试名 | 验证什么 |
|---|--------|---------|
| 1 | microCompact 替换旧 tool_result | 3 轮前的被替换 |
| 2 | microCompact 保留 read_file 结果 | 例外处理 |
| 3 | autoCompact 生成摘要 | Mock LLM 返回摘要文本 |
| 4 | autoCompact 保存 transcript | 文件写入验证 |
| 5 | 集成：30 轮对话不崩 | token 增长 → 触发压缩 → 继续运行 |

### 设计原因
- **为什么放最后**：压缩是优化，不是核心。Agent 没有压缩也能工作（只是对话不能太长）
- **为什么对应 Claude Code 的 QueryDeps**：microcompact 和 autocompact 正是 QueryDeps 的两个注入点

---

## 九、Lab 间依赖关系与跨 Lab 导入架构

### 关键架构决策：依赖注入 + type-only 导入（Architect 审查后确定）

**问题**：Lab 3 的 agentLoop 需要 Lab 1 的 LLMClient 和 Lab 2 的 ToolExecutor。如果直接用相对路径导入 (`../../lab-01-messages/src/llm-client`)，会导致：
- 学习者 Lab 1/2 未完成或有 bug 时，Lab 3 测试会报莫名其妙的错误
- tsconfig 需要复杂的跨目录配置
- 违反"每个 Lab 可独立测试"原则

**解决方案：接口定义在 shared/types.ts，具体实例通过参数传入**

```typescript
// Lab 3 的 agent-loop.ts 只导入类型，不导入具体实现
import type { Message, AgentEvent, ToolDefinition, ContentBlock, ToolUseBlock } from '../../../shared/types';

// 通过接口定义依赖，不依赖具体 Lab 1/2 的代码
export interface LLMClient {
  chat(messages: Message[], options?: { tools?: ToolDefinition[], systemPrompt?: string }): Promise<ChatResponse>;
}

export interface ToolExecutor {
  executeToolCall(toolUse: ToolUseBlock): Promise<ToolResultBlock>;
  executeToolCalls(toolUses: ToolUseBlock[]): Promise<ToolResultBlock[]>;
  getToolDefinitions(): ToolDefinition[];
}

// agentLoop 接收接口，不关心具体实现来自哪里
export async function* agentLoop(
  client: LLMClient,      // 测试时传 Mock，demo 时传真实 LLMClient
  executor: ToolExecutor,  // 测试时传 Mock，demo 时传真实 ToolExecutor
  ...
)
```

**效果**：
- **测试**：Lab 3 tests 用 Mock LLM + Mock Executor，完全独立于 Lab 1/2
- **demo.ts**：import Lab 1/2 的 solution/（参考实现），展示完整集成
- **学习者集成**：完成 Lab 1-2-3 后，在 demo 中替换为自己的实现

### 依赖关系图

```
shared/types.ts ← 所有 Lab 导入类型
  ↑
Lab 0 (环境) — 无代码依赖
Lab 1 (消息) — 只依赖 shared/types.ts
Lab 2 (工具) — 只依赖 shared/types.ts
Lab 3 (循环) — 只依赖 shared/types.ts（接口在本地定义）
               测试用 Mock，demo 用 Lab 1+2 的 solution/
Lab 4 (规划) — 只依赖 shared/types.ts
Lab 5 (子Agent) — 依赖 Lab 3 的 agentLoop 类型（import type）
Lab 6 (压缩) — 依赖 shared/types.ts
```

### 设计原因
- **每个 Lab 可独立编译和测试**：学习者不需要先完成 Lab 1 才能开始 Lab 3 的测试
- **依赖注入是教学目标之一**：Claude Code 的 QueryDeps 就是这个模式，学习者在 Lab 3 自然接触到 DI
- **demo.ts 才做真正的集成**：这是"build on your prior work"的体验点，但不影响测试的可靠性
- **tsconfig 保持简单**：root tsconfig include `labs/**/*`，不需要 per-lab tsconfig

---

## 十、反馈机制总结

| Lab | vitest 测试 | demo.ts | TUI 预览 | 真实 TUI |
|-----|------------|---------|---------|---------|
| 0 | ✅ 环境验证 | - | - | ✅ 完整版 |
| 1 | ✅ 6 个 | ✅ 消息构建 | ✅ query-lab-01 | - |
| 2 | ✅ 8 个 | ✅ 工具执行 | ✅ query-lab-02 | - |
| **3** | **✅ 8 个** | **✅ Agent 循环** | - | **✅ 学习者代码驱动** |
| 4 | ✅ 5 个 | ✅ 规划执行 | ✅ query-lab-04 | - |
| 5 | ✅ 4 个 | ✅ 子Agent | - | - |
| 6 | ✅ 5 个 | ✅ 压缩效果 | - | - |

### 反馈层次设计原因

1. **vitest**（即时，最低门槛）：所有 Lab 都有，Mock LLM，秒级反馈。类似 YatSenOS 的 cargo test
2. **demo.ts**（即时，高获得感）：比测试通过更有冲击力——"看到 Agent 在循环"。这是 learn-claude-code 的优势，我们要保留
3. **TUI 预览**（需要构建，中获得感）：预置的 query-lab-XX.ts，学习者 build 后看到对应能力
4. **真实 TUI**（Lab 3 专属，最高获得感）：学习者自己的代码驱动完整 Claude Code TUI。这是本项目的核心差异化

---

## 十一、实现优先级

| 优先级 | 内容 | 负责 | Sprint |
|--------|------|------|--------|
| **P0** | Lab 3 skeleton + tests + demo + solution | Leader + D | Sprint 1 |
| **P0** | Mock LLM 基础设施（createMockLLM + SCENARIOS） | D | Sprint 1 |
| **P1** | Lab 1 skeleton + tests + demo | D | Sprint 1-2 |
| **P1** | Lab 2 skeleton + tests + demo | D | Sprint 1-2 |
| **P1** | query-lab-01.ts, query-lab-02.ts（TUI 预览版本） | Leader | Sprint 2 |
| **P2** | Lab 0 文档完善 | 任何人 | Sprint 2 |
| **P2** | Lab 4 skeleton + tests + demo | D | Sprint 2-3 |
| **P3** | Lab 5 skeleton | 后续 | Sprint 3+ |
| **P3** | Lab 6 skeleton | 后续 | 开源迭代 |

---

---

## 十二、Architect 审查记录（2026-04-08）

**Verdict: ITERATE → 已修订**

### 发现的问题及修复

| # | 问题 | 严重性 | 修复 |
|---|------|--------|------|
| 1 | tsconfig.json 不包含 labs/ 目录 | **P0 阻塞** | ✅ 已添加 `labs/**/*` 到 include |
| 2 | 跨 Lab 导入架构缺陷 | **P0 阻塞** | ✅ 改为依赖注入 + type-only 导入，接口定义在 Lab 3 本地 |
| 3 | package.json 缺少 tsx 依赖 | P1 | ✅ 已添加 `tsx: ^4.0.0` |
| 4 | Lab 3 测试缺少 4 个边界用例 | P1 | ✅ 已补充（空 content、纯 tool_use、is_error 传播、maxTurns 精确边界） |
| 5 | bash-execute 超时机制未 scaffold | P2 | ✅ 已提供 execFileAsync + timeout 模板 |
| 6 | async generator yield 概念未解释 | P2 | ✅ 已在骨架 JSDoc 中添加 yield 类比说明 |
| 7 | Lab 3 骨架 TODO 4 未提示 content 可能为空数组 | P2 | ✅ 已在 TODO 4 注释中明确 |

### Architect 的核心洞察（保留参考）

> **Steelman Antithesis**: "每个 Lab 完全自包含（复制依赖）比跨 Lab 导入更鲁棒。在教学场景中，鲁棒性比优雅更重要。"
> 
> **Synthesis**: 采用 Option B（依赖注入 + type-only 导入）——既保留 DI 的教学价值，又消除编译时耦合。测试完全独立，demo 才做真正集成。

### 审查后状态
- tsconfig.json: ✅ 已修复
- package.json: ✅ 已修复  
- LAB_DESIGN.md: ✅ 已修订（v2）
- 可进入实现阶段
