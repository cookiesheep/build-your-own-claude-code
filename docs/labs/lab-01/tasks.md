# Lab 1：让 Agent 第一次开口 — 实验任务

!!! tip "这次的任务顺序是从具体到抽象：先看真实对话，再写类型和类。"

Lab 1 的任务分成 7 个步骤。前半段帮助你理解消息协议，后半段才进入代码实现。

```text
Step 1   看真实对话
Step 2   标注 role 和 content block
Step 2.5 补全不完整 JSON
Step 3   从零写 JSON
Step 4   抽象成 TypeScript 类型
Step 5   实现 Conversation 类
Step 6   跑 demo 看格式化输出
Step 7   TUI 观察能力边界
```

<!-- Note: Claude Code 已扩写所有步骤的讲解、错误反馈和题目变体。如需进一步增加题量或调整难度梯度，可在此处扩展。 -->

## Step 1：看一段真实对话

先阅读这段对话，不急着写代码。每条消息下面有 💭 思考注释，帮助你理解它为什么存在：

```text
[1] User: "帮我创建 hello.js"
  💭 这是一条普通的人类用户消息。role 是 "user"，content 是纯文本字符串。
     此时 stop_reason 还没出现——这是发给 LLM 的输入，不是 LLM 的输出。

[2] Assistant:
    text: "好的，我来创建这个文件。"
    tool_use: write_file({
      path: "hello.js",
      content: "console.log('hello')"
    })
  💭 LLM 的回复包含两个 content block：一段文字 + 一个工具调用意图。
     stop_reason 变成了 "tool_use"——意思是"我停下来了，因为我想用工具"。
     注意：LLM 并没有真的创建文件，它只是表达了"我想创建"的意图。

[3] User: tool_result: "File written successfully"
  💭 关键消息！这条消息的 role 是 "user"，但这不是人类用户发的。
     这是 Harness（你的代码）执行了 write_file 工具后，自动构造的消息。
     为什么是 user？因为 Anthropic API 要求所有"给模型的新输入"都来自 user role。
     这条消息会追加到 messages 数组，和前面的消息一起发给 LLM。

[4] Assistant: text: "文件已创建。"
  💭 LLM 收到工具结果后继续推理，确认任务完成。
     stop_reason 变成 "end_turn"——"我说完了，不需要再用工具"。
```

请先回答三个自我解释问题：

1. 第 2 条消息为什么是 `assistant`？
   <details><summary>参考答案</summary>
   因为这是 LLM 生成的回复。在 Messages API 中，LLM 的输出永远是 assistant role。即使回复里包含 tool_use（工具调用意图），它仍然是 assistant 发出的。
   </details>

2. 第 3 条消息为什么看起来像工具结果，但 `role` 仍然是 `user`？
   <details><summary>参考答案</summary>
   Anthropic Messages API 只有 user 和 assistant 两个 role。工具结果不是 LLM 自己说的，而是"外部世界给模型的新输入"——所以它必须是 user。这里的 user 不是"人类用户"，而是"模型之外的输入源"。
   </details>

3. 第 2 条里的 `tool_use` 和第 3 条里的 `tool_result` 靠什么字段对应起来？
   <details><summary>参考答案</summary>
   靠 id 字段。第 2 条的 tool_use 有一个 id（例如 "toolu_01"），第 3 条的 tool_result 有一个 tool_use_id 字段指向同一个值。这样即使一条消息里调用了多个工具，LLM 也能把每个结果和对应的意图匹配起来。
   </details>

!!! note "参考理解"

    第 3 条不是人类用户发的，而是 Harness 执行工具后构造的消息。它放在 `user` role 下，是因为它会作为下一轮模型输入被发送给 LLM。

## Step 2：标注 role 和 block

这一部分适合做成平台按钮题。当前先用文档形式呈现。

### Level 1：识别

下面哪条消息包含工具调用？

```text
A) { role: “user”, content: “读取文件” }
B) { role: “assistant”, content: [{ type: “tool_use”, name: “read_file”, ... }] }
C) { role: “user”, content: [{ type: “tool_result”, content: “...” }] }
```

正确答案：`B`

**为什么选 B**：`tool_use` 是 assistant 发出的”我想调用工具”的意图。只有 LLM 才会发出工具调用请求，所以它一定出现在 `role: “assistant”` 的消息里。

