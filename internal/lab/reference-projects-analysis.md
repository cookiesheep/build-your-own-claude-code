# 参考项目深度分析 — BYOCC Lab 设计参考

> Date: 2026-05-09 | 目的：为 Lab 1-3 设计提供竞品/参考项目的教学设计灵感

---

## 一、CodeCrafters "Build Your Own Claude Code"

### 仓库信息

- **URL**: `codecrafters-io/build-your-own-claude-code`
- **测试框架**: `codecrafters-io/claude-code-tester` (Go)
- **学习者产出**: ~120 行 Python，完整 Agent

### 架构亮点

**6 Stage 渐进式设计**：

| Stage | 名称 | 学习者做的事 | 核心能力 |
|-------|------|-------------|---------|
| 1 | Communicate with LLM | 调 API 获取文本 | API 调用 |
| 2 | Advertise Read Tool | 请求中加 `tools=[...]` | 工具声明 |
| 3 | Execute Read Tool | 检测 tool_calls → 执行 | 工具执行 |
| 4 | Agent Loop | while(True) 循环 | 自主推理 |
| 5 | Write Tool | 添加 write_file | 文件写入 |
| 6 | Bash Tool | 添加 bash_command | 命令执行 |

**注意顺序**：CodeCrafters 先教 API → 工具声明 → 工具执行 → Agent Loop → 更多工具。这和 shareAI-lab 的顺序相反（后者 s01 就教 Agent Loop）。

### 测试机制（黑盒）

```
学习者程序 → Proxy Server → OpenRouter → Claude Haiku 4.5
                                         ↓
                               stdout + filesystem diff
                                         ↓
                               断言（ExactMatch / MinimumValue / FileContents）
```

**防作弊 4 层随机化**：
1. 操作数随机（1-10）
2. 运算符随机（+, ×）
3. 文件名随机（3-4 选 1）
4. prompt 措辞随机（3-4 种变体）

**guard rail prompt**：`"Respond with only a number."` 确保输出可解析

### Stage 4（Agent Loop）测试设计 ★

这是最精妙的测试。创建 3 个文件，要求 Agent 完成 3 步推理：

```
Step 1: Agent 读 README.md → "config is in app/substance.py"
Step 2: Agent 读 app/substance.py → "chemical_expiry_period = 17"
Step 3: Agent 输出 "17"
```

验证的是**多步推理链**，不是单次工具调用。需要完整的 while(True) 循环才能通过。

### BYOCC 可借鉴

| 借鉴点 | 来源 | 如何应用到 BYOCC |
|--------|------|----------------|
| 多步推理测试 | Stage 4 | Lab 3 的 TUI 验证场景 |
| 随机化防作弊 | 全局 | 未来 Mock LLM 测试 |
| guard rail prompt | 全局 | 引导 LLM 输出可验证的结果 |
| 6 stage 渐进 | 全局 | 我们的 6 Lab 设计已有更优方案 |

### BYOCC 与 CodeCrafters 的差异

| 维度 | CodeCrafters | BYOCC |
|------|-------------|-------|
| 基线 | 从零写 ~120 行 | 挖空真实 Claude Code |
| 语言 | 10 种语言 | TypeScript only |
| LLM | 真实 Claude Haiku | 真实 DeepSeek |
| 测试 | 黑盒 stdout 断言 | 编译验证 + TUI 体验 |
| 学习者产出 | 独立小程序 | 驱动真实 TUI |
| WOW 因子 | 中等 | 高（"我的代码驱动了 Claude Code"）|

---

## 二、shareAI-lab "Learn Claude Code" ★★★

### 仓库信息

- **URL**: `shareAI-lab/learn-claude-code`
- **Stars**: 51.2k（最大竞品）
- **学习者产出**: 读完整实现，非填空
- **语言**: Python

### 架构亮点

**12 Session + 1 Capstone，分 4 阶段**：

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
| TEAMS | s09-s12 | Multi-Agent | 9→16 | — |
| Capstone | s_full | 全部合并 | 16 | — |

### 关键教学设计模式

