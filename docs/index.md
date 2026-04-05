# Build Your Own Claude Code

**从零构建 Claude Code 的核心引擎 — 你写的代码，驱动真实的 Claude Code。**

---

## 这个项目是什么

Claude Code、Cursor Agent 这些 AI 编程工具的能力 = **大模型 (60%) + Agent Harness (40%)**。

大模型提供智能。而 **Harness** — 消息协议、工具系统、Agent Loop、上下文管理 — 才是让 agent 真正能完成复杂编码任务的关键。本项目通过 **6 个渐进式 Lab**，带你亲手实现这个 Harness。

!!! tip "不是教你「用」Claude Code，而是教你「造」它的大脑"

    完成所有 Lab 后，你实现的 Agent Loop 会被插入真实的 Claude Code 系统（416,500 行）。当你看到完整的 TUI 界面响应你的指令时，驱动一切的核心引擎，是你自己写的。

## 实验大纲

| Lab | 主题 | TUI 中会看到什么 |
|-----|------|----------------|
| [Lab 0：环境与体验](./labs/lab-00/index.md) | 安装运行完整 Claude Code | 完整 TUI，先体验终点 |
| [Lab 1：让 Agent 会说话](./labs/lab-01/index.md) | API 调用，文字回复 | Agent 说话了，但不能做任何事 |
| [Lab 2：给 Agent 一双手](./labs/lab-02/index.md) | 工具注册与执行 | Agent 用了一次工具，然后停了 |
| [**Lab 3：Agent Loop（核心）**](./labs/lab-03/index.md) | **while(true) 循环** | **Agent 自主循环，多轮调用工具！** |
| [Lab 4：规划与子 Agent](./labs/lab-04/index.md) | TodoWrite + Subagent | Agent 先列计划再执行，会拆子任务 |
| [Lab 5：上下文压缩](./labs/lab-05/index.md) | 三层压缩策略 | Agent 处理超长对话不崩溃 |

## 适合谁

- 想理解 AI Agent 内部原理的开发者
- 用过 Claude Code / Cursor 想知道「它是怎么做到的」的人
- 想做一个 AI 方向课程项目的学生
- 对 tool calling / agent loop 好奇的人

## 前置要求

- Node.js >= 18
- 基本的 TypeScript / JavaScript 知识
- Anthropic API Key（Lab 3 live demo 需要，单元测试不需要）

## 快速开始

```bash
git clone https://github.com/cookiesheep/build-your-own-claude-code.git
cd build-your-own-claude-code
npm install
```

从 [Lab 0](./labs/lab-00/index.md) 开始你的旅程。

## 项目特点

- **基于真实 Claude Code 源码**：416,500 行 TypeScript，而非玩具实现
- **渐进式反馈**：每个 Lab 完成后，TUI 的能力都会发生可见变化
- **测试驱动**：Mock LLM 测试确保结果确定可验证，不依赖 API Key
- **终极体验**：你的代码插入真实 416K 行系统中运行
