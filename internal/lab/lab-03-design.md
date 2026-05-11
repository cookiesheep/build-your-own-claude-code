# Lab 3 设计文档 — Agent Loop ★

> Date: 2026-05-09 | Status: Draft
> **这是 BYOCC 的核心 Lab，获得 80% 的设计精力。**

## 基本信息

| 项 | 值 |
|---|---|
| **主题** | Agent Loop — 让 Agent 活过来 |
| **前置条件** | Lab 2 完成（API 调用 + 单轮工具执行） |
| **核心文件** | `src/query-lab3.ts`（唯一变体文件） |
| **原始文件** | `src/query.ts`（1729 行生产级 Agent Loop） |
| **PoC 参考** | `src/query-lab.ts`（227 行，已验证可运行） |
| **学习者代码量** | ~15 行新增 TODO（在 Lab 2 完成品基础上） |
| **难度** | ★★★★☆（高——概念密度最大） |
| **Motto** | **"It's alive! — the infinite loop that turns chatbot into agent"** |

## 为什么 Lab 3 是核心

**Chatbot vs Agent 的分界线就是 Agent Loop。**

```
Chatbot:
  用户 → LLM → 文字回复 → 结束

Agent:
  用户 → LLM → 文字回复 → 结束（如果没有工具调用）
                → 工具调用 → 执行 → 结果 → LLM → 可能继续...
                                        ↑
                                        │
                               ┌────────┴────────┐
                               │ while (true)     │
                               │ 这是 Agent Loop  │
                               └─────────────────┘
```

Lab 1 给了 Agent 声音（API calling），Lab 2 给了 Agent 双手（tools），Lab 3 给了 Agent **自主性**——它自己决定什么时候停止。

## 渐进式体验

### Lab 3 构建后 TUI 表现（WOW 时刻！）

1. **Agent 能对话** — 继承 Lab 1-2
2. **Agent 自主多轮调用工具** — "读 README → 根据内容读配置文件 → 回答问题"
3. **Agent 完成多步任务** — 读取 → 分析 → 写入 → 验证，全自动
4. **学习者看到 Agent "活" 了** — **这就是 WOW 时刻！**

### 学习者会感知到什么

- "它活了！" — Agent 不再是"说一次做一次"的工具，而是自主推理的 agent
- 理解 `while(true)` 不是死循环——它是 Agent 的"心跳"
- 理解 Agent Loop 的本质：**把工具结果喂回 LLM，让 LLM 决定下一步**
- 对比 Lab 2：同一个 Agent，加了 3 行代码，从"单轮工具执行器"变成"自主推理 agent"

### ASCII 架构图

```
Lab 3 的 query() 函数结构：

┌──────────────────────────────────────────────┐
│           query(params)                       │
│           AsyncGenerator                      │
├──────────────────────────────────────────────┤
│                                               │
│  ┌─────────────────────────────────────────┐  │
│  │ TODO 9: while (true) {                  │  │  ← NEW! Agent 的心跳
│  │         turnCount++                     │  │
│  │         if (maxTurns exceeded) return   │  │
│  ┼─────────────────────────────────────────┤  │
│  │                                         │  │
│  │  ┌─────────────────────────────────┐   │  │
│  │  │ ✓ Lab 1: Build system prompt    │   │  │  ← 已完成
│  │  │ ✓ Lab 1: Get messages           │   │  │  ← 已完成
│  │  │ ✓ Lab 1: Call LLM + yield       │   │  │  ← 已完成
│  │  └───────────────┬─────────────────┘   │  │
│  │                  │                      │  │
│  │  ┌───────────────▼─────────────────┐   │  │
│  │  │ ✓ Lab 2: Detect tool_use        │   │  │  ← 已完成
│  │  │ ✓ Lab 2: Check needsFollowUp    │   │  │  ← 已完成
│  │  │   if no tools → return completed│   │  │
│  │  └───────────────┬─────────────────┘   │  │
│  │                  │ (tools found)        │  │
│  │  ┌───────────────▼─────────────────┐   │  │
│  │  │ ✓ Lab 2: Execute tools          │   │  │  ← 已完成
│  │  │ ✓ Lab 2: Collect tool results   │   │  │  ← 已完成
│  │  └───────────────┬─────────────────┘   │  │
│  │                  │                      │  │
│  │  ┌───────────────▼─────────────────┐   │  │
│  │  │ TODO 10: Update messages        │   │  │  ← NEW! 喂回 LLM
│  │  │ messages = [old + new results]  │   │  │
│  │  └───────────────┬─────────────────┘   │  │
│  │                  │                      │  │
│  │                  └──────► continue ─────┼──┼──► 回到循环顶部!
│  │                                         │  │
│  │ } // end while (true)                   │  │
│  └─────────────────────────────────────────┘  │
│                                                │
│  Agent Loop = while(true) { call → detect →   │
│    execute → update → repeat }                 │
└──────────────────────────────────────────────┘
```

