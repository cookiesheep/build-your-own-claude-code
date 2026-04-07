# 团队进度追踪

> 所有开发 Agent 和团队成员必须在每次工作后更新此文档。
> 新会话 AI 必须先读此文档了解最新进度，再开始任何工作。

---

## 团队分工

| 人 | 角色 | 主要职责 |
|----|------|---------|
| **cookiesheep（Leader）** | 架构师 + 产品 | 系统设计、Lab 内容设计、Claude Code 集成、整体把控 |
| **成员 B** | 平台后端 | Node.js API + Docker 容器管理 + WebSocket + 数据库 |
| **成员 C** | 平台前端 | Next.js + Lab 页面 + Monaco Editor + xterm.js 终端 |
| **成员 D** | Lab 内容 | 参考实现 + Lab skeleton 代码 + Mock 测试用例 |
| **成员 E** | 基础设施 | Docker 镜像 + 部署 + CI/CD + 容器环境配置 |

> 注：成员 B/C/D/E 为占位符，待 Leader 确认实际分工后更新。

---

## Sprint 规划

| Sprint | 时间 | 目标 | 负责人 |
|--------|------|------|--------|
| **Sprint 0** | Week 1-2 | 架构确认 + 环境搭建 + 分工对齐 | 全员 |
| **Sprint 1** | Week 3-5 | 平台 MVP + 参考实现 | B+C+E/D |
| **Sprint 2** | Week 6-8 | Lab 0-3 完整内容 + 联调 | D + B+C |
| **Sprint 3** | Week 9-10 | Beta 测试 + 修复 + Lab 4-5 | 全员 |
| **Sprint 4** | Week 11-12 | 打磨 + 答辩准备 | 全员 |

---

## P0 待办（必须在进入 Lab 开发前完成）

### 1. 教学平台形式确认 🔴

- [ ] 团队确认采用 Web Terminal + Docker 方案（见 `internal/PLATFORM_DESIGN.md`）
- [ ] 确认部署环境（谁的服务器/VPS？或 Docker Desktop 本地？）
- [ ] 技术栈最终确认（Next.js + xterm.js + ttyd + dockerode + SQLite）
- [ ] Docker 基础镜像确认（node:18 + claude-code-diy 预克隆）

**负责人**：全员对齐，Leader 拍板
**截止**：Sprint 0 结束

---

### 2. 团队分工与开发规范 🔴

- [ ] 确认 5 人具体分工（更新上方表格）
- [ ] 建立 GitHub 仓库协作规范（PR 流程、代码 Review）
- [ ] 确认本地开发环境（Node.js 18+、Docker Desktop、Git）
- [ ] 建立沟通渠道（微信群/飞书/Slack）

**负责人**：Leader
**截止**：Sprint 0 结束

---

### 3. 基础设施搭建 🔴

- [ ] Docker 基础镜像构建（含 claude-code-diy + Node.js + ttyd）
- [ ] 验证：容器启动后能运行 `node build.mjs --lab 3` 和 `node cli.js`
- [ ] 验证：ttyd 能通过 WebSocket 暴露 shell
- [ ] Next.js 项目初始化，基础目录结构

**负责人**：成员 E（基础设施）
**截止**：Sprint 1 Week 1

---

## P1 待办（平台 MVP）

### 4. 平台后端 API

- [ ] `POST /api/session` — 创建/获取用户会话，分配容器
- [ ] `POST /api/submit` — 接收代码，注入容器，触发构建
- [ ] `GET /api/progress` — 获取用户各 Lab 完成状态
- [ ] `POST /api/reset` — 重置容器到初始状态
- [ ] WebSocket 代理 → 容器 ttyd（7681 端口）
- [ ] SQLite 数据库：用户会话表 + 进度表

**负责人**：成员 B

---

### 5. 平台前端

- [ ] Lab 页面布局（左：文档，右：编辑器 + 终端）
- [ ] Monaco Editor 嵌入（显示 skeleton 代码）
- [ ] xterm.js 终端嵌入（连接 WebSocket）
- [ ] 「提交代码」按钮（调用 /api/submit）
- [ ] 进度追踪 UI（Lab 完成状态）
- [ ] Lab 0-3 页面内容填充

**负责人**：成员 C

---

### 6. Lab 内容（参考实现 + Skeleton）

- [ ] 参考实现（~800 行）：messages.ts + llm-client.ts + tools/ + tool-executor.ts + agent-loop.ts + cli.ts
- [ ] Lab 3 skeleton（query-lab-03.ts）：挖空核心循环，含 TODO 注释
- [ ] Lab 3 测试用例（Mock LLM，5-8 个场景）
- [ ] Lab 1-2 skeleton + 测试
- [ ] Lab 0 文档（安装指南）

**负责人**：成员 D（+ Leader 参与 Lab 设计）

---

## 进度日志

### 2026-04-06

**完成项**：
- ✅ PoC 验证通过：query-lab.ts 替换 query.ts，build + TUI 均正常
- ✅ claude-code-diy：--lab 构建模式实现（build.mjs Step 7）
- ✅ claude-code-diy：第三方 API 认证简化（auth.ts）
- ✅ 文档网站搭建（Material for MkDocs，已部署 GitHub Pages）
- ✅ HANDOFF.md 完整交接文档
- ✅ Lab 0-5 文档初版
- ✅ 第三方 API 教程（DeepSeek + cc-switch）

**进行中**：
- 🔄 教学平台方案确认（Web Terminal + Docker，待团队对齐）
- 🔄 团队正式分工（待 Leader 确认）

**阻塞项**：
- ⚠️ 平台方案未最终确认前，不应开始平台代码开发

---

## 关键资源

| 资源 | 位置 |
|------|------|
| 课程文档网站 | https://cookiesheep.github.io/build-your-own-claude-code |
| 文档源码 | `docs/` 目录（MkDocs） |
| Claude Code 可运行源码 | `D:\test-claude-code\claude-code`（claude-code-diy） |
| 平台设计文档 | `internal/PLATFORM_DESIGN.md` |
| 交接文档 | `HANDOFF.md` |
| 完整调研 | `HANDOFF.md` 第一至八节 |
| 第三方 API 配置 | `docs/guide/api-setup.md` |

---

## Agent 开发协作规范

多个 AI Agent 协助开发时必须遵守：

1. **每次工作前** 读 TEAM_PROGRESS.md 了解最新状态
2. **每次工作后** 更新进度日志（完成项 ✅ / 进行中 🔄 / 阻塞 ⚠️）
3. **不要重复造轮子** 先看已完成的内容再动手
4. **完成一个 P0 任务** 立刻标记 ✅ 并说明验证方式
5. **发现新问题** 加入阻塞项，不要默默绕过
