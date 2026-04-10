# BYOCC Lab 设计质量深度调研报告

> 调研日期：2026-04-10
> 调研方法：GitHub 搜索 + 网络搜索 + CDP 浏览器调研 + 项目文档分析
> 调研范围：现有 Claude Code 教学资源、AI Agent 课程市场、BYOX 教育模式、目标用户分析

---

## 一、现有 Claude Code 教学资源调研

### 1.1 直接竞品（教如何构建 Agent Harness）

| 资源名 | Stars | URL | 教什么 | 视角 | Agent Harness/Loop | License |
|--------|-------|-----|--------|------|-------------------|---------|
| **shareAI-lab/learn-claude-code** | **51.2k** | https://github.com/shareAI-lab/learn-claude-code | "Bash is all you need"——从零构建 nano agent harness，19章(s01-s19)4阶段，Python实现，含Web教学平台，中/英/日三语 | 开发者 | **深度涉及**——每章覆盖一个模块（Agent Loop、Tool Use、Planning、Subagent、Context Compact、Permission、Hook、Memory、System Prompt、Error Recovery、Tasks、Teams、Worktree、MCP） | 未标注 |
| **Windy3f3f3f3f/claude-code-from-scratch** | **844** | https://github.com/Windy3f3f3f3f/claude-code-from-scratch | 用~4000行TS/Python从零复现Claude Code核心架构，11章分步教程 | 开发者 | 涉及——从零复现核心架构 | 未标注 |
| **codecrafters-io/build-your-own-claude-code** | 17 | https://github.com/codecrafters-io/build-your-own-claude-code | CodeCrafters平台的编程挑战定义文件 | 开发者 | 视挑战定义而定 | 未标注 |
| **Owen718/coding-agent-vibe-tutorial** | 12 | https://github.com/Owen718/coding-agent-vibe-tutorial | 用AI辅助逐步构建类Claude Code agent | 开发者 | 涉及 | 未标注 |

#### 最大竞品分析：shareAI-lab/learn-claude-code

这是目前市场上与 BYOCC 定位最接近的项目，需要深入理解其差异：

| 维度 | shareAI-lab/learn-claude-code | BYOCC |
|------|------|------|
| **Stars** | 51.2k | 3 |
| **语言** | Python | TypeScript |
| **基础** | 从零独立实现 | 基于真实 claude-code-diy |
| **教学方法** | 独立章节 + 可运行 Python 脚本 | 挖空真实源码 + TUI 反馈 |
| **章节数** | 19章（s01→s19） | 6-7 Lab |
| **四阶段** | s01-s06（核心）→ s07-s11（安全/扩展）→ s12-s14（任务系统）→ s15-s19（团队/MCP） | Lab 0→3（核心）→ Lab 4-6（高级） |
| **是否基于真实源码** | 否 | 是（claude-code-diy） |
| **Web 教学平台** | 有（Next.js，含timeline/layers/compare可视化） | 规划中（Monaco Editor） |
| **教学特点** | "explain a concept before using it" / 每阶段后停下来重建最小版本 | "挖空真实文件" / 渐进式能力增长 / TUI反馈 |
| **目标受众** | 知道基本Python的任何人 | 大二CS学生 |
| **三语支持** | 中/英/日 | 中文为主 |

**BYOCC 的差异化空间**：
- "真实源码注入"模式——学习者在真正的 Claude Code 代码库中工作
- TUI 即时反馈——完成后直接看到真实 Claude Code TUI 由自己代码驱动
- 渐进式能力增长——类似 YatSenOS 的 QEMU 模式
- shareAI-lab 用的是"从零构建"，BYOCC 用的是"填空真实系统"

### 1.2 源码分析类资源（互补而非竞争）

