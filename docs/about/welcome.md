# 项目介绍

**Build Your Own Claude Code** 是一个基于真实 Claude Code 源码的渐进式教学项目。

学习者通过 6 个 Lab 逐步实现 Agent Harness 的核心模块，最终将自己写的代码插入 Claude Code 真实系统运行。

## 为什么要做这个项目？

AI Coding Agent 正在改变软件开发方式。Claude Code、Cursor、Windsurf 这些工具背后，都有一个精心设计的 **Agent Harness**。

大模型提供智能，但真正让 Agent 能完成复杂编码任务的，是 Harness — 消息协议、工具系统、Agent Loop、上下文管理。这部分代码在 Claude Code 的 416,500 行中约占 12,000 行（3%），核心 Agent Loop 逻辑约 100 行。

理解这 100 行，就理解了 AI Coding Agent 的核心引擎。

## 适合谁？

- 有基本 TypeScript 知识的开发者
- 想理解 AI Coding Agent 工作原理的工程师
- 准备面试 AI/LLM 相关岗位的候选人
- 对 Claude Code 内部实现好奇的技术爱好者

## 你会学到什么？

通过 6 个渐进式 Lab，你会亲手实现：

1. **API 调用与消息协议** — 理解 LLM 的输入输出格式
2. **工具注册与执行** — 让 Agent 能操作文件系统、运行命令
3. **Agent Loop** — `while(true)` 循环，让 Agent 自主决策、多轮调用工具
4. **规划与子 Agent** — TodoWrite + Subagent，让 Agent 先想再做
5. **上下文压缩** — 三层压缩策略，处理超长对话

## 技术栈

| 组件 | 技术 |
|------|------|
| 基线代码 | claude-code-diy (416,500 行 TypeScript) |
| 测试框架 | Vitest + Mock LLM |
| 文档 | Material for MkDocs |
| 部署 | GitHub Pages + GitHub Actions |

## 如何开始？

!!! tip "前提条件"
    - Node.js 18+
    - 基本 TypeScript 知识
    - Lab 3 的 live demo 需要 Anthropic API Key（其他 Lab 不需要）

```bash
git clone https://github.com/cookiesheep/build-your-own-claude-code.git
cd build-your-own-claude-code
npm install
```

然后从 [Lab 0](../labs/lab-00/index.md) 开始你的旅程。

## 相关资源

- [项目背景](background.md) — 了解项目的设计理念和教学目标
- [常见问题](faq.md) — 安装、使用、贡献等常见问题解答
- [GitHub 仓库](https://github.com/cookiesheep/build-your-own-claude-code) — 源码和 Issue
- [claude-code-diy](https://github.com/cookiesheep/claude-code-diy) — 可运行的 Claude Code 源码