**为什么不是 A**：这是一条纯文本消息——用户只是说了”读取文件”这四个字，content 是字符串而不是数组，没有任何 content block。这只是语言输入，不是工具调用。

**为什么不是 C**：`tool_result` 是工具执行**之后**返回的结果，不是工具调用本身。如果把它比作餐厅，`tool_use` 是”点菜”（B），`tool_result` 是”上菜”（C）。这道题问的是”谁在点菜”。

---

### Level 1 变体：再认

下面哪个 `content block` 表示”工具执行后的结果”？

```text
A) { type: “text”, text: “读取完成” }
B) { type: “tool_use”, name: “read_file”, input: { path: “README.md” } }
C) { type: “tool_result”, tool_use_id: “toolu_01”, content: “文件内容...” }
```

正确答案：`C`

**为什么选 C**：`tool_result` 是 Harness 执行工具后构造的结果 block。关键字段是 `tool_use_id`（对应哪个工具调用）和 `content`（工具返回的内容）。

**为什么不是 A**：`text` block 是纯文本，LLM 可以用它说话，但它不携带任何工具相关的结构信息。

**为什么不是 B**：`tool_use` 是”我想调用工具”的意图声明，不是执行结果。注意 `input` 字段——它是传给工具的参数，不是工具的返回值。

---

### Level 2：推理

Assistant 刚发出一条包含 `tool_use` 的消息。下一条消息应该是什么？

```text
A) assistant: “我正在等待工具结果...”
B) user: tool_result，包含工具执行结果
C) user: “好的，继续”
D) tool: tool_result，包含工具执行结果
```

正确答案：`B`

**为什么选 B**：LLM 不能自己执行工具。它只说”我想用 read_file”，然后就停了（`stop_reason: “tool_use”`）。Harness（你的代码）看到这个 `tool_use` 后执行工具，然后把结果包装成 `role: “user”` 的 `tool_result` 消息，追加到 `messages` 数组，再发给 LLM。

**为什么不是 A**：Assistant 不能在发出 `tool_use` 后自己继续发第二条消息。在 Messages API 中，每次 LLM 调用只产生一条 assistant 消息。要继续，必须有新的 user 输入（哪怕是 tool_result）。

**为什么不是 C**：这是一条人类用户的文字消息，不是工具结果。如果 Harness 把这条消息追加进去，LLM 会困惑：”我让你执行工具，你跟我说'好的继续'？”

**为什么不是 D**：Anthropic Messages API 没有 `role: “tool”`。这是最容易犯的错误——其他一些 LLM API（比如 OpenAI）确实用 `role: “tool”`，但 Anthropic 的设计是：所有”给模型的新输入”都用 `user`。

---

### Level 2 变体：补全

看这段不完整的消息序列，[?] 处应该填什么？

```text
messages: [
  { role: “user”, content: “帮我读取 package.json” },
  { role: “assistant”, content: [
    { type: “text”, text: “好的，我来读取。” },
    { type: “tool_use”, id: “toolu_02”, name: “read_file”, input: { path: “package.json” } }
  ]},
  [?]  // <-- 这里应该是什么？
]
```

```text
A) { role: “assistant”, content: [{ type: “tool_result”, ... }] }
B) { role: “user”, content: [{ type: “tool_result”, tool_use_id: “toolu_02”, content: “...” }] }
C) { role: “user”, content: “这是文件内容：...” }
D) { role: “tool”, content: [{ type: “tool_result”, tool_use_id: “toolu_02”, content: “...” }] }
```

正确答案：`B`

**为什么选 B**：工具结果必须是 `role: “user”` 的消息，content 里包含 `tool_result` block，且 `tool_use_id` 必须和上面的 `”toolu_02”` 对应。

**为什么不是 A**：工具结果不会是 assistant 消息。Assistant 只负责发 `tool_use`（意图），不负责发 `tool_result`（结果）。

**为什么不是 C**：虽然是 user role，但 content 是纯字符串而不是包含 `tool_result` block 的数组。缺少 `tool_use_id` 字段，LLM 无法知道这个结果是回答哪个工具调用的。

**为什么不是 D**：同上，没有 `role: “tool”`。

