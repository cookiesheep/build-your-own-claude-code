# Lab 2：给 Agent 一双手 — 实验任务

!!! tip "这次的任务顺序仍然是从具体到抽象：先看一次工具调用，再补全 query-lab2。"

Lab 2 的核心文件是 `claude-code-diy/src/query-lab2.ts`。它继承 Lab 1 的完成品，只新增工具检测和单轮工具执行逻辑。

```text
Step 1   看 Lab 2 的真实行为
Step 2   识别与理解（Quiz）
Step 3   补全关键代码片段
Step 4   实现 TODO 5：收集 tool_use
Step 5   实现 TODO 6：没有工具就结束
Step 6   实现 TODO 7-8：执行工具并收集结果
Step 7   构建并在 TUI 验证
Step 8   观察能力边界
```

## Step 1：看一次真实工具调用

先读这段流程，不急着写代码。每一步下面有思考注释，帮助你理解它为什么存在：

```text
[1] User: "请读取 README.md 第一行"
  思考：这是一条普通用户消息。它只是表达需求，还没有任何工具调用发生。

[2] Assistant:
    text: "好的，我来读取 README.md。"
    tool_use: Read({ file_path: "README.md" })
  思考：这是 LLM 的回复。它仍然不能自己读文件，只能发出 tool_use 意图。
     Lab 2 要做的第一件事，就是从 assistant message 的 content 数组里找出这个 block。

[3] Harness:
    runTools([Read tool_use], assistantMessages, canUseTool, toolUseContext)
  思考：Harness 才是真正执行工具的一方。Claude Code 已经提供 runTools()，
     你不需要从零实现 Read 工具，只需要把正确参数交给它。

[4] User:
    tool_result: "README.md 的文件内容..."
  思考：工具结果仍然会被包装成 user message。Lab 2 会 yield 这条消息给 TUI，
     但还不会把它再次发给 LLM。
```

请先回答三个自我解释问题：

1. 第 2 步里的 `tool_use` 是工具结果吗？
   <details><summary>参考答案</summary>
   不是。`tool_use` 是 LLM 发出的工具调用意图，意思是"我想用这个工具，并且参数是这些"。真正执行工具的是 Harness。
   </details>

2. 第 3 步为什么调用 `runTools()`，而不是自己写 `readFile()`？
   <details><summary>参考答案</summary>
   因为本项目基于真实 Claude Code。工具注册、权限、执行、UI 反馈已经由现有工具系统处理。Lab 2 的教学重点是 query 主流程如何发现并调度工具请求，而不是重写工具系统。
   </details>

3. 第 4 步已经有 `tool_result` 了，为什么 Agent 还不会继续？
   <details><summary>参考答案</summary>
   因为 Lab 2 只执行一轮工具。它收集了工具结果，但没有把工具结果追加回 messages 并再次调用 LLM。这个循环会在 Lab 3 实现。
   </details>

## Step 2：识别与理解

### Level 1：识别 tool_use

:::quiz-single[下面哪个 content block 表示"LLM 想调用工具"？]{answer="B" explanation="tool_use 是 assistant 发出的工具调用意图，包含工具名和输入参数。text 只是语言说明，模型说'我来读取'不等于文件真的被读取。tool_result 是工具执行后的结果，不是调用意图。"}
- A) `{ type: "text", text: "我来读取文件" }`
- B) `{ type: "tool_use", id: "toolu_01", name: "Read", input: { file_path: "README.md" } }`
- C) `{ type: "tool_result", tool_use_id: "toolu_01", content: "文件内容..." }`
- D) `{ type: "image", source: { type: "base64", data: "..." } }`
:::

### Level 2：推理下一步

:::quiz-single[`query-lab2.ts` 在 `deps.callModel()` 的流式循环里收到一条 assistant message，下一步应该做什么？]{answer="B" explanation="Lab 2 的关键缺口就是检测 assistant content 中的 tool_use。只有发现工具请求，后面才需要执行工具。如果直接结束会回到 Lab 1 的问题：Agent 只说不做。"}
- A) 直接 return completed
- B) 扫描 `message.message.content`，过滤 `type === "tool_use"` 的 block
- C) 手动调用 `fs.readFileSync("README.md")`
- D) 把 assistant message 改成 user message
:::

### Level 3：预测行为

