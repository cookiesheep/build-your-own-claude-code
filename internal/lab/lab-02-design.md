# Lab 2 设计文档 — Tool System

> Date: 2026-05-09 | Status: Draft

## 基本信息

| 项 | 值 |
|---|---|
| **主题** | Tool System — 给 Agent 一双手 |
| **前置条件** | Lab 1 完成（API 调用已通） |
| **核心文件** | `src/query-lab2.ts`（唯一变体文件） |
| **原始文件** | `src/query.ts`（1729 行生产级 Agent Loop） |
| **学习者代码量** | ~30 行新增 TODO（在 Lab 1 完成品基础上） |
| **难度** | ★★★☆☆（中等） |
| **Motto** | **"Giving the agent hands — one grasp at a time"** |

## 渐进式体验

### Lab 2 构建后 TUI 表现

构建成功后，学习者会看到：

1. **Agent 能对话**（继承 Lab 1）— 回复文字正常
2. **Agent 尝试用工具** — 输入"读一下 README.md"，Agent 会**调用一次** Read 工具
3. **Agent 执行一次工具就停** — 读取文件内容后，Agent 不会继续推理
4. **Agent 无法完成多步任务** — "找到配置文件中的端口号" 需要 2+ 步，Agent 只做第一步

### 学习者会感知到什么

- "Agent 能读文件了！但只用了一次就停了"
- 理解 `tool_use` 是 LLM 返回的一种特殊响应类型
- 理解工具执行 = 查找工具 → 验证输入 → 调用 → 返回结果
- "为什么它不继续？" → 为 Lab 3（Agent Loop）制造需求

### ASCII 架构图

```
Lab 2 的 query() 函数结构：

┌───────────────────────────────────────┐
│         query(params)                  │
│         AsyncGenerator                 │
├───────────────────────────────────────┤
│                                        │
│  ┌───────────────────────────────────┐ │
│  │ ✓ Lab 1: Build system prompt     │ │  ← 已完成
│  │ ✓ Lab 1: Get messages            │ │  ← 已完成
│  │ ✓ Lab 1: Call LLM + yield        │ │  ← 已完成
│  └───────────────┬───────────────────┘ │
│                  │                     │
│  ┌───────────────▼───────────────────┐ │
│  │ TODO 5: Detect tool_use blocks    │ │  ← NEW! 你需要实现
│  │ content.type === 'tool_use'       │ │
│  └───────────────┬───────────────────┘ │
│                  │                     │
│  ┌───────────────▼───────────────────┐ │
│  │ TODO 6: Check needsFollowUp       │ │  ← NEW!
│  │ if no tools → return completed    │ │
│  └───────────────┬───────────────────┘ │
│                  │                     │
│  ┌───────────────▼───────────────────┐ │
│  │ TODO 7: Execute tools             │ │  ← NEW! (核心)
│  │ runTools() → yield results        │ │
│  └───────────────┬───────────────────┘ │
│                  │                     │
│  ┌───────────────▼───────────────────┐ │
│  │ TODO 8: Collect tool results      │ │  ← NEW!
│  │ for message history               │ │
│  └───────────────────────────────────┘ │
│                                        │
│  （没有循环！只执行一轮工具就结束）       │
│  Lab 2 = 单轮工具执行                   │
└───────────────────────────────────────┘
```

## 挖空方案

### 唯一变体文件: `src/query-lab2.ts`

- **原始文件**: `src/query.ts` (1729 行)
- **挖空策略**: Lab 1 完成品 + 工具处理逻辑的 TODO。学习者在已完成的 API 调用代码基础上，添加工具检测和执行。

### Skeleton 代码

