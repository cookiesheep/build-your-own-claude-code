# Lab 1：让 Agent 第一次开口 — 实验任务

!!! tip "这次的任务顺序是从协议理解走到真实源码：先看消息结构，再补全 `query-lab1.ts`。"

Lab 1 的任务分成 7 个步骤。前半段帮助你理解消息协议，后半段才进入代码实现。

```text
Step 1   看真实对话
Step 2   标注 role 和 content block
Step 2.5 补全不完整 JSON
Step 3   进入真实源码变体
Step 4   补全 query-lab1.ts 的 4 个 TODO
Step 5   构建 Lab 1
Step 6   启动 TUI 观察能力边界
Step 7   对照消息协议复盘
```

## Step 1：看一段真实对话

先阅读这段对话，不急着写代码。每条消息下面有思考注释，帮助你理解它为什么存在：

```text
[1] User: "帮我创建 hello.js"
  思考：这是一条普通的人类用户消息。role 是 "user"，content 是纯文本字符串。

[2] Assistant:
    text: "好的，我来创建这个文件。"
    tool_use: write_file({
      path: "hello.js",
      content: "console.log('hello')"
    })
  思考：LLM 的回复包含两个 content block：一段文字 + 一个工具调用意图。
       注意：LLM 并没有真的创建文件，它只是表达了"我想创建"的意图。

[3] User:
    tool_result: "File written successfully"
  思考：这条消息的 role 是 "user"，但这不是人类用户亲手发的。
       这是 Harness 执行 write_file 后，构造出来的新输入。

[4] Assistant:
    text: "文件已创建。"
  思考：LLM 收到工具结果后继续推理，确认任务完成。
```

请先回答三个自我解释问题：

1. 第 2 条消息为什么是 `assistant`？

!!! note "参考答案"

    因为这是 LLM 生成的回复。在 Messages API 中，LLM 的输出永远是 `assistant` role。即使回复里包含 `tool_use`，它仍然是 assistant 发出的。

2. 第 3 条消息为什么看起来像工具结果，但 `role` 仍然是 `user`？

!!! note "参考答案"

    Anthropic Messages API 只有 `user` 和 `assistant` 两个 role。工具结果不是 LLM 自己说的，而是外部世界给模型的新输入，所以它必须作为 `user` 消息回到对话历史里。

3. 第 2 条里的 `tool_use` 和第 3 条里的 `tool_result` 靠什么字段对应起来？

!!! note "参考答案"

    靠 id 字段。第 2 条的 `tool_use.id` 和第 3 条的 `tool_result.tool_use_id` 必须相同。这样即使一条消息里调用多个工具，LLM 也能把每个结果和对应意图配对。

## Step 2：标注 role 和 content block

这一部分先用平台里的小题确认你真的分清了 role 和 block。答错不会锁住题目；看完反馈后可以重新选择。

### Level 1：识别

::::quiz-single[下面哪条消息包含工具调用？]{id="lab1-tool-use-message" answer="B" explanation="对，tool_use 是 assistant 发出的工具调用意图。"}
- A) `{ role: "user", content: "读取文件" }`
- B) `{ role: "assistant", content: [{ type: "tool_use", name: "read_file", ... }] }`
- C) `{ role: "user", content: [{ type: "tool_result", content: "..." }] }`
:::quiz-feedback[A]
这只是用户文本消息，还没有出现工具调用意图。
:::
:::quiz-feedback[C]
这是工具执行后的结果，不是工具调用本身。调用意图叫 `tool_use`，结果叫 `tool_result`。
:::
::::

::::quiz-single[下面哪个 content block 表示工具执行后的结果？]{id="lab1-tool-result-block" answer="C" explanation="对，tool_result 是 Harness 执行工具后构造的结果 block。"}
- A) `{ type: "text", text: "读取完成" }`
- B) `{ type: "tool_use", name: "read_file", input: { path: "README.md" } }`
- C) `{ type: "tool_result", tool_use_id: "toolu_01", content: "文件内容..." }`
:::quiz-feedback[A]
`text` block 只是自然语言文字，不代表工具执行结果。
:::
:::quiz-feedback[B]
`tool_use` 是 assistant 发出的调用意图；工具结果必须是 `tool_result`。
:::
::::