### Agent Loop 的本质（3 句话解释）

> 1. Agent Loop 就是一个 `while(true)` 循环
> 2. 每轮循环：调用 LLM → 如果 LLM 要用工具 → 执行工具 → 把结果喂回 LLM → 重复
> 3. 当 LLM 不再请求工具时，循环结束，Agent 回复最终答案

## 挖空方案

### 唯一变体文件: `src/query-lab3.ts`

- **原始文件**: `src/query.ts` (1729 行)
- **PoC 参考**: `src/query-lab.ts` (227 行，已验证可运行)
- **挖空策略**: Lab 2 完成品 + 循环结构的 TODO。学习者只需要添加 ~15 行代码就能让 Agent "活" 过来。

### 设计哲学

Lab 3 的教学密度最高，但代码量最少。这是因为：

- **概念密度高**：`while(true)` + `continue` + 消息累积 + 终止条件
- **代码量少**：只比 Lab 2 多 ~15 行
- **杠杆效应最大**：3 行代码让 Agent 从"工具执行器"变成"自主 agent"

### Skeleton 代码

```typescript
/**
 * Lab 3: Agent Loop — "It's Alive!" ★★★
 *
 * 这是 BYOCC 最重要的 Lab。
 *
 * 在 Lab 2 中，你的 Agent 能调用工具——但只用一次就停了。
 * 现在，你要给它"自主性"：让 Agent 自己决定何时停止。
 *
 * 核心洞察：
 *   Chatbot = 调用一次 LLM，返回文字
 *   Agent   = while(true) { 调用 LLM → 用工具 → 继续 }
 *
 * Agent Loop 的本质：
 *   1. while(true) 循环
 *   2. 每轮：调 LLM → 如果 LLM 要用工具 → 执行 → 把结果喂回 LLM
 *   3. LLM 不再请求工具时，循环结束
 *
 * 你只需要添加 ~15 行代码——但它改变了一切。
 *
 * ┌──────────────────────────────────────────────┐
 * │  while (true) {                               │
 * │    call LLM ──► yield response to TUI         │
 * │         │                                     │
 * │         ├── no tool_use? ──► return completed  │
 * │         │                                     │
 * │         └── tool_use? ──► execute tools        │
 * │                              │                │
 * │                              ▼                │
 * │                        update messages        │
 * │                              │                │
 * │                              └──► continue     │
 * │  }                                            │
 * └──────────────────────────────────────────────┘
 *
 * Motto: "It's alive! — the infinite loop that turns chatbot into agent"
 *
 * 完成后，在 TUI 中试试这些：
 *   "读取 README.md，找到里面提到的配置文件，读取配置，告诉我端口号"
 *   → Agent 会自主完成 3 步推理！
 *
 * 参考文件：
 *   生产版: src/query.ts (1729 行, while(true) 在 line 307)
 *   PoC 版: src/query-lab.ts (227 行, 已验证可运行)
 *   依赖注入: src/query/deps.ts (4 个可注入依赖)
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

/**
 * query() — Agent 的核心循环
 *
 * 这是 Agent 的"大脑"。它是一个 AsyncGenerator：
 * - yield: 向 TUI 发送消息（LLM 响应、工具结果）
 * - return: 结束对话，返回终止原因
 *
 * 对比 Lab 2：
 *   Lab 2 = 单轮执行（调用 LLM → 执行工具 → 结束）
 *   Lab 3 = 循环执行（调用 LLM → 执行工具 → 继续 → 直到 LLM 不再请求工具）
 *
 * 区别只有 ~15 行代码，但 Agent 从"被动工具执行器"变成了"自主推理 agent"。
 */
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
    maxTurns,
  } = params
  const deps = params.deps ?? productionDeps()
  let messages = [...params.messages]
  let toolUseContext = params.toolUseContext

  // ================================================================
  // ✓ Lab 1 完成：构建系统提示词
  // ================================================================
  const fullSystemPrompt = asSystemPrompt(
    appendSystemContext(systemPrompt, systemContext),
  )

  // ================================================================
  // TODO 9: Agent Loop — while (true) + 安全保护
  //
  // 这是 Lab 3 的核心！你需要：
  //   1. 用 while (true) 包裹整个 Agent 逻辑
  //   2. 添加 turnCount 计数器（在循环前初始化为 0）
  //   3. 每轮循环开始时 turnCount++
  //   4. 安全保护：if (maxTurns && turnCount > maxTurns) return
  //
  // 为什么需要 maxTurns？
  //   如果 LLM 一直请求工具，Agent 会永远运行下去。
  //   maxTurns 是安全阀——防止无限循环消耗 API 额度。
  //
  // 结构：
  //   let turnCount = 0
  //   while (true) {
  //     turnCount++
  //     if (maxTurns && turnCount > maxTurns) {
  //       return { reason: 'max_turns', turnCount }
  //     }
  //     // ... (Lab 1 + Lab 2 的代码在这里)
  //   }
  //
  // 提示：把下面所有的代码（从 yield stream_request_start 开始）
  //       都缩进一层，放到 while(true) 里面。
  // ================================================================

  // ================================================================
  // ✓ Lab 1 完成：通知 TUI 开始请求
  // ================================================================
  yield { type: 'stream_request_start' }

  // ================================================================
  // ✓ Lab 1 完成：获取消息列表
  // ================================================================
  const messagesForQuery = [...getMessagesAfterCompactBoundary(messages)]
  toolUseContext = { ...toolUseContext, messages: messagesForQuery }

  // 累加器：收集本轮的助手消息和工具调用
  const assistantMessages: AssistantMessage[] = []
  const toolResults: (UserMessage | AttachmentMessage)[] = []
  const toolUseBlocks: ToolUseBlock[] = []
  let needsFollowUp = false

  const appState = toolUseContext.getAppState()
  const permissionMode = appState.toolPermissionContext.mode
  const currentModel = getRuntimeMainLoopModel({
    permissionMode,
    mainLoopModel: toolUseContext.options.mainLoopModel,
  })

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
      // ✓ Lab 2 完成：从助手消息中收集 tool_use 块
      // ================================================================
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
    }
  } catch (error) {
    logError(error)
    return { reason: 'model_error', error: error as Error }
  }

  // ================================================================
  // ✓ Lab 2 完成：中断检查
  // ================================================================
  if (toolUseContext.abortController.signal.aborted) {
    return { reason: 'aborted_streaming' }
  }

  // ================================================================
  // ✓ Lab 2 完成：检查是否需要执行工具
  // ================================================================
  if (!needsFollowUp) {
    return { reason: 'completed' }
  }

  // ================================================================
  // ✓ Lab 2 完成：执行工具
  // ================================================================
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

  // ================================================================
  // ✓ Lab 2 完成：工具执行中断检查
  // ================================================================
  if (toolUseContext.abortController.signal.aborted) {
    return { reason: 'aborted_tools' }
  }

  // ================================================================
  // TODO 10: 更新消息历史，为下一轮循环做准备 ★★★
  //
  // 这是 Agent Loop 的"燃料"——把工具执行的结果喂回消息列表，
  // 让下一轮 LLM 调用能看到"我调用了工具，结果是..."。
  //
  // 你需要更新 messages 数组，让它包含：
  //   1. messagesForQuery — 之前的对话历史
  //   2. normalizeMessagesForAPI(assistantMessages, ...) — 本轮 LLM 的回复（含 tool_use）
  //   3. toolResults — 工具执行的结果
  //
  // 这样新一轮 LLM 调用时，它会看到完整的对话：
  //   用户: "读 README.md"
  //   助手: [tool_use: read_file("README.md")]
  //   用户: [tool_result: "config is in settings.json"]  ← 工具结果
  //   → LLM 看到这些后，可能会决定继续读 settings.json
  //
  // 代码：
  //   messages = [
  //     ...messagesForQuery,
  //     ...normalizeMessagesForAPI(assistantMessages, toolUseContext.options.tools),
  //     ...toolResults,
  //   ]
  //
  // 更新后，while(true) 循环回到顶部，开始下一轮！
  // ================================================================

  // while(true) 循环的末尾隐式 continue → 回到顶部
  // 如果 LLM 在下一轮不再请求工具 → needsFollowUp = false → return completed
}
```

