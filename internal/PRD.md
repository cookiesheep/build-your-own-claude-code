# Product Requirements Document (PRD)

## build-your-own-agent — 从零构建 Coding Agent 教学项目

**Version**: 0.1 (MVP)
**Date**: 2026-04-01
**Author**: cookiesheep & team
**Status**: Draft

---

## 1. 项目概述

### 1.1 一句话描述

一个任务驱动的开源教学项目，引导学习者从第一行代码开始，逐步构建出一个简化但功能完整的 coding agent（类似 Claude Code）。

### 1.2 背景与动机

**市场现状**：
- AI Agent 是 2025-2026 最热门的技术方向之一
- 大量开发者想学习 agent 开发，但现有资源存在断层：
  - 概念文章（太抽象，看完不会写）
  - 框架教程如 LangChain（教你用框架，不教原理）
  - 工业级源码如 Claude Code（1888 个文件，无从下手）
- **缺少一种"从零到一、渐进式、动手实现"的学习路径**

**我们的优势**：
- 团队 leader 通过 [claude-code-diy](https://github.com/cookiesheep/claude-code-diy) 项目深入研究过 Claude Code 真实源码
- 对 agent harness 的核心架构（message protocol、tool system、agent loop）有第一手理解
- 这不是纸上谈兵，而是从真实工业代码中提炼出的教学设计

### 1.3 项目定位

本项目同时是：

| 定位 | 说明 |
|------|------|
| **课程大作业** | 软件工程课程的完整工程实践，体现需求→设计→实现→测试→文档全流程 |
| **教学产品** | 面向 agent 学习者的结构化教程，有明确的学习路径和自动反馈 |
| **开源项目** | 在 GitHub 上公开，吸引社区贡献，持续迭代 |

---

## 2. 目标用户

### 2.1 Primary: Agent 学习者

**画像**：
- 有基本编程能力（了解 TypeScript/JavaScript）
- 听说过 AI agent，可能用过 ChatGPT/Claude，但没有自己实现过
- 想理解 Claude Code / Cursor Agent 等工具的内部原理
- 偏好"动手学"而非"读文档学"

**核心需求**：
- "我想自己写一个 coding agent，但不知道从哪里开始"
- "我想理解 tool calling 到底是怎么实现的"
- "我想要一个有测试反馈的、渐进式的学习过程"

### 2.2 Secondary: 软件工程学生

**画像**：
- 大二/大三计算机专业学生
- 需要课程项目或毕设方向
- 想做有技术含量、能写进简历的东西

**核心需求**：
- "我想找一个既能交作业，又能学到前沿技术的项目"

### 2.3 Tertiary: 开源贡献者

**画像**：
- 有 agent 开发经验
- 愿意为教学内容贡献新 task、新工具、新语言适配

---

## 3. 用户故事

### 核心流程

```
学习者 clone 项目
    → 阅读 Task 1 README（学习 Message 协议）
    → 打开 skeleton 代码，看到 TODO 标记
    → 补全代码
    → 运行 npm test（自动测试）
    → 测试通过 → 进入 Task 2
    → ...重复...
    → 完成 Task 7
    → 得到一个可运行的 CLI coding agent
    → 用自己的 API key 测试：让 agent 帮自己写代码
```

### 具体用户故事

| # | As a... | I want to... | So that... |
|---|---------|-------------|------------|
| US-1 | 学习者 | 按顺序完成 7 个 task | 从零构建出一个 coding agent |
| US-2 | 学习者 | 每个 task 运行测试得到即时反馈 | 知道自己的实现是否正确 |
| US-3 | 学习者 | 在卡住时查看 hints | 不需要直接看答案就能突破 |
| US-4 | 学习者 | 完成所有 task 后运行完整 agent | 验证自己的成果是真实可用的 |
| US-5 | 学习者 | 阅读每个 task 的知识讲解 | 理解背后的设计原理，不只是"怎么做"而是"为什么" |
| US-6 | 贡献者 | 按模板添加新的 task | 扩展教学内容 |
| US-7 | 教育者 | fork 项目用于自己的课程 | 作为 agent 教学的课程材料 |

---

## 4. 功能需求

### 4.1 MVP 功能（必须交付）

| ID | 功能 | 描述 | 优先级 |
|----|------|------|--------|
| F-1 | 7 个学习任务 | 每个任务含 README、skeleton、tests、solution、hints | P0 |
| F-2 | 自动化测试 | `npm test` 验证学习者实现的正确性 | P0 |
| F-3 | Mock LLM | 测试不依赖真实 API，用固定 fixture | P0 |
| F-4 | 参考实现 | 完整可运行的简化版 coding agent（~800 行） | P0 |
| F-5 | 知识文档 | 每个 task 的原理讲解，配代码示例和图示 | P0 |
| F-6 | CLI agent | 最终产物：终端对话式 coding agent | P0 |
| F-7 | 渐进式提示 | hints.md 提供分级提示（Hint 1 → 2 → 3） | P1 |

### 4.2 Nice-to-Have（有时间再做）

| ID | 功能 | 描述 | 优先级 |
|----|------|------|--------|
| F-8 | 进度追踪 | CLI 命令显示完成了哪些 task | P2 |
| F-9 | GitHub Actions CI | PR 自动运行测试 | P2 |
| F-10 | 可视化架构图 | 交互式的 agent 架构 diagram | P3 |
| F-11 | 多语言版本 | Python 版本的 task | P3 |
| F-12 | 视频讲解 | 配套 Bilibili/YouTube 教学视频 | P3 |

### 4.3 明确不做（MVP 排除）

| 排除项 | 原因 |
|--------|------|
| WebUI | 增加复杂度，偏离"agent 原理"教学目标 |
| 多模型适配 | MVP 只支持 Anthropic API，抽象层留给 v2 |
| 安全沙箱 | 太复杂，且是运维范畴不是 agent 原理 |
| Diff/Patch 工具 | 高级功能，可作为 bonus task |
| 会话持久化 | 内存即可，持久化是工程而非原理 |
| 流式 TUI | CLI readline 足够，不用 Ink |

---

## 5. 非功能需求

| 需求 | 标准 |
|------|------|
| **可学习性** | 零 agent 经验的开发者能在 1 周内完成所有 task |
| **可测试性** | 所有 task 的测试用例不依赖真实 LLM API |
| **可扩展性** | 社区可以按模板添加新 task（Task 8, 9, ...） |
| **可移植性** | Windows / macOS / Linux 均可运行 |
| **最小依赖** | 生产依赖只有 `@anthropic-ai/sdk`，其余为 devDependencies |
| **文档完整性** | README + 每个 task 文档 + 架构文档 + 贡献指南 |

---

## 6. 成功指标

### 课程维度
- [ ] 完整的软件工程文档（PRD、架构、测试报告）
- [ ] 全部 7 个 task 已实现且测试通过
- [ ] 参考实现可运行并完成真实编码任务
- [ ] 项目展示 demo 准备就绪

### 开源维度
- [ ] GitHub 项目公开
- [ ] README 清晰且吸引人
- [ ] 至少 1 名团队外人员成功完成全部 task（beta test）
- [ ] 在至少 2 个社区发布（V2EX、Reddit/r/ClaudeAI 等）

---

## 7. 约束与风险

| 风险 | 影响 | 缓解策略 |
|------|------|---------|
| LLM 输出非确定性导致测试不可靠 | 高 | 使用 Mock LLM fixture，不依赖真实 API |
| 团队需要先理解 agent 才能教 agent | 高 | 先完成参考实现，再拆解为 task |
| 教学文档质量不够好 | 中 | 找外部测试者试做，根据反馈迭代 |
| 12 周时间不够 | 中 | 严格控制 MVP 边界，砍掉一切 P2+ |
| 团队成员技术水平不均 | 中 | 按能力分配任务，pair programming |

---

## 8. 里程碑

| Sprint | 时间 | 交付 |
|--------|------|------|
| Sprint 0 | Week 1-2 | 项目启动：完成文档设计、技术选型、环境搭建 |
| Sprint 1 | Week 3-5 | 参考实现：完整可运行的 ~800 行 coding agent |
| Sprint 2 | Week 6-8 | Task 拆解：7 个 task 的 skeleton + tests + README |
| Sprint 3 | Week 9-10 | Beta 测试：找 2-3 人试做，收集反馈，修复问题 |
| Sprint 4 | Week 11-12 | 发布：开源发布、社区推广、课程答辩准备 |