```typescript
/**
 * Lab 2: Tool System — "Giving the Agent Hands"
 *
 * 在 Lab 1 中，你的 Agent 学会了说话。
 * 但它只会"说"——当用户要求它读文件、执行命令时，
 * Agent 只会回复"我来帮你"，却什么也不做。
 *
 * 现在你要给它"双手"：工具执行能力。
 *
 * LLM 返回的不仅是文字，还可能是 tool_use 请求：
 *   "我需要调用 read_file 工具来读取 README.md"
 *
 * 你的任务：检测 tool_use → 执行工具 → 返回结果
 *
 * 但注意：Lab 2 只执行一轮工具！
 * Agent 用了一次工具就停止了——
 * "多轮自主推理"是 Lab 3 的 Agent Loop。
 *
 * ┌───────────────────────────────────────┐
 * │ ✓ Lab 1: API calling                  │
 * │           ↓                           │
 * │ TODO 5: Detect tool_use blocks        │
 * │           ↓                           │
 * │ TODO 6: Check if tools needed         │
 * │           ↓ (if yes)                  │
 * │ TODO 7: Execute tools                 │
 * │           ↓                           │
 * │ TODO 8: Collect tool results          │
 * └───────────────────────────────────────┘
 *
 * Motto: "Giving the agent hands — one grasp at a time"
 *
 * 参考文件：
 *   完整版: src/query.ts (1729 行)
 *   工具编排: src/services/tools/toolOrchestration.ts
 *   工具执行: src/services/tools/toolExecution.ts
 */

import type { ToolUseBlock } from '@anthropic-ai/sdk/resources/index.mjs'
import type { CanUseToolFn } from './hooks/useCanUseTool.js'
import { findToolByName, type ToolUseContext } from './Tool.js'
import { asSystemPrompt, type SystemPrompt } from './utils/systemPromptType.js'
import type {
  AssistantMessage,
  AttachmentMessage,
  Message,
  RequestStartEvent,
  StreamEvent,
  ToolUseSummaryMessage,
  UserMessage,
  TombstoneMessage,
} from './types/message.js'
import {
  createUserMessage,
  normalizeMessagesForAPI,
  getMessagesAfterCompactBoundary,
} from './utils/messages.js'
import { prependUserContext, appendSystemContext } from './utils/api.js'
import { getRuntimeMainLoopModel } from './utils/model/model.js'
import { runTools } from './services/tools/toolOrchestration.js'
import { productionDeps, type QueryDeps } from './query/deps.js'
import type { Terminal } from './query/transitions.js'
import type { QuerySource } from './constants/querySource.js'
import { logError } from './utils/log.js'

export type QueryParams = {
  messages: Message[]
  systemPrompt: SystemPrompt
  userContext: { [k: string]: string }
  systemContext: { [k: string]: string }
  canUseTool: CanUseToolFn
  toolUseContext: ToolUseContext
  fallbackModel?: string
  querySource: QuerySource
  maxOutputTokensOverride?: number
  maxTurns?: number
  skipCacheWrite?: boolean
  taskBudget?: { total: number }
  deps?: QueryDeps
}

export async function* query(
  params: QueryParams,
): AsyncGenerator<
  | StreamEvent
  | RequestStartEvent
  | Message
  | TombstoneMessage
  | ToolUseSummaryMessage,
  Terminal
> {
  const {
    systemPrompt,
    userContext,
    systemContext,
    canUseTool,
    querySource,
  } = params
  const deps = params.deps ?? productionDeps()
  const messages = [...params.messages]
  let toolUseContext = params.toolUseContext

  // ================================================================
  // ✓ Lab 1 完成：构建系统提示词
  // ================================================================
  const fullSystemPrompt = asSystemPrompt(
    appendSystemContext(systemPrompt, systemContext),
  )

  yield { type: 'stream_request_start' }

  // ================================================================
  // ✓ Lab 1 完成：获取消息列表
  // ================================================================
  const messagesForQuery = [...getMessagesAfterCompactBoundary(messages)]
  toolUseContext = { ...toolUseContext, messages: messagesForQuery }

  const appState = toolUseContext.getAppState()
  const permissionMode = appState.toolPermissionContext.mode
  const currentModel = getRuntimeMainLoopModel({
    permissionMode,
    mainLoopModel: toolUseContext.options.mainLoopModel,
  })

  // 累加器：收集本轮的助手消息和工具调用
  const assistantMessages: AssistantMessage[] = []
  const toolResults: (UserMessage | AttachmentMessage)[] = []

  // ================================================================
  // ✓ Lab 1 完成：调用 LLM 并 yield 消息给 TUI
  // ================================================================
  try {
    for await (const message of deps.callModel({
      messages: prependUserContext(messagesForQuery, userContext),
      systemPrompt: fullSystemPrompt,
      thinkingConfig: toolUseContext.options.thinkingConfig,
      tools: toolUseContext.options.tools,
      signal: toolUseContext.abortController.signal,
      options: {
        async getToolPermissionContext() {
          return toolUseContext.getAppState().toolPermissionContext
        },
        model: currentModel,
        toolChoice: undefined,
        isNonInteractiveSession: toolUseContext.options.isNonInteractiveSession,
        fallbackModel: params.fallbackModel,
        querySource,
        agents: toolUseContext.options.agentDefinitions.activeAgents,
        allowedAgentTypes: toolUseContext.options.agentDefinitions.allowedAgentTypes,
        hasAppendSystemPrompt: !!toolUseContext.options.appendSystemPrompt,
        maxOutputTokensOverride: params.maxOutputTokensOverride,
        mcpTools: appState.mcp.tools,
        hasPendingMcpServers: appState.mcp.clients.some(c => c.type === 'pending'),
        queryTracking: toolUseContext.queryTracking,
        effortValue: appState.effortValue,
        advisorModel: appState.advisorModel,
        skipCacheWrite: params.skipCacheWrite,
        agentId: toolUseContext.agentId,
        addNotification: toolUseContext.addNotification,
      },
    })) {
      yield message

      // ================================================================
      // TODO 5: 从助手消息中收集 tool_use 块
      //
      // LLM 的响应可能包含两种内容：
      //   - type: 'text' → 普通文本
      //   - type: 'tool_use' → 工具调用请求
      //
      // 你需要：
      //   1. 检查 message.type === 'assistant'
      //   2. 如果是，将 message 推入 assistantMessages 数组
      //   3. 从 message.message.content 中过滤出 type === 'tool_use' 的块
      //   4. 将过滤出的 tool_use 块推入 toolUseBlocks 数组
      //   5. 如果有 tool_use 块，设置 needsFollowUp = true
      //
      // 变量已在下方声明：toolUseBlocks, needsFollowUp
      //
      // 提示：
      //   if (message.type === 'assistant') {
      //     assistantMessages.push(message)
      //     const toolBlocks = message.message.content.filter(
      //       c => c.type === 'tool_use'
      //     ) as ToolUseBlock[]
      //     if (toolBlocks.length > 0) {
      //       toolUseBlocks.push(...toolBlocks)
      //       needsFollowUp = true
      //     }
      //   }
      // ================================================================
    }
  } catch (error) {
    logError(error)
    return { reason: 'model_error', error: error as Error }
  }

  // 被中断时直接返回
  if (toolUseContext.abortController.signal.aborted) {
    return { reason: 'aborted_streaming' }
  }

  // ---- tool_use 检测累加器 ----
  // （这些变量需要在 TODO 5 之前的某个位置声明，
  //   但为了教学清晰，我们把声明放在这里，
  //   你需要把它们移到 for await 循环之前）
  const toolUseBlocks: ToolUseBlock[] = []
  let needsFollowUp = false
  // 注意：实际实现中，你需要把 toolUseBlocks 和 needsFollowUp
  // 的声明移到 for await 循环之前，并在循环内部修改它们

  // ================================================================
  // TODO 6: 检查是否需要执行工具
  //
  // 如果 LLM 没有请求任何工具（needsFollowUp === false），
  // 说明对话已经完成，直接返回。
  //
  // 你需要：
  //   if (!needsFollowUp) {
  //     return { reason: 'completed' }
  //   }
  // ================================================================

  // ================================================================
  // TODO 7: 执行工具 ★ Lab 2 核心 ★
  //
  // runTools() 接收 4 个参数：
  //   1. toolUseBlocks — LLM 请求的工具列表
  //   2. assistantMessages — 包含工具调用的助手消息
  //   3. canUseTool — 权限检查函数
  //   4. toolUseContext — 工具执行上下文
  //
  // runTools() 返回一个 AsyncGenerator，每次 yield 一个
  // { message?, newContext } 对象。
  //
  // 你需要：
  //   for await (const update of runTools(toolUseBlocks, assistantMessages, canUseTool, toolUseContext)) {
  //     if (update.message) {
  //       yield update.message                    // yield 工具结果给 TUI
  //       toolResults.push(...)                   // 收集到 toolResults（见 TODO 8）
  //     }
  //     if (update.newContext) {
  //       toolUseContext = { ...update.newContext } // 更新上下文
  //     }
  //   }
  // ================================================================

  // 工具执行期间被中断
  if (toolUseContext.abortController.signal.aborted) {
    return { reason: 'aborted_tools' }
  }

  // ================================================================
  // TODO 8: 收集工具执行结果到 toolResults 数组
  //
  // 实际上这部分已经嵌入在 TODO 7 中了。
  // 在 for await 循环内，当 update.message 存在时，
  // 你需要用 normalizeMessagesForAPI 处理后推入 toolResults：
  //
  //   toolResults.push(
  //     ...normalizeMessagesForAPI([update.message], toolUseContext.options.tools)
  //       .filter(_ => _.type === 'user')
  //   )
  //
  // 这些 toolResults 会在 Lab 3 中被用来自动继续对话。
  // 在 Lab 2 中，它们只是被收集但不使用（因为没有循环）。
  // ================================================================

  // Lab 2 结束：执行了一轮工具后返回
  return { reason: 'completed' }
}
```