### 参考答案

<details>
<summary>点击展开 Lab 3 完整参考答案（= 已验证的 PoC query-lab.ts）</summary>

```typescript
/**
 * Lab 3 完整答案 = src/query-lab.ts（已验证可运行的 PoC）
 *
 * 只需要在 Lab 2 基础上添加 3 处代码：
 */

// --- TODO 9 答案：在函数体开头添加 ---
let turnCount = 0

// eslint-disable-next-line no-constant-condition
while (true) {
  turnCount++

  // 安全保护：最大迭代次数
  if (maxTurns && turnCount > maxTurns) {
    return { reason: 'max_turns', turnCount }
  }

  // --- 以下是 Lab 1 + Lab 2 的完整代码（缩进一层）---

  yield { type: 'stream_request_start' }

  const messagesForQuery = [...getMessagesAfterCompactBoundary(messages)]
  toolUseContext = { ...toolUseContext, messages: messagesForQuery }

  const assistantMessages: AssistantMessage[] = []
  const toolResults: (UserMessage | AttachmentMessage)[] = []
  const toolUseBlocks: ToolUseBlock[] = []
  let needsFollowUp = false

  // ... callModel + tool detection + tool execution ...

  // --- TODO 10 答案：在工具执行完成后添加 ---

  // 更新消息历史，继续循环
  messages = [
    ...messagesForQuery,
    ...normalizeMessagesForAPI(assistantMessages, toolUseContext.options.tools),
    ...toolResults,
  ]

  // 循环回到 while(true) 顶部！
}
```

