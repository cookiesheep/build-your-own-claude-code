# 团队进度追踪

> 所有开发 Agent 和团队成员必须在每次工作后更新此文档。
> 新会话 AI 必须先读此文档了解最新进度，再开始任何工作。

---

## 团队分工

| 人 | 方向 | 主要职责 | 指南文档 | Sprint 1 具体产出 |
|----|------|---------|---------|------------------|
| **cookiesheep（Leader）** | A. 后端+部署 | Express API + dockerode + 部署 + 架构把控 | `internal/work-a-backend/` | API 跑通 + 容器管理 + 部署 |
| **成员 B** | B. 前端页面 | Next.js + Monaco + xterm.js + Lab 页面 | `internal/work-b-frontend/` | Lab 页面原型（可 Mock 运行） |
| **成员 C** | C. Lab 核心 ★ | Lab 3 skeleton + tests + demo（最重要） | `internal/work-c-lab-core/` | Lab 3 全部文件 + 12 个测试通过 |
| **成员 D** | D. Lab 扩展 | Lab 1-2 skeleton + tests + demo | `internal/work-d-lab-extend/` | Lab 1 + Lab 2 全部文件 |
| **成员 E** | E. 文档+CI | 文档站完善 + Mock 基础设施 + GitHub Actions | `internal/work-e-docs/` | Lab 3 文档完善 + CI 绿色 |

> 注：成员 B/C/D/E 为占位符，待 Leader 确认实际分工后更新姓名。
> 每个成员在自己的 `internal/work-X-xxx/` 文件夹的 README.md 中记录进度。
> **台式机限制**：只有 Leader 能访问台式机，后端部署由 Leader 负责。其他方向可在任何电脑上开发。
> **部署方案**：Leader 闲置台式机（Intel Core Ultra 5, 10核, 16GB RAM, Win11）+ Cloudflare Tunnel 免费穿透。

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

- [x] 团队确认采用 Web Terminal + Docker 方案（见 `internal/PLATFORM_DESIGN.md`）✅ 2026-04-07
- [x] 确认部署环境：Leader 闲置台式机 + Cloudflare Tunnel ✅ 2026-04-07
- [x] 技术栈最终确认：Next.js + xterm.js + ttyd + dockerode + SQLite ✅ 2026-04-07
- [x] Docker 基础镜像确认：node:18-bookworm-slim + ttyd ✅ 2026-04-07
- [x] Docker + ttyd PoC 验证 ✅ 2026-04-07（node:18 + ttyd 1.7.7，阿里云镜像源，localhost:7681 返回 200）

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
- 🔄 Docker + ttyd PoC 验证（Dockerfile 已创建，待 Docker Desktop 启动后测试）
- 🔄 Lab 1-2 TUI 反馈方案细化

**阻塞项**：
- ⚠️ Docker Desktop 需要启动才能验证 PoC

### 2026-04-07（会话 2）

**完成项**：
- ✅ 项目认知底座建立（deepinit，5 个 AGENTS.md 生成）
- ✅ 三个核心决策验证：
  - 决策 A（挖空 query.ts）：✅ 通过，PoC 已验证
  - 决策 B（Web Terminal + Docker）：✅ 确认自建轻量平台方案
  - 决策 C（Lab 设计）：⚠️ 三处修正建议（见下方）
- ✅ 平台架构方案确认（GPT 交叉验证通过）：
  - Next.js + dockerode + ttyd + Cloudflare Tunnel
  - 部署在 Leader 闲置台式机（10核/16GB/Win11）
  - 支持 20-30 并发用户
  - ~2500 行自定义代码
- ✅ 否决 pwn.college 源码魔改方案（太复杂，技术栈不匹配）
- ✅ 团队分工建议更新（含 Sprint 1 具体产出）
- ✅ Docker PoC 文件创建（infrastructure/Dockerfile.lab + docker-compose.poc.yml）
- ✅ learn-claude-code 对比分析完成

**Lab 设计修正建议**（待 Leader 确认）：
1. Lab 1-2 需预置 query-lab-01/02.ts 提供 TUI 反馈（或只用 vitest 反馈）
2. 每个 Lab 需增加 demo.ts（Mock 模式可运行 demo，获得感 > 测试通过）
3. Lab 4 建议只保留 TodoWrite，Subagent 作为 Bonus

**进行中**：
- 🔄 Lab 3 参考实现 + skeleton 设计（Sprint 1 核心交付）

**下一步**：
- Sprint 1 启动：参考实现 (~800 行) → Lab 3 skeleton → Lab 3 测试用例

### 2026-04-08（会话 3）

**完成项**：
- ✅ 新增 `internal/PROJECT_BRIEFING.md`，作为新会话 / 新 agent 的快速接手文档
- ✅ 更新 `SESSION_STARTER.md`，将新会话推荐阅读顺序改为先读 briefing，再读进度与平台设计
- ✅ 再次核对当前项目现状，确认关键结论未变：
  - 主路线仍是 `query.ts` 挖空 + 注入学习者实现
  - 平台路线仍是 Web Terminal + Docker
  - 当前仓库现实仍是“文档成熟，代码实现早期”

**进行中**：
- 🔄 统一新版项目叙事，减少 `README.md` / `package.json` / `labs/` 结构与 `internal/` 设计稿之间的漂移

**阻塞项**：
- ⚠️ Lab 总数与命名仍存在版本漂移：部分文档为 6 Labs，`internal/LAB_DESIGN.md` 已倾向 7 Labs，后续需统一

### 2026-04-08（会话 4）

**完成项**：
- ✅ 前端 MVP 初始化完成（`platform/`）：
  - 首页已替换为 BYOCC 深色品牌首页
  - 顶部 Navbar 已实现，支持 Lab 0-5 导航与核心 Lab 高亮
  - `/lab/[id]` 动态页面已实现，形成「左文档 + 右编辑器/终端」工作台布局
  - 已接入 Markdown 渲染、Monaco Editor、xterm.js 终端占位、Mock API
  - Lab 3 默认骨架代码已内置到编辑器
- ✅ 设计风格已统一为深色专业界面（Cursor / Linear / Vercel Dashboard 风格）
- ✅ 验证通过：
  - `cd platform && npm run lint`
  - `cd platform && npm run build`
  - `next dev -p 3010` 下首页与 `/lab/3` 均返回 200

**进行中**：
- 🔄 后续仍需把 Mock API 替换成真实后端接口，并接入真实 ttyd WebSocket
- 🔄 Lab 文档与骨架代码目前仍部分依赖硬编码 / 文件读取混合方案，后续可统一

**阻塞项**：
- ⚠️ 后端 API 与容器终端尚未联通，当前终端区仍是占位模式

---

## 关键资源

| 资源 | 位置 |
|------|------|
| 快速接手 briefing | `internal/PROJECT_BRIEFING.md` |
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
