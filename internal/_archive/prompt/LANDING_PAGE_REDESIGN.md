# BYOCC 官网首页重设计方案 v2

> 创建：2026-04-18 | 版本：v2.0（综合外部评审反馈修订）
> 目标：将首页从"Hero 惊艳 + 下方平庸"提升为全页一致的高水准体验
> 核心原则：**内容先行，动效赋能**——没有好内容的动效是浪费

---

## 一、现状诊断（不变）

### 1.1 结构

当前 5 个 section，阅读时间约 90 秒：

```
1. Hero           — 粒子动画 + 标题 + CTA       ★★★★★ (Awwwards 水平)
2. Selling Points — 3 张卡片                     ★★☆☆☆ (Bootstrap 水平)
3. Lab Preview    — 6 张卡片                     ★★☆☆☆ (Bootstrap 水平)
4. Architecture   — 4 个节点                     ★★☆☆☆ (Bootstrap 水平)
5. Footer         — 链接                         ★★☆☆☆ (Bootstrap 水平)
```

### 1.2 问题

1. **内容不足**：整页约 500 字，90 秒读完，没有足够的"钩子"留住用户
2. **特效断崖**：Hero 粒子动画惊艳，下方只有 fadeInUp + tilt + spotlight
3. **缺少代码展示**：编程教学平台不展示代码 = 餐厅不展示菜品
4. **缺少差异化表达**：用户不知道为什么要选 BYOCC
5. **缺少社会证明**：没有任何"别人在用"的信号
6. **缺少 FAQ**：潜在用户的疑问没有解答

### 1.3 已有的好东西（保留）