---

### Level 3：预测

如果请求里没有 `tools` 参数，assistant 收到”请创建 hello.js”后最可能怎样？

```text
A) 报错 missing tools parameter
B) 用文字解释怎么创建，但不会真的调用工具
C) 自动使用内置 write_file 工具
D) 返回 stop_reason: “tool_use”，但没有 tool_use block
```

正确答案：`B`

**为什么选 B**：`tools` 是可选参数。没有工具定义时，模型没有任何工具可以调用——它甚至不知道 `write_file` 这个工具的存在。所以它只能用文字回答”你可以创建一个 hello.js 文件，内容是...”。`stop_reason` 会是 `”end_turn”`（正常结束），不会是 `”tool_use”`。

**为什么不是 A**：`tools` 不是必填参数。不传 `tools` 完全合法，只是模型没有工具可用。

**为什么不是 C**：模型没有”内置工具”。所有工具都必须通过 `tools` 参数显式定义。没有定义就没有能力，这是 Claude Code 架构的基本原则。

**为什么不是 D**：`stop_reason: “tool_use”` 只在响应里确实包含 `tool_use` block 时才会出现。既然没有工具定义，模型根本不会产生 `tool_use`，`stop_reason` 自然也不会是 `”tool_use”`。

---

### Level 3 变体：debug

下面这段消息序列有一个严重错误，找到它：

```text
messages: [
  { role: “user”, content: “删除 temp.log” },
  { role: “assistant”, content: [
    { type: “text”, text: “好的，我来删除这个文件。” },
    { type: “tool_use”, id: “toolu_03”, name: “delete_file”, input: { path: “temp.log” } }
  ]},
  { role: “assistant”, content: [
    { type: “tool_result”, tool_use_id: “toolu_03”, content: “File deleted.” }
  ]},
  { role: “assistant”, content: [
    { type: “text”, text: “文件已删除。” }
  ]}
]
```

```text
A) 第 1 条消息应该是 system role
B) 第 2 条消息不应该同时有 text 和 tool_use
C) 第 3 条消息的 role 应该是 “user” 而不是 “assistant”
D) 第 4 条消息不应该存在
```

正确答案：`C`

**为什么选 C**：`tool_result` 所在的消息必须是 `role: “user”`。当前第 3 条写的是 `role: “assistant”`，这会导致 API 报错或行为异常——因为 assistant 不能发 `tool_result`，只有 Harness 构造的 user 消息才能携带 `tool_result`。

**为什么不是 A**：用户消息用 `role: “user”` 没问题。system role 用于系统提示（”你是一个编程助手”），不是必须的。

**为什么不是 B**：assistant 消息可以同时包含 `text` 和 `tool_use`。事实上这很常见——LLM 先用文字说明意图，再附上工具调用。

**为什么不是 D**：收到 `tool_result` 后 LLM 继续推理并给出最终回复，这是正常的第四条消息。

!!! warning “平台实现提示”

    未来平台可以把本步骤做成选择题按钮，并用 80% 正确率作为软性掌握度提示。当前不建议硬锁后续任务。

## Step 2.5：补全不完整 JSON

现在你已经能识别 block，先补全一段不完整 JSON：

```json
{
  "role": "assistant",
  "content": [
    { "type": "text", "text": "好的，我来创建这个文件。" },
    {
      "type": "___",
      "id": "toolu_01",
      "name": "___",
      "input": {
        "path": "hello.js",
        "content": "console.log('hello')"
      }
    }
  ]
}
```

你需要填：

```text
第一个空：tool_use
第二个空：write_file
```

再补全工具结果消息：

```json
{
  "role": "___",
  "content": [
    {
      "type": "___",
      "tool_use_id": "toolu_01",
      "content": "File written successfully"
    }
  ]
}
```

你需要填：

```text
第一个空：user
第二个空：tool_result
```

!!! note "为什么这里不是 role: tool？"

    Anthropic Messages API 不用 `role: "tool"` 表示工具结果。工具结果是 Harness 给模型的新输入，所以它被包装成 `role: "user"` 的消息。

### 平台 Diff 反馈设计

提交后，平台应展示学生答案与参考答案的对比：

**情况 1：全对**

