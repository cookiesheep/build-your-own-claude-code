# MVP Scope — 任务设计详解

## MVP 边界总览

**核心交付**：7 个渐进式学习任务 + 1 个完整参考实现
**目标学时**：学习者 10-15 小时完成全部 task
**代码规模**：参考实现 ~800 行 TypeScript，每个 task 的 skeleton ~50-150 行

### 明确的 IN / OUT

| IN（MVP 必须包含） | OUT（明确排除） |
|-------------------|----------------|
| 7 个 task，每个含 skeleton + test + doc + solution | WebUI |
| Mock LLM 测试方案 | 多模型适配（只用 Anthropic） |
| 3 个核心工具：read_file, write_file, bash_execute | 安全沙箱 / 权限系统 |
| 基础 CLI（readline） | 流式 TUI (Ink) |
| 内存中对话历史 | 持久化存储 |
| 单轮 agent loop（user → multi-turn tool use → done） | 多 agent 协作 |
| 中文文档为主，英文 section | Diff/Patch 高级工具 |

---

## 7 个任务的详细设计

---

### Task 1: Message Protocol — 消息协议

**学习目标**：理解 LLM 对话的底层数据结构

**知识点**：
- Anthropic Messages API 的消息格式（role + content）
- 四种消息角色：user, assistant, system, tool
- Content block 类型：text, tool_use, tool_result
- 对话历史的组织方式

**学习者需要实现**：
```typescript
// TODO 1: 定义消息类型 (UserMessage, AssistantMessage, etc.)
// TODO 2: 实现 Conversation 类
//   - addUserMessage(text: string)
//   - addAssistantMessage(content: ContentBlock[])
//   - addToolResult(toolUseId: string, result: string)
//   - getMessages(): Message[]  // 返回符合 API 格式的消息数组
//   - getSystemPrompt(): string
// TODO 3: 实现 token 粗略估算（字符数 / 4）
```

**测试用例**：
- 创建对话，添加消息，验证格式正确
- 消息顺序验证（user/assistant 交替）
- tool_result 必须跟在包含 tool_use 的 assistant 消息后
- token 估算在合理范围内

**预计时长**：1-1.5 小时
**难度**：★☆☆☆☆

---

### Task 2: LLM Client — API 客户端

**学习目标**：学会调用 LLM API 并处理响应

**知识点**：
- Anthropic Messages API 的请求/响应结构
- 流式响应（Server-Sent Events）vs 非流式
- API 错误处理（rate limit, auth, network）
- stop_reason 的含义（end_turn, tool_use, max_tokens）

**学习者需要实现**：
```typescript
// TODO 1: 实现 LLMClient 类
//   - constructor(apiKey, options?: { baseUrl?, model? })
//   - chat(messages, tools?): Promise<AssistantMessage>
//   - chatStream(messages, tools?): AsyncGenerator<StreamEvent>
// TODO 2: 处理 API 错误（封装为统一的 LLMError）
// TODO 3: 实现简单的重试逻辑（429 rate limit → exponential backoff）
```

**测试用例**（使用 Mock）：
- Mock API 返回正常文本响应 → 正确解析
- Mock API 返回 tool_use 响应 → 正确解析出 tool name + input
- Mock API 返回 429 → 触发重试
- Mock API 返回 401 → 抛出认证错误

**预计时长**：1.5-2 小时
**难度**：★★☆☆☆

---

### Task 3: Tool Definition — 工具定义系统

**学习目标**：理解 LLM 如何通过 JSON Schema "认识"工具

**知识点**：
- Function calling / Tool use 的核心原理
- JSON Schema 描述工具参数
- Tool registry 模式
- 好的 tool description 如何影响 LLM 行为

**学习者需要实现**：
```typescript
// TODO 1: 定义 Tool 接口
//   interface Tool {
//     name: string;
//     description: string;
//     inputSchema: JSONSchema;
//     execute(input: unknown): Promise<ToolResult>;
//   }
// TODO 2: 实现 ToolRegistry 类
//   - register(tool: Tool): void
//   - get(name: string): Tool | undefined
//   - getToolDefinitions(): ToolDefinition[]  // 返回传给 API 的格式
//   - listTools(): string[]
// TODO 3: 实现 schema 校验（验证 tool input 符合 schema）
```

