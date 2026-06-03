# Lab 1-3 深度设计提示词

> 复制以下全部内容（从 --- 开始），粘贴到新的 Claude Code 会话中。
> 推荐模型：Opus（需要深度教学设计推理）

---

你是 build-your-own-claude-code (BYOCC) 项目的 **Lab 设计专家**。

你的任务是基于对项目架构的理解、对三个竞品/参考项目的分析、以及对教学设计的深度思考，**完成 Lab 1-3 的完整设计文档**。包括：每个 Lab 挖空哪些文件、skeleton 代码长什么样、渐进式能力如何体现、测试用例如何设计。

## 你必须先读的文件（按顺序）

1. **`CLAUDE.md`** — 项目定义、技术架构、开发规范
2. **`HANDOFF.md`** — 完整项目交接（owner 背景、调研记录、设计决策）
3. **`internal/Lab开发与平台同步手册.md`** — ★ 变体文件机制的三条数据管道、Lab 开发完整流程
4. **`internal/Lab设计与评测机制-待决问题-2026-04-30.md`** — 路线 A/B/C 讨论（我们选路线 A：纯变体文件）
5. **`~/.claude/projects/D--code-build-your-own-claude-code/memory/MEMORY.md`** — 跨会话记忆

**参考文档（不需要优先读，需要时查阅）**：
- `internal/Lab设计与评测机制-CodeCrafters分析-2026-05-06.md` — CodeCrafters 源码分析（仅供测试用例设计参考，不是我们的测试方案）

**以下内容是核心上下文，不需要再读其他文件就能完成设计。**

---

## 项目背景

### 项目定位

BYOCC 是一个基于真实 Claude Code 源码的渐进式教学项目。学习者通过 6 个 Lab 逐步实现 Agent Harness 的核心模块，最终将自己写的代码插入 Claude Code 真实系统运行。

**核心教学方法**：不删不封装，挖空关键文件。学习者拿到的是完整可运行的 Claude Code（通过 claude-code-diy），关键文件被替换为带 TODO 的骨架。学习者补全 → 构建 → TUI 跑起来。

**核心理念**：Coding Agent = 模型(60%) + Harness(40%)。Claude Code 的 416,500 行代码中，核心 Harness 只有 ~12,000 行（3%）。其中最关键的 Agent Loop（query.ts）剥掉生产级复杂度后，核心逻辑约 100 行。

### 项目 owner

- cookiesheep，中山大学大二，5 人团队 leader
- 技术能力强但经验在积累中
- 项目真实目标：**开源影响力打底 + 商业化探索**
- WOW 时刻："自己的代码驱动真实 TUI"
- 老师（客户）建议考虑面向 B 端/企业

### 时间线

- 18 周考试，留整个月考试
- 约 14 周停工，剩余 3-4 周
- **本学期目标**：完成 Lab 1-3 设计 + 初期宣传 + GitHub OAuth

### 技术栈

- **基线**: claude-code-diy (`D:\test-claude-code\claude-code`，416,500 行 TypeScript，基于 Bun)
- **平台**: Next.js 16 + Monaco Editor + xterm.js + Docker + ttyd
- **后端**: Express + SQLite + Docker
- **部署**: 华为云 Ubuntu 24.04, 16 核 62GB RAM
- **LLM**: 通过后端代理，使用 DeepSeek 等低成本 API

---

## 现有 Lab 设计（6 个）

| Lab | 主题 | 学习者实现什么 | TUI 中看到的反馈 |
|-----|------|--------------|----------------|
| 0 | 环境 + 体验 | 安装运行完整 Claude Code | 看到完整 TUI 换皮haun |
| 1 | API 调用 | 调 LLM 返回文字，不用工具 | Agent 能回复但不能做事 |
| 2 | 工具系统 | 工具注册 + 单轮执行 | Agent 用了一次工具就停 |
| **3** | **Agent Loop** ★ | **while(true) 循环** | **Agent 自主多轮调用工具** |
| 4 | 规划 + 子 Agent | TodoWrite + Subagent | Agent 先想再做、会拆任务 |
| 5 | 上下文压缩 | 三层压缩策略 | Agent 长对话不崩 |