```text
✓ 第一空: tool_use
✓ 第二空: write_file
✓ 第三空: user
✓ 第四空: tool_result

完成！你已经能从 JSON 结构里识别关键字段了。
接下来 Step 3 会让你从零写完整 JSON——那时候这些字段都是你自己决定的。
```

**情况 2：`type` 写错（如写成 `"tool"` 或 `"function_call"`）**

```text
✗ 第一个 type 填的是 "tool"
  参考答案: "tool_use"

  Anthropic API 里的 content block 类型只有三种：
  - "text" — 纯文本
  - "tool_use" — 工具调用意图
  - "tool_result" — 工具执行结果

  "tool" 不是合法的 type 值。如果你用过 OpenAI API，
  那边的 function_call 在这里叫 tool_use。
```

**情况 3：`name` 写错（如写成 `"create_file"` 或 `"WriteFile"`）**

```text
✗ name 填的是 "create_file"
  参考答案: "write_file"

  工具名称由 tools 参数定义，不是 API 内置的。
  在这段对话的场景里，工具定义里注册的名字是 "write_file"。
  LLM 只能使用已注册的工具名称。
```

**情况 4：`role` 写错（如写成 `"tool"` 或 `"assistant"`）**

```text
✗ tool_result 的 role 填的是 "tool"
  参考答案: "user"

  这是最常见的误解。Anthropic Messages API 没有 "tool" role。
  tool_result 是 Harness 执行工具后构造的消息，它作为"给模型的新输入"
  发送给 LLM，所以必须是 "user"。

  类比：tool_result 像是 Harness 替用户"转达"工具执行结果。
  虽然不是用户亲手打的，但它是从用户侧发给模型的信息。
```

**情况 5：`type`（第二个空）写成 `"tool_response"` 或 `"function_result"`**

```text
✗ tool_result 的 type 填的是 "tool_response"
  参考答案: "tool_result"

  不用 "response" 也不用 "output"，就是 "tool_result"。
  记忆方法：tool_use 是"工具被使用了"，tool_result 是"工具的结果"。
  一个是动作，一个是结果，形成配对。
```

## Step 3：从零写 JSON

现在尝试从零构造完整消息序列。

场景：

```text
用户说：“帮我查看 package.json 的内容”
assistant 使用 read_file 工具读取 package.json
工具返回："{ \"name\": \"byocc\" }"
assistant 汇报：“package.json 的 name 是 byocc。”
```

请写出 4 条 `messages`：

```typescript
const messages = [
  // 1. user 文本消息
  // 2. assistant text + tool_use
  // 3. user tool_result
  // 4. assistant text
];
```

检查重点：

- `tool_use.id` 和 `tool_result.tool_use_id` 必须对应。
- `tool_result` 所在消息的 `role` 必须是 `"user"`。
- assistant 的工具调用应该放在 `content` 数组里，而不是单独字段。

### 参考答案

```typescript
const messages = [
  // 1. 用户文本消息
  {
    role: "user",
    content: "帮我查看 package.json 的内容"
  },

  // 2. assistant 回复：文字 + 工具调用意图
  {
    role: "assistant",
    content: [
      {
        type: "text",
        text: "好的，我来读取 package.json。"
      },
      {
        type: "tool_use",
        id: "toolu_01",          // 注意：这个 id 是自由生成的，但必须和下面 tool_use_id 对应
        name: "read_file",
        input: {
          path: "package.json"
        }
      }
    ]
  },

  // 3. 工具结果：role 是 "user"，不是 "tool"
  {
    role: "user",
    content: [
      {
        type: "tool_result",
        tool_use_id: "toolu_01", // 必须和上面的 id 对应
        content: '{ "name": "byocc" }'
      }
    ]
  },

  // 4. assistant 最终回复
  {
    role: "assistant",
    content: [
      {
        type: "text",
        text: "package.json 的 name 是 byocc。"
      }
    ]
  }
];
```

### 常见错误与纠正

**错误 1：tool_result 的 role 写成 `"tool"`**

```typescript
// ✗ 错误
{ role: "tool", content: [{ type: "tool_result", ... }] }

// ✓ 正确
{ role: "user", content: [{ type: "tool_result", ... }] }
```

**错误 2：tool_use_id 和 id 不对应**

