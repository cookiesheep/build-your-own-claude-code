# PROJECT_BRIEFING.md

> 用途：给新会话 / 新 agent 的 5-10 分钟快速接手文档。
> 定位：这是 `HANDOFF.md` 的高密度摘要，不替代完整 handoff。
> 维护原则：当项目方向、阶段、优先级、平台方案或 Lab 设计发生明显变化时，同步更新本文件。

---

## 1. 项目一句话

`build-your-own-claude-code` 是一个基于**真实 Claude Code 源码**的渐进式教学项目。学习者不是做一个 toy agent，而是通过逐步完成 Labs，最终看到**真实 Claude Code TUI 被自己写的代码驱动**。

---

## 2. 核心目标

按优先级看，这个项目最重要的是：

1. 学习者最终得到一个“由自己代码驱动的类似 Claude Code 的专业级工具”，不是玩具。
2. 教学过程必须是渐进式的，每完成一个 Lab 都能看到能力增长。
3. 反馈必须足够强，最好是可见行为变化，而不只是测试变绿。
4. 作为软件工程课程大作业，项目需要体现完整工程链路。
5. 项目本身最好具备开源传播价值。

---

## 3. 已确认的关键决策

### 决策 A：保留完整源码，只“挖空”关键文件

最终路线不是“删减 Claude Code 到几万行”，也不是“从零重写一个 800 行 agent”，而是：

- 保留 `claude-code-diy` 的完整源码
- 将关键文件 `src/query.ts` 替换为渐进式 Lab 版本
- 学习者补全代码后重新 build
- 再运行真实 Claude Code TUI

这是当前项目最核心、也最不能轻易推翻的方案。

### 决策 B：平台采用 Web Terminal + Docker

旧方案是“Monaco + 浏览器内 eval + 模拟动画”，已被否决。

现在的平台方案是：

- 浏览器里看 Lab 文档
- Monaco 中补全代码
- 提交后把代码注入容器
- 容器内执行 `node build.mjs --lab N`
- 学习者在浏览器终端运行 `node cli.js`
- 直接看到真实 Claude Code TUI

原因很简单：只有这条路能兑现“真实反馈”。

### 决策 C：Lab 3 是绝对核心

Lab 3 教 Agent Loop，也就是 `while (true)` 驱动的“LLM → 工具 → 结果回传 → 继续推理”循环。

如果只够打磨一个 Lab，优先把 Lab 3 做好。

---

## 4. PoC 现状

关键 PoC 已经在 sister repo `D:\test-claude-code\claude-code` 中验证通过：

- 简化版 `query-lab.ts` 可以替换原 `query.ts`
- `build.mjs --lab` 注入成功
- 完整依赖链能正常加载
- Claude Code TUI 能启动
- 交互能正常走到 API 调用路径

结论：**“挖空 query.ts + 注入学习者实现”方案可行。**

---

## 5. 两个仓库的关系

### 运行基线仓库

`D:\test-claude-code\claude-code`

- 这是 `claude-code-diy`
- 包含完整可运行的 Claude Code 源码
- 已做少量改造：`--lab` 构建模式、第三方 API 认证简化、PoC 文件等
- 用于验证“真实 TUI + 学习者代码注入”

### 教学平台仓库

`D:\code\build-your-own-claude-code`

- 这是当前仓库
- 负责教学文档、平台、Labs 骨架、测试、团队协作
- 不承载完整 Claude Code 源码本体

一句话：前者是**运行底座**，后者是**教学产品**。

---

## 6. 当前项目阶段

当前整体处于：

`Sprint 0 已基本完成 -> 正在进入 Sprint 1`

已经完成的主要是：

- 项目方向与方案收敛
- 核心 handoff 文档
- 平台方案确认
- 团队分工草案
- MkDocs 文档站搭建
- PoC 验证

尚未真正完成的主要是：

- 平台 MVP
- Labs 真正落地
- 参考实现
- Lab 3 skeleton / tests / demo

目前最大的特征是：**文档设计明显领先于代码实现。**

---

## 7. 当前仓库现实情况

### 已经比较完整的部分

- `HANDOFF.md`：完整交接文档
- `CLAUDE.md`：项目总览与分工原则
- `internal/PLATFORM_DESIGN.md`：平台设计主文档
- `internal/TEAM_PROGRESS.md`：当前进展与分工
- `internal/LAB_DESIGN.md`：更细的 Lab 设计稿
- `internal/work-*/README.md`：各方向工作说明

