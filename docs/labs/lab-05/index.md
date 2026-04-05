# Lab 5：上下文压缩

!!! tip "上下文总会满，要有办法腾地方。<br/>Agent 可以忘记，但要忘得有策略。"

## 实验目的

1. 理解 LLM 上下文窗口的限制以及为什么它是 Agent 的瓶颈
2. 实现 micro_compact：对旧工具结果的静默压缩（每轮运行）
3. 实现 auto_compact：token 超限时自动 LLM 摘要压缩
4. 理解 Claude Code 的三层压缩策略

## 背景知识

### 为什么需要上下文压缩？

一个 Agent 做复杂任务时，messages[] 会越来越长：

```
[user: 帮我重构整个项目]
[assistant: 好的，先读文件...]
[tool_result: 读取了 fileA.ts（5000 字符）]
[assistant: 好的，现在读下一个...]
[tool_result: 读取了 fileB.ts（3000 字符）]
[assistant: 继续...]
[tool_result: 读取了 fileC.ts（4000 字符）]
...
（messages 很快超过 100,000 tokens）
→ API 报错：prompt too long
→ Agent 崩溃
```

**没有压缩 = Agent 只能处理短任务**

### 三层压缩策略（来自 learn-claude-code）

```
每轮循环都运行：
┌─────────────────────────────────┐
│  Layer 1: micro_compact（静默）  │
│  把 3 轮前的工具结果替换为占位符  │
│  "[Previous: used read_file]"   │
│  read_file 结果例外（保留参考）  │
└─────────────────────────────────┘
         │
         ▼ token > 50,000?
┌─────────────────────────────────┐
│  Layer 2: auto_compact（自动）  │
│  保存完整对话到 .transcripts/   │
│  请 LLM 生成对话摘要             │
│  用摘要替换所有历史消息          │
└─────────────────────────────────┘
         │
         ▼ LLM 主动调用
┌─────────────────────────────────┐
│  Layer 3: compact tool（手动）  │
│  LLM 自己判断需要压缩时调用      │
│  同 auto_compact，立即执行       │
└─────────────────────────────────┘
```

learn-claude-code 的格言：*「上下文总会满，要有办法腾地方 — 三层 Context Compact」*

### Claude Code 的对应实现

Claude Code 的 `query.ts` 中有对应的实现：
- `microcompactMessages()` — Layer 1
- `autoCompactIfNeeded()` — Layer 2
- 这两个函数都注入在 `QueryDeps` 中，是可替换的依赖

## 实验任务

详见 [实验任务](./tasks.md)。
