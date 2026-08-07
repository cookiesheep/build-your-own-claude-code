# Lab 4：规划与子 Agent — 实验任务

> ⚠️ **Lab 4 任务文档正在设计中。**
>
> 旧版文档描述的是已废弃的 standalone 设计（`labs/lab-04/src/` + vitest + Mock LLM）。该方案已否决，请勿参照。
>
> 当前 Lab 4 的载体是变体文件 **`src/agent/todo-write-lab4.ts`** 和 **`src/agent/subagent-lab4.ts`**。

## 核心任务（预览）

1. **TodoWrite 工具**：让 Agent 具备任务规划能力（创建/更新待办列表）
2. **子 Agent 派生**：让 Agent 能派出独立上下文的子 Agent 处理子任务

## 在文档完成前

1. 阅读 [Lab 4 概念讲解](./index.md) 了解 TodoWrite 和子 Agent 的原理
2. 参考 [Lab 2 任务](../lab-02/tasks.md) 了解变体文件的编辑和提交方式
3. 在平台编辑器中打开 `todo-write-lab4.ts` / `subagent-lab4.ts`，找到 TODO 标记

## 验证

```bash
node build.mjs --lab=4    # 编译，exit 0 = 通过
node cli.js               # 运行 TUI，观察 Agent 先规划再执行
```