:::quiz-single[Lab 2 中，用户输入"读取 README.md，然后根据里面的说明继续读取配置文件"，最可能发生什么？]{answer="B" explanation="Lab 2 只执行一轮工具。它能完成第一步工具调用，但不会把工具结果发回 LLM 继续规划第二步。完整多步任务需要 Agent Loop，这是 Lab 3 的内容。"}
- A) Agent 完整完成两步任务
- B) Agent 读取 README.md 后停止
- C) Agent 报错，因为多步任务不允许
- D) Agent 自动进入 while(true) 循环
:::

### Level 4：理解 tool_result 的角色

:::quiz-single[为什么 `tool_result` 消息的 role 是 user 而不是 tool？]{answer="C" explanation="Anthropic API 规范中，所有发给模型的内容都通过 user 或 assistant 角色传递。tool_result 是 Harness 执行工具后的结果，需要作为新的输入发给模型，所以放在 user 消息中。这也是 Agent 能多轮循环的关键——工具结果以 user 消息的形式回到对话中。"}
- A) 因为工具是用户调用的
- B) 因为 assistant 不能接收工具结果
- C) 因为 API 规范中所有非 assistant 的输入都是 user 角色
- D) 因为 tool 角色已被废弃
:::

## Step 3：补全关键代码片段

先补全 `tool_use` 检测逻辑：

```typescript
if (message.type === '___') {
  assistantMessages.push(message)

  const blocks = message.message.content.filter(
    content => content.type === '___',
  ) as ToolUseBlock[]

  if (blocks.length > 0) {
    toolUseBlocks.push(...blocks)
    needsFollowUp = true
  }
}
```

你需要填：

```text
第一个空：assistant
第二个空：tool_use
```

再补全工具执行调用：

```typescript
for await (const update of ___(
  toolUseBlocks,
  assistantMessages,
  canUseTool,
  toolUseContext,
)) {
  if (update.message) {
    ___ update.message
  }
}
```

你需要填：

```text
第一个空：runTools
第二个空：yield
```

!!! note "为什么这里是 yield？"

    `query()` 是 AsyncGenerator。TUI 看到的 assistant 文本、工具调用进度、工具结果，都是通过 `yield` 一条条送出去的。如果执行了工具但没有 `yield update.message`，用户界面就看不到 Agent 做了什么。

## Step 4：实现 TODO 5，收集 tool_use

在 `for await (const message of deps.callModel(...))` 循环里，`yield message` 之后补全 TODO 5。

你需要完成：

1. 判断 `message.type === "assistant"`。
2. 把 assistant message 推入 `assistantMessages`。
3. 从 `message.message.content` 中过滤 `type === "tool_use"` 的 block。
4. 把这些 block 推入 `toolUseBlocks`。
5. 只要发现工具请求，就设置 `needsFollowUp = true`。

把 TODO 5 改成下面的代码填空。先不要整段复制答案，逐个空确认自己填的是什么：

```typescript
if (message.type === '___1___') {
  ___2___.push(message)

  const blocks = message.message.___3___.filter(
    content => content.type === '___4___',
  ) as ToolUseBlock[]

  if (blocks.length > 0) {
    ___5___.push(...blocks)
    ___6___ = true
  }
}
```

填空项：

| 空 | 应填 | 为什么 |
|----|------|--------|
| `___1___` | `assistant` | `tool_use` 是 LLM 在 assistant message 里发出的意图 |
| `___2___` | `assistantMessages` | `runTools()` 需要知道本轮 assistant 消息 |
| `___3___` | `content` | 工具调用藏在 content blocks 里 |
| `___4___` | `tool_use` | 只收集工具调用意图，不收集文本 |
| `___5___` | `toolUseBlocks` | 保存待执行的工具请求 |
| `___6___` | `needsFollowUp` | 标记本轮需要进入工具执行阶段 |

常见错误与纠正：

**错误 1：变量声明在循环之后**

```typescript
// 错误：循环里用到了变量，但变量在后面才声明
for await (...) {
  toolUseBlocks.push(...)
}
const toolUseBlocks: ToolUseBlock[] = []
```

正确做法：把 `toolUseBlocks` 和 `needsFollowUp` 放到 `for await` 之前。

**错误 2：只检查 `stop_reason`**

```typescript
// 不推荐：过度依赖 stop_reason
if (message.message.stop_reason === 'tool_use') { ... }
```

正确做法：扫描 content block。Claude Code 的真实逻辑更关注有没有实际的 `tool_use` block。