```typescript
// ✗ 错误：id 是 "toolu_01"，tool_use_id 写成了 "tool_01"
{ type: "tool_use", id: "toolu_01", ... }
{ type: "tool_result", tool_use_id: "tool_01", ... }  // 少了个 u！

// ✓ 正确：严格对应
{ type: "tool_use", id: "toolu_01", ... }
{ type: "tool_result", tool_use_id: "toolu_01", ... }
```

**错误 3：assistant 消息的 content 写成字符串而不是数组**

```typescript
// ✗ 错误：同时有文字和工具调用，content 不能是字符串
{ role: "assistant", content: "好的，我来读取 package.json。" }
// 这样写的话，tool_use 放哪里？

// ✓ 正确：content 是数组，包含 text 和 tool_use 两个 block
{ role: "assistant", content: [
  { type: "text", text: "好的，我来读取 package.json。" },
  { type: "tool_use", ... }
]}
```

**错误 4：第 4 条消息也写成数组 content**

```typescript
// 不算错，但可以简化
{ role: "assistant", content: [{ type: "text", text: "package.json 的 name 是 byocc。" }] }

// 更简洁的写法——纯文字消息可以用字符串
{ role: "assistant", content: "package.json 的 name 是 byocc。" }
```

### 逐项评分规则

| 检查项 | 分值 | 说明 |
|--------|------|------|
| 第 1 条：role 是 "user"，content 是字符串 | 10% | 最简单的消息 |
| 第 2 条：role 是 "assistant"，content 是数组 | 15% | 必须是数组因为有两个 block |
| 第 2 条：包含 text block | 10% | 文字说明 |
| 第 2 条：包含 tool_use block，type/name/input 正确 | 15% | 核心字段缺一不可 |
| 第 3 条：role 是 "user" | 15% | **最关键的检查点** |
| 第 3 条：tool_use_id 与第 2 条的 id 对应 | 15% | 必须严格一致 |
| 第 4 条：role 是 "assistant"，content 包含最终回复 | 20% | 完成对话闭环 |

满分 100%，80% 以上视为通过。扣分最多的是第 3 条的 role 和 tool_use_id——如果这两个都写错了，说明还需要回到 Step 2 复习。

## Step 3.5：Live API Echo

有 API Key 时，可以把最小消息发给真实 API 观察响应；没有 API Key 时，使用 Mock 响应。

最小请求：

```typescript
{
  messages: [{ role: "user", content: "hi" }],
  max_tokens: 128
}
```

你要观察：

- 响应里的 `role` 是什么？
- `content` 是字符串还是数组？
- `stop_reason` 是什么？

再对比一个带 `tools` 参数的请求，观察：

- 响应里是否出现 `tool_use`。
- `stop_reason` 是否变成 `tool_use`。
- 没有工具执行逻辑时，为什么这还不等于“文件真的被读写了”。

!!! warning "不要把 API Key 写进代码"

    平台或本地环境会通过配置提供底层 LLM。Lab 代码不应该硬编码 API Key、Base URL 或模型名称。

### 真实请求序列

如果你有 API Key 或平台提供了 LLM 后端，按顺序发送以下请求并观察：

**请求 A：最简单的消息（无 tools）**

```json
{
  "model": "claude-sonnet-4-20250514",
  "max_tokens": 128,
  "messages": [
    { "role": "user", "content": "用一句话说你好" }
  ]
}
```

预期响应（真实）：

```json
{
  "id": "msg_01ABC",
  "type": "message",
  "role": "assistant",
  "content": [
    { "type": "text", "text": "你好！很高兴见到你。" }
  ],
  "model": "claude-sonnet-4-20250514",
  "stop_reason": "end_turn",
  "usage": { "input_tokens": 15, "output_tokens": 20 }
}
```

观察问题：

1. `content` 是数组还是字符串？→ **数组**，哪怕只有一段文字。
2. `stop_reason` 是什么？→ `"end_turn"`，表示模型说完了。
3. `role` 是什么？→ `"assistant"`，和 messages 里的 user 形成配对。

**请求 B：带 tools 参数的消息**

