# 新会话开场白

复制以下内容作为你在 `D:\code\build-your-own-claude-code` 目录启动新 Claude Code 会话时的第一条消息：

---

```
我正在开发一个教学项目 build-your-own-claude-code。

这个项目基于真实的 Claude Code 源码（416,500 行 TypeScript），通过 6 个渐进式 Lab 教学习者实现 Agent Harness 的核心模块。学习者最终将自己写的 Agent Loop 插入真实 Claude Code 系统，看到完整 TUI 由自己的代码驱动。

项目的完整上下文在两个文件中：
1. CLAUDE.md — 项目概览和技术架构
2. HANDOFF.md — 完整的调研记录、设计决策、待办事项（记录了所有被否决的方案及原因、PoC 结果、参考项目分析、Lab 设计）

第一步：请先阅读这两个文件，建立完整上下文。

第二步：运行 OMC 项目初始化（扫描目录，生成分层 AGENTS.md，让所有 agent 理解项目结构）：
/oh-my-claudecode:deepinit

第三步：阅读完成后，我需要你做两件事：

1. 双重验证：审视 HANDOFF.md 中记录的设计方案（特别是「不删不封装，挖空 query.ts」的方法和 6 个 Lab 的渐进设计）。告诉我你是否认同，有没有潜在问题或更好方案。不要迎合我，直说风险。

   注意：PoC 已经验证通过（见 HANDOFF.md 第五节）。query-lab.ts 替换 query.ts 构建和 TUI 均正常。验证重点是 Lab 设计逻辑和教学路径是否合理。

2. 启动 Sprint 1 核心任务 — 在 claude-code-diy 写参考实现：

   ralph: 在 D:\test-claude-code\claude-code 中，基于 CCB 的 learn/phase-2-conversation-loop.md 文档，写一个完整的 ~800 行参考实现（独立的 coding agent），覆盖 messages.ts + llm-client.ts + tools/ + tool-executor.ts + agent-loop.ts + cli.ts。先让它完整跑通（能对话、能调用工具），再拆解为 Lab skeleton。完成标准：node 运行后能在终端和 Claude 对话并调用文件工具。

当前阶段：Sprint 1 — 参考实现

---

## OMC 工作方式速查（后续开发用）

你运行在 Claude Code + oh-my-claudecode (OMC) 多 agent 编排框架下。按场景选择工作模式：

### 自然语言触发（直接说）

| 场景 | 命令 | 何时用 |
|------|------|--------|
| 持久执行任务 | `ralph: [任务]` | PoC 验证、Lab skeleton 实现、复杂 bug 修复 |
| 先规划再执行 | `ralplan: [任务]` | 新 Lab 设计、架构方案确认 |
| 多模块并行 | `ulw [任务]` | 同时开发多个 Lab |
| 纯规划讨论 | `plan [任务]` | 理清思路但不立即执行 |
| 停止当前模式 | `stop` 或 `cancelomc` | 随时叫停 |

### 显式命令

```bash
# 新项目第一件事 — 建立认知底座
/oh-my-claudecode:deepinit

# 并行开发多个 Lab（如 Lab 1/2/3 同时推进）
/oh-my-claudecode:team 3:executor "开发 Lab 1 messages、Lab 2 tools、Lab 3 agent-loop 的 skeleton + tests"

# 方案交叉验证（架构决策时）
/oh-my-claudecode:ask codex "review this Lab 3 agent-loop skeleton design"

# Claude + Codex 双模型综合分析
/oh-my-claudecode:ccg
```

### 本项目推荐工作流

```
Sprint 1（参考实现）：
  Claude 设计架构 + 接口
  → omx / /oh-my-claudecode:ask codex 实现具体文件（成本低）
  → Claude 验证和代码审查

Sprint 2（Lab skeleton）：
  ralplan: 设计 Lab 3 Agent Loop 的 TODO 挖空方案（Claude，需要教学判断）
  →（共识后）/oh-my-claudecode:ask codex "生成 Lab 3 骨架代码和 Mock 测试用例"
  → Claude 审查教学质量

Sprint 2 并行（多 Lab 同时）：
  /oh-my-claudecode:team 3:executor "实现 Lab 1/2/3 skeleton 和测试用例"

架构决策时（交叉验证）：
  /oh-my-claudecode:ask codex "review this in-browser test runner design"
  /oh-my-claudecode:ccg
```

### Claude vs Codex 分工原则

| 给 Claude 的任务 | 给 Codex (omx) 的任务 |
|----------------|---------------------|
| 架构设计、教学路径设计 | 具体文件实现（TypeScript 代码） |
| 方案评审、教学质量审查 | 批量生成骨架代码和测试 |
| 复杂推理、跨文件理解 | 重复性文档、测试用例生成 |

**调用 omx 的示例 prompt（在终端运行）：**
```bash
omx "在 D:\test-claude-code\claude-code\labs\lab-03\src 目录下，
  实现 agent-loop.ts 的完整版本（solution），
  参考 CCB 的 learn/phase-2-conversation-loop.md，
  要求：TypeScript strict，包含完整 JSDoc，
  完成后确认 npx tsc --noEmit 无错误"
```
```