| 资源名 | Stars | URL | 教什么 | 与 BYOCC 关系 | License |
|--------|-------|-----|--------|-------------|---------|
| **dadiaomengmeimei/claude-code-sourcemap-learning-notebook** | 165 | https://github.com/dadiaomengmeimei/claude-code-sourcemap-learning-notebook | 逆向工程分析 512K+ 行 TS，8章课程(~5.5h)，提取 11 个可迁移设计模式。姊妹项目 nano-claude-code(1,646行) | **可复用**——其设计模式分析可直接用于 Lab 文档的知识讲解 | MIT |
| **674019130/learn-real-claude-code** | 134 | https://github.com/674019130/learn-real-claude-code | "Source Archaeology"，15+3章，含 Web 交互平台（架构图、数据流、源码浏览器） | **可参考**——Web 平台交互设计（架构图/数据流/源码浏览器） | MIT |
| **ghboke/claude-code-reverse** | 226 | https://github.com/ghboke/claude-code-reverse | v2.1.88 完整源码分析报告，12节，含架构图+数据流图+"如何构建第三方客户端" | 可引用其架构分析结论 | 未标注 |
| **Liyurun/Claude-Code-Source** | 6 | https://github.com/Liyurun/Claude-Code-Source | Claude Code 源码分析解读 | 互补 | 未标注 |
| **9p6p/claude-code-tutorial** | 7 | https://github.com/9p6p/claude-code-tutorial | 源码详解教程 | 互补 | 未标注 |
| **NozomiX1/claude-code-wiki** | 2 | https://github.com/NozomiX1/claude-code-wiki | 基于源码分析的深度 wiki | 互补 | 未标注 |

### 1.3 用户使用指南类资源（不涉及内部原理）

| 资源名 | Stars | URL | 教什么 | License |
|--------|-------|-----|--------|---------|
| **shanraisshan/claude-code-best-practice** | **35k** | https://github.com/shanraisshan/claude-code-best-practice | Claude Code 使用最佳实践，69条Tips，10个开发工作流框架对比 | 未标注 |
| **carlvellotti/claude-code-everyone-course** | 476 | https://github.com/carlvellotti/claude-code-everyone-course | "Claude Code for Everyone" MDX课程 | 未标注 |
| **hiliyongke/claude-code-tutorial** | 43 | https://github.com/hiliyongke/claude-code-tutorial | 中文CLI教程，配置/Hooks/Skills/MCP/企业实践 | 未标注 |

### 1.4 课程笔记/衍生

| 资源名 | Stars | URL | 教什么 |
|--------|-------|-----|--------|
| **MarkShawn2020/DeepLearning.ai-Courses-ClaudeCode** | 76 | https://github.com/MarkShawn2020/DeepLearning.ai-Courses-ClaudeCode | DeepLearning.AI "Claude Code: A Highly Agentic Coding Assistant" 课程笔记 |
| **delbaoliveira/learn-claude-code** | 171 | https://github.com/delbaoliveira/learn-claude-code | JS 项目 |

### 1.5 其他语言实现

| 资源名 | Stars | URL | 说明 |
|--------|-------|-----|------|
| **Chris-debug-0225/learn-claude-code-java** | 73 | https://github.com/Chris-debug-0225/learn-claude-code-java | Java 版，12节 |
| **i5ting/learn-claude-code-js** | 90 | https://github.com/i5ting/learn-claude-code-js | learn-claude-code 的 JS 版 |

---

## 二、AI Agent 教学课程调研

### 2.1 DeepLearning.AI 课程

| 课程名 | 合作方 | 核心内容 | 涉及 Harness 原理？ |
|--------|--------|---------|-------------------|
| **Agentic AI**（Andrew Ng 主讲） | DeepLearning.AI | Reflection、Tool Use、Planning、Multi-agent、Evals、Deep Research Agent。用 raw Python，不依赖框架 | 侧重 design patterns 而非 Harness 工程实现 |
| **Building Coding Agents with Tool Execution** | E2B | 在沙盒云环境构建 coding agent，feedback loops，代码执行/文件管理/错误处理 | 直接涉及 coding agent feedback loop |
| **Agent Skills with Anthropic** | Anthropic | 为 Agent 配备专家级按需知识，实现可靠的 coding/research/data analysis | 侧重 skills 使用 |
| **Building and Evaluating Data Agents** | Snowflake | 多 agent 系统：规划步骤、连接数据源、提供洞察 | 框架层面 |
| **Nvidia's NeMo Agent Toolkit** | Nvidia | Agent 的 observability、evaluation、deployment | 生产部署层面 |

### 2.2 Anthropic 官方课程（Anthropic Academy / Skilljar）