</details>

## 教学设计

### 知识点

| # | 知识点 | 对应源码位置 | 难度 | 重要性 |
|---|--------|-------------|------|--------|
| 1 | while(true) 循环结构 | query.ts:307 | ★★ | ★★★★★ |
| 2 | 安全保护（maxTurns） | query.ts:1705-1712 | ★ | ★★★★ |
| 3 | 消息历史累积 | query.ts:1715-1727 | ★★★ | ★★★★★ |
| 4 | Agent 终止条件 | query.ts:1062 | ★★ | ★★★★★ |
| 5 | tool_use → tool_result → continue 的完整回路 | query.ts:826-1727 | ★★★ | ★★★★★ |
| 6 | 与生产版 query.ts 的差异 | query.ts vs query-lab.ts | ★★ | ★★★ |

### Lab 3 的认知负荷分析

**为什么 Lab 3 概念密度最高**：

学习者需要同时理解：
1. `while(true)` 不是死循环——有终止条件（`needsFollowUp === false`）
2. `messages` 在每轮循环中被更新——这是 Agent 的"记忆"
3. 工具结果通过 `normalizeMessagesForAPI` 转换为 LLM 可理解的格式
4. `yield` 和 `return` 的区别——yield 是临时发送，return 是永久结束
5. `turnCount` 安全阀——防止 API 额度耗尽

**缓解策略**：
- 代码量最少（~15 行新代码），降低认知负担
- 完整的 ASCII 架构图标注每一步
- 分级 Hints（从方向到完整代码）
- "3 句话解释" 放在文档顶部

### 分步引导

**Step 1: 对比 Lab 2 和 Lab 3 的行为（5 分钟）**
- 在 TUI 中用 Lab 2 完成 "读取 README → 读配置 → 回答端口"
  - Lab 2: 只读 README → 停止
  - Lab 3: 读 README → 读配置 → 回答端口 → 完成
- 差异来自哪里？ → **循环**

**Step 2: 理解 Agent Loop 的 3 句话定义（5 分钟）**

