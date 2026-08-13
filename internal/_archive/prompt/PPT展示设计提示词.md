# BYOCC 小组展示 PPT 设计提示词

> 使用方式：将以下内容完整复制给已安装 huashu-design skill 的 AI agent（如 Claude Code / Cursor），让它生成 PPT。

---

请用 huashu-design skill 为我们制作一份课程小组展示 PPT。先推荐 3 个风格方向让我选，选定后再正式制作。

## 一、项目完整背景

### 项目名称
BYOCC — Build Your Own Claude Code

### 一句话描述
一个基于真实 Claude Code 源码的渐进式教学平台——学习者通过 6 个 Lab 从零实现 AI 编程助手的核心模块，最终将自己写的代码插入真实 Claude Code 系统运行。

### 团队信息
- 中山大学软件工程课程大作业
- 5 人团队，分工：架构设计 / 后端 / 前端 / Lab 内容 / 基础设施
- 项目周期约 12 周

### 项目起源
团队 leader（cookiesheep）从 Claude Code npm 包的 source map 中恢复了 416,500 行 TypeScript 源码（1,888 个文件），在 Node.js 上修复了所有运行问题使其完整运行。基于这个深入理解，设计了本项目——让更多人能理解 AI Agent 的内部工作原理。

### 核心教学理念

**Agent Harness 概念**：Coding Agent = 模型（60%）+ Harness（40%）。模型提供智能，Harness 是让智能变成行动的一切——消息协议、工具系统、Agent Loop、上下文管理。Claude Code 的 416,500 行代码中，核心 Harness 只有约 12,000 行（3%）。其中最关键的 Agent Loop（query.ts）剥掉生产级复杂度后，核心逻辑约 100 行。

**教学方法**：不删不封装，挖空关键文件。学习者拿到完整可运行的 Claude Code，关键文件被替换为带 TODO 的骨架。补全 → 构建 → TUI 跑起来。类似中山大学的 YatSenOS 操作系统实验课：QEMU 虚拟机是固定的壳，内核能力逐步增长。

### 六个 Lab 的渐进式设计

| Lab | 主题 | 学习者实现什么 | TUI 中看到的反馈 |
|-----|------|--------------|----------------|
| 0 | 环境搭建与体验 | 安装运行完整 Claude Code | 看到完整 TUI——"这是你最终要驱动的东西" |
| 1 | API 调用 | 调 LLM 返回文字，不用工具 | Agent 能回复文字，但说"我来帮你创建文件"后什么也不做 |
| 2 | 工具系统 | 工具注册 + 单轮执行 | Agent 用了一次工具就停了 |
| 3（核心）| Agent Loop | while(true) 循环 | Agent 自主多轮调用工具——chatbot 变成了 agent |
| 4 | 规划与子 Agent | TodoWrite + Subagent | Agent 先列计划再按步骤执行 |
| 5 | 上下文压缩 | 三层压缩策略 | Agent 长对话不崩溃，自动压缩 |

### 技术架构
- 基线代码：claude-code-diy（416,500 行真实 Claude Code 源码，已可运行）
- 教学平台：Next.js 前端 + Docker 容器 + ttyd Web Terminal
- 学习者在浏览器中写代码（Monaco Editor），通过 Web Terminal 看到真实 Claude Code TUI 运行
- 测试：Vitest + Mock LLM（确定性，离线可跑）
- 部署：Docker 自建服务器 + Cloudflare Tunnel

### 项目核心文件（技术深度）
- `src/query.ts`（1,729 行）——Agent Loop 本体，while(true) 循环
- `src/QueryEngine.ts`（1,295 行）——session 管理
- `src/Tool.ts`（792 行）——工具执行上下文
- `src/services/tools/toolOrchestration.ts`（~400 行）——工具路由
- `src/utils/messages.ts`（~800 行）——消息构造

### 已完成的验证
- PoC 已通过：query-lab.ts 替换方案可行
- 416K 行依赖链加载无 import 错误
- TUI 交互模式正常启动
- 自建平台已部署上线（登录页 + Landing Page + Docker 容器管理）

## 二、PPT 结构要求

展示时间 **10 分钟**，需要覆盖以下四个方面：

