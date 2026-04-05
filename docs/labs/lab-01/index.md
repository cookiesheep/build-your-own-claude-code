# Lab 1：让 Agent 会说话

!!! tip "对话的底层结构，决定了 Agent 的上限。<br/>消息不只是文字 — 它是 Agent 的血液。"

## 实验目的

1. 理解 Anthropic Messages API 的消息格式
2. 掌握四种 Content Block 类型：`text`、`tool_use`、`tool_result`、`thinking`
3. 实现对话历史管理（Conversation 类）
4. 封装 LLM API 客户端，完成一次真实 API 调用

## 背景知识

### 消息的结构

LLM 对话不是"一问一答的字符串"，而是结构化的消息序列：

```typescript
// 一条消息
{
  role: "user" | "assistant",
  content: string | ContentBlock[]
}

// Content Block 的类型
{ type: "text", text: "I'll create that file for you." }
{ type: "tool_use", id: "toolu_01", name: "write_file", input: { path: "hello.js", content: "..." } }
{ type: "tool_result", tool_use_id: "toolu_01", content: "File written successfully" }
```

### 一次完整对话的消息流

```
[user]      "帮我创建 hello.js"
[assistant] text: "好的，我来创建" + tool_use: write_file(...)
[user]      tool_result: "File written"       ← 这不是用户发的，是 Harness 自动构造的
[assistant] text: "文件已创建！"
```

!!! warning "关键理解"

    `tool_result` 消息的 `role` 是 `"user"`，但它不是用户发的——它是 Harness 在执行工具后自动构造并插入对话的。这是 Agent 能"多轮循环"的关键。

### LLM API 调用

```typescript
const response = await anthropic.messages.create({
  model: "claude-haiku-4-5-20251001",
  max_tokens: 4096,
  system: "You are a coding assistant.",
  messages: [...conversationHistory],
  tools: [...toolDefinitions],  // 告诉 LLM 有哪些工具可用
});

// response.stop_reason 告诉你 LLM 为什么停了：
// "end_turn"  → LLM 认为任务完成
// "tool_use"  → LLM 想调用工具（但实际判断应看 content 里有无 tool_use block）
// "max_tokens" → 输出长度到上限了
```

## 实验任务

详见 [实验任务](./tasks.md)。