> 1. Agent Loop 就是 while(true) 循环
> 2. 每轮：调 LLM → 如果要工具 → 执行 → 喂回 → 重复
> 3. LLM 不再要工具时，循环结束

**Step 3: 完成 TODO 9 — 添加 while(true) 循环（10 分钟）★**
- 把 Lab 2 的代码缩进一层，放到 while(true) 里
- 添加 turnCount 和 maxTurns 安全保护
- **关键理解**：循环不是"重复做同样的事"——每轮的 `messages` 不同

**Step 4: 完成 TODO 10 — 更新消息历史（10 分钟）★**
- 这是 Agent Loop 的"燃料"
- 理解 `messages = [...old, ...new_assistant, ...new_tool_results]`
- 下一轮 LLM 调用会看到更新后的消息 → 做出新的决策

**Step 5: 编译 + TUI 验证（10 分钟）**
- 编译成功后，尝试多步任务
- "读取 README.md，找到配置文件，读取配置，告诉我端口号"
- 观察 Agent 自主完成 3 步推理！
- **这就是 WOW 时刻！**

**Step 6: 对比和理解（5 分钟）**
- 对比 Lab 1 → Lab 2 → Lab 3 的行为变化
- 理解 `query-lab.ts`（227 行）和 `query.ts`（1729 行）的差异
- 理解生产级的 7 层结构（Layer 0-6），知道自己实现了 Layer 0

### Hints (3 级)

**TODO 9 (while true + safety)**:
- **Hint 1 (方向)**: 你需要用 `while(true)` 包裹从 `yield { type: 'stream_request_start' }` 开始的所有代码。在循环外部添加一个 `turnCount` 计数器。在循环内部，先增加计数器，再检查是否超过 `maxTurns`。
- **Hint 2 (结构)**:
  ```
  let turnCount = 0
  while (true) {
    turnCount++
    if (maxTurns && turnCount > maxTurns) {
      return { reason: 'max_turns', turnCount }
    }
    // ... (所有现有代码缩进一层)
  }
  ```
- **Hint 3 (关键理解)**: 注意 `messages` 变量在循环外声明为 `let`（不是 `const`），这意味着每轮循环可以更新它。`messages` 的更新就是 Agent 的"记忆增长"。

**TODO 10 (Update messages)**:
- **Hint 1 (方向)**: 在工具执行完成后，你需要把本轮的新消息（助手回复 + 工具结果）合并到 messages 数组中。这样新一轮 LLM 调用时能看到完整的对话历史。
- **Hint 2 (具体)**:
  ```typescript
  messages = [
    ...messagesForQuery,                                                     // 之前的对话
    ...normalizeMessagesForAPI(assistantMessages, toolUseContext.options.tools),  // 本轮助手回复（含 tool_use）
    ...toolResults,                                                          // 工具执行结果
  ]
  ```
- **Hint 3 (完整代码)**: 这就是 PoC `query-lab.ts` 的第 220-224 行。添加后，while(true) 循环会继续到顶部，开始新一轮 LLM 调用。如果 LLM 在新一轮不再请求工具，`needsFollowUp` 会保持 `false`，循环终止。

## 测试验证

### 编译验证

```bash
node build.mjs --lab=3
```

**预期输出**：
```
Swapped dist/src/query.js ← src/query-lab3.ts
Build succeeded
```

### TUI 行为预期（WOW 时刻验证场景）

**场景 1: 多步文件读取** ★ CodeCrafters Stage 4 级别
```
准备工作区:
  README.md: "Server config is in config/settings.json"
  config/settings.json: '{"port": 8080, "host": "localhost"}'

用户: "服务器配置的端口号是多少？"
Agent 行为:
  Round 1: LLM → tool_use(read_file, {path: "README.md"})
           → 执行 → "Server config is in config/settings.json"
  Round 2: LLM → tool_use(read_file, {path: "config/settings.json"})
           → 执行 → '{"port": 8080, ...}'
  Round 3: LLM → text: "端口号是 8080"
  → needsFollowUp = false → return completed

预期: Agent 自主完成 3 步推理！
```

