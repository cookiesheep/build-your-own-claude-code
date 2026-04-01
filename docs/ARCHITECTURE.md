# Technical Architecture

## 系统总览

build-your-own-agent 教学习者构建一个简化版 coding agent。下图是最终产物的架构：

```
┌─────────────────────────────────────────────────────────────┐
│                        CLI Interface                         │
│                    (readline, event display)                  │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│                        Agent Loop                            │
│              (observe → think → act → repeat)                │
│                                                              │
│    ┌──────────────┐              ┌────────────────────┐     │
│    │  LLM Client   │              │  Tool Executor      │     │
│    │               │◄────────────►│                    │     │
│    │  - chat()     │   tool_use   │  - executeToolCalls│     │
│    │  - stream()   │   ────────►  │  - error handling  │     │
│    │  - retry()    │   tool_result│                    │     │
│    │               │   ◄────────  │                    │     │
│    └──────┬───────┘              └────────┬───────────┘     │
│           │                               │                  │
│           │                      ┌────────┴───────────┐     │
│           │                      │   Tool Registry      │     │
│           │                      │                      │     │
│           │                      │  ┌──────────────┐   │     │
│           │                      │  │ read_file    │   │     │
│           │                      │  │ write_file   │   │     │
│           │                      │  │ bash_execute │   │     │
│           │                      │  └──────────────┘   │     │
│           │                      └──────────────────────┘     │
│           │                                                   │
│    ┌──────┴───────┐                                          │
│    │  Conversation  │                                          │
│    │  (Message      │                                          │
│    │   History)     │                                          │
│    └───────────────┘                                          │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│                    Anthropic Messages API                     │
└──────────────────────────────────────────────────────────────┘
```

## 核心模块详解

### 1. Message Protocol (`shared/types.ts` + `messages.ts`)

消息是 agent 的血液。所有信息通过消息在模块间流动。

```typescript
// 核心类型
type Role = 'user' | 'assistant';

type ContentBlock =
  | { type: 'text'; text: string }
  | { type: 'tool_use'; id: string; name: string; input: unknown }
  | { type: 'tool_result'; tool_use_id: string; content: string; is_error?: boolean };

type Message = {
  role: Role;
  content: string | ContentBlock[];
};
```

**设计决策**：直接复用 Anthropic API 的消息格式，减少转换层。教学上也让学习者直接理解生产级 API 的数据结构。

### 2. LLM Client (`llm-client.ts`)

封装 API 调用，隐藏 HTTP 细节。

```
LLMClient
├── chat(messages, tools?) → AssistantMessage     # 非流式
├── chatStream(messages, tools?) → AsyncGenerator  # 流式
└── (内部) retry logic, error normalization
```

**设计决策**：
- 使用 Anthropic SDK（不手写 HTTP），因为重点是 agent 架构不是 HTTP client
- 但在 Task 2 的知识讲解里会解释 SDK 背后的 HTTP 请求结构
- 支持流式，但 Task 7 的 CLI 可以先用非流式（简单），流式作为可选优化

### 3. Tool System (`tool-definition.ts` + `tools/` + `tool-executor.ts`)

三层结构：

```
定义层 (Tool interface)
  ↓
注册层 (ToolRegistry)
  ↓
执行层 (ToolExecutor)
```

**Tool 接口**：
```typescript
interface Tool {
  name: string;
  description: string;        // LLM 通过这个理解工具的用途
  inputSchema: JSONSchema;    // LLM 通过这个知道怎么调用
  execute(input: unknown): Promise<ToolResult>;
}
```

**设计决策**：
- Tool 是 interface，不是 class — 更灵活，学习者可以用函数或类实现
- execute 返回 `ToolResult`（成功或错误），不 throw — 因为工具失败不应该终止 agent loop
- inputSchema 使用标准 JSON Schema — 和 Anthropic API 完全一致

### 4. Agent Loop (`agent-loop.ts`)

这是整个项目最核心的模块。

