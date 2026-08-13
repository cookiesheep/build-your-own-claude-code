# TEAM_PROGRESS — 工作日志

> 2026-08-13 整理：4 月（平台/后端搭建期，会话 1–38）已整体归档至 [`_archive/TEAM_PROGRESS.md`](./_archive/TEAM_PROGRESS.md)。
> 本文件只保留 2026-05 起的近期记录。需要查阅早期 Docker/认证/API Key/多文件编辑等搭建细节，看归档原件。
>
> ⚠️ 这是历史流水账，**不是项目现状的权威来源**。判断现状以代码 + [`platform/src/lib/lab-files.json`](../platform/src/lib/lab-files.json) 为准。

---

### 2026-05-13 / Lab 01 渐进式文档优化

**完成项**：
- ✅ 在 `docs/labs/lab-01/index.md` 重写 Lab 01 教学定位，明确「让 Agent 第一次开口」的语言通道目标与能力边界。
- ✅ 在 `docs/labs/lab-01/tasks.md` 把任务顺序改为「真实对话 → 标注 → JSON 填空 → 从零写 JSON → TypeScript 类型 → Conversation 类 → demo → TUI 观察」。
- ✅ 明确 `tool_result` 的 `role` 是 `user` 但不是人类用户发的，新增「请读取 README.md 第一行」的能力边界观察 TODO。

**进行中**：选择题解释、错误选项反馈、JSON diff 文案、Live API Echo、Conversation stage 细节仍待打磨。

**验证**：本次只改 Markdown 文档与内部规格，未运行构建/测试。

---

### 2026-05-30 / 平台统计 + 粒子 Logo + 学习排行榜

**完成项**：
- ✅ 完成 Logo 粒子阶段、首页独立访客统计、`/platform` 学习排行榜三项功能。
- ✅ 新增 public stats API：`GET /api/stats/visitors`、`GET /api/stats/leaderboard`。
- ✅ 排行榜只展示至少完成 1 个 Lab 的 GitHub/password 学习者。
- ✅ 新增 `LeaderboardPanel`，桌面三栏、移动端折叠、支持复制分享链接。
- ✅ 新增 stats DB helper 测试与 route 契约测试（临时 SQLite，不污染本地库）。

**验证**：`server vitest`（8 files / 19 tests）、`platform/server build` 通过；HTTP + Playwright smoke 通过（`/api/stats/visitors` 返回 `{ total: 224 }`，排行榜 `rows=4`）。

---

### 2026-05-31 / 首页统计首屏化 + 排行榜 Top 10

**完成项**：
- ✅ 将首页独立访客统计从 Footer 移到 Hero 首屏，与粒子/终端视觉融合。
- ✅ `/platform` Learners 面板默认展示 Top 10（后端 SQL 10 条上限为唯一截断源）。

**验证**：`server vitest`（8 files / 21 tests）、双端 build 通过；HTTP smoke `/api/stats/visitors` 返回 `{ total: 230 }`，排行榜 `totalLearners=83`。

**遗留**：当前统计口径是「数据库身份 + 历史 session」的近似，不是严格 UV/PV；如需精确需新增隐私友好的 page-view/event 表。

---

### 2026-05-31 / 首页访客终端 + 粒子数字

**完成项**：
- ✅ 新增 `VisitorTerminal`：右下角小铜色脉冲点，hover/click/focus 展开微型终端卡片，调 `getVisitorCount()` 展示当前 stats 并生成稳定假在线人数与 30 秒假日志。
- ✅ `HeroParticles` 新增 `visitors` phase，`stable` 后显示 5 秒访客数字。

> ⚠️ `VisitorTerminal` 后续已被 `CrabTeacher` 像素风助教组件替代（见 2026-08-09），组件文件保留但不再使用。

---

### 2026-06-01 / 双仓远端同步