### 参考答案

<details>
<summary>点击展开参考答案</summary>

```typescript
// TODO 5 答案（移到 for await 循环内的 yield message 之后）：
if (message.type === 'assistant') {
  assistantMessages.push(message)
  const msgToolUseBlocks = message.message.content.filter(
    content => content.type === 'tool_use',
  ) as ToolUseBlock[]
  if (msgToolUseBlocks.length > 0) {
    toolUseBlocks.push(...msgToolUseBlocks)
    needsFollowUp = true
  }
}

// TODO 6 答案：
if (!needsFollowUp) {
  return { reason: 'completed' }
}

// TODO 7 + TODO 8 答案：
const toolUpdates = runTools(
  toolUseBlocks,
  assistantMessages,
  canUseTool,
  toolUseContext,
)

for await (const update of toolUpdates) {
  if (update.message) {
    yield update.message
    toolResults.push(
      ...normalizeMessagesForAPI(
        [update.message],
        toolUseContext.options.tools,
      ).filter(_ => _.type === 'user'),
    )
  }
  if (update.newContext) {
    toolUseContext = { ...update.newContext }
  }
}
```

</details>

## 教学设计

### 知识点

| # | 知识点 | 对应源码位置 | 难度 |
|---|--------|-------------|------|
| 1 | Anthropic tool_use 响应格式 | claude.ts:1997-2001 | ★★ |
| 2 | 工具调用检测（content block 过滤） | query.ts:826-835 | ★★ |
| 3 | `needsFollowUp` 标志模式 | query.ts:1062 | ★ |
| 4 | 工具编排（并行/串行调度） | toolOrchestration.ts:19-82 | ★★★ |
| 5 | 工具结果格式化（tool_result） | messages.ts:460-520 | ★★ |
| 6 | 消息规范化（normalizeMessagesForAPI） | messages.ts:1989 | ★★ |