### Level 2：推理

::::quiz-single[Assistant 刚发出一条包含 tool_use 的消息，下一条消息应该是什么？]{id="lab1-after-tool-use" answer="B" explanation="对。Harness 执行工具后，要把结果包装成 user 消息里的 tool_result，再发回给 LLM。"}
- A) assistant: 我正在等待工具结果
- B) user: tool_result，包含工具执行结果
- C) user: 好的，继续
- D) tool: tool_result，包含工具执行结果
:::quiz-feedback[A]
assistant 不能自己执行工具，也不能自己给出工具结果。
:::
:::quiz-feedback[C]
普通 user 文本无法和前面的 `tool_use.id` 配对，模型不知道这是哪个工具的结果。
:::
:::quiz-feedback[D]
Anthropic Messages API 没有 `tool` role。工具结果也要放在 `role: "user"` 的消息里。
:::
::::

看这段不完整的消息序列，[?] 处应该填什么？

```text
messages: [
  { role: "user", content: "帮我读取 package.json" },
  { role: "assistant", content: [
    { type: "text", text: "好的，我来读取。" },
    { type: "tool_use", id: "toolu_02", name: "read_file", input: { path: "package.json" } }
  ]},
  [?]
]
```

::::quiz-single[占位处应该填哪个消息？]{id="lab1-complete-tool-result-message" answer="B" explanation="对。工具结果必须是 role: user 的消息，并用 tool_use_id 对应上面的 toolu_02。"}
- A) `{ role: "assistant", content: [{ type: "tool_result", ... }] }`
- B) `{ role: "user", content: [{ type: "tool_result", tool_use_id: "toolu_02", content: "..." }] }`
- C) `{ role: "user", content: "这是文件内容：..." }`
- D) `{ role: "tool", content: [{ type: "tool_result", tool_use_id: "toolu_02", content: "..." }] }`
:::quiz-feedback[A]
`tool_result` 不是 assistant 自己发出的。assistant 发出的是 `tool_use` 意图。
:::
:::quiz-feedback[C]
普通字符串没有 `tool_use_id`，无法和前面的 `toolu_02` 配对。
:::
:::quiz-feedback[D]
这里最容易混淆：Anthropic 没有 `tool` role。工具结果是给模型的新输入，所以放在 `user` role。
:::
::::

### Level 3：预测与 debug

::::quiz-single[如果请求里没有 tools 参数，assistant 收到“请创建 hello.js”后最可能怎样？]{id="lab1-no-tools-behavior" answer="B" explanation="对。tools 是可选参数，没有工具定义时，模型没有任何工具可调用。"}
- A) 报错 missing tools parameter
- B) 用文字解释怎么创建，但不会真的调用工具
- C) 自动使用内置 write_file 工具
- D) 返回 stop_reason: tool_use，但没有 tool_use block
:::quiz-feedback[A]
没有 `tools` 参数不是协议错误，只是模型没有工具可以使用。
:::
:::quiz-feedback[C]
工具不是 API 内置的。你必须在 `tools` 参数里注册，模型才可能调用。
:::
:::quiz-feedback[D]
`stop_reason: "tool_use"` 必须对应实际的 `tool_use` block。
:::
::::

```text
messages: [
  { role: "user", content: "删除 temp.log" },
  { role: "assistant", content: [
    { type: "text", text: "好的，我来删除这个文件。" },
    { type: "tool_use", id: "toolu_03", name: "delete_file", input: { path: "temp.log" } }
  ]},
  { role: "assistant", content: [
    { type: "tool_result", tool_use_id: "toolu_03", content: "File deleted." }
  ]},
  { role: "assistant", content: "文件已删除。" }
]
```