```json
{
  "model": "claude-sonnet-4-20250514",
  "max_tokens": 256,
  "messages": [
    { "role": "user", "content": "请帮我读取 hello.js 的内容" }
  ],
  "tools": [
    {
      "name": "read_file",
      "description": "读取指定路径的文件内容",
      "input_schema": {
        "type": "object",
        "properties": {
          "path": { "type": "string", "description": "文件路径" }
        },
        "required": ["path"]
      }
    }
  ]
}
```

预期响应（真实）：

```json
{
  "id": "msg_02DEF",
  "type": "message",
  "role": "assistant",
  "content": [
    { "type": "text", "text": "好的，我来帮你读取 hello.js。" },
    {
      "type": "tool_use",
      "id": "toolu_01A",
      "name": "read_file",
      "input": { "path": "hello.js" }
    }
  ],
  "model": "claude-sonnet-4-20250514",
  "stop_reason": "tool_use",
  "usage": { "input_tokens": 120, "output_tokens": 45 }
}
```

对比观察：

4. `content` 里出现了什么新类型？→ `tool_use` block，包含 `id`、`name`、`input`。
5. `stop_reason` 变成了什么？→ `"tool_use"`，不再是 `"end_turn"`。
6. 文件真的被读取了吗？→ **没有！** LLM 只是表达了"我想调用 read_file"的意图。`stop_reason: "tool_use"` 的意思是"我停下来了，因为我想用工具，请帮我执行"。真正执行工具并读取文件的是 Harness（你的代码），不是 LLM。

### Mock Fallback（无 API Key 时）

如果平台没有提供 LLM 后端，使用以下预录响应，效果类似：

**Mock 请求 A 响应**：

```json
{
  "role": "assistant",
  "content": [{ "type": "text", "text": "你好！有什么可以帮你的吗？" }],
  "stop_reason": "end_turn"
}
```

**Mock 请求 B 响应**：

```json
{
  "role": "assistant",
  "content": [
    { "type": "text", "text": "好的，我来读取 hello.js。" },
    { "type": "tool_use", "id": "toolu_mock01", "name": "read_file", "input": { "path": "hello.js" } }
  ],
  "stop_reason": "tool_use"
}
```

Mock 模式下，上面 6 个观察问题的答案完全相同。差异只在于 Mock 的文字内容是固定的，真实 API 的文字内容每次可能略有不同。

### 关键结论

完成 Step 3.5 后，你应该能回答：

1. 不带 `tools` 时，LLM 只能文字回复，`stop_reason` 是 `"end_turn"`。
2. 带 `tools` 时，LLM 可能回复 `tool_use` block，`stop_reason` 变成 `"tool_use"`。
3. `stop_reason: "tool_use"` 不等于"工具已经执行了"。它只是说"LLM 想用工具，现在轮到 Harness 来执行了"。

## Step 4：抽象成 TypeScript 类型

补全 `labs/lab-01-messages/src/types.ts` 中的 TODO。

你要从前面的 JSON 里抽象出这些类型：

```typescript
type Role = "user" | "assistant";

type ContentBlock =
  | TextBlock
  | ToolUseBlock
  | ToolResultBlock;

interface Message {
  role: Role;
  content: string | ContentBlock[];
}
```

验证：

```bash
npx vitest run labs/lab-01-messages/tests/types.test.ts
```

## Step 5：实现 Conversation 类

补全 `labs/lab-01-messages/src/conversation.ts` 中的 TODO。

建议按 5 个微阶段实现：

| 阶段 | 方法 | 通过标准 |
|------|------|----------|
| Stage 1 | `addMessage(role, content)` | 能追加一条消息 |
| Stage 2 | `getMessages()` | 返回 API 格式数组，并且不暴露内部数组引用 |
| Stage 3 | `addToolResult(toolUseId, result)` | 构造 `role: "user"` 的 `tool_result` |
| Stage 4 | `getLastToolUses()` | 能从最后一条 assistant 消息中提取 `tool_use` |
| Stage 5 | `estimateTokens()` | 能给出粗略 token 估算 |

验证：

```bash
npx vitest run labs/lab-01-messages/tests/conversation.test.ts
```

### 各 Stage 测试用例与失败提示

#### Stage 1: `addMessage(role, content)`

**测试用例**：

```typescript
const conv = new Conversation();
conv.addMessage("user", "你好");
conv.addMessage("assistant", "你好！有什么可以帮你的？");

// 内部应该有 2 条消息
// getMessages() 应该返回 length === 2 的数组
```

