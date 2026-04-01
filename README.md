# build-your-own-agent

[中文](#中文) | [English](#english)

---

# 中文

**从零构建一个 Coding Agent — 理解 AI 编程工具背后那 40% 的秘密。**

Claude Code、Cursor Agent 这些 AI 编程工具的能力 = 大模型 (60%) + Agent Harness (40%)。大模型提供智能，而 **harness** — 消息协议、工具系统、循环编排 — 才是让 agent 真正能完成复杂任务的关键。

本项目通过 **7 个渐进式实战任务**，带你亲手实现这个 harness。不是读文档，不是看视频，而是**像做 lab 一样写代码、跑测试、逐步搭建出一个真实可用的 coding agent**。

## 这个项目适合谁

- 想理解 AI Agent 内部原理的开发者
- 听说过 tool calling / function calling 但没实际实现过的人
- 想做一个 AI 方向的课程项目或练手项目的学生
- 用过 Claude Code / Cursor 想知道"它是怎么做到的"的人

## 你将构建什么

完成全部 7 个任务后，你会得到一个 **~800 行 TypeScript** 的 CLI coding agent：

- 用自然语言和它对话
- 它能读文件、写文件、执行命令
- 它能自主决定用哪个工具、何时停止
- 就像一个简化版的 Claude Code

## 学习路线

| Task | 主题 | 你将实现 | 难度 |
|------|------|---------|------|
| 1 | 消息协议 | 对话历史管理、消息类型定义 | ★☆☆☆☆ |
| 2 | LLM 客户端 | API 调用、流式响应、错误处理 | ★★☆☆☆ |
| 3 | 工具定义 | JSON Schema 描述工具、工具注册表 | ★★☆☆☆ |
| 4 | 核心工具 | 文件读写、Shell 执行 | ★★☆☆☆ |
| 5 | 工具执行引擎 | 解析 tool_use、路由执行、结果回传 | ★★★☆☆ |
| 6 | Agent 循环 | 核心 loop：思考→行动→观察→重复 | ★★★★☆ |
| 7 | 整合 | 组装完整 agent + CLI + System Prompt | ★★★★☆ |

每个 Task 包含：
- 📖 知识讲解（原理 + 代码示例）
- 📝 带 TODO 的骨架代码（你来补全）
- ✅ 自动化测试（补完代码，跑测试，全过就是做对了）
- 💡 渐进式提示（卡住时可以看 hints）
- 📋 参考实现（完成后对比学习）

## 快速开始

### 前置要求

- Node.js >= 18
- 基本的 TypeScript 知识

### 安装

```bash
git clone https://github.com/cookiesheep/build-your-own-agent.git
cd build-your-own-agent
npm install
```

### 开始 Task 1

```bash
# 阅读 Task 1 的知识讲解
cat tasks/task-01-messages/README.md

# 编辑骨架代码，补全 TODO
# （用你喜欢的编辑器打开 tasks/task-01-messages/src/messages.ts）

# 验证你的实现
npx vitest run tasks/task-01-messages/tests/
```

测试全部通过？恭喜，进入 Task 2！

### 运行完整的参考实现

```bash
# 配置 API Key
cp .env.example .env
# 编辑 .env 填入你的 Anthropic API Key

# 运行参考实现
npm start
```

## 项目背景

本项目源自团队对 Claude Code 源码的深入研究。通过 [claude-code-diy](https://github.com/cookiesheep/claude-code-diy) 项目，我们从 npm 包的 source map 中恢复并运行了 Claude Code 的完整源码（~1888 个 TypeScript 文件），从中理解了 agent harness 的核心架构，并将这些真实认知提炼为本教学项目。

## 项目结构

```
├── tasks/                    # 7 个学习任务
│   ├── task-01-messages/     #   每个任务含 README + skeleton + tests + solution
│   ├── task-02-llm-client/
│   ├── ...
│   └── task-07-integration/
├── src/                      # 参考实现（完整可运行的 agent）
├── shared/                   # 共享类型定义
├── docs/                     # 项目文档（PRD、架构、MVP 设计）
└── vitest.config.ts          # 测试配置
```

## 技术栈

| 类别 | 技术 |
|------|------|
| 语言 | TypeScript |
| 运行时 | Node.js >= 18 |
| 测试 | Vitest |
| LLM API | Anthropic SDK |

## Contributing

欢迎贡献！你可以：

- 改进现有 task 的文档和提示
- 添加新的 task（高级工具、安全机制、多模型适配等）
- 添加 Python 等其他语言版本
- 修复 bug 和改进测试

## License

MIT

---

# English

**Build a Coding Agent from Scratch — understand the "other 40%" behind AI coding tools.**

AI coding tools like Claude Code and Cursor Agent = LLM (60%) + Agent Harness (40%). The LLM provides intelligence, but the **harness** — message protocol, tool system, orchestration loop — is what makes agents actually capable of complex tasks.

This project teaches you to build that harness through **7 progressive, hands-on tasks**. Not reading docs. Not watching videos. **Writing code, running tests, and incrementally building a real, working coding agent.**

## Who Is This For

- Developers wanting to understand AI agent internals
- People who've heard of tool calling / function calling but never implemented it
- Students looking for an AI-related course project
- Users of Claude Code / Cursor wondering "how does it actually work?"

## What You'll Build

After completing all 7 tasks, you'll have a **~800-line TypeScript** CLI coding agent that:

- Chats with you in natural language
- Reads files, writes files, executes commands
- Autonomously decides which tools to use and when to stop
- Works like a simplified Claude Code

## Learning Path

| Task | Topic | What You'll Implement | Difficulty |
|------|-------|--------------------|------------|
| 1 | Messages | Conversation history, message types | ★☆☆☆☆ |
| 2 | LLM Client | API calls, streaming, error handling | ★★☆☆☆ |
| 3 | Tool Definition | JSON Schema tools, tool registry | ★★☆☆☆ |
| 4 | Core Tools | File read/write, bash execution | ★★☆☆☆ |
| 5 | Tool Execution | Parse tool_use, route & execute, return results | ★★★☆☆ |
| 6 | Agent Loop | Core loop: think → act → observe → repeat | ★★★★☆ |
| 7 | Integration | Assemble complete agent + CLI + system prompt | ★★★★☆ |

Each task includes:
- 📖 Knowledge guide (concepts + code examples)
- 📝 Skeleton code with TODOs (you fill in the blanks)
- ✅ Automated tests (pass all tests = task complete)
- 💡 Progressive hints (when you're stuck)
- 📋 Reference solution (compare after completing)

## Quick Start

```bash
git clone https://github.com/cookiesheep/build-your-own-agent.git
cd build-your-own-agent
npm install

# Start Task 1
cat tasks/task-01-messages/README.md
# Edit skeleton → run tests → repeat
npx vitest run tasks/task-01-messages/tests/
```

## Background

This project originates from the team's deep exploration of Claude Code source code via the [claude-code-diy](https://github.com/cookiesheep/claude-code-diy) project, where we recovered and ran the full source (~1888 TypeScript files) from npm source maps. The architectural insights from that hands-on experience form the foundation of this educational project.

## License

MIT