**场景 2: 读后写**
```
准备工作区:
  data.txt: "important data"

用户: "读取 data.txt 然后创建 backup.txt 备份"
Agent 行为:
  Round 1: LLM → tool_use(read_file, {path: "data.txt"})
           → 执行 → "important data"
  Round 2: LLM → tool_use(write_file, {path: "backup.txt", content: "important data"})
           → 执行 → OK
  Round 3: LLM → text: "已创建备份"
  → return completed
```

**场景 3: 纯文本对话（无工具调用）**
```
用户: "1+1等于几？"
Agent 行为:
  Round 1: LLM → text: "1+1 = 2"
  → needsFollowUp = false → return completed

预期: 不触发任何工具调用，直接回复。
```

**场景 4: 复杂多步任务**
```
准备工作区:
  README.md: "这个项目有两个配置文件：
    - config/dev.json: 开发环境
    - config/prod.json: 生产环境
    需要确保两个环境使用相同的数据库。"
  config/dev.json: '{"db": "localhost:5432", "port": 3000}'
  config/prod.json: '{"db": "localhost:5432", "port": 8080"}'

用户: "检查开发和生产环境的数据库配置是否一致"
Agent 行为:
  Round 1: 读 README.md
  Round 2: 读 config/dev.json
  Round 3: 读 config/prod.json
  Round 4: LLM → text: "两个环境使用相同的数据库 localhost:5432"
  → return completed

预期: Agent 自主完成 4 步推理！
```

### 行为对比表

| 操作 | Lab 1 | Lab 2 | Lab 3 |
|------|-------|-------|-------|
| "你好" | 回复文字 | 回复文字 | 回复文字 |
| "读 README.md" | 说"我来读"不做 | 读一次就停 | 读 → 如果需要继续 → 继续 |
| "读 README → 读配置 → 告诉我端口" | 什么都不做 | 只读 README | **自主 3 步推理** |
| 复杂多步任务 | 什么都不做 | 最多做 1 步 | **自主 N 步推理** |

### 常见编译错误

| 错误 | 原因 | 修复 |
|------|------|------|
| `Unreachable code detected` | while(true) 后面有代码 | while(true) 应该是函数的最后结构 |
| `Cannot assign to 'messages'` | messages 声明为 const | 改为 `let messages = [...]` |
| `Block-scoped variable 'turnCount' used before declaration` | turnCount 位置不对 | 移到 while(true) 之前 |
| Agent 没有循环 | TODO 10 缺失 | 添加 messages 更新 |

### 验证 Agent Loop 确实在工作

**怎么确认 Agent 真的在循环？**

1. 在 TUI 中观察：Agent 的行为是"读文件 → 思考 → 继续读 → 思考 → 回答"
2. 每个 `[Agent 正在思考...]` 提示 = 新一轮 LLM 调用 = while(true) 的一次迭代
3. 如果只有 1 个 `[Agent 正在思考...]` = 没有循环（Lab 2 行为）
4. 如果有 2+ 个 = 循环在工作！（Lab 3 行为）

## 与 query.ts 的精确映射

| Skeleton 部分 | query.ts 行号 | query-lab.ts 行号 | 说明 |
|---------------|-------------|-------------------|------|
| TODO 9: while(true) | 307 | 94 | 循环入口 |
| turnCount + maxTurns | 1705-1712 | 95-100 | 安全保护 |
| stream_request_start | 337 | 103 | yield 请求开始 |
| getMessagesAfterCompactBoundary | 365 | 106 | 获取消息 |
| 累加器初始化 | 551-558 | 111-114 | assistant/tool/msg 数组 |
| deps.callModel() | 659-708 | 125-159 | LLM 调用 |
| tool_use 检测 | 826-835 | 166-173 | content 过滤 |
| needsFollowUp 检查 | 1062 | 187-189 | 终止条件 |
| runTools() | 1380-1408 | 192-212 | 工具执行 |
| TODO 10: messages 更新 | 1715-1727 | 220-224 | **循环燃料** |

### query.ts 的 7 层结构 vs Lab 3 实现

