# Lab 5：上下文压缩 — 实验任务

> ⚠️ **Lab 5 任务文档正在设计中。**
>
> 旧版文档描述的是已废弃的 standalone 设计（`labs/lab-05/src/` + vitest + Mock LLM）。该方案已否决，请勿参照。
>
> 当前 Lab 5 的载体是变体文件 **`src/context/compress-lab5.ts`**。

## 核心任务（预览）

1. **micro_compact**：替换旧 tool_result 为占位符，减少上下文占用
2. **auto_compact**：当 token 超阈值时，用 LLM 摘要历史对话
3. **compact 工具**：让 Agent 自己决定何时压缩

## 在文档完成前

1. 阅读 [Lab 5 概念讲解](./index.md) 了解三层压缩策略
2. 参考 [Lab 2 任务](../lab-02/tasks.md) 了解变体文件的编辑和提交方式
3. 在平台编辑器中打开 `compress-lab5.ts`，找到 TODO 标记

## 验证

```bash
node build.mjs --lab=5    # 编译，exit 0 = 通过
node cli.js               # 运行 TUI，进行长对话观察压缩效果
```
