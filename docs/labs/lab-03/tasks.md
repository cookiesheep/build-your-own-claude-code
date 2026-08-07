# Lab 3：Agent Loop — 实验任务

> ⚠️ **Lab 3 任务文档正在重新设计中。**
>
> 旧版文档描述的是已废弃的 standalone 设计（`labs/lab-03-agent-loop/src/` + vitest + Mock LLM + demo.ts）。该方案已否决，请勿参照。
>
> 当前 Lab 3 的载体是变体文件 **`src/query-lab3.ts`**。

## 核心任务

在 Lab 2 完成的工具执行基础上，加入 `while(true)` 循环，把工具结果追加回 `messages` 并触发下一轮 LLM 调用，构成自主 Agent 闭环。

这就是「聊天机器人」变成「自主 Agent」的分界线——Lab 3 是整个学习路径的核心。

## 在文档完成前，你可以

1. 阅读 [Lab 3 概念讲解](./index.md) 了解 Agent Loop 的核心思想
2. 参考 [Lab 2 任务](../lab-02/tasks.md) 了解变体文件的编辑和提交方式
3. 在平台编辑器中打开 `query-lab3.ts`，找到 TODO 标记开始实验

## 验证

```bash
node build.mjs --lab=3    # 编译，exit 0 = 通过
node cli.js               # 运行 TUI，观察 Agent 自主多轮调用工具
```

完成任务后，Agent 应能自主完成「读文件 → 分析 → 写文件 → 报告结果」的多步任务闭环。
