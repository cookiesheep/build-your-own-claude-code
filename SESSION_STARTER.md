# 新会话开场白

复制以下内容作为你在 `D:\code\build-your-own-claude-code` 目录启动新 Claude Code 会话时的第一条消息：

---

```
我正在开发一个教学项目 build-your-own-claude-code。

这个项目基于真实的 Claude Code 源码（416,500 行 TypeScript），通过 6 个渐进式 Lab 教学习者实现 Agent Harness 的核心模块。学习者最终将自己写的 Agent Loop 插入真实 Claude Code 系统，看到完整 TUI 由自己的代码驱动。

项目的完整上下文在两个文件中：
1. CLAUDE.md — 项目概览和技术架构
2. HANDOFF.md — 完整的调研记录、设计决策、待办事项（这个文件非常重要，记录了所有被否决的方案及原因、参考项目分析、以及详细的 Lab 设计）

请先阅读这两个文件。

阅读后，我需要你做两件事：

1. 双重验证：审视 HANDOFF.md 中记录的设计方案（特别是"不删不封装，挖空关键文件"的方法和 6 个 Lab 的渐进设计），告诉我你是否认同，有没有看到潜在问题或更好的替代方案。不要迎合我——如果你觉得方案有风险，直说。

2. 开始 PoC：如果你认同方案方向，第一步是验证核心假设——在姊妹项目 claude-code-diy（D:\test-claude-code\claude-code）中，写一个简化版 query-lab.ts 替换 query.ts，验证 build + 运行后 TUI 是否正常。这 30 分钟的验证决定整个项目方向。

当前阶段：Sprint 0 — PoC 验证
```