**Lab 3 是核心中的核心，获得 80% 精力。**

---

## 核心设计概念：渐进式能力解锁

**这是 BYOCC 区别于所有竞品的核心差异化。**

类比 YatSenOS 的 QEMU：Claude Code TUI 是固定的壳，Agent 大脑从空开始逐步获得能力。

学习者的体验应该是：

```
Lab 0: Claude Code 能启动但连对话都做不到（API 调用被挖空）
       → 学习者看到 TUI 启动了，但 Agent 无响应 → "坏了，让我修好它"

Lab 1: 学习者修好 API 调用 → Agent 能对话了，但不能用工具
       → 学习者在 TUI 中输入消息，Agent 能回复文字，但不会调用任何工具

Lab 2: 学习者加上工具系统 → Agent 能调用工具，但用一次就停
       → 学习者让 Agent 读文件，Agent 读了一次就返回结果，不会继续

Lab 3: 学习者加上 Agent Loop → Agent 自主多轮调用工具
       → 学习者让 Agent 完成任务，Agent 自主读文件、写文件、多轮推理
       → WOW 时刻！"它活了！"
```

**全程反馈 = 在终端里直接观察 Claude Code 的行为变化。** 编译成功后 TUI 启动，学习者直接看 Agent 能做什么、不能做什么。

---

## 现有注入机制（variant file 机制）

### 技术实现

claude-code-diy 的构建系统 `build.mjs` 支持 `--lab=N` 参数：

```bash
node build.mjs --lab=0   # Lab 0 模式
node build.mjs --lab=1   # Lab 1 模式
node build.mjs --lab=3   # Lab 3 模式
```

### 文件后缀约定

- 标准文件：`src/services/agent/query.ts`
- Lab 变体：`src/services/agent/query-lab3.ts`（带 `-labN` 后缀）

### 构建时行为

1. esbuild 正常编译所有文件
2. `build.mjs` 扫描所有 `-labN` 后缀文件
3. 将 `-labN` 变体的编译输出**覆盖**标准文件的编译输出
4. 删除 `-labN` 变体的编译产物
5. 最终产物中，标准文件被替换为 Lab 变体

例如：
```
编译前: query.ts + query-lab3.ts
编译后: dist/query.js (内容来自 query-lab3.ts)
```

### 现有 Lab 0 变体文件

Lab 0 已有 6 个变体文件：
- `src/main-lab0.tsx` — 主入口（几乎与 main.tsx 相同）
- `src/entrypoints/cli-lab0.tsx` — CLI 入口（品牌名改为 YOUR_BRAND）
- `src/components/LogoV2/WelcomeV2-lab0.tsx` — 欢迎页（简化版）
- `src/components/LogoV2/Clawd-lab0.tsx` — Logo（可自定义颜色）
- `src/components/LogoV2/CondensedLogo-lab0.tsx` — 紧凑 Logo
- `src/components/LogoV2/LogoV2-lab0.tsx` — Logo 组件

**Lab 0 的模式**：不挖空核心功能文件，只定制品牌相关 UI。学习者看到完整的 Claude Code。

---

## 竞品/参考项目分析

### 项目 1: CodeCrafters "Build Your Own Claude Code"

**仓库**: `codecrafters-io/build-your-own-claude-code`

**6 个 Stage**：

| Stage | 名称 | 学习者做的事 |
|-------|------|------------|
| 1 | Communicate with LLM | 取消注释 `print(response)` |
| 2 | Advertise Read Tool | 在 API 请求中加 `tools=[...]` |
| 3 | Execute Read Tool | 检测 tool_calls，执行 read_file |
| 4 | Agent Loop | while(True) 循环，直到没有 tool_calls |
| 5 | Write Tool | 添加 write_file 工具 |
| 6 | Bash Tool | 添加 bash_command 工具 |

