# Platform 页面修复与重构提示词

> 本文档供 AI 开发者使用，描述 platform 总览页面的 3 个 Bug 修复 + 1 个重大重构任务。
> 项目仓库：D:\code\build-your-own-claude-code
> 前端代码位置：D:\code\build-your-own-claude-code\platform

---

## 一、项目背景

这是一个"Build Your Own Claude Code"教学平台，用户通过 6 个渐进式 Lab 学习实现 Agent Harness。Platform 总览页面（`/platform`）是用户登录后的主页面，左侧是 Lab 时间线，右侧是 Lab 详情卡片。

### 当前页面结构

```
PlatformPage (platform/src/app/platform/page.tsx)
├── FloatingCodeBlocks        ← 背景：浮动代码块
├── ScrollReactiveOrbs        ← 背景：彩色光球
├── Hero Bar                  ← 顶部：标题 + 进度条
└── PlatformClientLayout      ← 主内容
    ├── Left: PlatformTimeline    ← 左侧：Lab 列表 + 进度
    └── Right: LabDetailPanel     ← 右侧：Lab 详情（终端代码预览）
```

---

## 二、Bug 修复（3 个）

### Bug 1：悬浮代码块在大屏幕上分布不均

**现象：** 背景的浮动代码块（FloatingCodeBlocks）在大屏幕（如 2K/4K）下方区域没有分布，下半部分空白。

**文件：** `platform/src/components/FloatingCodeBlocks.tsx`

**根因：** 第 57 行的 `useEffect` 只在组件挂载时计算一次网格布局（cols × rows），使用的是初始的 `clientWidth` / `clientHeight`。虽然计算逻辑本身会根据屏幕尺寸动态算出 cols 和 rows（第 85-86 行），但关键问题是 `rows` 的计算公式 `Math.floor(h / (BH * 0.6))` 中 `h` 取的是容器高度——而这个容器是 `fixed inset-0`，高度等于视口高度。在大多数正常屏幕上这个计算应该是正确的。

**真正需要检查的是：**
1. `maxBlocks` 默认值为 26，可能在大屏幕上不够用——即使 rows × cols 算出来需要更多 block，也会被 `id < maxBlocks` 截断
2. 缺少 `resize` 事件监听——窗口大小变化后不会重新计算布局

**修复方向：**
- `maxBlocks` 应该根据屏幕面积动态计算，而不是固定 26
- 添加 `window.addEventListener('resize', ...)` 监听，resize 时重新初始化 blocks
- 或者使用 ResizeObserver 监听容器尺寸变化

### Bug 2：悬浮代码块入场动画太慢，体验不佳

**现象：** 页面加载时，所有浮动代码块从左上角逐个出现（一个一个就位），总耗时过长，用户需要等很久才能看到完整背景。

**文件：** `platform/src/components/FloatingCodeBlocks.tsx`

**根因：** 第 125 行 `enterDelay: id * 100 + Math.random() * 100`。如果有 26 个 block，最后一个的 delay 就是 `26 * 100 + 100 = 2700ms`。加上每个 block 的 opacity 从 0 渐变到 1（每帧 +0.03，约 33 帧 = ~550ms），最后一个 block 完全显示需要 ~3.2 秒。

**但实际上** blocks 的初始位置就是最终位置（`x: tx, y: ty`），entering phase 只是做 opacity 渐变，不是位移。用户看到的"从左上角出现"可能是因为所有 block 的 `opacity` 都从 0 开始、加上 staggered delay 导致一个一个浮现。

**修复方向：**
- 大幅缩短 `enterDelay`：将 `id * 100` 改为 `id * 30` 或使用更激进的 stagger 策略（如按距离分组、前几个 block 先显示）
- 或者改为同时 fade-in 全部 blocks（去掉 stagger），只保留一小段随机 delay 做微弱的层次感：`enterDelay: Math.random() * 300`
- 提高进入动画速率：`block.enterProgress + 0.03` → `+ 0.08` 或更高