**完成项**：
- ✅ 同步 `claude-code-diy`：`main` fast-forward 到 `origin/main`，`HEAD = 6151748`。
- ✅ 同步 `build-your-own-claude-code`：当前分支 fast-forward 到 `origin/main`，`HEAD = f454156`，stash 保护并恢复了原有 Lab 01 改动与未跟踪规格。

---

### 2026-06-02 / Lab 1 平台反馈 MVP

**完成项**：
- ✅ 扩展平台 Markdown quiz 管线，支持稳定 `id`、`quiz-single`、`quiz-code`。
- ✅ 新增 `QuizCode`、`QuizProgress` 与 quiz 选项解析工具；`QuizSingle` 改用 Markdown 稳定 id 存储答题状态。
- ✅ Lab 1 tasks 接入 7 个理解检查（6 单选 + 1 代码理解）；任务 tab 顶部软进度只读 `localStorage`。
- ✅ `NEXT_PUBLIC_MOCK_MODE=true` 同时放行前端 auth mock；修复极窄移动视口 quiz 溢出。

**验证**：`platform tsc/build` 通过；Playwright `/lab/1` 确认 7 quiz、1 代码题、提交反馈、刷新恢复、进度更新、移动端无溢出。

---

### 2026-06-02 / Lab 1 Quiz-to-Code 联动

**完成项**：
- ✅ 新增 quiz-to-code 前端事件总线：左侧 `quiz-code` 答对后可请求右侧编辑器写入草稿，不新增后端 API。
- ✅ 扩展 `quiz-code` 指令属性：`applyFile`、`applyMarker`、`applyLabel`、`typescript apply` 代码块。
- ✅ Lab 1 `tool_result` 代码理解题加入可应用片段：答对后展示目标文件/插入位置/全文，点击写入。
- ✅ 右侧工作台只替换明确 marker；找不到目标文件或 marker 时只提示错误，不改草稿、不重复写入。

**验证**：双端 tsc/build 通过；Playwright 确认答对显示应用面板、点击写入、marker 缺失报错不重复写入、错答不显示面板。

---

### 2026-06-03 / Lab 1 Step 3-5 教学与审查重构

**完成项**：
- ✅ Step 1 把 raw `<details>` 参考答案改成平台支持的 `!!! note`；清理 Step 2.5 提前给答案的正文。
- ✅ 扩展选项级反馈：答错展示解析可重选，答对锁定并计入软进度。
- ✅ 删除 Step 3.5 Live API Echo；Step 3 改为右侧 `src/messages-lab1.ts` 的结构审查。
- ✅ 新增 Lab 1 右侧文件配置：`src/messages-lab1.ts`、`src/types-lab1.ts`、`src/conversation-lab1.ts`，同步平台与服务端白名单。
- ✅ 新增客户端 Lab 1 messages 审查工具（基于 TS AST，不 eval 用户代码）。

> ⚠️ 这一版的「右侧多文件 + AST 审查」后来在 2026-06-04 被推翻，Lab 1 改回单一 `src/query-lab1.ts` 变体文件，移除审查按钮。

---

### 2026-06-03 / README 网页平台口径改写

**完成项**：
- ✅ 按 `docs/labs` 当前 Lab 0-5 内容重写根目录 `README.md`，从「本地克隆/安装/配置」改为「访问 byocc.cc 网页端直接学习」的产品口径。
- ✅ 补充居中标题、徽章、Why、Preview、学习路线、Features、FAQ、Documentation、Project Structure、Architecture、Contributing、License。

---

### 2026-06-04 / Lab 1 真实构建链路修复（关键转折）

