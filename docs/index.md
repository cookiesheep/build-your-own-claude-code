# Build Your Own Agent

**从零构建 Coding Agent Harness — 理解 AI 编程工具背后那 40% 的秘密。**

---

## 这个项目是什么

Claude Code、Cursor Agent 这些 AI 编程工具的能力 = **大模型 (60%) + Agent Harness (40%)**。

大模型提供智能。而 **Harness** — 消息协议、工具系统、循环编排 — 才是让 agent 真正能完成复杂编码任务的关键。本项目通过 5 个渐进式 Lab，带你亲手实现这个 Harness。

!!! tip "你的代码最终会跑在真实的 Claude Code 里"

    这不是一个玩具项目。完成所有 Lab 后，你实现的 Agent Loop 会被插入真实的 Claude Code 系统。当你看到完整的 TUI 界面响应你的指令时，驱动一切的核心引擎，是你自己写的。

## 实验大纲

| Lab | 主题 | 你将看到的反馈 |
|-----|------|--------------|
| [Lab 0：环境与体验](./labs/lab-00/index.md) | 搭建环境，体验完整 Claude Code | 完整 TUI 跑起来 |
| [Lab 1：消息协议与 LLM 调用](./labs/lab-01/index.md) | 消息结构、API 调用 | 调通 Claude API，收到回复 |
| [Lab 2：工具系统](./labs/lab-02/index.md) | 工具定义、注册、执行 | 手动触发工具执行 |
| [**Lab 3：Agent Loop（核心）**](./labs/lab-03/index.md) | Agent 核心循环 | Agent 自主循环调用工具！ |
| [Lab 4：接入 Claude Code](./labs/lab-04/index.md) | 插入真实系统 | 完整 Claude Code TUI 由你驱动 |

## 适合谁

- 想理解 AI Agent 内部原理的开发者
- 用过 Claude Code / Cursor 想知道"它怎么做到的"的人
- 想做一个 AI 方向课程项目的学生
- 对 tool calling / function calling 好奇的人

## 前置要求

- Node.js >= 18
- 基本的 TypeScript / JavaScript 知识
- 一个 Anthropic API Key（Lab 2+ 的 live demo 需要，单元测试不需要）

## 快速开始

```bash
git clone https://github.com/cookiesheep/build-your-own-agent.git
cd build-your-own-agent
npm install
```

然后从 [Lab 0](./labs/lab-00/index.md) 开始你的旅程。