### 第 1 部分：项目背景（约 2 分钟）
- AI 编程助手（Cursor、Claude Code、Windsurf）正在改变开发方式
- 但大多数人只把它们当黑盒用，不理解内部原理
- 市面上缺少"理解 AI Agent 内部工作原理"的实践性教学项目
- 已有项目的问题：learn-claude-code 只有阅读没有动手，其他教程都是玩具级 demo
- 我们的核心洞察：Claude Code 416,500 行代码中，核心 Harness 只有约 12,000 行，最关键的 Agent Loop 约 100 行——这可以被教学化

### 第 2 部分：项目目标（约 2 分钟）
- 核心目标：让学习者通过动手实现来理解 AI Agent 的内部架构
- 学习者最终得到一个由自己代码驱动的真实 Claude Code TUI（不是玩具 demo）
- 渐进式能力增长：6 个 Lab，从"能说话"到"自主规划"
- 即时反馈设计：测试通过 → 动画模拟 → 真实 TUI 运行，三层递进
- 开源社区价值：让更多人能学习 Agent Harness 工程

### 第 3 部分：项目需求分析（约 3 分钟）
- 目标用户分析：对 AI Agent 感兴趣的开发者、CS 学生
- 功能需求：Web 编辑器 + Web Terminal + 自动构建 + 测试反馈 + Lab 文档
- 非功能需求：容器隔离、资源限制、离线可测试
- 用户故事示例：学生打开 Lab 3 页面 → 看到带 TODO 的代码骨架 → 补全 while(true) 循环 → 点击提交 → 看到 Agent 在终端中自主多轮调用工具
- 竞品对比分析：
  - learn-claude-code：12 课渐进式，但没有动手，最终没有作品
  - pwn.college：Docker 容器隔离，但需要 40 核服务器
  - WebContainers：浏览器内运行，但 416K 行代码太重
  - 我们的方案：Docker + ttyd + Cloudflare Tunnel，自建轻量级平台

### 第 4 部分：项目技术路线（约 3 分钟）
- 整体架构图：前端（Next.js）→ 后端 API → Docker 容器 → ttyd Terminal
- 核心技术选型理由：
  - claude-code-diy 作为基线：真实源码，不是模拟
  - Docker 容器隔离：每个用户独立环境，安全可控
  - ttyd + WebSocket：浏览器内直接看到真实 TUI
  - Cloudflare Tunnel：无需公网 IP，自建服务器即可
- 构建系统改造：build.mjs 的 --lab 参数，注入学习者的 query 实现
- Agent Loop 的渐进式实现：query-lab-01.ts 到 query-lab-05.ts 逐层递进
- 当前进展：PoC 验证通过，Landing Page 上线，Docker 容器管理可用

## 三、视觉风格要求

### 品牌配色
- 自己使用skilll来抓取

### 设计气质
- 整体是**暗色系开发者工具**的美学，类似 IDE / 终端界面
- 但带有**温暖的学院气质**（金色而非蓝色的强调色）
- 要传达的感觉：专业但不冰冷、技术但不枯燥、有深度但可接近
- 参考气质：

### 排版偏好
- 标题使用无衬线粗体，紧凑字间距
- 正文可读性优先
- 代码片段使用 JetBrains Mono 或等宽字体，带语法高亮
- 数据使用表格或图表呈现，不要大段纯文字

### 具体视觉元素建议
- 架构图用暗色背景 + 金色/青色连线，节点用圆角矩形
- Lab 渐进表用类似"技能树"或"进度条"的可视化
- 代码片段展示要带暗色背景 + 语法高亮，像真实 IDE
- 竞品对比用表格，突出我们的差异化

## 四、输出要求

1. **先推荐 3 个不同的设计风格方向**，每个方向用 2-3 句话描述视觉气质和代表作品，等我选定后再正式制作
2. PPT 页数建议 12-16 页（10 分钟展示，每页约 40-60 秒）
3. 需要**同时输出 HTML deck（浏览器演讲用）和可编辑 PPTX 文件**
4. 第一页是封面，最后一页是 Q&A / Thank You
5. 每页标题要简洁有力，不要用"项目背景"这种干巴巴的标题，比如可以用"为什么我们需要理解 AI Agent？"代替