**完成项**：
- ✅ 确认三文件 Lab 1（messages/types/conversation）不符合 `claude-code-diy/build.mjs --lab 1` 的真实变体发现规则。
- ✅ 在 `claude-code-diy` 新增 `src/query-lab1.ts` 作为 `src/query.ts` 的 Lab 1 变体；保留真实 TUI + 模型流式路径，但刻意关闭 tools / agent loop。
- ✅ 平台 Lab 1 可编辑文件改为唯一 `src/query-lab1.ts`，重新生成 `server/src/services/lab-files-generated.ts`。
- ✅ Lab 1 文档右侧实作步骤改为 `query-lab1.ts` 的 4 个 TODO：system prompt、messages、`deps.callModel()`、completed 返回。
- ✅ 移除右侧「审查消息」按钮和 `lab1-review` 工具，避免审查通过但真实构建失败的假反馈。
- ✅ 修正 `infrastructure/build-lab-image.ps1` 默认 runtime 路径与 Docker 失败退出码；更新 `Dockerfile.lab` 说明。

**验证**：`claude-code-diy node build.mjs --lab 1` 通过（`Swapped dist\src\query.js ← dist\src\query-lab1.js`）；`cli.js --version` 通过；`server npm test -- lab-workspace`（2 passed）。

**遗留**：Docker Desktop daemon 未运行，未做真实镜像构建 + 容器内提交流程验证。

> 📌 这条确立了本项目的评测机制真相：**变体文件注入 + `build.mjs --lab=N` 编译 + TUI 观察**，无 Mock LLM、无测试框架。

---

### 2026-08-09 / 蟹老师全模态助教（CrabTeacher）

**完成项**：
- ✅ 在既有 `CrabTeacher` 分层 PNG + 访问计数 + 呼吸/眨眼/教鞭动画基础上，接入点击唤醒、悬停提示、说话状态和响应式助教面板。
- ✅ 新增文字、按住说话、真实视口截图三种入口；语音采集/识别/合成 + Canvas 波形 + 截图缩略图 + 粉笔风视觉标注均可独立运行。
- ✅ 新增 `minicpm-client.ts`（无密钥 Demo 消息库 + OpenAI-compatible MiniCPM-o 4.5 文本/图像/音频请求）。
- ✅ 新增 Express `/api/crab-tutor` 轻量代理（生产密钥留在服务端）。
- ✅ 补充 README、MkDocs 技术说明、前后端环境变量示例，挂入导航。

**验证**：双端 tsc + `server build` 通过；`crab-tutor.test.ts`（4 tests）；Playwright 桌面 1440×900 + 移动 390×844 验证交互/截图/视觉标注/明暗主题正常。

**遗留**：真实 MiniCPM-o 4.5 端点需部署者自行配置；现场麦克风权限与中文语音识别质量待真机验证。

---

## 当前已知事实（2026-08-13 复核）

- **平台/后端**：Next.js 16 + Express + Docker + ttyd + SQLite，已部署华为云（systemd `byocc-server` + `byocc-platform`）。详见 [`华为云服务器运维手册.md`](./华为云服务器运维手册.md)。
- **评测机制**：变体文件注入 + `node build.mjs --lab=N` 编译（exit 0 即通过）+ TUI 观察。无 Mock LLM、无测试框架。真相源是 [`platform/src/lib/lab-files.json`](../platform/src/lib/lab-files.json)。
- **Lab 完成度**：Lab 0（环境，无代码）、Lab 1（`query-lab1.ts`，已打磨）、Lab 2（`query-lab2.ts`，骨架本周重构）有真实骨架；**Lab 3/4/5 目前只有单行 `// TODO` 占位，尚未设计真实骨架**。Lab 3（Agent Loop）是核心，应获 80% 精力。

---

## Agent 开发协作规范

多个 AI Agent 协助开发时遵守：

1. **以代码为现状唯一真相**——文档（含本文件）可能滞后，先读代码再下结论。
2. **每次工作前** 读 `CLAUDE.md` + `platform/src/lib/lab-files.json` 了解 Lab 真相。
3. **每次工作后** 追加一条本日志（完成项 ✅ / 进行中 🔄 / 阻塞 ⚠️ / 验证证据）。
4. **不要重复造轮子**——先看已完成的内容再动手。
5. **发现新问题**加入阻塞项，不要默默绕过。