::::quiz-single[这段消息序列里最严重的错误是什么？]{id="lab1-debug-tool-result-role" answer="C" explanation="对。tool_result 所在消息必须是 role: user。assistant 只发 tool_use 意图，不能自己发 tool_result。"}
- A) 第 1 条消息应该是 system role
- B) 第 2 条消息不应该同时有 text 和 tool_use
- C) 第 3 条消息的 role 应该是 user 而不是 assistant
- D) 第 4 条消息不应该存在
:::quiz-feedback[A]
普通用户请求就是 `user` role，不需要 system role。
:::
:::quiz-feedback[B]
assistant 可以在同一条消息里同时说一句话并发出 `tool_use`。
:::
:::quiz-feedback[D]
第 4 条可以存在。模型收到工具结果后继续回复，完成对话闭环。
:::
::::

## Step 2.5：补全不完整 JSON

现在把空位和字段名对应起来。这里不提前给答案；选错后平台会告诉你错在什么概念上。

::::quiz-code[assistant 想调用 read_file 时，两个空应该怎么填？]{id="lab1-code-tool-use-message" answer="B" explanation="对。assistant 发出工具调用意图，block 类型是 tool_use，工具名来自 tools 定义里的 read_file。"}
```json
{
  "role": "assistant",
  "content": [
    { "type": "text", "text": "好的，我来读取。" },
    {
      "type": "___",
      "id": "toolu_01",
      "name": "___",
      "input": { "path": "package.json" }
    }
  ]
}
```
- A) `type: "tool"`；`name: "read_file"`
- B) `type: "tool_use"`；`name: "read_file"`
- C) `type: "tool_use"`；`name: "create_file"`
- D) `type: "function_call"`；`name: "read_file"`
:::quiz-feedback[A]
`tool` 不是合法的 content block 类型。Anthropic 这里叫 `tool_use`。
:::
:::quiz-feedback[C]
block 类型对了，但工具名错了。工具名称由 tools 参数定义，这里注册的是 `read_file`。
:::
:::quiz-feedback[D]
如果你用过其他 API，可能见过 `function_call`；但 Anthropic Messages API 这里使用 `tool_use`。
:::
::::

::::quiz-code[工具执行完成后，这段 tool_result 消息的两个空应该怎么填？]{id="lab1-code-tool-result-message" answer="B" explanation="对。工具结果作为下一轮模型输入发送，所以 role 是 user；block 类型必须是 tool_result。"}
```json
{
  "role": "___",
  "content": [
    {
      "type": "___",
      "tool_use_id": "toolu_01",
      "content": "{ \"name\": \"byocc\" }"
    }
  ]
}
```
- A) `role: "assistant"`；`type: "tool_result"`
- B) `role: "user"`；`type: "tool_result"`
- C) `role: "tool"`；`type: "result"`
- D) `role: "user"`；`type: "tool_response"`
:::quiz-feedback[A]
`tool_result` 不是 assistant 自己说的。它是 Harness 执行工具后给模型的新输入。
:::
:::quiz-feedback[C]
Anthropic Messages API 没有 `tool` role，`result` 也不是合法 block 类型。
:::
:::quiz-feedback[D]
role 对了，但 block 类型不叫 `tool_response` 或 `function_result`，而是 `tool_result`。
:::
::::

## Step 3：进入真实源码变体

右侧打开 `src/query-lab1.ts`。这不是独立练习文件，而是 `claude-code-diy/src/query.ts` 的 Lab 1 变体。

提交时，平台会把这个文件注入容器，然后运行：

```bash
node build.mjs --lab 1
```

构建脚本会自动把 `query-lab1.ts` 编译后的产物替换到 `dist/src/query.js`。也就是说，你改的是一个真实 TUI 会调用的入口，而不是浏览器里的模拟代码。

