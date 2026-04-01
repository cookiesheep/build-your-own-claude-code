# Anthropic Messages API

## 请求格式

```typescript
const response = await anthropic.messages.create({
  model: "claude-haiku-4-5-20251001",
  max_tokens: 4096,
  system: "You are a helpful assistant.",
  messages: [
    { role: "user", content: "Hello" }
  ],
  tools: [...]  // 可选：工具定义列表
});
```

## 响应格式

```typescript
{
  id: "msg_abc123",
  type: "message",
  role: "assistant",
  content: [
    { type: "text", text: "Hello! How can I help?" }
  ],
  stop_reason: "end_turn",  // "end_turn" | "tool_use" | "max_tokens"
  usage: {
    input_tokens: 12,
    output_tokens: 23
  }
}
```

## 当 LLM 想使用工具时

```typescript
{
  role: "assistant",
  content: [
    { type: "text", text: "I'll read that file." },
    {
      type: "tool_use",
      id: "toolu_abc123",
      name: "read_file",
      input: { path: "./hello.js" }
    }
  ],
  stop_reason: "tool_use"
}
```

## 返回工具结果

```typescript
// Harness 构造的消息（不是用户发的）
{
  role: "user",
  content: [
    {
      type: "tool_result",
      tool_use_id: "toolu_abc123",
      content: "console.log('hello');"
    }
  ]
}
```

## 参考链接

- [Anthropic Messages API 文档](https://docs.anthropic.com/en/api/messages)
- [Tool Use 文档](https://docs.anthropic.com/en/docs/build-with-claude/tool-use)