**特点**：
- 学习者从零写一个 ~120 行 Python Agent
- 使用真实 LLM（OpenRouter → Claude Haiku）
- 黑盒测试：运行程序 → 检查 stdout + 文件系统
- 每个.Stage 有随机化防作弊（随机 prompt、随机值、随机文件名）
- 支持 10 种语言

**BYOCC 可借鉴**：
- Stage 4（Agent Loop）的多步推理测试设计非常精妙
- 随机化防作弊思路
- guard rail prompt 设计（"Respond with only a number"）

### 项目 2: shareAI-lab "Learn Claude Code" ★★★ 最值得参考

**仓库**: `shareAI-lab/learn-claude-code`

**12 个 Session + 1 个 Capstone**：

| Phase | Session | 主题 | 工具数 | Motto |
|-------|---------|------|--------|-------|
| THE LOOP | s01 | Agent Loop | 1 (bash) | "One loop & Bash is all you need" |
| | s02 | Tool Use | 4 | "Adding a tool = adding one handler" |
| PLANNING | s03 | TodoWrite | 5 | "An agent without a plan drifts" |
| | s04 | Subagents | 5+task | "Children summarize, parents decide" |
| | s05 | Skill Loading | 5+load_skill | — |
| | s06 | Context Compact | 5+compact | — |
| PERSISTENCE | s07 | Task System | 8 | — |
| | s08 | Background Tasks | 6 | — |
| TEAMS | s09-s12 | 多 Agent 协作 | 9→16 | — |
| Capstone | s_full | 全部合并 | 16 | — |

**关键教学设计**：
1. **Motto 系统**：每个 session 一句话核心洞察，极大增强记忆
2. **ASCII 架构图**：代码注释中有完整的 ASCII 流程图，代码自文档化
3. **渐进式工具数**：从 1 个工具到 16 个，复杂度增长可视化
4. **完整独立脚本**：每个 session 是完整可运行的，无跨 session 依赖
5. **Nag reminder 模式**：当模型忘记更新 todo 时注入提醒，教学习者如何影响模型行为
6. **三层压缩**（s06）：micro_compact（每轮）+ auto_compact（超限）+ manual compact
7. **s01 就是 Agent Loop**：第一个 session 就教 while(True)，不先教 API 调用！这是反 CodeCrafters 的顺序

**BYOCC 可借鉴**：
- Motto 系统非常适合 Lab 文档面板
- ASCII 架构图可以嵌入 skeleton 代码注释中
- s01 的 "One loop & Bash is all you need" 理念——先让 Agent 转起来，再加能力
- 但 BYOCC 不能完全照搬，因为我们的基线是真实 Claude Code 源码，不是从零写

### 项目 3: claude-code-best/claude-code (CCB)

**仓库**: `claude-code-best/claude-code`

**性质**：这不是教学项目，是 Claude Code 的反编译/逆向工程版本。完整 TypeScript 代码库。

**BYOCC 可借鉴**：
- Feature flag 机制：`FEATURE_<FLAG_NAME>=1` 控制功能开关，类似我们的 variant file 机制
- 文档结构：`docs/` 按 agent/, context/, conversation/ 组织，提供了"完整态"的参考架构
- `/teach-me` skill 的苏格拉底式教学设计：结构化选项（不给开放式文本），掌握度门控

---

## 评测机制：纯注入 + 编译 + TUI 体验

### ★ 核心方案（已确认，路线 A）

BYOCC 的评测方式是**纯代码注入**，不使用 Mock LLM 或任何额外的测试基础设施。

**完整流程**：

```
1. 学习者在 Monaco Editor 中填写 skeleton 代码（TODO 部分）
2. 点击"提交" → 后端将代码注入 Docker 容器（覆盖 -labN 文件）
3. 容器内执行 build.mjs --lab=N
4. 编译成功 → ttyd 启动 node cli.js → 学习者在 TUI 中看到真实 Agent 行为
5. 编译失败 → 显示构建错误，学习者修复后重试
```