### Bug 3：Lab 进度条是写死的前端数据，没有对接后端

**现象：** 所有用户看到的 Lab 进度都一样（Lab 0/1 已完成，Lab 2/3 进行中，Lab 4/5 未开始），不会根据用户的实际完成情况变化。

**确认：** 进度确实写死在前端。

**文件：**
- `platform/src/lib/labs.ts`（第 13-63 行）— `LABS` 数组硬编码了每个 Lab 的 `status`
- `platform/src/app/platform/page.tsx`（第 39-54 行）— Hero 进度条直接用 `LABS.filter(l => l.status === 'completed')` 计算
- `platform/src/components/PlatformTimeline.tsx` — 时间线组件从 props 接收 labs 数据，不调 API

**已有后端 API：** `platform/src/lib/api.ts` 第 466-493 行有 `getProgress()` 函数，可以获取用户的真实进度，但从未被 platform 页面调用过。

**修复方向：**

1. **platform/page.tsx** 需要从 `LABS` 中移除硬编码的 `status`，改为从后端获取：
   ```typescript
   // 改为 client component 或在 PlatformClientLayout 中获取
   const progress = await getProgress(); // 或 useEffect 中 fetch
   const labsWithStatus = LABS.map(lab => ({
     ...lab,
     status: progress[lab.id] ?? 'not_started'
   }));
   ```

2. **labs.ts** 中的 `LABS` 数组保留 id/emoji/name/desc/tag 等静态元数据，但 `status` 字段改为默认值 `'not_started'`，由运行时覆盖

3. **Hero 进度条** 同样要从动态数据计算

4. **PlatformTimeline** 和 **LabDetailPanel** 不需要改（它们从 props 拿数据），只要传入的 data 正确即可

---

## 三、重大重构：右侧 Lab 详情内容重新设计

### 当前问题

右侧 `LabDetailPanel` 目前只展示：
- Lab 名称、标签、状态 badge
- 一行简短描述（`lab.desc`，约 20 字）
- 一个终端风格的代码预览（打字机动画 + 语法高亮）
- "开始 Lab" 按钮

**核心问题：** 用户在 platform 总览页面上，完全不知道每个 Lab 的具体内容、学什么、做什么任务。终端代码预览看起来很酷，但信息密度几乎为零——用户无法据此判断"这个 Lab 值得做"或"这个 Lab 难度如何"。

### 设计参考：CodeCrafters