### 还明显早期的部分

- 根目录 `src/` 目前基本未实装
- `labs/` 目前仍主要是目录壳
- `platform/` 虽已初始化 Next.js，但距离真正平台 MVP 还有很大距离

### 当前存在的文档漂移

仓库里目前同时存在两套叙事：

1. 旧叙事：`README.md` / `package.json` 更像“7 个 task，从零构建 coding agent”
2. 新叙事：`HANDOFF.md` / `internal/*` 更像“build-your-own-claude-code + 真实 TUI 注入 + 渐进式 Labs”

后续开发时要优先以 **`HANDOFF.md` + `internal/`** 为准。

---

## 8. Lab 设计现状

项目主线始终是“渐进式增长能力”，但 Lab 结构目前有版本漂移：

### 稳定共识

- Lab 0：环境与体验
- Lab 1：让 Agent 会说话 / 消息与基础调用
- Lab 2：工具调用
- Lab 3：Agent Loop

### 存在漂移的部分

较早文档里常写成：

- Lab 4：规划 + 子 Agent
- Lab 5：上下文压缩

较新的设计稿里则倾向拆成：

- Lab 4：TodoWrite
- Lab 5：Subagent
- Lab 6：Context Compression

### 当前比较合理的判断

- Lab 3 必须重点打磨
- 每个 Lab 最好同时有：
  - `vitest` 测试反馈
  - `demo.ts` 或 TUI 级可见反馈
- Lab 4 是否只保留 TodoWrite、Subagent 是否降为 Bonus，仍需最终统一

---

## 9. 平台方案摘要

目标平台形态：

- 前端：Next.js + Monaco + xterm.js
- 后端：Node.js API + Docker 管理
- 容器：每个学习者一个独立环境
- 终端：ttyd 暴露 shell
- 数据：SQLite 记录会话和 Lab 进度
- 部署：Leader 闲置台式机 + Cloudflare Tunnel

平台不是附属品，而是本项目的重要组成部分，因为它承载“真实反馈”。

---

## 10. 当前最重要的下一步

如果开启一个新开发会话，默认优先级应该是：

1. 统一最新版叙事，减少文档和目录漂移
2. 做出平台 MVP 的最小闭环
3. 做出 Lab 3 的完整首版：
   - skeleton
   - tests
   - demo
   - 文档 / hints
4. 再向 Lab 1-2 和后续 Labs 扩展

如果精力有限，优先顺序是：

`平台最小可用闭环 > Lab 3 > Lab 1/2 > 其余 Labs`

---

## 11. 新会话建议阅读顺序

### 快速接手（5-10 分钟）

1. `WORK_LOG.md`
2. `internal/TEAM_PROGRESS.md`
3. `internal/PROJECT_BRIEFING.md`
4. `internal/PLATFORM_DESIGN.md`

### 完整接手（15-30 分钟）

1. `WORK_LOG.md`
2. `internal/TEAM_PROGRESS.md`
3. `CLAUDE.md`
4. `HANDOFF.md`
5. `internal/PROJECT_BRIEFING.md`
6. `internal/PLATFORM_DESIGN.md`
7. `internal/LAB_DESIGN.md`

---

## 12. 对未来 agent 的提醒

- 不要轻易推翻“挖空 query.ts”的主方案，除非新的证据证明它不可行。
- 不要退回“从零写 toy agent 教程”的路线，那不符合 owner 的核心目标。
- 每次完成实质性工作后，必须更新 `internal/TEAM_PROGRESS.md` 留痕。
- 判断方案时，始终用这个标准衡量：
  - 学习者是否能看到真实能力增长？
  - 是否真的更接近“自己写的 Claude Code”？
- 如果发现文档冲突，优先参考：
  - `WORK_LOG.md`
  - `HANDOFF.md`
  - `internal/PROJECT_BRIEFING.md`
  - `internal/TEAM_PROGRESS.md`
  - `internal/PLATFORM_DESIGN.md`

---

## 13. 本文档当前结论

这个项目已经完成了最难的一步之一：**把方向想清楚，并证明主路线技术上可行。**

现在需要的是稳定推进，把“成熟的设计文档”尽快转成“可运行的平台和 Labs”。
