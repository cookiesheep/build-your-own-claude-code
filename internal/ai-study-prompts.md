# Claude Code 源码学习 — AI 辅助学习提示词

> 以下提示词用于在 Claude Code / Codex / Cursor 等 AI 编码工具中辅助学习 Claude Code 源码。
> 在 claude-code-diy 项目目录下启动 AI 会话，然后使用对应的提示词。

---

## 提示词 1：全局架构导览（Day 1-2 使用）

```
我正在学习 Claude Code 的源码架构。这个项目是从 Claude Code npm 包的 source map 恢复出来的，完整源码有 416,500 行、1,916 个文件。

我的学习目标是理解 Agent Harness 的核心原理——即 Agent Loop、工具执行、消息管理这些模块，而不是 TUI/UI、遥测、认证等外围功能。

请帮我完成以下任务：

1. 阅读 src/query.ts 的前 300 行，告诉我：
   - query() 的函数签名和参数类型 QueryParams
   - while(true) 循环在哪一行开始
   - 它依赖了哪些关键模块（import 列表中最重要的 5 个）

2. 阅读 src/QueryEngine.ts，找到 submitMessage() 方法，告诉我：
   - 用户输入是怎么变成 query() 参数的
   - query() 的返回值是怎么被处理的
   - mutableMessages 的作用是什么

3. 用一张调用链图总结：用户输入 "帮我创建 hello.js" 后，数据经过了哪些函数、哪些文件，最终工具被执行、结果返回。

请用中文回答，代码引用标注文件名和行号。
```

---

## 提示词 2：Agent Loop 精读（Day 3 使用）

```
我需要深入理解 src/query.ts 中的 Agent Loop 核心逻辑。

请帮我逐步分析 queryLoop() 函数（从 while(true) 开始），只关注核心路径，跳过错误恢复分支。具体来说：

1. 找到调用 LLM 的位置（deps.callModel），解释它的输入和输出
2. 找到 toolUseBlocks 和 needsFollowUp 被设置的位置，解释判断逻辑
3. 找到 runTools() 被调用的位置，解释工具执行的触发条件
4. 找到 state = { messages: [...] } 的位置，解释消息是怎么被累积的
5. 找到循环退出的条件（return 语句），列出所有可能的退出原因

对于 query.ts 中的 7 个 continue 分支，请用一张表格列出每个的：
- 行号
- 触发条件
- 做了什么（一句话）
- 是否是核心逻辑（是/否）

最后，把核心路径（不含错误恢复）提炼成不超过 50 行的伪代码。
```

---

## 提示词 3：工具系统精读（Day 3-4 使用）

```
我需要理解 Claude Code 的工具执行系统。请帮我分析以下文件的关键逻辑：

1. src/services/tools/toolOrchestration.ts
   - runTools() 的函数签名
   - partitionToolCalls 是怎么区分并发和串行的
   - 为什么读工具可以并发，写工具必须串行

2. src/services/tools/toolExecution.ts
   - runToolUse() 的执行流程（权限检查 → 执行 → 结果包装）
   - canUseTool() 返回什么，deny 的时候发生什么
   - 工具执行出错时怎么处理的（是 throw 还是返回 is_error）

3. 挑一个具体工具 src/tools/FileReadTool/FileReadTool.ts 读一下：
   - 它的 name、description、inputSchema 怎么定义的
   - execute() 方法的实现
   - 输出是怎么格式化给 LLM 看的

请把整个工具执行链路画成一张流程图：
LLM 返回 tool_use → ? → ? → ? → tool_result 回传给 LLM
```

---

## 提示词 4：消息系统精读（Day 3-4 使用）

```
我需要理解 Claude Code 的消息类型系统。请帮我分析：

1. 阅读 src/utils/messages.ts，列出所有 Message 子类型和它们的用途
2. 找到 createUserMessage() 函数，解释：
   - 什么时候用户消息包含 text（用户真的打字了）
   - 什么时候用户消息包含 tool_result（Harness 自动构造的）
   - 为什么 tool_result 的 role 是 "user" 不是 "tool"
3. 找到 normalizeMessagesForAPI()，解释它把内部消息格式转成 API 格式时做了什么转换
4. 解释 assistant 消息的 content 字段里，TextBlock 和 ToolUseBlock 是怎么混合存在的

最后回答：如果 assistant 返回了 3 个 tool_use block，下一条 user 消息应该长什么样？给一个具体的 JSON 示例。
```

---

## 提示词 5：对比分析（Day 5-6 使用）

```
我在做一个教学项目 build-your-own-agent，需要让学习者实现一个简化版的 Agent Loop 来替换 query.ts。

请帮我做一个对比分析：

1. 阅读 src/query.ts 完整代码，提取出核心路径（去掉所有错误恢复、压缩、预算控制、stop hooks），写一个最简化的版本，尽量控制在 100 行以内

2. 这个简化版和完整版相比，缺少了什么？请列一张表：
   | 功能 | 完整版有 | 简化版没有 | 缺少的后果 |

3. query() 的接口（QueryParams → AsyncGenerator → Terminal）能直接被简化版满足吗？有哪些类型需要适配？

4. 如果我要把简化版插入到真实的 Claude Code 里（替换 query.ts），最小的改动是什么？会有哪些功能失效？

请给出具体的代码，不要只给伪代码。
```

---

## 提示词 6：验证理解（Day 7 使用，团队讨论前）

```
我学习了 Claude Code 的核心架构，请帮我验证我的理解是否正确。我会说出我的理解，你来纠正错误：

我的理解：

1. Agent Loop 的核心是 query.ts 里的 while(true) 循环。每一轮：调 LLM → 检查有没有 tool_use → 有就执行 → 结果加入消息 → 继续循环。没有 tool_use 就结束。

2. 判断是否需要继续循环，不是看 stop_reason，而是看 toolUseBlocks 数组是否为空。因为 stop_reason 不可靠。

3. 工具执行时，只读工具并发跑，写入工具串行跑，由 toolOrchestration.ts 的 partitionToolCalls 决定。

4. tool_result 被包装成 role:"user" 的消息，因为 Anthropic API 只有 user 和 assistant 两种 role。

5. QueryEngine 管理跨轮次的对话状态（mutableMessages），query() 管理单次调用内的循环。

6. query() 有依赖注入（QueryDeps），可以注入 Mock 的 callModel 来测试。

7. query.ts 有 7 个 continue 分支，但只有 1 个是核心逻辑（工具执行后继续），其余 6 个是错误恢复。

请逐条告诉我：正确/部分正确/错误，如果有错请纠正。
```

---

## 使用建议

| 提示词 | 适合谁 | 什么时候用 | 预计时间 |
|--------|--------|-----------|---------|
| 1 全局导览 | 所有人 | 第一次接触源码 | 1-2h |
| 2 Agent Loop | 负责 Lab 3 的同学优先 | 理解全局后深入核心 | 2-3h |
| 3 工具系统 | 负责 Lab 2 的同学优先 | 理解全局后深入工具 | 1-2h |
| 4 消息系统 | 负责 Lab 1 的同学优先 | 理解全局后深入消息 | 1h |
| 5 对比分析 | 架构师/PM | 准备 Lab 4 的设计 | 2h |
| 6 验证理解 | 所有人 | 团队讨论前自测 | 30min |
