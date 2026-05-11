# Lab 1 设计文档 — API Calling

> Date: 2026-05-09 | Status: Draft

## 基本信息

| 项 | 值 |
|---|---|
| **主题** | API Calling — 让 Agent 能与 LLM 对话 |
| **前置条件** | Lab 0 完成（已体验完整 Claude Code TUI） |
| **核心文件** | `src/query-lab1.ts`（唯一变体文件） |
| **原始文件** | `src/query.ts`（1729 行生产级 Agent Loop） |
| **学习者代码量** | ~25 行 TODO 填空 |
| **难度** | ★★☆☆☆（中等偏易） |
| **Motto** | **"The first conversation — teaching silence to speak"** |

## 渐进式体验

### Lab 1 构建后 TUI 表现

构建成功后，学习者在 TUI 中会看到：

1. **TUI 正常启动** — Logo、状态栏、输入框全部显示
2. **输入消息 → Agent 能回复文字** — 但 Agent 不调用任何工具
3. **Agent 可能说 "我来帮你读文件"** — 但什么也不会做
4. **对比 Lab 0 的完整 Agent** — 学习者感受到 Agent "失去了双手"

### 学习者会感知到什么

- "我写了几十行代码，就让这个 416K 行的系统重新能说话了"
- 理解 `AsyncGenerator` + `yield` 是 Agent 和 TUI 之间的桥梁
- 理解 `deps.callModel()` 是所有能力的源头——没有 API 调用，一切都不存在

### ASCII 架构图（嵌入 skeleton 注释中）

```
Lab 1 的 query() 函数结构：

┌─────────────────────────────────┐
│       query(params)              │
│       AsyncGenerator             │
├─────────────────────────────────┤
│                                  │
│  ┌─────────────────────────────┐ │
│  │ TODO 1: Build system prompt │ │  ← 你需要实现
│  └────────────┬────────────────┘ │
│               │                  │
│  ┌────────────▼────────────────┐ │
│  │ TODO 2: Get messages        │ │  ← 你需要实现
│  └────────────┬────────────────┘ │
│               │                  │
│  ┌────────────▼────────────────┐ │
│  │ TODO 3: Call LLM            │ │  ← 你需要实现 (核心!)
│  │ deps.callModel({...})       │ │
│  │ for await (msg of stream)   │ │
│  │   yield msg                 │ │
│  └────────────┬────────────────┘ │
│               │                  │
│  ┌────────────▼────────────────┐ │
│  │ TODO 4: Return completed    │ │  ← 你需要实现
│  └─────────────────────────────┘ │
│                                  │
│  （没有工具处理，没有循环）        │
│  Lab 1 = 单轮对话                │
└─────────────────────────────────┘
```

## 挖空方案

### 唯一变体文件: `src/query-lab1.ts`

- **原始文件**: `src/query.ts` (1729 行，完整的 Agent Loop)
- **挖空策略**: 只保留 `query()` 函数的框架和 LLM 调用路径，移除所有工具处理、循环、上下文压缩。学习者填入 4 个 TODO 区块。
- **为什么只挖这一个文件**: `query.ts` 是 Agent 的"大脑"。所有其他文件（API client、工具系统、TUI）保持不变。通过替换 `query.ts`，我们精确控制 Agent 的能力级别。

### Skeleton 代码