13门免费课程，全部用户视角：
- Claude 101、Claude Code 101、Claude Code in Action
- Building with the Claude API
- Introduction to MCP（从零构建 MCP server/client）
- MCP: Advanced Topics
- Introduction to Agent Skills
- Introduction to Subagents
- AI Fluency: Framework & Foundations

**关键结论：Anthropic 官方没有"教你怎么构建 Agent Harness"的课程。BYOCC 填补了这个空白。**

### 2.3 Microsoft AI Agents for Beginners

- **Stars**: 56.3k | **Fork**: 19.5k
- **URL**: https://github.com/microsoft/ai-agents-for-beginners
- **内容**: 15 节课，50+ 语言支持，Jupyter notebook
- **覆盖**: Tool Use、Agentic RAG、Planning、Multi-Agent、Context Engineering、Agent Memory 等
- **特点**: 入门友好，框架层面

### 2.4 Sebastian Raschka — "Components of A Coding Agent"（2026-04-04）

- **URL**: https://magazine.sebastianraschka.com/p/components-of-a-coding-agent
- **作者**: "Build a Large Language Model From Scratch" 作者
- **核心观点**:
  - 明确定义了 LLM vs Reasoning Model vs Agent vs Agent Harness vs Coding Harness 的层次关系
  - Agent = 控制循环，围绕 model 的 loop
  - Agent Harness = 管理 context、tool use、prompts、state、control flow 的软件脚手架
  - Coding Harness = Agent Harness 的特例
  - **"harness 可以成为让一个 LLM 比另一个 LLM 工作得更好的区分因素"**——直接验证了 BYOCC 的核心理念
  - 三个层次：model family + agent loop + runtime supports
  - 配套项目：https://github.com/rasbt/mini-coding-agent
- **BYOCC 可复用点**: 这篇文章可以直接作为 Lab 0 的阅读材料；其概念定义可以作为 Lab 文档的理论基础

---

## 三、"Build Your Own X" 教育模式分析

### 3.1 build-your-own-x 概况

- **Stars**: 488k（GitHub 最高 Star 仓库之一）
- **URL**: https://github.com/codecrafters-io/build-your-own-x
- **Contributors**: 140+
- **核心理念**: Richard Feynman — "What I cannot create, I do not understand"

### 3.2 成功要素

1. **概念驱动而非技术驱动**: 用户选"我想构建什么"而非"我想学什么语言"
2. **社区驱动内容策展**: 140+ 贡献者持续补充优质教程
3. **极低参与门槛**: 只需要一个链接
4. **覆盖面广**: 25+ 类技术（3D Renderer、Database、OS、Web Browser、Programming Language 等）
5. **持续活跃**: 每周仍有 500+ 新 star

### 3.3 与 BYOCC 相关的类别

| 类别 | 教程数 | 与 BYOCC 的关系 |
|------|--------|---------------|
| Build your own Command-Line Tool | 7 | 近似——Claude Code 本质是 CLI tool |
| Build your own Text Editor | 6 | 近似——同样是"壳+引擎"的教学模式 |
| Build your own Shell | 6 | 近似——同样是 loop + command dispatch |
| Build your own AI Model | 3 | 上位类别——AI Agent 尚未建立 |
| **Build your own AI Agent** | **0** | **空白！BYOCC 可以填补** |

**重要发现**: build-your-own-x 的 AI Agent 类别尚未建立。如果 BYOCC 成熟后提交，可以获得巨大曝光。

### 3.4 BYOCC 是否具备 build-your-own-x 的成功要素

| 成功要素 | BYOCC 具备程度 | 说明 |
|---------|-------------|------|
| 清晰的概念驱动 | ★★★★ | "构建自己的 Claude Code" 足够吸引人 |
| 社区驱动策展 | ★☆☆☆ | 目前单团队，需要开放贡献机制 |
| 低门槛 | ★★★☆ | 需要 Node.js 环境，但有 Web 平台降低门槛 |
| 覆盖面 | ★★☆☆ | 只覆盖 coding agent 一个方向 |
| Feynman 哲学共鸣 | ★★★★★ | "理解 Agent = 写出 Agent Loop" 完美契合 |

---

## 四、Lab 设计有效性评估

