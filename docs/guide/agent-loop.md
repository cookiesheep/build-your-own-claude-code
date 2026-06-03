# Agent Loop 详解

## 核心模型

Agent Loop 是所有 Agent 系统的核心。不管是 Claude Code、Cursor Agent、还是 AutoGPT，内部都有这个循环。

```
         ┌──────────────────────────────┐
         │                              │
         ▼                              │
    调用 LLM                            │
         │                              │
         ▼                              │
    有 tool_use？──── 否 ──→ 返回结果    │
         │                              │
         是                             │
         │                              │
         ▼                              │
    执行工具                            │
         │                              │
         ▼                              │
    把结果加入对话历史 ─────────────────┘
```

## 用 AsyncGenerator 实现

```typescript
async function* agentLoop(client, tools, message) {
  const conversation = new Conversation();
  conversation.addUserMessage(message);

  while (true) {
    const response = await client.chat(
      conversation.getMessages(),
      tools
    );

    // 提取文本和工具调用
    const textBlocks = response.content.filter(b => b.type === 'text');
    const toolBlocks = response.content.filter(b => b.type === 'tool_use');

    // yield 文本
    for (const block of textBlocks) {
      yield { type: 'text', content: block.text };
    }

    // 没有工具调用 → 结束
    if (toolBlocks.length === 0) {
      yield { type: 'done' };
      return;
    }

    // 执行工具并 yield 结果
    conversation.addAssistantMessage(response.content);
    for (const toolUse of toolBlocks) {
      const result = await executeTool(toolUse);
      conversation.addToolResult(toolUse.id, result);
      yield { type: 'tool_result', name: toolUse.name, output: result };
    }
    // 循环继续
  }
}
```

## 生产级的额外复杂度

Claude Code 的实际 Agent Loop（`query.ts`，1,729 行）在核心之上加了：

| 功能 | 代码量 | 作用 |
|------|--------|------|
| 上下文压缩 (autocompact) | ~200 行 | 对话太长时自动截断/压缩 |
| 错误恢复 | ~300 行 | API 超时、token 超限等的自动恢复 |
| 流式处理 | ~200 行 | 边接收边渲染，而非等完整响应 |
| 权限检查 | ~150 行 | 工具执行前检查用户是否授权 |
| 预算控制 | ~100 行 | 追踪 token 消耗和成本 |
| Stop Hooks | ~100 行 | 每轮结束后执行自定义检查 |
| 状态机 | ~300 行 | 7 个不同的 `continue` 分支处理不同恢复路径 |

这些是把 Agent 从"能用"变成"好用"的工程。