Lab 1 的目标很窄：保留真实 TUI 和 LLM 流式回复路径，但不接工具系统、不进入 Agent Loop。

## Step 4：补全 query-lab1.ts 的 4 个 TODO

在右侧找到 `TODO-Lab1-1` 到 `TODO-Lab1-4`。它们对应 Agent 第一次开口所需的最短路径：

| TODO | 你要完成什么 | 为什么重要 |
|------|--------------|------------|
| `TODO-Lab1-1` | 用 `appendSystemContext()` 和 `asSystemPrompt()` 构建完整 system prompt | LLM 需要知道当前 Agent 的角色和上下文 |
| `TODO-Lab1-2` | 用 `getMessagesAfterCompactBoundary()` 取要发送的消息 | 真实 Claude Code 会处理压缩边界，Lab 1 要兼容这条数据流 |
| `TODO-Lab1-3` | 调用 `deps.callModel()`，并把流式返回的 message `yield` 给 TUI | 这是“Agent 能说话”的核心 |
| `TODO-Lab1-4` | 返回 `{ reason: 'completed' }` | 告诉 TUI 本轮对话已经结束 |

重点观察这一段：

```typescript
for await (const message of deps.callModel({ ... })) {
  yield message
}
```

`deps.callModel()` 负责和底层 LLM 通信；`yield message` 负责把模型输出交给 TUI 显示。少了前者，Agent 没有语言来源；少了后者，TUI 看不到回复。

!!! warning "Lab 1 不给模型工具"

    `query-lab1.ts` 会把 `tools` 和 `mcpTools` 置为空。这样模型可以回复文字，但不会真正读取文件、写文件或执行命令。

## Step 5：构建 Lab 1

点击右侧底部的“提交代码”。平台会保存当前 `src/query-lab1.ts`，注入实验容器，并运行 `node build.mjs --lab 1`。

你应该在终端日志里看到类似输出：

```text
Lab mode enabled — discovering *-lab variants for 1...
Swapped dist/src/query.js ← dist/src/query-lab1.js
Build complete!
```

如果构建失败，优先看错误指向的 TODO 区域：

| 错误线索 | 常见原因 |
|----------|----------|
| `fullSystemPrompt` 相关 | TODO 1 没有构建完整 system prompt |
| `messagesForQuery` 相关 | TODO 2 没有生成要发送给 LLM 的消息数组 |
| `deps.callModel` 参数错误 | TODO 3 的参数对象缺字段或括号没闭合 |
| `not all code paths return` | TODO 4 没有返回完成状态 |

## Step 6：启动 TUI 观察能力边界

构建成功后，在下方终端运行：

```bash
node cli.js
```

然后输入几条 prompt 观察：

| 输入 | 你应该观察到什么 | 为什么 |
|------|------------------|--------|
| `你好，请用一句话说明你现在能做什么` | Agent 能回复文字 | 语言通道已经接通 |
| `请读取 README.md 第一行` | Agent 还不能真正读取文件 | Lab 1 没有工具执行能力 |
| `请创建 hello.js` | Agent 可能解释怎么做，但不会真的写文件 | `write_file` 要到 Lab 2 才接上 |
| 连续问两轮相关问题 | Agent 能利用当前 TUI 的消息输入路径继续对话 | `query()` 会收到 TUI 传入的消息历史 |

## Step 7：对照消息协议复盘

回到前面看到的 `tool_use` / `tool_result` 协议。现在你应该能解释两件事：

1. Lab 1 为什么只需要把 `user` 消息发给 LLM，再把 `assistant` 回复 `yield` 给 TUI。
2. Lab 1 为什么还不会出现真正的 `tool_result`：因为 Harness 还没有执行工具，也没有把工具结果作为 `role: "user"` 的新消息塞回历史。

!!! success "完成标志"

    你完成 Lab 1 后，应该能清楚解释：Agent 为什么能说话，为什么还不能读文件，以及为什么工具结果会作为 `role: "user"` 回到消息历史里。
