# Lab 3：实验任务

!!! danger "这是核心 Lab，请认真对待。<br/>完成这个 Lab 后，你将真正理解 Agent 是怎么工作的。"

## 任务 1：实现 Agent Loop

补全 `labs/lab-03-agent-loop/src/agent-loop.ts` 中的核心循环：

```typescript
export async function* agentLoop(
  client: LLMClient,
  executor: ToolExecutor,
  systemPrompt: string,
  userMessage: string,
  options?: { maxTurns?: number }
): AsyncGenerator<AgentEvent> {

  const maxTurns = options?.maxTurns ?? 25;
  // TODO: 初始化对话历史（Conversation）

  let turnCount = 0;

  while (true) {
    turnCount++;

    // TODO 1: 检查是否超过最大迭代次数
    //   超过 → yield error event + return

    // TODO 2: 调用 LLM
    //   使用 client.chat() 发送消息
    //   传入工具定义

    // TODO 3: 处理 LLM 响应
    //   提取所有 text blocks → yield text events
    //   提取所有 tool_use blocks

    // TODO 4: 判断是否需要执行工具
    //   没有 tool_use blocks → yield done event + return

    // TODO 5: 执行工具
    //   使用 executor.executeToolCalls()
    //   对每个工具 → yield tool_call + tool_result events

    // TODO 6: 更新对话历史
    //   添加 assistant 消息
    //   添加 tool_result 消息
    //   继续循环
  }
}
```

验证：
```bash
npx vitest run labs/lab-03-agent-loop/tests/agent-loop.test.ts
```

测试用例（全部使用 Mock LLM）：

| 测试 | 场景 | Mock LLM 行为 | 预期 |
|------|------|-------------|------|
| 简单问答 | 用户问好 | 直接返回文字，无 tool_use | 1 轮，yield text + done |
| 单工具调用 | 创建文件 | 第1轮返回 tool_use，第2轮返回文字 | 2 轮，yield tool_call + tool_result + text + done |
| 多工具链式 | 读文件→改文件 | 第1轮 read，第2轮 write，第3轮文字 | 3 轮 |
| 超过迭代上限 | 无限循环 | 每轮都返回 tool_use | yield error，安全终止 |
| LLM 报错 | API 异常 | throw Error | yield error |

## 任务 2：实现 CLI 入口

补全 `labs/lab-03-agent-loop/src/cli.ts`：

```typescript
// TODO: 使用 readline 创建交互式 CLI
//   1. 读取用户输入
//   2. 调用 agentLoop()
//   3. 消费 AgentEvent 流，格式化打印
//   4. Ctrl+C 优雅退出
```

## 任务 3：编写 System Prompt

补全 `labs/lab-03-agent-loop/src/system-prompt.ts`：

```typescript
// TODO: 编写一个 system prompt，要求 Agent：
//   1. 使用提供的工具完成编码任务
//   2. 先读代码再修改
//   3. 解释自己的思路
//   4. 出错时自我纠正
```

!!! success "你应该看到"

    运行 Demo（Mock 模式）：
    ```
    npx tsx labs/lab-03-agent-loop/demo.ts

    You: 帮我创建一个 hello.js 文件

    [Turn 1] Calling Claude...
    [Turn 1] Claude says: "好的，我来帮你创建这个文件。"
    [Turn 1] Claude wants to use: write_file
    [Turn 1] Executing write_file({ path: "hello.js", content: "console.log('hello')" })
    [Turn 1] Tool result: Successfully wrote to hello.js

    [Turn 2] Calling Claude with tool result...
    [Turn 2] Claude says: "我已经创建了 hello.js 文件！它会输出 'hello'。"
    [Turn 2] stop_reason: end_turn

    ✅ Agent completed in 2 turns.
    ```

    运行 Live 模式（需要 API Key）：
    ```
    ANTHROPIC_API_KEY=sk-xxx npx tsx labs/lab-03-agent-loop/demo.ts --live

    这次是真实的 Claude 在决策和调用工具！
    ```

!!! warning "★ 这就是 chatbot → agent 的分界线"

    在 Lab 1 和 Lab 2 中，所有操作都是你手动触发的。但在这个 Demo 里，**是 LLM 自己决定了要用什么工具**。你只说了"帮我创建文件"，LLM 自己判断出应该用 `write_file`，自己生成了参数，Harness 执行后把结果喂回，LLM 自己判断任务完成了。

    **这就是 Agent。**

## 思考题

1. 如果 LLM 在一轮里同时返回了多个 tool_use block，你的实现是串行还是并行执行的？各有什么优劣？
2. Claude Code 的 Agent Loop 有 1,729 行，你的简化版约 100 行。那多出来的 1,600 行在做什么？
3. 如果对话历史的 token 数超过了模型上下文窗口的限制，应该怎么处理？Claude Code 是怎么做的？（提示：搜索 `autoCompact`、`microcompact`、`snipCompact`）
