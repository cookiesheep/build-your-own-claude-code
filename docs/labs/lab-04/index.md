# Lab 4：接入 Claude Code

!!! tip "终极验证 — 你的代码驱动真实的 Claude Code。"

## 实验目的

1. 理解 Claude Code 的 `query.ts` 接口边界
2. 将你的 Agent Loop 适配为 Claude Code 需要的格式
3. 替换核心模块，构建并启动
4. 在完整的 Claude Code TUI 中使用你自己实现的 Agent Loop

## 背景知识

### Claude Code 的模块化设计

Claude Code 的 Agent Loop 在 `src/query.ts` 中，它已经有依赖注入设计：

```typescript
// query.ts 第 263 行
const deps = params.deps ?? productionDeps();

// deps 的类型
type QueryDeps = {
  callModel: typeof queryModelWithStreaming,
  microcompact: ...,
  autocompact: ...,
  uuid: () => string,
}
```

这意味着 `query()` 函数是可替换的。`QueryEngine.ts` 调用 `query()` 时：

```typescript
// QueryEngine.ts 第 675 行
for await (const message of query(params)) {
  // 处理消息
}
```

**只要你的实现满足 `query()` 的接口约束，整个系统就能正常工作。**

### 适配的核心挑战

你在 Lab 3 写的是简化版（~100 行），Claude Code 的接口需要：

1. 正确 yield 消息类型（`AssistantMessage`、`UserMessage` 等）
2. 返回 `Terminal` 对象（包含 `reason` 字段）
3. 使用 `deps.callModel()` 而不是直接调用 SDK
4. 处理 `toolUseContext`（工具执行上下文）

这个适配过程本身就是学习"生产级代码 vs 教学代码"差距的最好方式。

## 实验任务

详见 [实验任务](./tasks.md)。
