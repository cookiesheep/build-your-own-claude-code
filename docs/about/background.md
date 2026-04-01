# 项目背景

## 起源

2025 年，Anthropic 发布了 Claude Code — 一个终端内的 AI 编程助手。它的 npm 包内含完整的 source map，社区从中恢复出了约 1,888 个 TypeScript 源文件，共 416,500 行代码。

本项目的发起者通过 [claude-code-diy](https://github.com/cookiesheep/claude-code-diy) 项目，修复了恢复源码中的所有运行障碍（11 类共 200+ 个问题），使完整的 Claude Code 在标准 Node.js 上本地运行。这个过程揭示了 Coding Agent 的内部架构。

**关键发现：Claude Code 416,500 行代码中，核心 Agent Harness 只有 ~12,000 行（3%）。** 其中最关键的 Agent Loop（`query.ts`）剥掉生产级复杂度后只有约 100 行核心逻辑。

这个发现直接催生了 build-your-own-agent 项目：如果核心只有 100 行，那每个人都可以理解并实现它。

## 为什么不是另一个 WebUI

市面上已经有很多 Claude Code / ChatGPT 的 WebUI 替代品（Open WebUI、ChatGPT-Next-Web 等）。它们解决的是"访问"问题——让你用浏览器和 LLM 对话。

本项目解决的是"理解"问题——让你真正明白 AI 编程工具是怎么工作的。

## 为什么不用 LangChain / CrewAI

这些框架教你"怎么用"，我们教你"怎么造"。就像学操作系统不是去学怎么用 Linux 命令，而是自己写一个内核。

## 参考项目

| 项目 | 模式 | 和我们的关系 |
|------|------|------------|
| [nand2tetris](https://www.nand2tetris.org/) | 从 NAND 门造计算机 | 同类启发 — 渐进式造轮子 |
| [Crafting Interpreters](https://craftinginterpreters.com/) | 从零写编程语言 | 同类启发 — 深入原理 |
| [YatSenOS v2](https://github.com/YatSenOS/YatSenOS-Tutorial-Volume-2) | 从零写操作系统 | 直接模板 — 同大学，同 Lab 形式 |
| [build-your-own-x](https://github.com/codecrafters-io/build-your-own-x) | 各种"造轮子"目录 | 定位参考 — 但目前没有 Agent 条目 |