### 4.1 认知负荷检查

| Lab | 新增核心概念数 | 评估 | 骨架代码预估完成时间 |
|-----|--------------|------|-------------------|
| Lab 0 | 0（纯安装） | 合理 | 0（无代码） |
| Lab 1 | 2（消息协议 + LLM 调用） | 合理 | ~20 分钟 |
| Lab 2 | 2（工具注册 + 工具执行） | 合理 | ~30-40 分钟 |
| **Lab 3** | **3（while(true) + AsyncGenerator + tool result 反馈）** | **偏高** | **60-90 分钟** |
| Lab 4 | 2（TodoWrite + 规划） | 合理 | ~30 分钟 |
| Lab 5 | 2（子 Agent + 独立消息） | 合理 | ~40 分钟 |
| Lab 6 | 2（token 计算 + 三层压缩） | 合理 | ~40 分钟 |

**核心问题**: Lab 3 同时引入 while(true)、AsyncGenerator（yield/yield*）和 tool result 反馈循环三个概念。对大二学生而言，AsyncGenerator 本身就是一个较大的认知跳跃（多数 CS 大二课程不涉及 generator）。

### 4.2 反馈机制检查

#### Lab 1 "Agent 能回复但不能做事"

**问题**: 区分度不够。第一次看到 Claude Code TUI 的学生很可能分不清"能回复文字"和"完整功能"之间的差异。Claude Code 的文字回复本身就很有说服力。

**改进建议**: Lab 1 应设计一个**必然触发工具调用意图**的测试场景（如"请读取当前目录的文件"），让学生看到 Agent 明确地"想做事但做不了"——比如 TUI 显示一个灰色的"tool use blocked"指示器，或者 Agent 返回 "I want to use the Read tool but I don't have tools yet" 的消息。

#### Lab 2 "用一次工具就停"

**问题**: 学生可能意识不到这是"做了一次就停"而不是"任务做完了"。

**改进建议**: 需要一个对比设计——用同样的 prompt 在 Lab 2 和 Lab 3 中运行，让学生看到 Lab 2 中 Agent 只做了一步就停下，而 Lab 3 中 Agent 自主多轮探索直到完成。

#### Lab 3 "Agent 自主多轮调用工具"

**这是 Aha Moment**。设计得当的话，这会是最强的反馈。Agent 自己决定读文件、改文件、跑测试、看结果、再改——这种自主性是震撼的。

**但风险**: Mock LLM 设计不好会导致学生看到无意义的重复调用，而不是"智能的自主行为"。

#### build 失败时的错误信息

TypeScript 编译错误是最常见的失败模式。对大二学生，`Type 'string' is not assignable to type 'Message[]'` 这类错误不友好。

**建议**: 提供错误解码器或 `/hint` 命令，将常见 TS 错误映射到 Lab 相关的解释。

### 4.3 代码-理解桥梁检查

#### "填空通关"风险

**确实存在**。如果 TODO 只是"在空白处填入 `deps.callModel()`"，学生会机械完成而不理解为什么。

**缓解措施建议**:
1. 每个 TODO 前应有"为什么"的解释（不只是"做什么"）
2. Lab 文档中应有"预测输出"环节——运行前让学生预测 Agent 会做什么
3. 测试用例应包含一些**故意让它失败**的场景，学生必须理解原理才能通过

#### AsyncGenerator 对大二学生的难度

**偏高**。大多数中国大学 CS 大二课程（数据结构、操作系统）不涉及 JavaScript generator。

**建议**:
- Lab 3 前增加一个"TypeScript AsyncGenerator 速成"小节（5-10 分钟阅读 + 3 个小练习）
- 或者 Lab 3 骨架代码中预写 AsyncGenerator 框架，学生只填循环体内容

#### solution/ 目录的抄袭风险

**中等**。有动力的学生会抄。

**缓解**: solution/ 不直接放在学生容器中，而是通过"请求提示"机制逐步释放（提示1→提示2→部分代码→完整 solution）。

### 4.4 渐进性检查

#### Lab 1→2→3 的能力增长

- 概念上基本线性：消息→工具→循环
- **但代码量跳变明显**: Lab 1 (~20行) → Lab 2 (~40行) → Lab 3 (~100行核心逻辑)
- Lab 3 的代码量跳跃是最大的掉线风险