参考同名项目 [CodeCrafters: Build Your Own Claude Code](https://app.codecrafters.io/courses/claude-code/overview)，其 Stage 列表设计：

```
Stage 1: Communicate with the LLM       Very easy    < 5 minutes
Stage 2: Advertise the read tool        Easy         5-10 minutes
Stage 3: Execute the read tool          Easy         5-10 minutes
Stage 4: Implement the agent loop       Medium       30min - 1hr
Stage 5: Implement the write tool       Easy         5-10 minutes
Stage 6: Implement the bash tool        Easy         5-10 minutes
```

每个 Stage 有：标题 + 难度 + 预计时间。简洁但信息明确，用户一眼就知道每个阶段做什么。

### 重构目标

**保留终端代码预览的视觉效果（它是一个很好的品牌特征），但增加实质性的文字内容，让用户在总览页面就能理解每个 Lab 的完整内容。**

### 具体方案

#### 方案：终端预览 + Markdown 文档双区域

右侧面板分为上下两部分：

**上半部分（保留）：** 终端代码预览
- 保留现有的打字机动画、语法高亮、hover 效果
- 但缩小高度（从 ~340px 降到 ~200px），为文档内容腾出空间
- 作为视觉装饰和品牌元素

**下半部分（新增）：** Lab 文档内容渲染
- **直接渲染 `docs/labs/lab-XX/index.md` 文件** — 不需要二次编写内容
- 已有成熟的 Markdown 渲染系统可以直接复用：
  - `MarkdownRenderer` 组件（`platform/src/components/MarkdownRenderer.tsx`）— 支持 GFM、自定义 admonition、代码高亮
  - `CodeBlock` 组件（`platform/src/components/CodeBlock.tsx`）— 语法高亮 + 复制按钮
  - `Admonition` 组件 — 支持 tip/warning/danger/success/note 类型
  - `globals.css` 中 `.markdown-body` 样式（第 283-573 行）— 排版、表格、引用块等
- 只渲染 index.md 的前 N 个章节（如"实验目的"和"背景知识"），不需要全部内容
- 底部保留"开始 Lab"按钮

#### 技术实现要点

1. **Markdown 内容获取：** 参考 `platform/src/app/lab/[id]/page.tsx`（Server Component），它已经实现了读取 `docs/labs/lab-XX/index.md` 并传给 `DocsPanel`。Platform 页面需要做同样的事情。

2. **复用 MarkdownRenderer：** 直接 import `MarkdownRenderer` 组件渲染截取后的 markdown 内容。

3. **内容截取策略：** 不要渲染整个 index.md（太长），只取前 2-3 个章节（如"实验目的"和"背景知识"的第一个子节）。可以用简单的方式——按 `##` 标题分割，取前 2-3 段。

4. **布局调整：** `LabDetailPanel` 需要支持滚动（`overflow-y-auto`），因为内容会比现在多。保持面板高度不变，内部可滚动。

5. **终端预览压缩：** 代码预览区域从 `maxHeight: 340px` 降为 `maxHeight: 180px`，行数从 14 行减为 8 行。

#### 可选增强

- 在 Lab 卡片顶部显示难度标签和预计完成时间（类似 CodeCrafters）
- 为每个 Lab 增加"你将学到什么"的 bullet point 列表（可以从 index.md 的"实验目的"章节自动提取）
- 当前选中的 Lab 在左侧时间线中高亮时，右侧平滑切换内容（已有 `slideInRight` 动画）

---

## 四、关键文件索引

| 文件 | 作用 | 需要修改 |
|------|------|---------|
| `platform/src/components/FloatingCodeBlocks.tsx` | 背景浮动代码块 | Bug 1 + Bug 2 |
| `platform/src/lib/labs.ts` | Lab 元数据（含硬编码 status） | Bug 3 |
| `platform/src/app/platform/page.tsx` | Platform 主页面 | Bug 3 + 重构 |
| `platform/src/components/PlatformTimeline.tsx` | 左侧 Lab 时间线 | Bug 3（间接受益） |
| `platform/src/components/LabDetailPanel.tsx` | 右侧 Lab 详情面板 | 重构（主战场） |
| `platform/src/components/MarkdownRenderer.tsx` | Markdown 渲染器 | 复用，不修改 |
| `platform/src/components/CodeBlock.tsx` | 代码块渲染 | 复用，不修改 |
| `platform/src/lib/api.ts` | API 函数（含 getProgress） | Bug 3 调用 |
| `platform/src/app/lab/[id]/page.tsx` | Lab 工作区页面 | 参考 markdown 加载方式 |
| `platform/src/components/DocsPanel.tsx` | 文档面板 | 参考布局 |
| `docs/labs/lab-XX/index.md` (×6) | Lab 文档源文件 | 不修改 |

---

## 五、优先级与执行顺序

1. **Bug 3（进度对接后端）** — 最重要，影响所有用户体验
2. **重构（Lab 详情内容）** — 最重要的用户体验改进
3. **Bug 2（入场动画优化）** — 快速修复，提升第一印象
4. **Bug 1（大屏分布适配）** — 影响 2K+ 屏幕，优先级稍低

Bug 1 和 Bug 2 可以在同一个 PR 里修复（都改 FloatingCodeBlocks.tsx）。Bug 3 和重构分别独立 PR。
