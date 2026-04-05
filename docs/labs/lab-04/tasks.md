# Lab 4：规划与子 Agent — 实验任务

## 任务 1：实现 TodoManager

补全 `labs/lab-04/src/todo-manager.ts`：

```typescript
// TODO: 定义 Todo 接口（id, content, status）
// TODO: 实现 TodoManager 类
//   - create(content: string): Todo        // 创建待办，status = 'pending'
//   - update(id: string, status): void     // 更新状态
//   - list(): Todo[]                       // 获取所有待办
//   - getActive(): Todo[]                  // 获取未完成的待办
//   - format(): string                     // 格式化为 LLM 可读的文字
```

验证：
```bash
npx vitest run labs/lab-04/tests/todo-manager.test.ts
```

## 任务 2：实现 todo_write 工具

在 Lab 3 的工具系统基础上，注册一个 `todo_write` 工具：

```typescript
// TODO: 实现 todo_write 工具
// input: { todos: Array<{ content: string, status: string }> }
// 作用：接受 LLM 的计划列表，更新 TodoManager
// 返回：格式化后的计划列表（LLM 可确认）
```

!!! success "你应该看到"

    运行 demo，Agent 现在会先创建计划：
    ```
    You: 帮我实现一个计算器

    [Agent] 我来制定一个计划：
    📋 计划：
    1. [ ] 创建 calculator.js 文件
    2. [ ] 实现基本运算（加减乘除）
    3. [ ] 编写测试用例
    4. [ ] 运行测试验证

    [Agent] 开始执行...
    [✓] 步骤 1：创建 calculator.js
    [✓] 步骤 2：实现基本运算
    ...
    ```

## 任务 3：实现 Subagent 派生

补全 `labs/lab-04/src/subagent.ts`：

```typescript
// TODO: 实现 runSubagent 函数
// 关键：子 Agent 有自己独立的 messages[]，不污染主 Agent
//
// async function runSubagent(
//   client: LLMClient,
//   tools: ToolDefinition[],
//   task: string,  // 子任务描述
// ): Promise<string>  // 返回子 Agent 的最终输出
//
// 实现步骤：
// 1. 创建全新的 messages（独立上下文！）
// 2. 把 task 作为 user 消息
// 3. 用 agentLoop 驱动子 Agent 完成任务
// 4. 返回最终结果
```

验证：
```bash
npx vitest run labs/lab-04/tests/subagent.test.ts
```

## 思考题

1. TodoWrite 和直接在 system prompt 里写「先计划再执行」有什么区别？
2. 子 Agent 的 messages[] 为什么必须独立？用同一个 messages 会出什么问题？
3. Claude Code 的 AgentTool 就是 Subagent 的生产实现，你能找到它的源码位置吗？