```
用户输入
    │
    ▼
┌─→ 构建消息 → 调用 LLM ─┐
│                          │
│   ┌──────────────────────┘
│   │
│   ▼
│   stop_reason?
│   │
│   ├── end_turn → 返回最终回复 → 结束
│   │
│   ├── tool_use → 解析 tool calls
│   │              → 执行工具
│   │              → 将结果加入消息历史
│   │              → 回到循环顶部 ───────────┐
│   │                                         │
│   └── max_tokens → 继续请求（可选） ────────┘
│                                              │
└──────────────────────────────────────────────┘
     (最大迭代次数保护)
```

**设计决策**：
- 使用 AsyncGenerator (`yield` events) 而不是 callback — 更现代，更容易测试
- AgentEvent 是统一事件类型 — CLI 层只需消费事件流，不关心内部逻辑
- 最大迭代次数默认 25 — 防止无限循环（参考 Claude Code 的实际值）

### 5. CLI (`cli.ts`)

最薄的一层，只负责用户交互。

```
readline.question() → AgentLoop.run() → AgentEvent 流 → 格式化打印
```

**设计决策**：
- 用 Node.js 内置 readline，不引入 Ink/blessed 等框架
- 彩色输出用 ANSI escape codes（可选，不做也行）
- 这不是教学重点，保持极简

## 测试架构

### Mock LLM 方案

```typescript
// tests/fixtures/mock-llm.ts
class MockLLMClient implements LLMClientInterface {
  private responses: AssistantMessage[];
  private callIndex = 0;

  constructor(responses: AssistantMessage[]) {
    this.responses = responses;
  }

  async chat(messages: Message[]): Promise<AssistantMessage> {
    return this.responses[this.callIndex++];
  }
}
```

每个 task 的测试通过提前录制的 LLM 响应序列来驱动，完全不依赖真实 API。

### 测试金字塔

```
    ╱  Live Test (可选)  ╲      ← 需要 API key，学习者自愿运行
   ╱   Integration Test    ╲    ← Mock LLM + 真实模块组合
  ╱     Unit Test            ╲  ← 每个函数/类的独立测试
```

## 文件结构（最终状态）

```
build-your-own-agent/
├── CLAUDE.md
├── README.md
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── .env.example
│
├── shared/
│   └── types.ts                 # 所有共享类型定义
│
├── src/                         # 参考实现（完整版）
│   ├── main.ts                  # CLI 入口
│   ├── messages.ts
│   ├── llm-client.ts
│   ├── tool-definition.ts
│   ├── tool-executor.ts
│   ├── agent-loop.ts
│   └── tools/
│       ├── read-file.ts
│       ├── write-file.ts
│       └── bash-execute.ts
│
├── tasks/
│   ├── task-01-messages/
│   │   ├── README.md
│   │   ├── src/messages.ts      # 带 TODO 的骨架
│   │   ├── tests/
│   │   │   ├── messages.test.ts
│   │   │   └── fixtures/        # 测试数据
│   │   ├── solution/
│   │   │   └── messages.ts      # 参考答案
│   │   └── hints.md
│   ├── task-02-llm-client/
│   │   └── ...
│   ├── task-03-tool-definition/
│   │   └── ...
│   ├── task-04-core-tools/
│   │   └── ...
│   ├── task-05-tool-execution/
│   │   └── ...
│   ├── task-06-agent-loop/
│   │   └── ...
│   └── task-07-integration/
│       └── ...
│
└── docs/
    ├── PRD.md
    ├── MVP_SCOPE.md
    ├── ARCHITECTURE.md
    └── TEAM_BRIEF.md
```

## 技术选型理由

| 选择 | 为什么 | 考虑过的替代方案 |
|------|--------|----------------|
| TypeScript | 类型安全帮助教学（学习者能看到接口定义），且和 Claude Code 同技术栈 | Python（更多人会，但类型提示弱）|
| Vitest | 快、零配置、支持 ESM、对 TypeScript 友好 | Jest（配置复杂）、Mocha（需要更多 setup）|
| Anthropic SDK | 官方 SDK，类型完整，减少 HTTP 样板代码 | 手写 fetch（教育价值高但增加 task 复杂度）|
| readline | 内置模块，零依赖，够用 | Ink（太重）、Inquirer（不需要选择器）|
| ESM | 现代 Node.js 标准 | CJS（过时）|
