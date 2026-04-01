# Team Brief — 给组员的项目介绍

## 给组员的介绍（可直接复制到群里）

---

大家好，我来介绍一下我们软工大作业的项目想法。

### 一句话

我们要做一个**教别人从零构建 AI Coding Agent 的开源教学项目**。

### 这是什么意思？

你们应该都知道 Claude Code、Cursor Agent 这些工具 — 你在终端/IDE 里用自然语言告诉它要做什么，它就会自动帮你读代码、写代码、跑命令。这些工具的能力来自两部分：

- **大模型**（Claude、GPT）：提供智能，占 60%
- **Agent Harness**（框架/缰绳）：定义工具、管理对话、编排循环，占 40%

我们教的就是这个 **40%**。

### 具体形式

项目是一个 GitHub 仓库，里面有 7 个渐进式学习任务（Task 1 到 Task 7）。每个任务：

1. 有一篇知识讲解（原理是什么）
2. 有一份带 TODO 的骨架代码（要你填空实现）
3. 有自动化测试（填完代码跑测试，全过就是做对了）
4. 有参考答案和提示（卡住了可以看）

学习者完成全部 7 个任务后，就能得到一个**自己亲手写的、能实际运行的 CLI coding agent**。

### 为什么选这个？

1. **趋势**：AI Agent 是今年最热的方向，老师也鼓励这个方向
2. **空白**：GitHub 上有"build-your-own-x"（造数据库、造操作系统、造编译器），但没有人做过"build your own coding agent"
3. **工程量合理**：核心代码约 800 行 TypeScript + 约 600 行测试，不是无底洞
4. **既是产品又是作业**：软工课要求体现完整工程流程（需求→设计→实现→测试→文档），这个项目天然满足
5. **简历价值高**："我设计了一个 Agent 教学框架"比"我做了个 WebUI"强得多

### 我已经做了什么

我之前通过 [claude-code-diy](https://github.com/cookiesheep/claude-code-diy) 这个项目，把 Claude Code 官方 npm 包的源码恢复出来并跑通了。这让我对 agent 的内部架构有了深入理解，我们的教学设计就是基于这些真实认知来做的，不是空想。

---

## Sprint 规划

| Sprint | 时间 | 目标 | 交付物 |
|--------|------|------|--------|
| **Sprint 0** | Week 1-2 | 项目启动 | 环境搭建、文档完善、技术选型确认、分工 |
| **Sprint 1** | Week 3-5 | 参考实现 | 完整可运行的 ~800 行 coding agent |
| **Sprint 2** | Week 6-8 | Task 制作 | 7 个 task 的 skeleton + tests + README |
| **Sprint 3** | Week 9-10 | 测试迭代 | 找 2-3 个外部人员试做，根据反馈修改 |
| **Sprint 4** | Week 11-12 | 发布答辩 | 开源发布、社区推广、课程答辩 |

## 建议分工

### 角色定义

| 角色 | 职责 | 建议人数 |
|------|------|---------|
| **架构师 / PM** | 整体设计、任务拆解、进度管理、文档审核 | 1 人（项目 leader） |
| **核心开发** | 参考实现编写、核心模块开发 | 2 人 |
| **教学设计** | Task README 撰写、skeleton 代码设计、hints 编写 | 1 人 |
| **质量保证** | 测试用例设计、Mock 框架搭建、CI 配置、beta 测试组织 | 1 人 |

> 注意：角色不是固定的。每个人都会写代码和文档，但有一个主要负责方向。

### 任务分配建议

**Sprint 1（参考实现）** — 所有人都参与写代码：

| 人 | 负责模块 |
|------|---------|
| A (leader) | 架构设计 + agent-loop.ts + cli.ts |
| B | messages.ts + llm-client.ts |
| C | tool-definition.ts + tool-executor.ts |
| D | tools/（read-file, write-file, bash-execute）|
| E | 测试框架 + Mock LLM + shared/types.ts |

**Sprint 2（Task 制作）** — 每人负责 1-2 个 task：

| 人 | 负责 Task |
|------|----------|
| A | Task 6 (Agent Loop) + Task 7 (Integration) |
| B | Task 1 (Messages) + Task 2 (LLM Client) |
| C | Task 3 (Tool Definition) + Task 5 (Tool Execution) |
| D | Task 4 (Core Tools) |
| E | 测试质量审核 + CI + 文档一致性检查 |

## 技术要求

**必须掌握**：
- TypeScript 基础（变量、函数、类型、接口、async/await）
- Node.js 基础（npm、模块系统）
- Git（分支、PR、merge）

**会在项目中学到**：
- LLM API 调用和消息协议
- Agent 架构（tool calling、agent loop）
- 测试驱动开发（TDD）
- 开源项目工程实践

**不需要提前掌握**：
- AI/ML 理论
- React/前端框架
- 后端开发

---

## 给新 Claude Code 会话的开场白

当在 `D:\code\build-your-own-agent` 目录启动新的 Claude Code 会话时，可以用以下 prompt 开始：

---

```
我正在开发一个开源教学项目 build-your-own-agent。

这个项目教学习者通过 7 个渐进式任务，从零构建一个 coding agent（类似简化版 Claude Code）。每个任务有知识讲解、带 TODO 的骨架代码、自动化测试和参考答案。

项目的核心文档在 CLAUDE.md、docs/PRD.md、docs/MVP_SCOPE.md、docs/ARCHITECTURE.md 中。请先阅读 CLAUDE.md 了解项目全貌。

当前阶段：[填写当前 Sprint，例如 "Sprint 1 — 编写参考实现"]
当前任务：[填写具体要做什么，例如 "实现 agent-loop.ts 核心循环"]

请帮我 [具体请求]。
```

---

## FAQ

**Q: 为什么不直接做一个 Claude Code WebUI？**
A: WebUI 类产品已经很多了（Open WebUI、ChatGPT-Next-Web 等），没有差异化。而且 WebUI 主要是前端工程，学不到 agent 核心原理。我们的项目教的是"那 40%"——模型之外让 agent 真正能用的部分。

**Q: 我不太懂 AI，能做吗？**
A: 完全可以。这个项目不需要你懂机器学习。你需要的是 TypeScript 编程能力和学习意愿。Agent 的核心是软件工程（API 调用、消息管理、工具系统），不是算法。

**Q: 做完课程后真的能开源吗？**
A: 当然。这是 MIT 许可证的独立项目，不依赖任何私有代码。我们用的是公开的 Anthropic API，教学设计完全原创。

**Q: 工作量会不会太大？**
A: MVP 控制在 7 个 task、参考实现约 800 行代码。关键是"先做完，再做好"——Sprint 1 先把参考实现跑通，后续才是拆解和打磨。
