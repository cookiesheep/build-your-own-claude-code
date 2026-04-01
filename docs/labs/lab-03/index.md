# Lab 3：Agent Loop（核心）

!!! danger "这是整个项目最重要的 Lab。<br/>Agent Loop 是把聊天机器人变成 Agent 的唯一东西。"

## 实验目的

1. 深入理解 Agent Loop 的核心机制：observe → think → act → repeat
2. 实现完整的 Agent Loop（~100 行核心逻辑）
3. 理解 `stop_reason` 驱动的循环控制
4. 实现最大迭代次数保护
5. 看到 Agent **自主决策、循环调用工具** — 而不是你手动触发

## 背景知识

### 聊天机器人 vs Agent

```
聊天机器人：
  user → LLM → 回复 → 结束
  （一问一答）

Agent：
  user → LLM → "我要读文件" → 执行 → 结果喂回 →
         LLM → "我要写文件" → 执行 → 结果喂回 →
         LLM → "改好了" → 结束
  （自主循环，直到任务完成）
```

**Agent Loop 就是这个循环。** 没有它，LLM 只能说话不能做事。

### Claude Code 的真实实现

Claude Code 的 `query.ts` 中，Agent Loop 的核心是一个 `while(true)`：

```typescript
// 简化后的核心逻辑（真实代码 1,729 行，核心 ~100 行）
while (true) {
  // 1. 调用 LLM
  const response = await callModel(messages, tools);

  // 2. 收集 tool_use blocks
  const toolUseBlocks = response.content
    .filter(block => block.type === 'tool_use');

  // 3. 没有工具调用 → 任务完成
  if (toolUseBlocks.length === 0) {
    return { reason: 'completed' };
  }

  // 4. 执行工具
  const toolResults = await executeTools(toolUseBlocks);

  // 5. 把 assistant 消息和 tool_result 加入历史
  messages.push(
    { role: 'assistant', content: response.content },
    { role: 'user', content: toolResults }
  );

  // 6. 回到第 1 步（自动循环）
}
```

!!! note "关键细节"

    Claude Code 源码中有一句注释（query.ts:554）：

    > "Note: stop_reason === 'tool_use' is unreliable -- it's not always set correctly."

    所以真正的判断方式是检查 `toolUseBlocks.length > 0`，而不是 `stop_reason`。

### 循环的退出条件

| 条件 | 含义 |
|------|------|
| 没有 tool_use blocks | LLM 认为任务完成 |
| 超过最大迭代次数 | 安全保护，防止无限循环 |
| API 报错 | 不可恢复的错误 |
| 用户中断 | Ctrl+C |

### AgentEvent — 事件流

Agent Loop 使用 `AsyncGenerator` 向外部报告进展：

```typescript
type AgentEvent =
  | { type: 'text', content: string }         // LLM 输出的文字
  | { type: 'tool_call', name: string, input: object }  // 工具调用
  | { type: 'tool_result', name: string, output: string } // 工具结果
  | { type: 'done', finalMessage: string }    // 循环结束
  | { type: 'error', error: string }          // 错误
```

外部（CLI、TUI）只需要消费这个事件流，不需要知道内部逻辑。

## 实验任务

详见 [实验任务](./tasks.md)。
