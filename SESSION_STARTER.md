# 新会话开场白

复制以下内容作为你在 `D:\code\build-your-own-claude-code` 目录启动新 Claude Code 会话时的第一条消息：

---

```
我正在开发一个教学项目 build-your-own-claude-code。

这是一个基于真实 Claude Code 源码（416,500 行）的渐进式教学平台——学习者在浏览器内完成代码，看到真实 Claude Code TUI 由自己的代码驱动。同时这也是一个软件工程课程大作业，需要完整的全栈平台（前端+后端+数据库+Docker基础设施）。

第一步：阅读以下四个文件建立完整上下文：
1. CLAUDE.md — 项目概览、技术架构、Codex 分工原则
2. HANDOFF.md — 完整调研记录、PoC 结果、设计决策、优先级
3. internal/PLATFORM_DESIGN.md — 教学平台架构设计（关键！Web Terminal + Docker 方案）
4. internal/TEAM_PROGRESS.md — 团队分工和当前进度

第二步：运行 OMC 项目初始化：
/oh-my-claudecode:deepinit

第三步：双重验证两个核心决策（不要迎合，有问题直说）：

决策 A（已验证）：「挖空 query.ts，插入学习者实现」方案
  → PoC 已通过，构建和 TUI 均正常，见 HANDOFF.md 第五节

决策 B（新决策，需审视）：教学平台采用 Web Terminal + Docker
  → 学习者在浏览器终端运行 node cli.js，看到真实 TUI
  → 详见 internal/PLATFORM_DESIGN.md
  → 旧方案（Monaco + 浏览器 eval）被否决，原因：只能展示模拟动画，无法看到真实 TUI

第四步：确认后按优先级推进：

P0-1（最优先）：确认平台方案并验证可行性
  ralph: 验证 Docker 容器内 ttyd 能通过 WebSocket 暴露 shell，node cli.js 能在浏览器终端运行，看到 Claude Code TUI

P0-2：更新 internal/TEAM_PROGRESS.md，输出团队 5 人具体分工建议

P1（平台确认后）：参考实现 + Lab 3 skeleton
  ralph: 在 D:\test-claude-code\claude-code 中写 ~800 行参考实现（messages.ts + llm-client.ts + tools/ + agent-loop.ts + cli.ts），跑通后拆解为 Lab skeleton

当前阶段：Sprint 0 → Sprint 1（平台 + 参考实现）

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