```typescript
/**
 * Lab 1: API Calling — "The First Conversation"
 *
 * 你正在修复一个"失声"的 Agent。
 * 完整的 Claude Code TUI 已经在运行，但 Agent 无法响应——
 * 因为这个 query() 函数还没有实现与 LLM 的对话能力。
 *
 * 你的任务：实现 4 个 TODO，让 Agent 能够：
 *   1. 构建系统提示词
 *   2. 准备发送给 LLM 的消息
 *   3. 调用 LLM 并将响应展示在 TUI 中
 *   4. 正确结束对话
 *
 * 完成后，你会在 TUI 中看到 Agent 回复你的消息！
 * （但 Agent 还不能用工具——那是 Lab 2 的事）
 *
 * ┌─────────────────────────────────┐
 * │       query(params)              │
 * │       AsyncGenerator             │
 * ├─────────────────────────────────┤
 * │  TODO 1: Build system prompt     │
 * │           ↓                      │
 * │  TODO 2: Get messages            │
 * │           ↓                      │
 * │  TODO 3: Call LLM (core!)        │
 * │           ↓                      │
 * │  TODO 4: Return completed        │
 * └─────────────────────────────────┘
 *
 * Motto: "The first conversation — teaching silence to speak"
 *
 * 参考文件：
 *   完整版: src/query.ts (1729 行)
 *   PoC 版: src/query-lab.ts (227 行)
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
  normalizeMessagesForAPI,
  getMessagesAfterCompactBoundary,
} from './utils/messages.js'
import { prependUserContext, appendSystemContext } from './utils/api.js'
import { getRuntimeMainLoopModel } from './utils/model/model.js'
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
 * query() — Agent 的核心函数
 *
 * 这是一个 AsyncGenerator：它通过 yield 向 TUI 发送消息，
 * 通过 return 结束对话。
 *
 * TUI 会消费这个 generator，把 yield 出来的每条消息显示在终端中。
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
    querySource,
  } = params
  const deps = params.deps ?? productionDeps()
  const messages = [...params.messages]
  let toolUseContext = params.toolUseContext

  // ================================================================
  // TODO 1: 构建完整的系统提示词
  //
  // 系统提示词 (system prompt) 是发送给 LLM 的"角色设定"，
  // 告诉模型它是谁、应该怎么回答。
  //
  // 你需要：
  //   1. 用 appendSystemContext(systemPrompt, systemContext) 把系统上下文追加到提示词
  //   2. 用 asSystemPrompt() 包装结果（它会把字符串数组转为系统提示词格式）
  //
  // 提示：这是一行代码。两个函数的组合。
  //
  // const fullSystemPrompt = ...
  // ================================================================

  // 通知 TUI：即将开始 API 请求
  yield { type: 'stream_request_start' }

  // ================================================================
  // TODO 2: 获取需要发送给 LLM 的消息列表
  //
  // claude-code-diy 有一个"上下文压缩"机制，会在对话过长时
  // 自动压缩历史消息。getMessagesAfterCompactBoundary() 返回
  // 压缩边界之后的最新消息。
  //
  // 你需要：
  //   用 getMessagesAfterCompactBoundary(messages) 获取消息列表
  //   用 [...] 展开为一个新数组
  //
  // 提示：这也是一行代码。
  //
  // const messagesForQuery = ...
  // ================================================================

  // 更新 toolUseContext 中的消息引用（工具执行时需要看到对话历史）
  toolUseContext = { ...toolUseContext, messages: messagesForQuery }

  // 获取当前应使用的模型名称
  const appState = toolUseContext.getAppState()
  const permissionMode = appState.toolPermissionContext.mode
  const currentModel = getRuntimeMainLoopModel({
    permissionMode,
    mainLoopModel: toolUseContext.options.mainLoopModel,
  })

  // ================================================================
  // TODO 3: 调用 LLM 并将响应 yield 给 TUI  ★ Lab 1 核心 ★
  //
  // 这是 Agent 最核心的能力：与 LLM 对话。
  //
  // deps.callModel() 返回一个 AsyncGenerator，每次 yield 一个
  // 消息（可能是文本片段、工具调用请求、或流事件）。
  //
  // 你需要：
  //   1. 用 try/catch 包裹（处理网络错误）
  //   2. 用 for await...of 循环遍历 deps.callModel() 的返回值
  //   3. yield 每个消息给 TUI
  //   4. 在 catch 中 logError(error) 并 return { reason: 'model_error', error }
  //
  // deps.callModel 的参数对象：
  //   {
  //     messages: prependUserContext(messagesForQuery, userContext),
  //     systemPrompt: fullSystemPrompt,
  //     thinkingConfig: toolUseContext.options.thinkingConfig,
  //     tools: toolUseContext.options.tools,
  //     signal: toolUseContext.abortController.signal,
  //     options: {
  //       async getToolPermissionContext() {
  //         return toolUseContext.getAppState().toolPermissionContext
  //       },
  //       model: currentModel,
  //       toolChoice: undefined,
  //       isNonInteractiveSession: toolUseContext.options.isNonInteractiveSession,
  //       fallbackModel: params.fallbackModel,
  //       querySource,
  //       agents: toolUseContext.options.agentDefinitions.activeAgents,
  //       allowedAgentTypes: toolUseContext.options.agentDefinitions.allowedAgentTypes,
  //       hasAppendSystemPrompt: !!toolUseContext.options.appendSystemPrompt,
  //       maxOutputTokensOverride: params.maxOutputTokensOverride,
  //       mcpTools: appState.mcp.tools,
  //       hasPendingMcpServers: appState.mcp.clients.some(c => c.type === 'pending'),
  //       queryTracking: toolUseContext.queryTracking,
  //       effortValue: appState.effortValue,
  //       advisorModel: appState.advisorModel,
  //       skipCacheWrite: params.skipCacheWrite,
  //       agentId: toolUseContext.agentId,
  //       addNotification: toolUseContext.addNotification,
  //     },
  //   }
  //
  // 结构提示：
  //   try {
  //     for await (const message of deps.callModel({ ... })) {
  //       yield message
  //     }
  //   } catch (error) {
  //     logError(error)
  //     return { reason: 'model_error', error: error as Error }
  //   }
  // ================================================================

  // ================================================================
  // TODO 4: 返回完成状态
  //
  // 当 LLM 回复完毕（没有更多消息需要 yield），返回完成状态。
  // TUI 收到这个 return 值后知道本轮对话结束了。
  //
  // 提示：return { reason: 'completed' }
  // ================================================================
}
```