**评测 = 编译验证 + TUI 真实体验**：
- **Level 1（编译验证）**：`build.mjs --lab=N` 返回 exit code 0 → 编译通过
- **Level 3（TUI 体验）**：编译通过后 ttyd 启动，学习者在 TUI 中用真实 LLM 交互，亲眼看到自己的代码驱动 Agent

**没有 Mock LLM、没有 stdout 断言、没有黑盒测试框架**。评测的核心是：你的代码能让 Agent "活过来"吗？

### 三条数据管道（必须理解）

详见 `internal/Lab开发与平台同步手册.md`，核心架构：

```
管道 1：Docker 镜像（容器内执行）
  claude-code-diy 的 -labN 文件
       ↓ build-lab-image.sh
  Docker 镜像 /workspace/src/...
       ↓ 学习者点"提交" → injectFiles()
  容器内执行 build.mjs --lab=N

管道 2：前端编辑器（学习者看到的初始代码）
  platform/src/lib/lab-files.json
       ↓ getLabInitialFiles()
  Monaco 编辑器显示 skeleton 内容

管道 3：已保存的 workspace（学习者之前的编辑）
  server/byocc.sqlite → code_snapshots 表
       ↓ GET /api/labs/:id/workspace
  覆盖编辑器的初始内容（优先级最高）
```

### 现有 Lab 0 的已验证模式

Lab 0 已按此机制完成，包含 6 个变体文件：
- `src/main-lab0.tsx` — 主入口（品牌定制）
- `src/entrypoints/cli-lab0.tsx` — CLI 入口（品牌名替换为 YOUR_BRAND）
- `src/components/LogoV2/WelcomeV2-lab0.tsx` — 欢迎页（简化版）
- `src/components/LogoV2/Clawd-lab0.tsx` — Logo（可自定义颜色）
- `src/components/LogoV2/CondensedLogo-lab0.tsx` — 紧凑 Logo
- `src/components/LogoV2/LogoV2-lab0.tsx` — Logo 组件

**Lab 0 的变体只定制 UI/品牌，不挖空核心功能。Lab 1-3 则需要挖空核心功能文件，使 Agent 逐步获得能力。**

### 变体文件命名和构建规则

```
原始文件: src/services/agent/query.ts
Lab 变体: src/services/agent/query-lab3.ts

构建时:
  build.mjs --lab=3
  → discoverLabSwaps() 找到 query-lab3.ts
  → 编译 query-lab3.ts → 输出到 dist/src/services/agent/query.js（覆盖原始产物）
  → 最终系统使用 lab3 版本的 query
```

**关键**：变体文件必须是**完整文件**（不是 diff），构建时整个替换原始文件的编译产物。

---

## 你需要完成的任务

### 任务 1：Lab 1 设计（API 调用）

设计 Lab 1 的完整方案，包括：

1. **哪些文件需要创建 `-lab1` 变体？**
   - 需要分析 claude-code-diy 的 API 调用链路
   - 找到 LLM 调用的核心文件（可能在 `src/services/api/` 或 `src/services/agent/`）
   - 确定 Lab 1 的挖空策略：是挖空 API client？还是挖空消息处理？
   - Lab 1 构建后的 TUI 应该是什么表现？（能启动但无法对话？能显示错误？）

2. **skeleton 代码设计**
   - 每个 `-lab1` 变体文件的内容
   - TODO 标记的位置和提示
   - 难度评估（需要学习者理解多少 claude-code-diy 内部机制？）

3. **教学设计**
   - 知识点列表
   - 分步引导
   - Hints 系统（3 级提示）
   - Motto（一句话核心洞察）

4. **测试验证点**
   - 编译验证：skeleton 填充后 `build.mjs --lab=N` 能否成功编译？
   - TUI 行为验证：编译成功后，Agent 在 TUI 中的表现是否符合预期？（例如 Lab 1 编译后 Agent 能对话但不能用工具）

### 任务 2：Lab 2 设计（工具系统）

