# Lab 4：规划与子 Agent

!!! tip "没有计划的 Agent 走哪算哪。<br/>任务太大一个人干不完，要能分给队友。"

## 实验目的

1. 理解为什么 Agent 需要「先规划再执行」
2. 实现 TodoWrite 机制：Agent 在执行前先列出步骤
3. 理解 Subagent 的核心思想：独立的 messages[]，防止上下文污染
4. 实现子 Agent 派生：把大任务拆分给独立上下文的子 Agent 处理

## 背景知识

### 为什么需要规划？

没有规划的 Agent：

```
用户：帮我重构这个项目
Agent：（立刻开始乱改）→ 改了 A → 改了 B（和 A 冲突了）→ 一团糟
```

有规划的 Agent（TodoWrite）：

```
用户：帮我重构这个项目
Agent：我先制定计划：
       1. [ ] 读取所有相关文件
       2. [ ] 分析当前架构
       3. [ ] 制定重构方案
       4. [ ] 逐步实施

       → 标记 1 为进行中 → 完成 → 标记 2 为进行中 → ...
```

来自 learn-claude-code 的格言：*「没有计划的 agent 走哪算哪 — 先列步骤再动手，完成率翻倍」*

### TodoWrite 的核心数据结构

```typescript
interface Todo {
  id: string;
  content: string;
  status: 'pending' | 'in_progress' | 'completed';
}
```

Agent 在任务开始时调用 `todo_write` 工具创建计划，每完成一步就更新状态。这和 Claude Code 里的 `TaskCreateTool`、`TaskUpdateTool` 是同一个思路。

### 为什么需要子 Agent？

```
主 Agent 上下文（越来越长）：
  [system]
  [user: 帮我实现 5 个功能]
  [assistant: 功能 1...]  [tool_result]
  [assistant: 功能 2...]  [tool_result]
  ...（上下文被前面的对话污染）

子 Agent 上下文（每个都干净）：
  [system: 你只需要实现功能 3]
  [user: 开始吧]
  [assistant: ...]   ← 不受其他任务干扰
```

来自 learn-claude-code 的格言：*「大任务拆小，每个小任务干净的上下文」*

## 实验任务

详见 [实验任务](./tasks.md)。