#### Lab 3 是否是"掉线点"

**是**。这是整个项目的核心难点。如果 Lab 3 骨架设计不好，60%+ 的学生可能在这里卡住。

**建议**: Lab 3 拆分为 3a（简单 while 循环，骨架提供 generator 框架）→ 3b（加入 yield 事件流）→ 3c（完整 agent loop + 停止条件），每步都有独立的 TUI 反馈。

#### Lab 4/5/6 的学习曲线

- Lab 4 (TodoWrite) 依赖 Lab 3 的 agentLoop——依赖注入设计好则合理
- Lab 5 (Subagent) 相对独立，概念较新但代码量可控
- Lab 6 (上下文压缩) 最抽象，但作为后续开源内容不紧急
- **曲线合理，前提是 Lab 3 不崩**

---

## 五、市场需求与用户获取评估

### 5.1 目标用户分析

#### 大二 CS 学生真正想要什么？（按驱动力排序）

1. **就业竞争力**（最强驱动力）: AI Agent 开发是 2025-2026 最热技能方向。中国企业级 AI Agent 市场规模已突破 230 亿元（来源：2025 AI 大模型开发生态白皮书）。B 站上"AI Agent 教程"视频播放量极高。
2. **简历加分**: 一个能展示"我理解 Claude Code 内部原理并能自己实现 Agent Loop"的项目，在面试中非常有区分度。
3. **好奇心**: 对 AI 感兴趣的学生会被"让 AI 自己写代码"的概念吸引。
4. **课程学分**: 作为软件工程课大作业。

#### 学生发现项目的渠道（按效率排序）

| 渠道 | 覆盖面 | 转化率 | 成本 | 优先级 |
|------|--------|--------|------|--------|
| **GitHub trending** | 全球开发者 | 高 | 零 | ★★★★★ |
| **知乎文章** | 中国 CS 学生+开发者 | 中高 | 低 | ★★★★ |
| **B 站视频** | 大量中国学生 | 中 | 中 | ★★★ |
| **微信公众号** | 开发者社区 | 中 | 低 | ★★★ |
| **大学课程推荐** | 精准用户 | 极高 | 高 | ★★ |
| **X/Twitter** | 英文开发者 | 中 | 低 | ★★★ |

**关键发现**: 中国大学生学习 AI Agent 的主要渠道是 B 站视频教程和知乎专栏。GitHub 对于有经验的学生是自然入口，但对大二学生来说，通过知乎/B 站引导到 GitHub 更常见。

### 5.2 与竞争对手的比较

#### vs shareAI-lab/learn-claude-code（51.2k stars）

| 维度 | learn-claude-code | BYOCC 优势 |
|------|-------------------|-----------|
| 真实感 | 自己写的 Python 小项目 | 真实 Claude Code TUI 由你的代码驱动 |
| 反馈 | print() 输出 | 完整终端 UI |
| 门槛 | 需要理解 Python | 只需填空 TypeScript |
| "Wow" 因素 | 中等 | 高——看到自己的代码驱动真实 Claude Code |

#### vs DeepLearning.AI 课程

| 维度 | DeepLearning.AI | BYOCC 优势 |
|------|----------------|-----------|
| 动手程度 | 看视频为主 | 从第一个 Lab 就在写代码 |
| 底层理解 | 框架使用 | 理解 Harness 内部机制 |
| 反馈 | 视频作业评分 | 即时 TUI 反馈 |
| 费用 | 部分免费 | 完全免费（MIT License） |

### 5.3 推广可行性

#### 大学课程采用条件

- 需要完整的教师手册、评分标准、答案 key、预计课时
- 需要离线可运行（不依赖 API key 的 Mock 模式）
- 需要明确的课程目标对齐
- **现实评估**: 作为课程实验采用的概率较低，但作为**课程大作业模板**或**课外学习资源**更可行

#### 最高效推广渠道

1. **知乎专栏**: "我逆向了 Claude Code 416,500 行源码，并设计了一个 6 步教学项目"——这种标题在知乎有高点击率
2. **GitHub README 精心设计**: 包含 demo GIF（TUI 演示）、架构图、Star 历史
3. **B 站 3 分钟 demo 视频**: 展示 Lab 3 完成时的 Aha Moment