同上结构，重点关注：
- 工具注册 + 工具执行的核心文件在哪里？
- Lab 1 完成后（API 调用已通），Lab 2 如何在 Lab 1 基础上加工具？
- 工具的定义格式（Anthropic tool schema）
- 工具执行的调度机制

### 任务 3：Lab 3 设计（Agent Loop）★ 最重要

同上结构，重点关注：
- Agent Loop 的核心文件是 `src/services/agent/query.ts`（~核心逻辑 100 行）
- 这是整个项目最关键的设计
- 需要 80% 的设计精力
- Lab 3 构建后，学习者应该能在 TUI 中看到 Agent 自主多轮调用工具——这就是 WOW 时刻

### 任务 4：三个 Lab 之间的连贯性

确保：
- Lab 1 的变体只挖空 API 调用相关文件
- Lab 2 的变体在 Lab 1 基础上恢复 API 调用，但挖空工具系统
- Lab 3 的变体恢复工具系统，但挖空 Agent Loop
- 每个 Lab 构建后都有明确可感知的行为变化

### 输出格式

为每个 Lab 输出以下格式的文档：

```markdown
# Lab N 设计文档

## 基本信息
- 主题: ...
- 前置条件: Lab N-1 完成
- 核心文件: ...

## 渐进式体验
- Lab N 构建后 TUI 表现: ...
- 学习者会感知到什么: ...
- Motto: "..."

## 挖空方案
### 文件 1: path/to/file-labN.ts
- 原始文件: path/to/file.ts (功能说明)
- 挖空策略: (说明为什么挖这个文件)
- Skeleton 代码: (完整代码)

### 文件 2: ...

## 教学设计
### 知识点
1. ...
2. ...

### 分步引导
1. 第一步: ...
2. 第二步: ...

### Hints (3 级)
- Hint 1 (方向性提示): ...
- Hint 2 (具体提示): ...
- Hint 3 (关键代码片段): ...

## 测试验证
### 编译验证
- skeleton 填充后能否成功编译: ...

### TUI 行为预期
- 编译成功后 Agent 在 TUI 中应表现出什么行为: ...

### 常见编译错误及修复提示
- 错误 1: ... → 提示: ...

## 与其他 Lab 的关系
- 依赖 Lab N-1 的哪些知识点: ...
- 为 Lab N+1 铺垫了什么: ...
```

---

## 工作原则

1. **先读代码再设计** — 使用 `Grep`/`Read`/`Glob` 工具阅读 claude-code-diy 的关键文件，理解 API 调用链路、工具系统、Agent Loop 的具体实现
2. **渐进式设计** — 每个 Lab 只挖空一个能力维度，保持其他能力完整
3. **教学优先** — 所有决策以学习者体验为第一优先级
4. **具体到文件和行号** — 不要说"修改 API 相关文件"，要说"修改 src/services/api/client.ts 第 301 行的 createAnthropicClient 函数"
5. **给出完整 skeleton 代码** — 不要省略，写完整的 `-labN` 变体文件内容
6. **验证可行性** — 设计完后，确认 `build.mjs --lab=N` 能正确替换文件

---

## 关键约束

- claude-code-diy 基于 **Bun**（不是 Node.js），使用 `bun:bundle` 等特殊 API
- TypeScript strict 模式，ESM 模块
- 变体文件（`-labN` 后缀）必须是**完整可编译的文件**，不能是 diff 或片段
- 每个 Lab 的变体文件通过 `-labN` 后缀被 `build.mjs` 发现和替换
- 学习者的代码通过后端 `injectFiles()` API 注入容器，然后执行 `build.mjs --lab=N`
- 编译成功后 ttyd 启动 `node cli.js`，学习者通过 TUI 与真实 LLM（DeepSeek）交互
- 三个管道（Docker 镜像 / lab-files.json / SQLite）需要同步更新

---

> 接收到这个提示词后，先确认你已经阅读了 CLAUDE.md 和 HANDOFF.md，然后开始深入阅读 claude-code-diy 的源码，找到 Lab 1-3 需要挖空的核心文件。

---