### 分步引导

**Step 1: 理解 tool_use 响应（5 分钟）**
- LLM 不仅返回文字，还可能返回工具调用请求
- Anthropic API 的 tool_use 格式：`{ type: 'tool_use', id, name, input }`
- 对比 Lab 1 的行为：Agent 说了"我来帮你读文件"但什么也没做 → 因为 tool_use 被忽略了

**Step 2: 完成 TODO 5 — 检测 tool_use 块（10 分钟）**
- 核心逻辑：过滤 `message.message.content` 中的 `type === 'tool_use'`
- 需要理解 `AssistantMessage` 的结构
- `needsFollowUp` 标志：这是"是否需要继续"的信号

**Step 3: 完成 TODO 6 — 判断是否需要执行工具（2 分钟）**
- 简单的 if 判断
- 没有 tool_use → 直接返回（和 Lab 1 行为一致）
- 有 tool_use → 继续执行

**Step 4: 完成 TODO 7 — 执行工具（10 分钟）★**
- `runTools()` 是工具编排的核心函数
- 理解它返回 `AsyncGenerator<MessageUpdate>`
- 每个 update 可能包含 message（工具结果）或 newContext（更新后的上下文）
- yield 工具结果给 TUI → 用户看到 Agent 在"做事"

**Step 5: 完成 TODO 8 — 收集工具结果（5 分钟）**
- 工具结果需要被规范化后存入 `toolResults` 数组
- 理解 `normalizeMessagesForAPI` 的作用
- 这些结果在 Lab 3 中会被喂回 LLM

**Step 6: 编译 + TUI 验证（5 分钟）**
- 编译成功后，让 Agent 读一个文件 → 成功读取！
- 让 Agent 做多步任务 → 只完成第一步就停
- 观察行为差异：Lab 1 vs Lab 2

### Hints (3 级)

**TODO 5 (Detect tool_use)**:
- **Hint 1**: 在 yield message 之后，检查 message 的类型。如果是 'assistant' 类型，它的 content 数组中可能有 type === 'tool_use' 的块。
- **Hint 2**: 用 `message.message.content.filter(c => c.type === 'tool_use')` 过滤。记得用 `as ToolUseBlock[]` 类型断言。如果有结果，推入 `toolUseBlocks` 并设 `needsFollowUp = true`。
- **Hint 3**:
  ```typescript
  if (message.type === 'assistant') {
    assistantMessages.push(message)
    const blocks = message.message.content.filter(
      c => c.type === 'tool_use'
    ) as ToolUseBlock[]
    if (blocks.length > 0) {
      toolUseBlocks.push(...blocks)
      needsFollowUp = true
    }
  }
  ```

