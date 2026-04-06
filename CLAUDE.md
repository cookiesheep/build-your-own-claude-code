# CLAUDE.md — Build Your Own Claude Code

## 项目一句话

一个基于真实 Claude Code 源码的渐进式教学项目——学习者通过 6 个 Lab 逐步实现 Agent Harness 的核心模块，最终将自己写的代码插入 Claude Code 真实系统运行。

## 项目名称与仓库

- **Name**: build-your-own-claude-code
- **GitHub**: https://github.com/cookiesheep/build-your-own-claude-code
- **Sister project**: [claude-code-diy](https://github.com/cookiesheep/claude-code-diy) — 可运行的 Claude Code 源码（416,500 行 TypeScript）
- **License**: MIT

## 完整的调研记录、设计决策、需求说明

**请务必阅读 [HANDOFF.md](./HANDOFF.md)**——那里记录了项目的完整上下文，包括：
- 项目 owner 的背景和核心需求
- 所有调研过的参考项目及其分析
- 被否决的方案及原因
- 最终方案的详细设计
- 待验证的 PoC 计划
- 待做事项清单

HANDOFF.md 是从前一个 AI 会话传递到本会话的完整交接文档。

## 核心理念

### Agent Harness

Coding Agent = **模型 (60%) + Harness (40%)**

模型提供智能。Harness 是让智能变成行动的一切：消息协议、工具系统、Agent Loop、上下文管理。Claude Code 的 416,500 行代码中，核心 Harness 只有 ~12,000 行（3%）。其中最关键的 Agent Loop（`query.ts`）剥掉生产级复杂度后，核心逻辑约 100 行。

### 教学方法：不删不封装，挖空关键文件

学习者拿到的是**完整可运行的 Claude Code**（通过 claude-code-diy）。关键文件被替换为带 TODO 的骨架。学习者补全 → 构建 → TUI 跑起来。

### 渐进式能力增长

Claude Code TUI 是固定的壳，Agent 大脑从空开始逐步获得能力（类比 YatSenOS 的 QEMU）。

## Lab 设计（6 个）

| Lab | 主题 | 学习者实现什么 | TUI 中看到的反馈 |
|-----|------|--------------|----------------|
| 0 | 环境 + 体验 | 安装运行完整 Claude Code | 看到完整 TUI |
| 1 | API 调用 | 调 LLM 返回文字，不用工具 | Agent 能回复但不能做事 |
| 2 | 工具系统 | 工具注册 + 单轮执行 | Agent 用了一次工具就停 |
| **3** | **Agent Loop** ★ | **while(true) 循环** | **Agent 自主多轮调用工具** |
| 4 | 规划 + 子 Agent | TodoWrite + Subagent | Agent 先想再做、会拆任务 |
| 5 | 上下文压缩 | 三层压缩策略 | Agent 长对话不崩 |

## 技术架构

- 基线: claude-code-diy (Node.js)
- 测试: Vitest + Mock LLM
- 文档: Material for MkDocs
- Web 编辑器: Monaco Editor (浏览器内写代码 + 测试)
- 部署: GitHub Pages + GitHub Actions

## Agent 成本优化与 Codex 分工

Claude Code 额度昂贵。合理分工可以显著降低成本：

### 任务路由原则

| 任务类型 | 交给谁 | 原因 |
|---------|--------|------|
| 架构设计、方案评审、复杂推理 | **Claude（本会话）** | 需要深度理解项目上下文 |
| 代码实现、文件编辑、跑测试 | **Codex (omx)** | Codex 擅长 code，成本低 |
| 重复性文档编写 | **Codex (omx)** | 模板类工作，不需要高推理 |
| 跨模型交叉验证方案 | **OMC ccg 模式** | Claude + Codex 双视角 |
| 多个 Lab 并行实现 | **OMC team executor** | 并行化压缩时间 |

### 调用 Codex 的方式

**方式 1：OMC 内调用（推荐，无需切换工具）**
```
# 把具体实现任务交给 Codex
/oh-my-claudecode:ask codex "在 D:\test-claude-code\claude-code\labs\lab-03\ 目录下，
  根据以下骨架设计实现 agent-loop.ts：[粘贴骨架代码]
  要求：TypeScript strict，ESM，包含完整 JSDoc，不要省略任何 TODO"

# 双模型方案验证
/oh-my-claudecode:ccg
```

**方式 2：直接使用 oh-my-codex (omx)**
```bash
# 大型独立编码任务（如实现完整参考实现）
omx "在 D:\test-claude-code\claude-code\src 目录下，
  参考 CCB 的 learn/phase-2-conversation-loop.md，
  实现一个独立的 coding agent，包含以下文件：
  messages.ts / llm-client.ts / tools/read-file.ts /
  tools/write-file.ts / tools/bash.ts / tool-executor.ts /
  agent-loop.ts / cli.ts
  完成后运行 node cli.ts 验证能对话"
```

### 具体场景的分工建议

```
Sprint 1（参考实现）：
  Claude 设计架构 + 接口定义
  → omx 实现具体文件（批量编码）
  → Claude 做代码审查

Sprint 2（Lab skeleton）：
  ralplan: 设计 Lab 3 挖空方案（Claude，需要教学设计判断）
  → /oh-my-claudecode:ask codex "生成 Lab 3 的骨架代码和测试用例"
  → Claude 审查教学质量

多 Lab 并行：
  /oh-my-claudecode:team 3:executor "Lab 1/2/3 skeleton"
  （executor agent 内部会用 Codex 实现）
```

### 验证 Codex 输出的方法

Codex 实现完成后，Claude 做以下验证：
1. 运行 `npx vitest run` — 确认测试通过
2. 检查类型 `npx tsc --noEmit` — 确认无类型错误
3. 手动测试核心路径（如 `node cli.js -p --bare "hello"`）
4. 审查 Lab skeleton 的教学质量（TODO 是否清晰、难度是否合适）

## 开发规范

- 分支: `feat/lab-01`, `fix/lab-03-loop`
- 提交: conventional commits
- 代码: TypeScript strict, ESM
- 测试: Mock-first, 所有测试离线可跑
- Lab 3 是核心，获得 80% 精力
- **成本意识**：实现类任务优先考虑 Codex/omx，Claude 专注设计和审查