#### 1. Motto 系统 ★

每个 session 一句话核心洞察，极大增强记忆：
- s01: "One loop & Bash is all you need" — 先让 Agent 转起来
- s02: "Adding a tool = adding one handler" — 工具就是处理器
- s03: "An agent without a plan drifts" — 没有规划的 Agent 会漂移

**BYOCC 应用**：每个 Lab 一个 Motto，嵌入文档面板和 skeleton 注释中。

#### 2. 反 CodeCrafters 顺序 ★

shareAI-lab s01 就教 Agent Loop（while(True)），不先教 API 调用！

**理由**：
- 先让 Agent 转起来，再加能力，比先学每个组件再组装更有动力
- "One loop & Bash is all you need" — 只需要一个工具 + 一个循环

**BYOCC 的选择**：我们保持 Lab 1→2→3 的顺序（API→工具→循环），因为：
1. 我们的基线是真实 Claude Code，不能从 s01 的极简 Agent 开始
2. 渐进式能力解锁（API→工具→循环）更符合"修好 Agent"的叙事
3. 但我们可以在 Lab 1 的 skeleton 注释中提前暗示循环的存在

#### 3. ASCII 架构图

代码注释中有完整的 ASCII 流程图：

```
┌─────────────┐
│  User Input  │
└──────┬──────┘
       │
       v
┌─────────────┐
│  Call LLM   │
└──────┬──────┘
       │
       v
┌──────────────┐    no tool_use
│ Check Response├───────────────► Return
└──────┬───────┘
       │ tool_use
       v
┌─────────────┐
│ Execute Tool │
└──────┬──────┘
       │
       └──────► loop back to Call LLM
```

**BYOCC 应用**：在每个 Lab 的 skeleton 文件顶部放置 ASCII 架构图，标注"你在这里"。

#### 4. 渐进式工具数

从 1 个工具（bash）到 16 个工具，复杂度增长可视化。

**BYOCC 应用**：
- Lab 1: 0 个工具（纯聊天）
- Lab 2: tools 已注册（但只执行一轮）
- Lab 3: 完整工具集 + 循环

#### 5. Nag Reminder 模式

当模型忘记更新 todo 时注入提醒，教学习者如何通过系统 prompt 影响模型行为。

**BYOCC 应用**：Lab 4（规划+子 Agent）可以引入这个概念。

#### 6. 三层压缩（s06）

| 层 | 名称 | 触发条件 | 说明 |
|----|------|---------|------|
| 1 | micro_compact | 每轮 | 自动删除过期消息 |
| 2 | auto_compact | 超限 | 整段压缩历史 |
| 3 | manual compact | 用户触发 | 手动压缩 |

**BYOCC 应用**：Lab 5 的核心教学内容。

### BYOCC 可借鉴

| 借鉴点 | 来源 | 应用 |
|--------|------|------|
| Motto 系统 | 全部 | 每个 Lab 一个 Motto |
| ASCII 架构图 | 全部 | skeleton 代码顶部注释 |
| 反 CodeCrafters 顺序 | s01 | 我们保持原序但在注释中暗示 |
| 渐进式工具数 | 全部 | Lab 1(0) → Lab 2(all) → Lab 3(all+loop) |
| 独立脚本 | 全部 | 每个 Lab 的 variant 文件自包含 |
| Nag reminder | s03 | Lab 4 参考 |

---

## 三、claude-code-best/claude-code (CCB)

### 仓库信息

- **URL**: `claude-code-best/claude-code`
- **性质**: Claude Code 反编译/逆向工程版本
- **规模**: 2,864 文件, 537,805 行
- **运行时**: Bun

### 架构亮点

#### 1. Feature Flag 机制

```typescript
// 通过环境变量控制功能开关
FEATURE_<FLAG_NAME>=1  // 启用某功能
```

类似于我们的 variant file 机制（`-labN` 后缀），但更轻量。

**BYOCC 应用**：理解了 feature flag 机制后，我们的 variant file 机制是更教学友好的版本。

#### 2. `learn/` 目录 — 源码学习笔记