**测试用例**：
- 注册工具，获取定义，格式符合 Anthropic API spec
- 查找已注册/未注册的工具
- input schema 验证通过/失败

**预计时长**：1-1.5 小时
**难度**：★★☆☆☆

---

### Task 4: Core Tools — 核心工具实现

**学习目标**：实现 coding agent 最基础的三个能力

**知识点**：
- 文件系统操作（读/写）的安全边界
- 子进程执行（child_process）
- 工具输出格式化（给 LLM 看的结果）
- 基本安全考虑（路径遍历防护、命令超时）

**学习者需要实现**：
```typescript
// TODO 1: 实现 ReadFileTool
//   - 读取指定路径的文件内容
//   - 处理文件不存在、权限不足等错误
//   - 返回格式化的文件内容（带行号）

// TODO 2: 实现 WriteFileTool
//   - 写入内容到指定路径
//   - 自动创建不存在的父目录
//   - 返回确认信息

// TODO 3: 实现 BashTool
//   - 执行 shell 命令
//   - 捕获 stdout + stderr
//   - 设置超时（默认 30 秒）
//   - 返回执行结果（exit code + output）
```

**测试用例**（使用临时目录）：
- 读取存在的文件 → 返回内容
- 读取不存在的文件 → 返回错误信息（不是 throw）
- 写入文件 → 文件内容正确
- 写入嵌套路径 → 自动创建目录
- 执行 `echo hello` → 返回 "hello"
- 执行超时命令 → 返回超时错误

**预计时长**：1.5-2 小时
**难度**：★★☆☆☆

---

### Task 5: Tool Execution Engine — 工具执行引擎

**学习目标**：理解 LLM 响应中的 tool_use 如何变成真实操作

**知识点**：
- 解析 LLM 响应中的 tool_use content block
- 工具路由：name → handler
- 结果格式化为 tool_result 消息
- 错误处理：工具执行失败时如何告知 LLM

**学习者需要实现**：
```typescript
// TODO 1: 实现 ToolExecutor 类
//   - constructor(registry: ToolRegistry)
//   - executeToolCalls(toolUseBlocks: ToolUseBlock[]): Promise<ToolResultMessage[]>
//     遍历所有 tool_use block，依次执行，收集结果

// TODO 2: 处理执行错误
//   - 工具不存在 → 返回 error 类型的 tool_result
//   - 工具执行抛异常 → 捕获并返回错误信息
//   - 输入校验失败 → 返回 schema 不匹配的错误

// TODO 3: 实现执行日志
//   - 记录每次工具调用的 name、input、output、耗时
```

**测试用例**：
- 正常执行 tool call → 返回正确的 tool_result
- 工具名不存在 → 返回 is_error: true 的 tool_result
- 工具执行抛异常 → 捕获并返回友好错误
- 多个 tool_use → 依次执行，返回所有结果

**预计时长**：1.5 小时
**难度**：★★★☆☆

---

### Task 6: Agent Loop — 核心循环

**学习目标**：理解 agent 的核心 — 循环决策机制

**知识点**：
- Agent loop 的本质：observe → think → act → observe → ...
- stop_reason 驱动的循环控制
  - `end_turn` → agent 认为任务完成
  - `tool_use` → 需要执行工具并继续
  - `max_tokens` → 需要继续生成
- 最大迭代次数保护
- 上下文窗口管理（何时该截断历史）

**学习者需要实现**：
```typescript
// TODO 1: 实现 AgentLoop 类
//   - constructor(client: LLMClient, executor: ToolExecutor, options?)
//   - run(userMessage: string): AsyncGenerator<AgentEvent>
//     核心循环：
//     1. 将 user message 加入对话历史
//     2. 调用 LLM
//     3. 如果 stop_reason === 'end_turn' → yield 最终回复，结束
//     4. 如果 stop_reason === 'tool_use' → 执行工具，将结果加入历史，回到步骤 2
//     5. 如果超过最大迭代次数 → yield 超时警告，结束

// TODO 2: 实现 AgentEvent 类型
//   - { type: 'text', content: string }          // LLM 文本输出
//   - { type: 'tool_call', name, input }          // 工具调用
//   - { type: 'tool_result', name, output }       // 工具结果
//   - { type: 'done', finalMessage: string }      // 循环结束
//   - { type: 'error', error: string }            // 错误

// TODO 3: 实现上下文窗口保护
//   - 当对话历史 token 估算超过阈值时，截断早期消息
```

