# Lab 1：让 Agent 会说话 — 实验任务

## 任务 1：定义消息类型

补全 `labs/lab-01-messages/src/types.ts` 中的 TODO：

```typescript
// TODO: 定义 ContentBlock 类型（TextBlock, ToolUseBlock, ToolResultBlock 的联合类型）
// TODO: 定义 Message 接口（role + content）
// TODO: 定义 StopReason 类型
```

验证：
```bash
npx vitest run labs/lab-01-messages/tests/types.test.ts
```

## 任务 2：实现 Conversation 类

补全 `labs/lab-01-messages/src/conversation.ts` 中的 TODO：

```typescript
// TODO: 实现 addUserMessage(text: string)
// TODO: 实现 addAssistantMessage(content: ContentBlock[])
// TODO: 实现 addToolResult(toolUseId: string, result: string, isError?: boolean)
// TODO: 实现 getMessages(): Message[]
// TODO: 实现 estimateTokens(): number （字符数 / 4 的粗略估算）
```

验证：
```bash
npx vitest run labs/lab-01-messages/tests/conversation.test.ts
```

!!! success "你应该看到"

    运行 demo 后，终端打印出格式化的对话历史：

    ```
    npx tsx labs/lab-01-messages/demo.ts

    ┌─ 对话历史 ──────────────────────────────────┐
    │ [system] You are a coding assistant.         │
    │ [user] Help me write hello world             │
    │ [assistant] I'll create that file for you... │
    │ [tool_use] write_file {path: "hello.js"}     │
    │ [tool_result] File written successfully      │
    │ [assistant] Done! File created.              │
    │ Estimated tokens: ~150                       │
    └──────────────────────────────────────────────┘
    ```

## 任务 3：封装 LLM Client

补全 `labs/lab-01-messages/src/llm-client.ts` 中的 TODO：

```typescript
// TODO: 实现 LLMClient 类
//   constructor(apiKey: string, options?: { baseUrl?: string, model?: string })
//   chat(messages: Message[], tools?: ToolDefinition[]): Promise<AssistantResponse>
```

验证（Mock 测试，不需要 API Key）：
```bash
npx vitest run labs/lab-01-messages/tests/llm-client.test.ts
```

!!! success "Live Demo（需要 API Key）"

    ```
    ANTHROPIC_API_KEY=sk-xxx npx tsx labs/lab-01-messages/demo.ts --live

    🟢 Live mode: calling Claude API...
    Model: claude-haiku-4-5-20251001
    Response: "Hello! How can I help you today?"
    Tokens: 12 in / 23 out
    ```

## 思考题

1. 为什么 `tool_result` 的 role 是 `"user"` 而不是 `"tool"`？
2. `stop_reason === "tool_use"` 一定可靠吗？Claude Code 源码里是怎么判断的？（提示：看 `toolUseBlocks.length`）
3. 如果对话历史太长超过了模型上下文窗口，应该怎么处理？