#### GitHub README 必备内容

- 一句话描述 + demo GIF
- 架构图（Agent = 模型 + Harness）
- 6 个 Lab 的进度表 + 每个 Lab 完成后的 TUI 截图
- Quick Start（3 步内跑起来）
- 与竞品对比表
- 致谢 + License

---

## 六、综合评分与改进建议

### 6.1 评分表

| 维度 | 分数 | 核心问题 |
|------|------|---------|
| 教学设计合理性 | **7/10** | Lab 3 认知负荷偏高，6 Lab 结构基本合理但 Lab 3 需要拆分 |
| 反馈机制有效性 | **6/10** | Lab 1 区分度不足；Lab 3 的 Aha Moment 潜力大但依赖 Mock 质量；build 失败时错误信息不友好 |
| 代码-理解联系 | **7/10** | 依赖注入设计好，但"填空通关"风险存在；AsyncGenerator 对目标用户偏难 |
| 市场需求吻合度 | **8/10** | AI Agent 教育市场 2025-2026 爆发期，coding agent 方向精准；但竞争激烈 |
| 与现有资源差异化 | **8/10** | "真实源码 + TUI 反馈 + 挖空模式" 组合目前无同类，但需清晰传达 |

### 6.2 最关键的 3 个改进建议

1. **Lab 3 拆为三步**: 3a（写 while 循环，骨架提供 generator 框架）→ 3b（加入 tool result 反馈）→ 3c（完整 loop + 停止条件），每步独立可运行看反馈。这是防止 60% 学生在 Lab 3 掉线的最关键措施。

2. **重新设计 Lab 1 的反馈**: 用"Agent 想用工具但用不了"的明确指示代替"能回复但不能做事"的模糊区分——测试 prompt 必须触发 tool_use intent，让学生看到 Agent 的"想做但做不了"。

3. **增加"预测→验证"环节**: 每个 Lab 在运行前让学生预测 Agent 行为，运行后对比——这比单纯的 TODO 填空更能建立深层理解。

---

## 七、关于大二学生团队与 AI 协作设计 Lab 的合作模式建议

### 核心回答

**可以依靠 AI 一步一步做精细化设计。** 推荐的合作模式是"你定方向，AI 填细节"。

### 推荐流程

| 阶段 | 谁做 | 做什么 | 产出 |
|------|------|--------|------|
| A. 目标定义 | 你们 | 用自然语言描述 Lab 要教什么 | 3-5 句话 |
| B. 方案生成 | AI | 输出骨架代码、TODO 设计、测试用例、Mock fixture | 完整 Lab 包 |
| C. 审查调整 | 你们 | 在本地尝试，提出"太难/太简单/看不懂" | 反馈列表 |
| D. 迭代优化 | AI | 根据反馈修改，补充文档和 hint | 更新版 Lab |
| E. 验证 | AI | 跑测试、检查类型、验证 TUI 反馈 | 通过报告 |

### 为什么这个模式适合你们

1. **你们不需要先完全理解 Agent 原理**——AI 负责把原理转化为可教学的代码和文档，你们负责判断"这个难度对我们同学是否合适"
2. **你们的核心优势是"目标用户的直觉"**——你们就是大二学生，你们觉得难的，其他同学大概率也觉得难
3. **渐进式理解**——在设计 Lab 1 的过程中理解消息协议；设计 Lab 2 时理解工具系统；到 Lab 3 时对 Agent Loop 的理解已经足够

### 需要避免的坑

1. **不要试图一次性设计所有 Lab**——先完成 Lab 3 的完整循环，验证模式可行后再扩展
2. **不要跳过"自己先做一遍"**——每个 Lab 团队应该先自己尝试完成 TODO，记录卡住的地方，这些卡点就是需要加 hint 的地方
3. **不要让 AI 写 solution/ 然后你们看不懂**——solution 必须在你们的理解范围内，否则无法应对答辩提问

### 预计效率

一个会话内就能完成一个 Lab 的精细化设计。6 个 Lab × 1-2 会话 = 整个教学内容的精细设计可以在 2-3 周内完成。