**测试用例**（Mock LLM 返回预设序列）：
- 简单问答（LLM 直接 end_turn）→ 一轮结束
- 单工具调用（LLM → tool_use → execute → LLM end_turn）→ 两轮
- 多工具链式调用（LLM → tool → LLM → tool → LLM → done）→ 多轮
- 超过最大迭代 → 安全终止
- LLM 返回错误 → 抛出并终止

**预计时长**：2-3 小时
**难度**：★★★★☆

---

### Task 7: Integration — 整合为完整 Agent

**学习目标**：将前 6 个 task 的模块组装成可用产品

**知识点**：
- System prompt 工程（如何让 agent 行为符合预期）
- CLI 交互设计（readline, 优雅退出, 错误展示）
- 端到端集成的调试技巧
- "能用"和"好用"之间的差距

**学习者需要实现**：
```typescript
// TODO 1: 编写 System Prompt
//   要求 agent：
//   - 使用提供的工具完成编码任务
//   - 先读代码再修改
//   - 解释自己的思路
//   - 出错时自我纠正

// TODO 2: 实现 CLI 入口
//   - readline 交互循环
//   - 打印 agent 事件（工具调用、结果、文本）
//   - Ctrl+C 优雅退出
//   - 支持 --help 和 --model 参数

// TODO 3: 组装所有模块
//   - 创建 LLMClient
//   - 创建 ToolRegistry 并注册 3 个工具
//   - 创建 ToolExecutor
//   - 创建 AgentLoop
//   - 连接 CLI → AgentLoop → 输出
```

**测试用例**：
- 组装完成后，模块间接口正确连接
- System prompt 包含工具列表和行为指南
- CLI 能正常启动和退出
- （可选 live test）发送一个真实请求，agent 能完成简单任务

**预计时长**：2-3 小时
**难度**：★★★★☆

---

## Task README 统一模板

每个 task 的 README.md 遵循以下结构：

```markdown
# Task N: [标题]

## 你将学到

- 知识点 1
- 知识点 2
- 知识点 3

## 背景知识

[2-3 段原理讲解，配代码示例和图示]

## 你的任务

[描述学习者需要做什么]

### 需要补全的代码

[列出哪些文件里的哪些 TODO]

### 验证方法

\```bash
cd tasks/task-0N-xxx
npx vitest run tests/
\```

所有测试通过即为完成。

## 提示

如果卡住了，查看 [hints.md](./hints.md)。

## 深入阅读

- [链接 1] — 相关 API 文档
- [链接 2] — 相关概念解释
```

---

## 任务依赖关系

```
Task 1 (Messages) ──┬──→ Task 2 (LLM Client)
                     │
                     └──→ Task 3 (Tool Definition) ──→ Task 4 (Core Tools)
                                                           │
Task 2 ──────────────────────────────────────────┐         │
                                                  ↓         ↓
                                             Task 5 (Tool Execution)
                                                  │
                                                  ↓
                                             Task 6 (Agent Loop)
                                                  │
                                                  ↓
                                             Task 7 (Integration)
```

- Task 1 是所有后续 task 的基础
- Task 2 和 Task 3-4 可以并行（不同组员同时做）
- Task 5 依赖 Task 3-4
- Task 6 依赖 Task 2 和 Task 5
- Task 7 依赖所有前序 task

---

## 参考实现规模估算

| 模块 | 预估行数 | 说明 |
|------|---------|------|
| types.ts (shared) | ~80 | 类型定义 |
| messages.ts | ~100 | 消息协议 + Conversation 类 |
| llm-client.ts | ~120 | API 客户端 + 流式 |
| tool-definition.ts | ~80 | Tool 接口 + Registry |
| tools/ (3 个) | ~180 | ReadFile + WriteFile + Bash |
| tool-executor.ts | ~80 | 执行引擎 |
| agent-loop.ts | ~120 | 核心循环 |
| cli.ts | ~80 | CLI 入口 |
| **Total** | **~840** | |

加上测试代码约 600 行，总计约 1400-1500 行代码。