**TODO 6 (Check needsFollowUp)**:
- **Hint 1**: 如果不需要执行工具，就可以结束对话了
- **Hint 2**: `if (!needsFollowUp) return { reason: 'completed' }`

**TODO 7 (Execute tools)**:
- **Hint 1**: `runTools()` 已经被导入了。它接收 4 个参数，返回 AsyncGenerator。你需要 for await 遍历它。
- **Hint 2**:
  ```typescript
  for await (const update of runTools(toolUseBlocks, assistantMessages, canUseTool, toolUseContext)) {
    if (update.message) yield update.message
    if (update.newContext) toolUseContext = { ...update.newContext }
  }
  ```
- **Hint 3**: 在 yield update.message 之后，还需要收集到 toolResults 数组（见 TODO 8）

**TODO 8 (Collect tool results)**:
- **Hint 1**: 工具结果需要用 `normalizeMessagesForAPI` 处理后才能用于后续对话
- **Hint 2**:
  ```typescript
  toolResults.push(
    ...normalizeMessagesForAPI([update.message], toolUseContext.options.tools)
      .filter(_ => _.type === 'user')
  )
  ```

## 测试验证

### 编译验证

```bash
node build.mjs --lab=2
```

**注意**：skeleton 中 `toolUseBlocks` 和 `needsFollowUp` 的声明位置需要调整。
完整实现中，它们应该在 `for await` 循环之前声明。

### TUI 行为预期

| 操作 | Lab 1 行为 | Lab 2 行为 | 差异说明 |
|------|-----------|-----------|---------|
| 输入 "你好" | 回复问候 | 回复问候 | 无差异（没有 tool_use） |
| 输入 "读 README.md" | 说"我来读"但不做 | **读取并显示文件内容** | ★ 关键差异 |
| 输入 "读 a.txt 再读 b.txt" | 什么都不做 | 只读第一个文件 | Lab 2 只执行一轮 |
| 输入 "找到配置中的端口号" | 什么都不做 | 可能读 README 但不继续 | 需要 2+ 步，Lab 2 只做 1 步 |

### 验证场景

**场景 1: 单工具调用**
```
用户: 读一下 README.md 的内容
预期: Agent 调用 Read 工具 → 显示文件内容 → 结束
```

**场景 2: 纯文本对话**
```
用户: 你好，今天天气怎么样？
预期: Agent 回复文字（不触发工具） → 结束
```

**场景 3: 多步任务（预期失败）**
```
用户: 读取 README.md，然后根据里面的说明读取配置文件
预期: Agent 读 README.md → 结束（不继续读配置文件）
      → 学习者感到"差一点就完成了" → 为 Lab 3 制造动机
```

### 常见编译错误

| 错误 | 原因 | 修复 |
|------|------|------|
| `Block scope variable used before declaration` | toolUseBlocks/needsFollowUp 在 for 循环之后声明 | 移到 for 循环之前 |
| `Cannot find name 'runTools'` | import 缺失 | 检查顶部 import |
| `Type 'void' is not assignable to 'Terminal'` | TODO 6 的 return 缺失 | 添加 return |

## 与其他 Lab 的关系

### 依赖 Lab 1 的哪些知识点

- API 调用（deps.callModel + for await + yield）
- 系统提示词构建
- AsyncGenerator 模式

### 为 Lab 3 铺垫了什么

- **tool_use 检测** — Lab 3 需要在每轮循环中检测
- **工具执行** — Lab 3 在循环中反复执行
- **toolResults 收集** — Lab 3 将它们喂回 LLM 继续
- **needsFollowUp 标志** — Lab 3 用它决定是否继续循环
- **"为什么 Agent 不继续？"** — Lab 3 的核心动机

### Lab 2 → Lab 3 的过渡

```
Lab 2 完成品（~130 行）+ Lab 3 新增 TODO（~15 行）= Lab 3 skeleton（~145 行）
```

Lab 3 只需要两个关键改动：
1. 包裹 `while(true)` 循环
2. 在循环底部更新 messages 数组

## 对应 query.ts 的精确映射

| Skeleton 部分 | query.ts 行号 | 说明 |
|---------------|-------------|------|
| Lab 1 完成部分 | 449-451, 365, 659-708 | 同 Lab 1 |
| TODO 5: Detect tool_use | 826-835 | 过滤 content blocks |
| TODO 6: Check needsFollowUp | 1062 | `if (!needsFollowUp) return` |
| TODO 7: Execute tools | 1380-1408 | `runTools()` + for await |
| TODO 8: Collect results | 1392-1398 | normalizeMessagesForAPI |