## Step 5：实现 TODO 6，没有工具就结束

如果本轮没有工具请求，说明模型只是正常文本回复，可以直接结束。把 TODO 6 改成这个填空：

```typescript
if (!___1___) {
  return { reason: '___2___' }
}
```

填空项：

| 空 | 应填 | 为什么 |
|----|------|--------|
| `___1___` | `needsFollowUp` | 没有工具请求时不需要调用 `runTools()` |
| `___2___` | `completed` | 普通文本回复已经完成 |

这一步保留了 Lab 1 的能力：普通聊天仍然能正常完成。

## Step 6：实现 TODO 7-8，执行工具并收集结果

补全 `runTools()` 调用。这里仍然是代码填空，不是让你直接粘贴完整答案：

```typescript
for await (const update of ___1___(
  ___2___,
  assistantMessages,
  canUseTool,
  toolUseContext,
)) {
  if (update.message) {
    ___3___ update.message

    ___4___.push(
      ...___5___(
        [update.message],
        toolUseContext.options.tools,
      ).filter(message => message.type === 'user'),
    )
  }

  if (update.newContext) {
    ___6___ = { ...update.newContext }
  }
}
```

填空项：

| 空 | 应填 | 为什么 |
|----|------|--------|
| `___1___` | `runTools` | 交给 Claude Code 现有工具系统执行 |
| `___2___` | `toolUseBlocks` | 本轮收集到的工具请求 |
| `___3___` | `yield` | 把工具结果送给 TUI |
| `___4___` | `toolResults` | 为 Lab 3 保存工具结果材料 |
| `___5___` | `normalizeMessagesForAPI` | 转成后续 API 可用的消息形状 |
| `___6___` | `toolUseContext` | 接收工具执行后的上下文更新 |

逐行理解：

| 代码 | 作用 |
|------|------|
| `runTools(...)` | 交给 Claude Code 的真实工具系统执行 |
| `yield update.message` | 把工具结果送到 TUI |
| `normalizeMessagesForAPI(...)` | 把工具结果转换成后续 API 可用的消息格式 |
| `toolResults.push(...)` | 为 Lab 3 的循环保存材料 |
| `update.newContext` | 接收工具执行后更新的上下文 |

!!! warning "Lab 2 收集但不继续"

    `toolResults` 在 Lab 2 中会被收集，但不会重新加入 messages 再调用 LLM。
    这不是 bug，而是教学边界：Lab 3 才会把这一步接成循环。

## Step 7：构建并在 TUI 验证

在 `claude-code-diy` 目录中运行：

```bash
node build.mjs --lab=2
node cli.js
```

建议用三类 prompt 验证：

| 输入 | 成功标志 | 思考引导 |
|------|----------|----------|
| `你好` | 正常文本回复 | 没有 tool_use 时仍走 Lab 1 路径 |
| `读一下 README.md` | TUI 中出现工具执行结果 | 你实现了 tool_use -> runTools -> yield |
| `读取 README.md，再根据里面的说明找配置文件` | 只完成第一步，然后停止 | Lab 2 没有 Agent Loop |

更完整的记录模板见 [TUI 验证 Checklist](./tui-checklist.md)。

## Step 8：观察能力边界

能力边界 TODO 的推荐反馈文案：

```text
我已经能执行一次工具调用，例如读取 README.md。
但我还不会根据工具结果继续下一轮推理。
在 Lab 2 里，我只完成了：LLM -> tool_use -> runTools -> tool_result。
多轮任务需要 Agent Loop，会在 Lab 3 实现。
```

!!! success "完成标志"

    你完成 Lab 2 后，应该能清楚解释：`tool_use` 是谁发出的，`runTools()` 为什么由 Harness 调用，以及为什么"一轮工具执行"还不是完整 Agent。

## 思考题

1. 为什么 Claude Code 不只看 `stop_reason === "tool_use"`，而要扫描 content block？
2. 为什么 `runTools()` 需要 `assistantMessages`，而不是只需要 `toolUseBlocks`？
3. Lab 2 已经收集了 `toolResults`，为什么还不能完成多步任务？
4. 如果一次 assistant message 里有多个 `tool_use`，哪些工具可以并行执行，哪些必须串行执行？

## 内部参考

- [参考实现](./solution.md)
- [TUI 验证 Checklist](./tui-checklist.md)