**常见失败与提示**：

| 症状 | 可能原因 | 提示 |
|------|---------|------|
| `getMessages()` 返回空数组 | `addMessage` 没有把消息存进内部数组 | 检查你的 `addMessage` 是否真的 push 了 `{ role, content }` |
| `getMessages()` 返回 length 1 | 每次调用覆盖了上一条 | 确认用的是 `push` 而不是赋值 |
| role 或 content 丢失 | 构造对象时字段名写错 | 确认消息结构是 `{ role: string, content: string \| ContentBlock[] }` |

#### Stage 2: `getMessages()`

**测试用例**：

```typescript
const conv = new Conversation();
conv.addMessage("user", "hello");

const msgs = conv.getMessages();
// msgs 应该是 [{ role: "user", content: "hello" }]

// 返回的应该是副本，修改不影响内部
msgs[0].content = "hacked";
conv.getMessages()[0].content; // 应该仍然是 "hello"
```

**常见失败与提示**：

| 症状 | 可能原因 | 提示 |
|------|---------|------|
| 修改返回值后内部数据被污染 | 直接返回了内部数组引用 | 使用 `[...this.messages]` 或 `JSON.parse(JSON.stringify(...))` 返回深拷贝 |
| 返回的对象缺少 role 或 content | 内部存储结构不对 | 确认 `addMessage` 存的是完整的 `{ role, content }` 对象 |
| 类型错误 | 返回类型不匹配 | `getMessages()` 的返回类型应该是 `Message[]` |

**为什么不能直接返回内部引用**：调用者可能意外修改返回的数组（比如 `.push()` 或修改字段），导致 Conversation 的内部状态被破坏。这是防御性编程的基本实践。

#### Stage 3: `addToolResult(toolUseId, result)`

**测试用例**：

```typescript
const conv = new Conversation();
conv.addMessage("assistant", [
  { type: "text", text: "好的" },
  { type: "tool_use", id: "toolu_01", name: "read_file", input: { path: "a.js" } }
]);
conv.addToolResult("toolu_01", "文件内容是...");

const msgs = conv.getMessages();
// 最后一条应该是:
// { role: "user", content: [{ type: "tool_result", tool_use_id: "toolu_01", content: "文件内容是..." }] }
```

**常见失败与提示**：

| 症状 | 可能原因 | 提示 |
|------|---------|------|
| role 是 "tool" 而不是 "user" | 混淆了其他 API 的 role 设计 | Anthropic API 没有 "tool" role。tool_result 必须放在 `role: "user"` 的消息里 |
| 消息里缺少 tool_use_id | 构造 tool_result 时漏了字段 | `tool_result` block 必须有 `tool_use_id`，用于和对应的 `tool_use` 配对 |
| content 是字符串而不是数组 | tool_result 消息的 content 应该是数组 | 虽然 user 文本消息的 content 可以是字符串，但包含 tool_result 的消息必须是 `ContentBlock[]` |
| block type 写成 "tool" 或 "result" | type 值不正确 | 合法的 type 值只有 `"text"`、`"tool_use"`、`"tool_result"` |

#### Stage 4: `getLastToolUses()`

**测试用例**：

```typescript
const conv = new Conversation();
conv.addMessage("user", "读取 a.js 和 b.js");
conv.addMessage("assistant", [
  { type: "text", text: "好的，我来读取两个文件。" },
  { type: "tool_use", id: "toolu_01", name: "read_file", input: { path: "a.js" } },
  { type: "tool_use", id: "toolu_02", name: "read_file", input: { path: "b.js" } }
]);

const toolUses = conv.getLastToolUses();
// 应该返回 2 个 tool_use block:
// [{ type: "tool_use", id: "toolu_01", ... }, { type: "tool_use", id: "toolu_02", ... }]

// 如果没有 assistant 消息，返回空数组
// 如果最后一条 assistant 消息只有 text，也返回空数组
```

**常见失败与提示**：

