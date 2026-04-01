# Lab 4：实验任务

## 任务 1：理解 query() 接口

阅读 `claude-code-diy/src/query.ts` 的前 300 行，回答：

1. `query()` 的完整参数类型是什么？
2. 它 yield 了哪些类型的消息？
3. 它返回什么？
4. `QueryDeps` 包含哪些依赖？

!!! tip "不需要读懂全部 1,729 行，只需要理解接口边界。"

## 任务 2：编写 query-lab.ts

创建 `claude-code-diy/src/query-lab.ts`，实现简化版 `query()`：

```typescript
// TODO: 导入必要的类型和工具
// TODO: 实现 query() 函数
//   1. 接受 QueryParams
//   2. 使用 deps.callModel() 调用 LLM
//   3. 收集 tool_use blocks
//   4. 如果没有 tool_use → return { reason: 'completed' }
//   5. 使用 runTools() 执行工具
//   6. yield 执行结果
//   7. 循环
```

关键：你的实现需要正确 yield 消息，让 TUI 能正常渲染。

## 任务 3：构建并运行

修改 `claude-code-diy/build.mjs`，添加 `--lab` 模式：

```bash
# 用你的实现替换 query.ts
node build.mjs --lab

# 启动 Claude Code
node cli.js
```

!!! success "你应该看到"

    **完整的 Claude Code TUI 启动了**，和官方一模一样的界面。

    试着和它对话：
    ```
    > 帮我创建一个 fizzbuzz.js 文件
    ```

    Agent 会调用工具、创建文件——而驱动这一切的 Agent Loop，是你在 Lab 3 写的代码。

    **如果你走到了这一步，恭喜你——你真正理解了 Coding Agent 的核心原理。**

## 任务 4（Bonus）：对比分析

对比你的 `query-lab.ts` 和官方 `query.ts`，列出：

1. 你没有实现但生产环境需要的功能（至少 5 个）
2. 每个功能解决什么问题
3. 如果要加上这些功能，你会怎么改你的代码

这是理解"教学版 vs 生产版"差距的最好练习。

## 思考题

1. 你的简化版在什么场景下会失败，而官方版本不会？
2. Claude Code 的 `query.ts` 为什么有 7 个不同的 `continue` 分支？每个解决什么问题？
3. 如果要把你的 Agent Loop 用在一个不同的 LLM（比如 GPT-4）上，需要改什么？