| 层 | 内容 | query.ts 行数 | Lab 3 实现 |
|----|------|-------------|-----------|
| **Layer 0: 核心循环** | while + call + detect + execute + update | ~130 行等效 | **✅ 学习者实现** |
| Layer 1: 错误处理 | model error + abort | ~40 行 | ✅ 简化版包含 |
| Layer 2: 模型回退 | fallback retry loop | ~300 行 | ❌ 不需要 |
| Layer 3: 上下文压缩 | micro + auto + snip + collapse | ~200 行 | ❌ Lab 5 |
| Layer 4: 恢复路径 | prompt-too-long, max_tokens | ~300 行 | ❌ 不需要 |
| Layer 5: 流式工具 | StreamingToolExecutor | ~100 行 | ❌ 不需要 |
| Layer 6: 可观测性 | analytics, telemetry | ~100 行 | ❌ 不需要 |

**学习者实现了核心循环（Layer 0），它占生产版代码的 ~7%（130/1729），
但覆盖了 Agent Loop 100% 的核心逻辑。**

## 与其他 Lab 的关系

### 依赖 Lab 1-2 的哪些知识点

- **Lab 1**: API 调用（deps.callModel + yield + return）
- **Lab 2**: 工具检测（tool_use filtering）+ 工具执行（runTools）

### 为 Lab 4 铺垫了什么

- **Agent Loop 本身** — Lab 4 在此基础上添加 TodoWrite（规划）和 Subagent（任务拆分）
- **消息历史管理** — Lab 4 需要在消息中添加 todo 列表
- **while(true) 结构** — Lab 4 添加了 "先规划再执行" 的逻辑

### Lab 3 在整个项目中的位置

```
Lab 0: 环境 + 体验（看到目标）
Lab 1: API 调用（给 Agent 声音）      ← 基础
Lab 2: 工具系统（给 Agent 双手）      ← 扩展
Lab 3: Agent Loop（给 Agent 自主性）   ← 核心！
Lab 4: 规划 + 子Agent（给 Agent 智慧） ← 进阶
Lab 5: 上下文压缩（给 Agent 记忆）     ← 优化
```

**Lab 3 是从 "chatbot" 到 "agent" 的分水岭。**

## 附录：query-lab.ts (PoC) 完整代码参考

以下是已验证可运行的简化版 Agent Loop（227 行），是 Lab 3 的目标参考实现：

```typescript
// 文件: src/query-lab.ts (已验证)
// 对比: src/query.ts (1729 行) — 简化了 ~93% 的代码

// ... imports 同 skeleton ...

export async function* query(params: QueryParams): AsyncGenerator<..., Terminal> {
  const { systemPrompt, userContext, systemContext, canUseTool, querySource, maxTurns } = params
  const deps = params.deps ?? productionDeps()
  let messages = [...params.messages]
  let toolUseContext = params.toolUseContext

  const fullSystemPrompt = asSystemPrompt(appendSystemContext(systemPrompt, systemContext))

  while (true) {                                    // ← Agent Loop
    turnCount++
    if (maxTurns && turnCount > maxTurns)           // ← 安全保护
      return { reason: 'max_turns', turnCount }

    yield { type: 'stream_request_start' }          // ← 通知 TUI
    const messagesForQuery = [...getMessagesAfterCompactBoundary(messages)]
    toolUseContext = { ...toolUseContext, messages: messagesForQuery }

    const assistantMessages = []                    // ← 累加器
    const toolResults = []
    const toolUseBlocks = []
    let needsFollowUp = false

    for await (const message of deps.callModel({   // ← 调用 LLM
      messages: prependUserContext(messagesForQuery, userContext),
      systemPrompt: fullSystemPrompt,
      // ... options ...
    })) {
      yield message                                // ← yield 给 TUI

      if (message.type === 'assistant') {          // ← 检测 tool_use
        assistantMessages.push(message)
        const blocks = message.message.content.filter(c => c.type === 'tool_use')
        if (blocks.length > 0) {
          toolUseBlocks.push(...blocks)
          needsFollowUp = true
        }
      }
    }

    if (!needsFollowUp)                            // ← 终止条件
      return { reason: 'completed' }

    for await (const update of runTools(...)) {    // ← 执行工具
      if (update.message) {
        yield update.message
        toolResults.push(...)
      }
    }

    messages = [                                   // ← 更新消息（循环燃料）
      ...messagesForQuery,
      ...normalizeMessagesForAPI(assistantMessages, ...),
      ...toolResults,
    ]
  }                                                // → 回到 while(true) 顶部
}
```