### 参考答案（TODO 填充后的完整代码）

<details>
<summary>点击展开参考答案</summary>

```typescript
// TODO 1 答案：
const fullSystemPrompt = asSystemPrompt(
  appendSystemContext(systemPrompt, systemContext),
)

// TODO 2 答案：
const messagesForQuery = [...getMessagesAfterCompactBoundary(messages)]

// TODO 3 答案：
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
  }
} catch (error) {
  logError(error)
  return { reason: 'model_error', error: error as Error }
}

// TODO 4 答案：
return { reason: 'completed' }
```

</details>

## 教学设计

### 知识点

| # | 知识点 | 对应源码位置 | 难度 |
|---|--------|-------------|------|
| 1 | AsyncGenerator + yield 模式 | query.ts 函数签名 | ★★★ |
| 2 | 系统提示词 (System Prompt) 构建 | query.ts:449-451 | ★ |
| 3 | 消息历史管理 | query.ts:365 | ★ |
| 4 | 依赖注入 (deps 模式) | deps.ts:21-40 | ★★ |
| 5 | LLM 流式响应处理 | claude.ts:1940-2304 | ★★★ |
| 6 | Anthropic Messages API 格式 | claude.ts:1699-1728 | ★★ |

### 分步引导

**Step 1: 理解 query() 是什么（5 分钟）**
- `query()` 是 Agent 的"大脑函数"
- 它是一个 `AsyncGenerator`——通过 `yield` 发消息给 TUI，通过 `return` 结束对话
- TUI 调用 `query()` 就像读一个故事：每次 `yield` 是一页，`return` 是结局

**Step 2: 完成 TODO 1 — 构建系统提示词（2 分钟）**
- 这是热身练习，只有一行代码
- 理解 `systemPrompt` + `systemContext` 的组合

**Step 3: 完成 TODO 2 — 获取消息列表（2 分钟）**
- 也是一行代码
- 理解为什么需要 `getMessagesAfterCompactBoundary`

**Step 4: 完成 TODO 3 — 调用 LLM（15 分钟）★**
- 这是 Lab 1 的核心
- 理解 `deps.callModel()` 的参数结构
- 理解 `for await...of` 循环遍历流式响应
- 理解 `yield message` 将 LLM 响应传递给 TUI
- 理解错误处理（网络故障、API 限流）

**Step 5: 完成 TODO 4 — 返回完成状态（1 分钟）**
- 一行代码
- 理解 `Terminal` 类型：`{ reason: 'completed' }`

**Step 6: 编译 + TUI 验证（5 分钟）**
- `build.mjs --lab=1` 编译
- 启动 TUI，输入消息，看到 Agent 回复
- 尝试让 Agent 做事（读文件等）→ 观察 Agent 只会"说"不会"做"

### Hints (3 级)

**TODO 1 (Build system prompt)**:
- **Hint 1 (方向)**: 你需要把 `systemContext` 追加到 `systemPrompt` 上，然后用 `asSystemPrompt()` 包装
- **Hint 2 (具体)**: 先调用 `appendSystemContext(systemPrompt, systemContext)`，把结果传给 `asSystemPrompt()`
- **Hint 3 (代码)**: `const fullSystemPrompt = asSystemPrompt(appendSystemContext(systemPrompt, systemContext))`