| 症状 | 可能原因 | 提示 |
|------|---------|------|
| 返回了所有消息的所有 tool_use | 没有过滤"最后一条 assistant 消息" | 只看最后一条 `role === "assistant"` 的消息，提取其中的 `tool_use` blocks |
| 返回了 text block | 过滤条件写错了 | 确认过滤的是 `type === "tool_use"` |
| 抛出异常（找不到 assistant 消息） | 没有处理边界情况 | 如果没有 assistant 消息，应该返回空数组，不应该抛异常 |
| 返回了 tool_result | 混淆了 tool_use 和 tool_result | `tool_use` 是 assistant 发出的意图，`tool_result` 是 user 侧的工具结果。你只需要找 `tool_use` |

#### Stage 5: `estimateTokens()`

**测试用例**：

```typescript
const conv = new Conversation();
conv.addMessage("user", "hello world");  // 11 字符
conv.addMessage("assistant", "hi there"); // 8 字符

const tokens = conv.estimateTokens();
// 粗略估算：(11 + 8) / 4 ≈ 5
// 应该返回一个正整数
```

**常见失败与提示**：

| 症状 | 可能原因 | 提示 |
|------|---------|------|
| 返回 0 或 NaN | 计算逻辑有误 | 确认你在遍历所有消息的 content，并累加字符数 |
| 返回浮点数 | 没有取整 | 使用 `Math.ceil()` 向上取整 |
| 精度过高（声称精确到个位） | 过度承诺 | 这只是粗略估算（字符数 ÷ 4），不需要很精确。返回时可以加 `~` 前缀表示近似 |
| 遇到 ContentBlock[] 时崩溃 | 只处理了字符串 content | 需要处理 `content` 是 `ContentBlock[]` 的情况：遍历每个 block，把 text 类型的 text 字段长度累加，把 tool_use 的 JSON.stringify(input) 长度累加，把 tool_result 的 content 长度累加 |

### 完成标志

5 个 stage 全部通过后，你应该能用 Conversation 类复现 Step 1 的完整对话：

```typescript
const conv = new Conversation();
conv.addMessage("user", "帮我创建 hello.js");
conv.addMessage("assistant", [
  { type: "text", text: "好的，我来创建这个文件。" },
  { type: "tool_use", id: "toolu_01", name: "write_file", input: { path: "hello.js", content: "console.log('hello')" } }
]);
conv.addToolResult("toolu_01", "File written successfully");
conv.addMessage("assistant", "文件已创建。");

console.log(conv.getMessages());
// 应该输出完整的 4 条消息数组
console.log(`Estimated tokens: ~${conv.estimateTokens()}`);
```

## Step 6：跑 demo 看格式化输出

运行：

```bash
npx tsx labs/lab-01-messages/demo.ts
```

你应该看到类似输出：

```text
┌─ 对话历史 ──────────────────────────────────┐
│ [user] Help me write hello world             │
│ [assistant] I'll create that file for you... │
│ [tool_use] write_file {path: "hello.js"}     │
│ [tool_result] File written successfully      │
│ [assistant] Done! File created.              │
│ Estimated tokens: ~150                       │
└──────────────────────────────────────────────┘
```

如果 demo 能把 `tool_result` 标出来，并且仍然显示它来自 `user` 消息，说明你已经抓住了 Lab 1 的核心。

## Step 7：TUI 观察能力边界

最后回到真实 TUI，输入几条 prompt 观察：

| 输入 | 你应该观察到什么 | 为什么 |
|------|------------------|--------|
| `你好，请用一句话说明你现在能做什么` | Agent 能流式回复文字 | 语言通道已经接通 |
| `请读取 README.md 第一行` | Agent 会说明或表现出现在还不能真正读取文件 | Lab 1 没有工具执行能力 |
| `请创建 hello.js` | Agent 可能解释怎么做，但不会真的写文件 | `write_file` 要到 Lab 2 才实现 |
| 连续问两轮相关问题 | Agent 能利用对话历史 | `messages` 在累积 |

能力边界 TODO 的推荐反馈文案：

```text
我现在还不能直接读取 README.md。
在 Lab 1 里，我只接通了语言通道：用户输入 -> LLM -> 文本回复。
读取文件需要工具系统，会在 Lab 2 实现。
```

!!! success "完成标志"

    你完成 Lab 1 后，应该能清楚解释：Agent 为什么能说话，为什么还不能读文件，以及为什么工具结果会作为 `role: "user"` 回到消息历史里。
