# Lab 2：代码填空答案

!!! warning "内部参考"

    这份文件用于团队验收、排错和助教讲解。Lab 2 面向学习者时只展示代码填空，不展示可直接复制的完整代码段。

## TODO 5：收集 `tool_use`

位置：`src/query-lab2.ts` 中 `yield message` 之后。

填空答案：

| 空 | 应填 | 作用 |
|----|------|------|
| `___1___` | `assistant` | 只处理 LLM 输出的 assistant message |
| `___2___` | `assistantMessages` | 保存 assistant 消息，供 `runTools()` 使用 |
| `___3___` | `content` | 扫描 message content blocks |
| `___4___` | `tool_use` | 找出工具调用意图 |
| `___5___` | `toolUseBlocks` | 收集本轮要执行的工具请求 |
| `___6___` | `needsFollowUp` | 标记本轮需要执行工具 |

关键点：

- `tool_use` 是 LLM 发出的工具意图，不是工具结果。
- 判断依据是 content block，不是单独依赖 `stop_reason`。
- `toolUseBlocks` 和 `needsFollowUp` 必须在流式循环之前声明。

## TODO 6：无工具请求时结束

位置：模型流式调用结束后，执行工具前。

填空答案：

| 空 | 应填 | 作用 |
|----|------|------|
| `___1___` | `needsFollowUp` | 没有工具请求时跳过工具执行 |
| `___2___` | `completed` | 纯文本回复路径正常结束 |

关键点：

- 保留 Lab 1 的纯文本路径。
- 没有 `tool_use` 时不应调用 `runTools()`。

## TODO 7-8：执行一轮工具并收集结果

位置：TODO 6 之后。

填空答案：

| 空 | 应填 | 作用 |
|----|------|------|
| `___1___` | `runTools` | 调用真实工具编排器 |
| `___2___` | `toolUseBlocks` | 传入待执行工具请求 |
| `___3___` | `yield` | 把工具更新消息送到 TUI |
| `___4___` | `toolResults` | 收集工具结果，留给 Lab 3 |
| `___5___` | `normalizeMessagesForAPI` | 转成 API 可继续使用的消息格式 |
| `___6___` | `toolUseContext` | 保存工具执行后的新上下文 |

关键点：

- `yield update.message` 是 TUI 能看到工具结果的原因。
- `normalizeMessagesForAPI()` 只是收集材料，Lab 2 不会把结果再次喂给 LLM。
- Lab 2 只执行一轮工具；多轮循环属于 Lab 3。

## 验收标准

| 场景 | 通过标准 |
|------|----------|
| 纯文本 prompt | 正常回复并结束 |
| 单工具 prompt | TUI 展示一次工具执行结果 |
| 多步 prompt | 完成第一步后停止，不继续推理 |
| 构建 | `node build.mjs --lab=2` 成功，并显示 `query.js <- query-lab2.js` 替换 |

## 不要“修掉”的行为

Lab 2 完成后，多步任务只做第一步就停止。这是预期行为，不是 bug。  
如果它已经会自动继续第二步，说明你不小心提前实现了 Lab 3 的循环。