- 琥珀金配色体系 (#D4A574 dark / #C17F4E light)
- 粒子动画系统（Phase 状态机 + Canvas 2D + 图片采样）
- 明暗模式切换
- HeroParticles.tsx 的完整实现
- ScrollReactiveOrbs.tsx（光晕视差）
- ScrollProgress.tsx（进度条）
- TiltCard 组件（3D 倾斜 + 光泽）

---

## 二、v1→v2 关键修订

基于外部评审的客观分析：

| 修订项 | v1 方案 | v2 修订 | 理由 |
|--------|---------|---------|------|
| Section 数量 | 9 个 | **7 个** | 高转化页 5-7 section 是共识，9 个用户疲劳 |
| 代码雨背景 | Canvas 代码雨 | **静态代码纹理或无背景** | 动效工作流文档自标"过时"，且与 Platform 页撞车 |
| ScrambleText | 全部标题 | **仅 3 个关键标题** | 第 4 次后新鲜感变噪音，限 Hero/SkillTree/CodePreview |
| 对比表 | 3 列对比拉踩 | **icon+tagline 为主 + 轻量对比** | 开源项目不宜攻击性，但保留对比价值 |
| Code Preview | 左右分栏 | **点击揭示模式（单个编辑器）** | 交互性、教学隐喻、空间利用全面优于分栏 |
| 开发优先级 | 按编号顺序 | **先做 Code Preview（最高差异化+最高风险）** | 核心卖点先验证 |
| 对比+社区 | 分开 2 个 section | **合并为 1 个** | 减少 section 数，逻辑连贯 |
| FAQ+Footer | 分开 2 个 section | **合并为 1 个** | FAQ 在 Footer 上方是常见模式 |

---

## 三、新页面结构（7 个 Section）

```
1. Hero                      ← 保留，增加粒子溶解过渡
2. 价值主张 (Selling Points)  ← 保留，增强卡片设计（不做代码雨）
3. 学习路径 (Skill Tree)      ← 新增！替代 Lab Preview ★ ScrambleText
4. 代码预览 (Code Demo)       ← 新增！核心差异化内容 ★ ScrambleText
5. 架构运行                   ← 保留，升级为终端动画
6. 差异化 + 社区              ← 合并！icon 展示 + 轻量对比 + GitHub stats
7. FAQ + Footer              ← 合并！FAQ 手风琴 + 完整 Footer
```

预计阅读时间：3-4 分钟，约 2000 字。

### ScrambleText 使用策略

只在以下 3 个位置使用文字解码效果：
1. **Hero 副标题**（第一印象）
2. **Skill Tree 标题**（"6 个 Lab，从 0 到 Agent"）
3. **Code Preview 标题**（"看到你将要写的代码"）

其余 section 标题使用简洁的 fadeInUp。

---

## 四、各 Section 详细设计

### Section 1: Hero（保留 + 增强）

**内容**：不变

**新增动效 — 粒子溶解过渡**：
- 当用户开始向下滚动 hero 区域时，"CLAUDE CODE" 粒子逐渐失去 cohesion
- 字符从左到右依次"溶解"——粒子向下滑落消失
- 溶解速度与滚动速度同步
- 实现：在 HeroParticles 的 animate loop 中读取 `window.scrollY`，scrollY > heroHeight × 0.3 时开始，每个粒子增加 dissolve 权重使其向下漂移 + 降低 alpha

**技术要点**：
- 修改 HeroParticles.tsx 的 animate 函数
- 新增 scrollY 读取逻辑
- 不需要新文件

---

### Section 2: 价值主张（保留 + 卡片增强）

**内容**：保留现有 3 张卡片（真实源码、挖空模式、即时反馈）

**视觉增强**（不使用代码雨）：
- 卡片本身做得更精致——加入悬浮代码片段 peek-through 效果
- 卡片 hover 时底部浮现一行真实的代码片段（极低透明度，像透出来的底纹）
  - 卡片 1：`// 416,500 lines of production TypeScript`
  - 卡片 2：`// TODO: implement agent loop`
  - 卡片 3：`> agent loop initialized ✓`
- 整体 section 背景干净，不添加额外动效层
- 如果觉得太空，可加一层极低透明度的 SVG 代码纹理壁纸（静态，不移动），像纸张的纤维

**技术**：
- 修改 LandingSections.tsx 的 SellingPointsSection
- 纯 CSS 实现，不需要新组件

---

### Section 3: 学习路径 Skill Tree（新增）★ ScrambleText

**位置**：替代当前 Lab Preview section

**内容设计**：

标题：`6 个 Lab，从零到 Agent`（使用 ScrambleText 文字解码效果）

纵向路径，每步一个节点：

```
Lab 0  ── 环境与体验 ──
  "安装完整 Claude Code，看到真实 TUI 跑起来"
  难度 ●○○○○
  │
Lab 1  ── 消息协议 ──
  "理解 LLM 对话的数据结构，让 Agent 能回复文字"
  难度 ●●○○○
  │
Lab 2  ── 工具系统 ──
  "实现 read_file / write_file / bash，Agent 会用一次工具"
  难度 ●●●○○
  │
Lab 3 ★ ── Agent Loop ──  ← 核心！金色高亮
  "while(true) 循环 — chatbot 变成 agent 的关键一步"
  难度 ●●●●○
  │
Lab 4  ── 规划能力 ──
  "TodoWrite 让 Agent 先想再做，会拆解任务"
  难度 ●●●●○
  │
Lab 5  ── 上下文压缩 ──
  "三层压缩策略，长对话不崩，掌握工程化思维"
  难度 ●●●●●
```

每个节点可点击跳转到 `/platform`。

**动效**：
- 滚动时路径从上到下逐段"亮起"，像电路通电
- 每个节点激活时显示能力描述文字（staggered fadeIn）
- 连接线是动态的，有微弱的"电流"脉冲流动
- 难度条从 0 动画到最终值，像液态灌入

**技术**：
- 在 LandingSections.tsx 中重写 `LabPreviewSection`
- IntersectionObserver 控制节点激活
- CSS animation 控制路径亮起和难度条填充

---

### Section 4: Agent Loop 体验（新增，最重要）★ ScrambleText

**位置**：Skill Tree 之后

**这是整个页面最核心的差异化内容。用户必须在这里产生 "Wow, I want to try this." 的冲动。**

**设计原则**：
- 展示**学习方式**，不展示具体 Lab 内容
- 展示**代码→Agent行为的变化**，不展示答案
- 零 Lab 耦合——Lab 怎么改都不影响首页
- 不泄露答案——学习者还没开始就看到答案会破坏体验

**设计方案：Agent Loop 体验**

一个编辑器窗口 + 终端面板的组合。用户点击代码中的空白步骤，看到概念性的代码填入，最终看到 Agent 真正运行起来。

**交互流程**：

```
初始状态（编辑器）：
┌──────────────────────────────────────────┐
│  agent.ts                                │
├──────────────────────────────────────────┤
│  async function runAgent(task) {         │
│                                          │
│  ┌── ▸ Step 1: 理解用户意图 ────────┐   │  ← 可点击
│  └──────────────────────────────────┘   │
│                                          │
│    while (running) {                     │
│  ┌── ▸ Step 2: 思考下一步 ──────────┐   │  ← 可点击
│  └──────────────────────────────────┘   │
│  ┌── ▸ Step 3: 执行动作 ────────────┐   │  ← 可点击
│  └──────────────────────────────────┘   │
│    }                                     │
│  }                                       │
│                                          │
│  💡 点击每个步骤，看 Agent 如何思考      │
└──────────────────────────────────────────┘

点击 Step 1 后：
│  async function runAgent(task) {         │
│                                          │
│  ✓ const goal = await analyze(task);    │  ← 概念性代码，不是真实 Lab 代码
│                                          │
│    while (running) {                     │
│  ┌── ▸ Step 2 ...                    ┐   │
│  └──────────────────────────────────┘   │
│  ┌── ▸ Step 3 ...                    ┐   │
│  └──────────────────────────────────┘   │
│    }                                     │
│  }                                       │

全部完成后，终端面板弹出：
┌──────────────────────────────────────────┐
│  $ ./agent                               │
│  > Agent initialized ✓                   │
│  > Analyzing task: "Fix the bug..."      │
│  > Reading source files...               │
│  > Tool call: read_file("src/main.ts")   │
│  > Bug identified at line 42             │
│  > Fixing...                             │
│  > Tool call: write_file(...)            │
│  > Task completed ✓                      │
│                                          │
│  几行代码，一个能思考、会行动的 Agent。  │
│                          [开始实验 →]     │
└──────────────────────────────────────────┘
```

**与旧方案的关键区别**：
1. **不绑定 Lab** — 通用 Agent Loop 示例，非任何 Lab 的代码
2. **不泄露答案** — 展示的是概念和形式，不是真实 Lab 内容
3. **展示行为** — 终端输出展示 Agent 实际行为，比纯代码更直观
4. **更简洁** — 去掉 Lab 标签页，一个编辑器专注一个体验

**代码骨架**：
```
async function runAgent(task) {
  // Step 1: 理解用户意图 → const goal = await analyze(task);
  while (running) {
    // Step 2: 思考下一步 → const plan = await model.think(context);
    // Step 3: 执行动作   → const result = await execute(plan);
  }
}
```

**终端输出**：
```
> Agent initialized ✓
> Analyzing task: "Fix the bug in main.ts"
> Reading source files...
> Tool call: read_file("src/main.ts")
> Bug identified at line 42
> Fixing...
> Tool call: write_file("src/main.ts", ...)
> Task completed ✓
```

**动效**：
- Step 块 hover 琥珀色脉冲
- 点击后代码行淡入 + ✓ 弹跳出现
- 全部完成后终端面板从下方滑入
- 终端行逐行出现（stagger 250ms）
- CTA 按钮脉冲发光

**技术**：
- 重写 `src/components/CodePreview.tsx`
- 无 Lab 数据，无标签页
- useState 管理 Step 状态
- 终端面板用 max-height + opacity 过渡

---

### Section 5: 架构运行（保留 + 升级）

**内容**：保留 4 个架构节点，但升级展示方式

**当前**：静态方块 + connector 小圆点

**升级为终端动画**：
每个架构节点变成一个微型终端窗口：
1. 初始状态：暗色矩形，光标闪烁
2. 激活时（滚动到视口）：绿色/琥珀色文字逐行打印
   - 学习者浏览器: `> xterm.js connected ✓`
   - Express 后端: `> server listening on :3000 ✓`
   - Docker 容器: `> container claude-code started ✓`
   - Claude Code TUI: `> agent loop initialized ✓`
3. 节点间 connector 变成数据包动画：一个小亮点从 A 飞到 B
4. 全部激活后，背景出现微弱的电路板纹路

**技术**：
- 修改 LandingSections.tsx 中的 ArchitectureSection
- 每个节点包含一个 typing animation
- Connector 的数据包用 CSS animation

---

### Section 6: 差异化 + 社区（合并）

**位置**：架构之后

**内容设计分为上下两部分**：

#### 上半部分：差异化 icon 展示

标题：`BYOCC 的不同之处`（使用 fadeInUp，不用 ScrambleText）

采用 icon + 标语的方式，自信展示，不拉踩：

```
🔍  416,500 行真实源码       — 不是示例片段，是生产级代码
✏️  挖空补全模式             — 不是复制粘贴，是你自己写出来
⚡  真实 TUI 即时运行         — 不是纸上谈兵，写完立即看到效果
🎯  核心代码只有 ~100 行      — 剥离生产级复杂度，只学最重要的
```

每个条目是独立的卡片/块，hover 时右侧浮现一句话解释。

#### 下半部分：轻量对比 + 社区

在 icon 展示下方，用一个简洁的两列轻量对比（不是攻击性的表格）：

```
┌─────────────────────────────────────────────┐
│  你可能已经试过的          BYOCC 给你的       │
│  ─────────────────       ─────────────────   │
│  读 API 文档             写进真实系统         │
│  跟视频敲代码             自己补全核心代码     │
│  跑测试看绿灯             看 Agent 活了        │
│  学会用一个工具           理解一类工具的原理   │
└─────────────────────────────────────────────┘
```

紧接着社区信息：

```
[GitHub Stars: ★XXX]  [MIT License]  [Contributors: XX]

这个项目基于 claude-code-diy — 416,500 行真实 Claude Code 源码，
在 MIT License 下完全开放。

[Star on GitHub →]  [查看 claude-code-diy →]  [阅读文档 →]
```

**动效**：
- icon 条目 staggered 入场（fadeInUp + 120ms stagger）
- 对比行 hover 时左侧变暗、右侧高亮（视觉聚焦 BYOCC 列）
- GitHub stats 数字 count-up 动画（0 → 实际值）
- 按钮 hover 光晕跟随

**技术**：
- 在 LandingSections.tsx 新增 DifferenceSection
- IntersectionObserver 触发入场
- CountUp 用 useEffect + requestAnimationFrame

---

### Section 7: FAQ + Footer（合并）

**位置**：页面底部

**内容设计**：

标题：`常见问题`（使用 fadeInUp，不用 ScrambleText）

6 个问答（手风琴格式）：

**Q1: "我需要什么基础？"**
A: 了解 JavaScript/TypeScript 基本语法即可。如果你能写一个 for 循环和一个 async function，你就能开始 Lab 0。

**Q2: "需要付费吗？"**
A: 完全开源免费，MIT License。Claude Code 是 Anthropic 的商标，本项目仅用于教学目的。

**Q3: "Lab 3 为什么是核心？"**
A: Agent Loop（while(true) 循环）是 coding agent 的灵魂。理解了这个，你就理解了 Cursor、Copilot、Claude Code 等工具的底层原理。核心代码只有约 100 行。

**Q4: "可以在手机上做吗？"**
A: 推荐使用桌面浏览器。Lab 中的代码编辑器（Monaco Editor）和终端（xterm.js）需要较大的屏幕和键盘输入。

**Q5: "做完 6 个 Lab 能做什么？"**
A: 你会理解 coding agent 的完整架构——从消息协议到工具系统到 Agent Loop 到上下文管理。这不是学会用一个工具，而是理解一类工具的底层原理。

**Q6: "和 claude-code-diy 是什么关系？"**
A: claude-code-diy 是完整的 Claude Code 源码（416,500 行 TypeScript），可以在本地运行。BYOCC 基于它构建教学骨架，让你通过补全关键代码来学习核心架构。

**Footer**（FAQ 下方紧接）：
保留现有 Footer 内容，不做磁吸文字（避免过度设计）。

**动效**：
- 手风琴展开/收起（max-height transition）
- 展开时 Q 的序号有琥珀色脉冲
- A 的文字淡入

**技术**：
- 在 LandingSections.tsx 新增 FAQSection
- useState 管理展开状态
- Footer 保持现有组件

---

## 五、全局动效方案

### 5.1 ScrambleText 文字解码（限制使用）

仅在 3 个位置使用：
1. Hero 副标题（第一印象）
2. Skill Tree 标题（"6 个 Lab，从 0 到 Agent"）
3. Code Preview 标题（"看到你将要写的代码"）

其余标题用简洁的 fadeInUp。

每个字符独立解码，从随机代码符号 → 正确文字，stagger 80ms。
由 IntersectionObserver 触发。

**技术**：新建 `src/components/ScrambleText.tsx`

### 5.2 粒子溶解过渡（Phase 2）

Hero 区域滚动时粒子向下漂移消失，溶解速度与滚动同步。

### 5.3 不做的动效

- ~~代码雨背景~~ — 已在动效工作流文档中标为过时
- ~~Footer 磁吸文字~~ — 过度设计，不是用户关注的区域
- ~~流动噪声背景替换光晕~~ — 优先级太低，当前光晕效果够用

---

## 六、开发步骤（按优先级排序）

### Phase 1: 核心差异化（先做最重要的）

```
Step 1: 创建 ScrambleText 组件
        - 新文件：src/components/ScrambleText.tsx
        - IntersectionObserver 触发，stagger 80ms
        - 验证：npm run build

Step 2: 创建 CodePreview 组件 ★ 核心中的核心
        - 新文件：src/components/CodePreview.tsx
        - 点击揭示模式，编辑器窗口样式
        - 准备 5 个 Lab 的 TODO + 完成代码数据
        - Tab 切换 + 揭示动画 + 全部揭示后 CTA
        - 验证：npm run build + 交互测试

Step 3: 重写 LabPreviewSection → Skill Tree
        - 在 LandingSections.tsx 替换当前的横向卡片
        - 纵向成长路径 + 节点 + 难度条
        - 用 ScrambleText 做标题
        - 验证：npm run build + 视觉检查
```

### Phase 2: 内容补充

```
Step 4: 新增 DifferenceSection（差异化 + 社区）
        - 在 LandingSections.tsx 添加
        - icon + 标语 + 轻量对比 + GitHub stats
        - 验证：npm run build + 视觉检查

Step 5: 新增 FAQSection（FAQ + Footer 合并）
        - 在 LandingSections.tsx 添加
        - 6 个问答，手风琴格式
        - 验证：npm run build + 视觉检查

Step 6: 增强 SellingPointsSection
        - 卡片 hover 时浮现代码片段
        - 不做代码雨背景
        - 验证：npm run build + 视觉检查

Step 7: 更新 page.tsx 引入新 section
        - 按 7 section 顺序排列
        - 验证：npm run build + 全页走查
```

### Phase 3: 动效增强（内容稳定后再加）

```
Step 8:  Skill Tree 滚动激活动画
        - 路径逐段亮起 + 节点 staggered 入场 + 难度条液态填充

Step 9:  Code Preview 交互打磨
        - TODO 块 hover 脉冲 + 揭示过渡动画 + Tab 切换效果

Step 10: 架构图终端动画
         - 每个节点变成终端窗口 + 打字效果 + 数据包动画

Step 11: 粒子溶解过渡
         - 修改 HeroParticles.tsx，滚动时粒子向下滑落

Step 12: 差异区动效
         - icon staggered 入场 + 对比行 hover 聚焦 + 数字 count-up
```

---

## 七、技术约束

- 不修改 HeroParticles.tsx 的粒子逻辑（Phase 3 的粒子溶解除外）
- 不修改 ThemeProvider.tsx
- 不修改 globals.css 的 CSS 变量（可以新增 keyframes）
- 所有 scroll 监听使用 `{ passive: true }` + requestAnimationFrame 节流
- 移动端（<768px）：关闭复杂动效，保留基本入场动画
- 所有 Canvas 保持粒子数 < 2000
- 每完成一步就 `npm run build` 验证
- 不使用第三方动画库
- **ScrambleText 限制使用：最多 3 处**

---

## 八、文件变更清单

### 新增文件
```
platform/src/components/ScrambleText.tsx    — 文字解码组件（限制 3 处使用）
platform/src/components/CodePreview.tsx     — 代码预览组件（点击揭示模式）
```

### 修改文件
```
platform/src/components/LandingSections.tsx — 重写 LabPreview→SkillTree + 新增 Difference/FAQ
platform/src/app/page.tsx                   — 引入新 section，7 section 排列
platform/src/components/HeroParticles.tsx   — 粒子溶解（Phase 3）
```

### 删除的效果（v1 有 v2 砍掉）
```
~~platform/src/components/CodeRain.tsx~~    — 代码雨已砍，不做
~~Footer 磁吸文字~~                         — 过度设计，不做
```

---

## 九、验收标准

```
内容：
  □ 7 个 section 结构清晰
  □ 新增 Skill Tree（纵向路径替代横向卡片）
  □ 新增 Code Preview（点击揭示模式，5 个 Lab 代码）
  □ 新增差异化展示（icon+tagline + 轻量对比）
  □ 新增 FAQ（6 个问答手风琴）
  □ 总阅读时间 ≥ 3 分钟
  □ ScrambleText 仅用于 3 个标题

交互：
  □ Code Preview 的 TODO 点击揭示流畅
  □ Code Preview 的 Lab 标签切换正常
  □ FAQ 手风琴展开/收起正常
  □ Skill Tree 节点可点击跳转

动效（Phase 3 验收）：
  □ Hero → Content 有粒子溶解过渡
  □ Skill Tree 滚动时路径逐段亮起
  □ Code Preview 有揭示动画
  □ 架构图有终端动画

质量：
  □ npm run build 无报错
  □ 明暗模式都正常
  □ 移动端无明显卡顿
  □ /platform 和 /lab/:id 不受影响
  □ Lighthouse Performance > 80
```

---

## 十、设计决策记录

| 决策 | 选择 | 否决的方案 | 理由 |
|------|------|-----------|------|
| Section 数量 | 7 个 | 9 个 | 高转化页共识，减少用户疲劳 |
| Code Preview 交互 | 点击揭示 | 左右分栏 | 交互性+教学隐喻+空间利用全面优于分栏 |
| 价值主张背景 | 无/静态纹理 | 代码雨 | 动效工作流自标过时，与 Platform 撞车 |
| 对比展示 | icon+tagline | 3 列表格 | 自信展示，不拉踩 |
| ScrambleText 范围 | 3 处 | 全部标题 | 第 4 次后新鲜感变噪音 |
| 开发顺序 | Code Preview 优先 | 按编号顺序 | 最高差异化+最高技术风险，早验证 |
| Footer 磁吸文字 | 不做 | 做 | 过度设计，用户不关注 Footer |

---

## 十一、开发日志

### Phase 1 实施记录（2026-04-20）

**已完成**：
- ✅ CSS 变量和动画（syntax highlighting, 5 keyframes, utility classes）
- ✅ ScrambleText 组件（IntersectionObserver + 字符逐个揭示 + 随机乱码过渡）
- ✅ CodePreview 组件（5 Lab 数据 + 正则语法高亮 + 点击揭示 + 进度追踪 + CTA）
- ✅ SkillTreeSection（纵向路径 + 节点逐个激活 + 难度条动画 + ScrambleText 标题）
- ✅ DifferenceSection（icon 卡片 + 轻量对比表 + 社区链接）
- ✅ FAQSection（6 问答手风琴 + 展开/收起动画）
- ✅ SellingPointsSection 增强（hover 代码 peek-through）
- ✅ page.tsx 重排为 7 section

**开发中发现的优化点**：

1. **ScrambleText 目前只在 SkillTree 标题使用**，Hero 副标题和 Code Preview 标题需要在后续手动加上。当前 Code Preview section 的 h2 用的是静态文字。
2. **CodePreview 的 Lab 3 默认高亮星标**效果不错，但可以考虑 Lab 3 tab 默认有微妙的 pulse 动画引导用户注意。
3. **SkillTree 难度条动画**用了 `transform: scaleX(0→1)` + 延迟，比液态灌入更简单但效果也够好。
4. **对比表的 hover 效果**：左侧变暗 + 右侧放大，通过 CSS group-hover 实现，简洁有效。
5. **FAQ 手风琴**：使用 `maxHeight` 过渡而非 `display: none`，动画更流畅。
6. **CodePreview 语法高亮**：使用正则逐字符解析器，比预格式化 JSX 更易维护。但模板字符串内的 `${}` 插值不单独高亮（作为整体字符串处理）。
7. **GitHub stars count-up 动画**暂未实现（需要真实 API 数据或静态值），留到有实际数据时再加。

**潜在改进（Phase 3 时考虑）**：
- CodePreview 添加"一键揭示全部"按钮
- Skill Tree 的连接线添加电流脉冲动画（小光点沿线移动）✅ 已做
- DifferenceSection 的 icon 卡片添加 hover 微动效（轻微旋转或缩放）
- Code Preview section 标题改用 ScrambleText ✅ 已做（改用 typewriter 模式）

---

## 十二、粒子溢出「金色溪流」方案（待实现）

> 创建：2026-04-20 | 状态：设计确认，待开发

### 核心概念

Hero 粒子不随 Hero 消失，而是滚动时切换为**流场模式**——金色丝线在内容间有序流动，像溪水。灵感来自登录页的 Perlin 噪声流场，但参数不同（更低调、更背景化）。

### 两种模式

```
Hero 模式 (scrollY < 30% heroH)           Flow 模式 (scrollY > 70% heroH)
─────────────────────────────────          ─────────────────────────────────
Phase 状态机循环                           粒子跟随 Perlin 噪声流场
文字形成 / 爆炸 / 重组                     丝线流动，像金色溪水
完整的鼠标排斥（立方衰减）                  鼠标排斥（但力度不同，更柔和）
全部粒子可见                               ~150 条可见（其余隐去）
alpha 0.4-1.0                              alpha 0.10-0.20
Canvas clearRect 完全清除                   Canvas 低 alpha 覆盖 → 产生拖尾
固定在 hero section                        fixed 全屏覆盖
```

### 和登录页流场的区别

| 维度 | 登录页流场 | 溢出流场 |
|------|-----------|---------|
| 粒子数 | 700 | ~150 |
| 透明度 | 0.4-0.6 | 0.10-0.20 |
| 线宽 | 1.2-1.4px | 0.8-1.0px |
| 鼠标交互 | 引力井 + 冲击波 | **柔和排斥**（和 Hero 区不同） |
| 角色 | 页面核心视觉 | 背景氛围层 |
| 拖尾 | trailAlpha 0.04 | trailAlpha 0.08（更短） |

### 鼠标交互设计（Flow 模式专用）

Flow 模式有鼠标交互，但和 Hero 模式不同：
- **Hero 模式**：强排斥，立方衰减，明显偏移
- **Flow 模式**：柔和排斥，力度更小（约 Hero 的 30%），影响范围更大但位移更小
- 效果：鼠标附近的丝线微微弯曲避让，像水遇到石头分流，不是"被推开"
- 不需要引力井或冲击波，只需要简单的距离衰减排斥

### 过渡动画

```
scrollY 0-30% heroH:   纯 Hero 模式（phase 循环 + 文字形成）
scrollY 30-70% heroH:  混合过渡
  - phase 循环暂停
  - 粒子逐渐从目标位置脱离，开始跟随噪声角度
  - alpha 从 0.4-1.0 降到 0.10-0.20
  - 约 70% 粒子逐渐隐去
  - 渲染方式从 clearRect 切换到低 alpha 覆盖
scrollY 70%+ heroH:    纯 Flow 模式
  - ~150 粒子可见，其余 alpha = 0
  - 噪声驱动角度 + 拖尾渲染
  - 鼠标柔和排斥
  - 越往下 alpha 越低，最终消失

滚回顶部: 粒子平滑回归编队（spring 物理天然支持）
```

### 技术实现

**改动范围**：只改 `HeroParticles.tsx` 一个文件

| 步骤 | 说明 |
|------|------|
| 1. Canvas 改为 `fixed inset-0 z-0` | 全屏覆盖 |
| 2. 复制 `makeNoise` 函数 | 从 LoginFlowField 移植（~50 行，零依赖） |
| 3. 添加 scroll 模式判断 | hero/transition/flow 三段 |
| 4. flow 模式下粒子行为 | 噪声驱动角度 + 拖尾渲染 |
| 5. flow 模式鼠标交互 | 柔和排斥（力度 = Hero × 0.3，范围更大） |
| 6. 粒子穿越视口边界时回绕 | 从对侧重新出现 |
| 7. 滚回顶部时粒子回归编队 | spring 物理天然支持 |

### 性能

- 不变。流场计算只是三角函数，和 spring 物理同级别
- 拖尾渲染是低 alpha fillRect，已有先例（登录页）
- Flow 模式只有 ~150 粒子活跃，CPU 更低

### 不做的事

- 不在移动端启用（保持现状）
- 不新建组件，只改 HeroParticles.tsx
- 不在 flow 模式添加冲击波
- 登录页的流场逻辑不修改
- Hero 副标题改用 ScrambleText