**TODO 2 (Get messages)**:
- **Hint 1 (方向)**: 有一个现成的函数可以从消息列表中提取需要的部分
- **Hint 2 (具体)**: 使用 `getMessagesAfterCompactBoundary(messages)` 并用展开运算符创建新数组
- **Hint 3 (代码)**: `const messagesForQuery = [...getMessagesAfterCompactBoundary(messages)]`

**TODO 3 (Call LLM)** ★:
- **Hint 1 (方向)**: `deps.callModel()` 返回一个 AsyncGenerator。你需要用 `for await...of` 遍历它，并把每个消息 `yield` 出去。记得加 try/catch 处理错误。
- **Hint 2 (具体)**:
  ```typescript
  try {
    for await (const message of deps.callModel({
      messages: prependUserContext(messagesForQuery, userContext),
      systemPrompt: fullSystemPrompt,
      // ... 其他参数见注释
    })) {
      yield message
    }
  } catch (error) {
    logError(error)
    return { reason: 'model_error', error: error as Error }
  }
  ```
- **Hint 3 (完整参数)**: 查看 skeleton 注释中的完整参数对象。`options` 对象中的所有字段都需要填写——但大部分是直接从 `toolUseContext` 和 `params` 中获取的。

**TODO 4 (Return completed)**:
- **Hint 1 (方向)**: 当 LLM 回复完毕，返回一个表示"完成"的对象
- **Hint 2 (具体)**: `return { reason: 'completed' }`

## 测试验证

### 编译验证

**Skeleton 填充后能否成功编译？**

- Skeleton 中的 TODO 注释不是有效的 TypeScript——学习者需要将其替换为实际代码
- 提供的代码框架中，`messagesForQuery` 等变量在 TODO 未填充时会导致编译错误
- 编译错误信息会明确指向 TODO 位置，学习者可以逐一修复

**编译命令**：
```bash
node build.mjs --lab=1
```

**预期输出**：
```
Swapped dist/src/query.js ← src/query-lab1.ts
Build succeeded
```

### TUI 行为预期

| 操作 | 预期 Agent 行为 | 原因 |
|------|---------------|------|
| 输入 "你好" | Agent 回复问候语 | LLM 正常响应文本 |
| 输入 "读一下 README.md" | Agent 回复"我来帮你读"，但什么也不做 | Lab 1 没有工具处理 |
| 输入 "1+1等于几" | Agent 回复 "2" | LLM 推理能力 |
| 连续多轮对话 | 每轮独立，Agent 不记得上一轮 | Lab 1 没有消息累积循环 |

### 常见编译错误及修复提示

| 错误 | 原因 | 修复提示 |
|------|------|---------|
| `Cannot find name 'fullSystemPrompt'` | TODO 1 未填充 | 实现 TODO 1 |
| `Cannot find name 'messagesForQuery'` | TODO 2 未填充 | 实现 TODO 2 |
| `Not all code paths return a value` | TODO 4 未填充 | 添加 `return { reason: 'completed' }` |
| `Type 'void' is not assignable...` | yield 使用错误 | 检查 yield 和 return 的类型 |

## 与其他 Lab 的关系

### 依赖 Lab 0 的哪些知识点

- TypeScript 基础（类型、函数、导入）
- AsyncGenerator 概念（`function*`、`yield`、`for await...of`）
- claude-code-diy 的目录结构和构建流程

### 为 Lab 2 铺垫了什么

- **API 调用能力** — Lab 2 在此基础上添加工具系统
- **yield 模式** — Lab 2 会 yield 更多种类的消息（tool_result）
- **deps 模式** — Lab 2 的工具执行也通过 deps 间接调用

### Lab 1 → Lab 2 的过渡

Lab 2 的 skeleton 是 Lab 1 的**完成品 + 新 TODO**：

```
Lab 1 完成品（~90 行）+ Lab 2 新增 TODO（~30 行）= Lab 2 skeleton（~120 行）
```

学习者会看到自己 Lab 1 的代码被保留，只需要在上面添加工具处理逻辑。

## 对应 query.ts 的精确映射

| Skeleton 部分 | query.ts 行号 | 说明 |
|---------------|-------------|------|
| TODO 1: Build system prompt | 449-451 | `appendSystemContext` + `asSystemPrompt` |
| TODO 2: Get messages | 365 | `getMessagesAfterCompactBoundary` |
| TODO 3: Call LLM | 659-708 | `deps.callModel()` 流式调用 |
| yield message | 824 | 每次 content_block_stop 时 yield |
| TODO 4: Return completed | 1062 | `return { reason: 'completed' }` |