CCB 的 `learn/` 目录有高质量的文档：
- `phase-1-startup-flow.md` — 启动流程分析
- `phase-2-conversation-loop.md` — 对话循环分析（标注了 query.ts 每段的行号）

**BYOCC 应用**：开发 Lab skeleton 时参考 CCB 的 learn/ 文档，理解 query.ts 的分段结构。

#### 3. `/teach-me` skill — 苏格拉底式教学

- 结构化选项（不给开放式文本输入）
- 掌握度门控（通过测试才能进入下一阶段）
- 逐步揭示答案

**BYOCC 应用**：Hints 系统可以借鉴这个模式——3 级提示，逐步揭示。

### CCB 与 claude-code-diy 的关系

| 维度 | CCB | claude-code-diy |
|------|-----|-----------------|
| 运行时 | Bun | Node.js |
| 构建系统 | Bun.build | esbuild (build.mjs) |
| 规模 | 537K 行 | 416K 行 |
| 多了什么 | Computer Use, Voice, Dream | — |
| learn/ 目录 | 有（高质量） | 无 |

**结论**：不切换基线（运行时不同，成本高），但参考 learn/ 文档。

---

## 四、跨项目对比

### 教学顺序对比

| 项目 | 教学顺序 | 理念 |
|------|---------|------|
| CodeCrafters | API → 工具声明 → 工具执行 → Agent Loop → 更多工具 | 自底向上构建 |
| shareAI-lab | Agent Loop → 工具 → 规划 → 子Agent → 压缩 | **先转起来再加能力** |
| BYOCC (我们) | 环境体验 → API → 工具 → Agent Loop → 规划 → 压缩 | **修好 Agent，逐步解锁** |

**BYOCC 的独特叙事**：
- CodeCrafters: "从零构建"
- shareAI-lab: "先跑起来再加零件"
- BYOCC: "**它是坏的，你来修好它**" — 每个 Lab 修好一个能力

### 核心差异化矩阵

| 维度 | CodeCrafters | shareAI-lab | **BYOCC** |
|------|-------------|-------------|-----------|
| 基线 | 从零写 | 读完整实现 | **挖空真实源码** |
| 学习者做什么 | 写代码 | 读代码 | **填空 + 编译** |
| 最终产出 | ~120 行 Agent | 无 | **驱动真实 Claude Code TUI** |
| 反馈 | stdout 断言 | 无自动反馈 | **TUI 实时观察 Agent 行为** |
| WOW 因子 | 中 | 低 | **高 — "我修好了 Claude Code"** |
| 目标用户 | 初学者 | 中级 | **有 TS 基础的学习者** |

### BYOCC 的核心竞争优势

**"真实源码 + TUI 即时反馈 + 挖空模式" 组合在市场中无同类产品。**

具体来说：
1. **真实感**：不是玩具 Agent，是 416K 行真实系统
2. **渐进式能力解锁**：类比 YatSenOS 的 QEMU，TUI 不变但 Agent 逐步获得能力
3. **即时反馈**：编译成功后直接看 Agent 在 TUI 中的行为变化
4. **叙事驱动**："修好 Agent" 比 "从零构建" 更有成就感

---

## 五、BYOCC Lab 设计的参考借鉴总结

### 从 CodeCrafters 借鉴

1. **Stage 4 的多步推理测试场景** → Lab 3 的 TUI 验证场景设计
2. **guard rail prompt** → 引导 LLM 输出可观察的行为
3. **随机化思路** → 未来 Mock LLM 测试的防作弊设计

### 从 shareAI-lab 借鉴

1. **Motto 系统** → 每个 Lab 一句话核心洞察
2. **ASCII 架构图** → skeleton 代码注释中的流程图
3. **渐进式工具数** → Lab 1(0) → Lab 2(all) → Lab 3(all+loop)
4. **独立脚本模式** → 每个 variant 文件自包含

### 从 CCB 借鉴

1. **learn/ 文档结构** → query.ts 分段理解
2. **苏格拉底式教学** → Hints 3 级提示系统
