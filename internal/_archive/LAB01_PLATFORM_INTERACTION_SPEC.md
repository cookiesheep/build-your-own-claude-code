# Lab 01 平台交互规格

> 状态：规格文档。当前只描述平台端后续需要支持的交互，不直接实现 `platform/`。

## 目标

Lab 01 的平台体验要从“读文档 + 写代码”升级为“边观察边判断”。学习者需要在页面上即时知道自己是否理解了消息协议，而不是等到写 TypeScript 时才发现概念错了。

核心体验：

```text
看真实对话
  -> 点击选择 role / block
  -> 立即看到对错和解释
  -> 补全 JSON
  -> 看到 diff
  -> 抽象成代码
  -> 跑 demo
  -> 在 TUI 里观察能力边界
```

## 非目标

- 当前阶段不直接改 `platform/` 代码。
- 当前阶段不实现真实 API Key 管理或 LLM proxy；已有平台机制负责底层配置。
- 当前阶段不把 Lab 01 硬锁成必须答题才能继续，先使用软性掌握度提示。

## 左侧进度条

平台应展示 Lab 01 内部进度，而不是只展示整个 Lab 完成状态。

推荐步骤：

1. 真实对话
2. 标注 role/block
3. JSON 填空
4. 从零写 JSON
5. TypeScript 类型
6. Conversation 类
7. Demo 输出
8. TUI 边界观察

状态：

| 状态 | 含义 |
|------|------|
| `locked` | 未来可用，当前阶段不建议使用 |
| `current` | 当前推荐步骤 |
| `done` | 已完成，可划掉或点亮 |
| `review` | 正确率不足，建议复习 |

## 选择题交互

建议未来支持 Markdown directive：

```markdown
::quiz{id="lab1-tool-result-role" level="2"}
```

最小字段：

| 字段 | 说明 |
|------|------|
| `id` | 稳定题目 ID，用于保存进度 |
| `level` | `1` 识别、`2` 推理、`3` 预测 |
| `question` | 题干 |
| `options` | 选项数组 |
| `answer` | 正确选项 |
| `explanation` | 答对后的详细解释 |
| `wrongExplanations` | 每个错误选项的针对性解释 |

交互规则：

- 用户点击选项后立即判题。
- 答对后展示详细解释，不只显示“正确”。
- 答错后展示针对性提示，并允许重试。
- 80% 正确率作为软性掌握度提示：显示“建议复习”，但不隐藏后续任务。

## JSON 填空与 diff

Step 2.5 需要支持局部填空：

```json
{
  "role": "assistant",
  "content": [
    { "type": "text", "text": "好的，我来创建这个文件。" },
    { "type": "___", "id": "toolu_01", "name": "___", "input": { "path": "hello.js" } }
  ]
}
```

提交后展示：

- 学生答案。
- 参考答案。
- 字段级 diff。
- 针对关键字段的解释，例如 `role`、`type`、`tool_use_id`。

重点反馈：

```text
tool_result 的 role 应该是 user。
这不是人类用户发的消息，而是 Harness 把工具结果作为下一轮输入交给 LLM。
```

## Live API Echo 面板

Step 3.5 推荐增加一个“发送 - 观察 - 理解”面板。

模式：

| 模式 | 说明 |
|------|------|
| Real | 用户或平台已有 API Key 时，发送真实请求 |
| Mock | 无 API Key 时，展示预录响应 |

对比内容：

1. 不带 `tools` 的普通 messages 请求。
2. 带 `tools` 的请求。
3. 观察 `content` 是否出现 `tool_use`。
4. 观察 `stop_reason` 如何变化。
5. 强调“出现 tool_use 不等于工具已经执行”。

安全要求：

- 不在前端暴露原始 API Key。
- 不把 API Key 写入 Lab 文档、代码或日志。
- 真实请求走平台已有后端配置或 LLM proxy。

## Conversation 微阶段反馈

Step 5 的 `Conversation` 类建议拆成 5 个阶段展示：

| Stage | 方法 | 平台反馈 |
|-------|------|----------|
| 1 | `addMessage` | 能追加消息 |
| 2 | `getMessages` | 返回 API 格式，且不泄露内部引用 |
| 3 | `addToolResult` | 正确生成 `role: "user"` 的 `tool_result` |
| 4 | `getLastToolUses` | 能提取最后 assistant 消息里的 `tool_use` |
| 5 | `estimateTokens` | 能输出粗略 token 估算 |

每个阶段独立显示通过/失败，不把所有错误压成一个大失败。

## TUI 边界观察 Checklist

平台应在 Lab 01 末尾展示观察清单：

| 输入 | 成功标志 | 思考引导 |
|------|----------|----------|
| `你好，请用一句话说明你现在能做什么` | 流式文本回复 | 语言通道已接通 |
| `请读取 README.md 第一行` | Agent 说明还不能读文件，或无法真正执行 | Lab 01 没有工具系统 |
| `请创建 hello.js` | Agent 只能解释，不能真的写文件 | Lab 02 才接工具 |
| 连续两轮提问 | 能利用上一轮上下文 | messages 在累积 |

推荐能力边界文案：

```text
我现在还不能直接读取 README.md。
在 Lab 1 里，我只接通了语言通道：用户输入 -> LLM -> 文本回复。
读取文件需要工具系统，会在 Lab 2 实现。
```

## Claude Code 优化完成状态

- [x] 为每道选择题补充更细的错误选项解释。（tasks.md Step 2，每题每个选项都有独立解释）
- [x] 为 `tool_result` 为什么是 `role: "user"` 增加多角度讲解。（index.md "常见误解" 段落，含 API 协议、Harness、对话历史三层视角）
- [x] 补齐 Step 2.5 的 JSON 填空题组、参考答案和 diff 文案。（tasks.md Step 2.5，5 种错误情况的 diff 反馈）
- [x] 设计 Step 3.5 的真实请求、Mock 响应和观察问题。（tasks.md Step 3.5，6 个观察问题 + Mock fallback）
- [x] 细化 Step 5 每个 stage 的测试用例和失败提示。（tasks.md Step 5，5 个 stage 各含测试用例 + 症状/原因/提示表）
- [x] 打磨文案节奏，让学习者被一步步带着抽象，而不是被要求凭空写类型。（index.md 学习节奏段落重写 + tasks.md Step 1 思考气泡）
