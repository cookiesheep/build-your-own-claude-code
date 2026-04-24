# Platform 页面修复与重构提示词

> 给新的 Claude Code 会话使用。建议配合 `/frontend-design` skill 使用。
> 工作目录：D:\code\build-your-own-claude-code
> 分支建议：`feat/platform-redesign`

---

## 零、如何熟悉这个项目

> 你是一个对项目完全陌生的新开发者。请按以下步骤快速建立上下文。

### 0.1 先读这两个文件（5 分钟）

| 文件 | 为什么读 |
|------|---------|
| `CLAUDE.md`（项目根目录） | 项目核心理念、6 个 Lab 的设计、技术架构、开发规范 |
| `HANDOFF.md`（项目根目录） | 从前一个 AI 会话交接的完整上下文：调研记录、设计决策、被否决方案 |

### 0.2 再跑一下前端（2 分钟）

```bash
cd D:\code\build-your-own-claude-code\platform
npm install   # 如果还没装过
npm run dev   # 启动 Next.js dev server，默认 localhost:3000
```

然后浏览器打开 `http://localhost:3000/platform`，亲眼看看当前页面的样子。

### 0.3 重点阅读这些前端文件（10 分钟）

按这个顺序读，从外到内：

```
1. platform/src/app/platform/page.tsx           ← 页面入口，理解整体结构
2. platform/src/lib/labs.ts                     ← Lab 数据定义（6 个 Lab 的元信息）
3. platform/src/components/PlatformTimeline.tsx ← 左侧时间线组件
4. platform/src/components/LabDetailPanel.tsx   ← 右侧详情面板（本次重构重点）
5. platform/src/components/FloatingCodeBlocks.tsx ← 背景浮动代码块（Bug 1&2）
6. platform/src/lib/syntax-tokenizer.ts         ← 代码片段定义 + 语法高亮
```

如果你想理解现有的 Markdown 渲染系统（重构要复用的）：

```
7. platform/src/components/MarkdownRenderer.tsx  ← Markdown 渲染器
8. platform/src/components/CodeBlock.tsx         ← 代码块（语法高亮 + 复制）
9. platform/src/components/Admonition.tsx        ← 提示框组件
10. platform/src/app/lab/[id]/page.tsx           ← Lab 工作区（已实现 markdown 加载）
11. platform/src/components/DocsPanel.tsx        ← 左侧文档面板（已有渲染）
12. platform/src/app/globals.css  (第 283-573 行) ← .markdown-body 样式
```

### 0.4 看一眼 Lab 文档源文件

这些是重构时需要渲染到 platform 页面的 markdown 文件：

```
docs/labs/index.md          ← 总览
docs/labs/lab-00/index.md   ← Lab 0
docs/labs/lab-01/index.md   ← Lab 1
docs/labs/lab-02/index.md   ← Lab 2
docs/labs/lab-03/index.md   ← Lab 3（核心）
docs/labs/lab-04/index.md   ← Lab 4
docs/labs/lab-05/index.md   ← Lab 5
```

### 0.5 技术栈速查

- **框架**：Next.js 14 (App Router, `"use client"` 组件)
- **样式**：Tailwind CSS + CSS 变量（`--accent`, `--bg-panel` 等） + `globals.css`
- **配色**：琥珀金主色调（`#D4A574` dark / `#C17F4E` light），深色/浅色双主题
- **Markdown**：`react-markdown` + `remark-gfm` + 自定义 admonition 插件
- **代码高亮**：`react-syntax-highlighter` (Prism)
- **状态管理**：React useState/useEffect，无外部状态库
- **后端 API**：`platform/src/lib/api.ts`，已有 `getProgress()` 等函数

---

## 一、项目背景

这是一个"Build Your Own Claude Code"教学平台。用户通过 6 个渐进式 Lab 学习实现 Agent Harness 的核心模块。Platform 总览页面（`/platform`）是用户登录后的主页面——用户在这里看到所有 Lab 的概览并选择进入。

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

**现象：** 背景的浮动代码块在大屏幕（如 2K/4K）下方区域没有分布，下半部分空白。

**文件：** `platform/src/components/FloatingCodeBlocks.tsx`

**根因：**
1. `maxBlocks` 默认值固定为 26（第 41 行）。即使网格算出需要更多 block，也会被 `id < maxBlocks` 截断
2. 没有监听 `resize` 事件——窗口大小变化后不会重新计算布局
3. 网格计算只在 mount 时执行一次（第 57 行 useEffect，依赖 `[maxBlocks, speedMultiplier]`）

**修复方向：**
- `maxBlocks` 根据屏幕面积动态计算，例如 `Math.max(26, Math.floor(w * h / 50000))`
- 添加 `ResizeObserver` 或 `window.addEventListener('resize', debounce(...))` 监听容器变化
- resize 时重新初始化 blocks 数组（注意避免频繁重建，用 debounce）

### Bug 2：悬浮代码块入场动画太慢

**现象：** 页面加载时，浮动代码块一个一个浮现，总耗时超过 3 秒，用户需要等很久才能看到完整背景。

**文件：** `platform/src/components/FloatingCodeBlocks.tsx`

**根因：** 第 125 行 `enterDelay: id * 100 + Math.random() * 100`。26 个 block，最后一个 delay = `26 * 100 + 100 = 2700ms`。加上 opacity 渐变（每帧 +0.03，约 550ms），总计 ~3.2 秒。

**修复方向：**
- 大幅缩短 stagger：`enterDelay: id * 30 + Math.random() * 200`（总时长 ~1 秒）
- 或去掉 stagger 全部同时 fade-in，只保留随机微 delay 做层次感：`enterDelay: Math.random() * 400`
- 提高 fade-in 速率：`enterProgress + 0.03` → `+ 0.06` 或更高

### Bug 3：Lab 进度是写死的前端数据，没对接后端

**现象：** 所有用户看到的进度都一样（Lab 0/1 已完成，Lab 2/3 进行中），不会根据实际完成情况变化。

**文件：**
- `platform/src/lib/labs.ts`（第 13-63 行）— `LABS` 数组硬编码了每个 Lab 的 `status`
- `platform/src/app/platform/page.tsx`（第 39-54 行）— Hero 进度条用 `LABS.filter(l => l.status === 'completed')` 计算
- `platform/src/components/PlatformTimeline.tsx` — 从 props 接收 labs，不调 API

**已有后端 API：** `platform/src/lib/api.ts` 第 466-493 行有 `getProgress()` 函数，可以获取用户真实进度，但从未被 platform 页面调用。

**修复方向：**

1. `labs.ts` 中 `LABS` 的 `status` 字段统一改为 `'not_started'` 作为默认值
2. `PlatformClientLayout` 或 `page.tsx` 中用 `useEffect` 调用 `getProgress()`，拿到真实进度后覆盖 status
3. Hero 进度条同样从动态数据计算
4. `PlatformTimeline` 和 `LabDetailPanel` 不需要改（它们从 props 拿数据）

---

## 三、重大重构：右侧 Lab 详情内容重新设计

### 3.1 当前问题

右侧 `LabDetailPanel` 目前只展示：
- Lab 名称、标签、状态 badge
- 一行简短描述（`lab.desc`，约 20 字）
- 一个终端风格的代码预览（打字机动画 + 语法高亮）——看起来酷但信息量为零
- "开始 Lab" 按钮

**核心问题：** 用户在总览页面上完全不知道每个 Lab 具体做什么、学什么、难度如何。终端代码预览是品牌装饰，不能帮助用户理解内容。

### 3.2 设计参考：CodeCrafters

参考同名项目 [CodeCrafters: Build Your Own Claude Code](https://app.codecrafters.io/courses/claude-code/overview)，其 Stage 列表：

```
Stage 1: Communicate with the LLM       Very easy    < 5 minutes
Stage 2: Advertise the read tool        Easy         5-10 minutes
Stage 3: Execute the read tool          Easy         5-10 minutes
Stage 4: Implement the agent loop       Medium       30min - 1hr
Stage 5: Implement the write tool       Easy         5-10 minutes
Stage 6: Implement the bash tool        Easy         5-10 minutes
```

每个 Stage 有：标题 + 难度 + 预计时间。简洁但信息明确。

### 3.3 重构目标

**保留终端代码预览的视觉效果（品牌特征），但增加实质性文字内容，让用户在总览页面就能理解每个 Lab。**

### 3.4 具体方案：终端预览 + Markdown 文档双区域

右侧面板分上下两部分：

**上半部分（保留）：** 终端代码预览
- 保留打字机动画、语法高亮、hover 效果
- **压缩高度**：`maxHeight` 从 `340px` 降到 `180px`，代码行数从 14 行减为 8 行
- 定位为视觉装饰和品牌元素

**下半部分（新增）：** Lab 文档内容渲染
- **直接渲染 `docs/labs/lab-XX/index.md` 文件**
- 已有成熟的 Markdown 渲染系统可直接复用（不需要二次开发）：
  - `MarkdownRenderer` 组件 — 支持 GFM、自定义 admonition、代码高亮
  - `CodeBlock` 组件 — 语法高亮 + 复制按钮
  - `Admonition` 组件 — tip/warning/danger/success/note 提示框
  - `.markdown-body` CSS 样式 — 排版、表格、引用块
- **内容截取**：不渲染整个 index.md，只取前 2-3 个章节（如"实验目的"和"背景知识"）
- 底部保留"开始 Lab"按钮

### 3.5 技术实现要点

1. **Markdown 内容获取：** 参考 `platform/src/app/lab/[id]/page.tsx`（Server Component），它已实现读取 `docs/labs/lab-XX/index.md`。Platform 页面也需要在服务端读取这些文件，传给 `LabDetailPanel`。

2. **复用 MarkdownRenderer：** 直接 import 现有的 `MarkdownRenderer` 组件。

3. **内容截取：** 按 `##` 标题分割，取前 2-3 段。或者直接渲染全部内容但限制容器高度（`max-height` + `overflow-y: auto`）。

4. **布局：** `LabDetailPanel` 需要支持滚动（`overflow-y-auto`）。保持面板高度不变，内部可滚动。

5. **Lab 元数据增强（可选）：** 在 `labs.ts` 中为每个 Lab 增加 `difficulty` 和 `estimatedTime` 字段，在卡片顶部显示（类似 CodeCrafters）。

### 3.6 可选增强

- 难度标签 + 预计时间（类似 CodeCrafters）
- "你将学到什么" bullet points（从 index.md "实验目的"自动提取）
- 左侧切换 Lab 时，右侧平滑过渡动画（已有 `slideInRight`）

---

## 四、关键文件索引

| 文件 | 作用 | 本次修改 |
|------|------|---------|
| `platform/src/components/FloatingCodeBlocks.tsx` | 背景浮动代码块 | Bug 1 + Bug 2 |
| `platform/src/lib/labs.ts` | Lab 元数据 | Bug 3（status 改默认值）+ 可选增强字段 |
| `platform/src/app/platform/page.tsx` | Platform 主页面 | Bug 3 + 重构 |
| `platform/src/components/PlatformTimeline.tsx` | 左侧 Lab 时间线 | 不改（间接受益） |
| `platform/src/components/LabDetailPanel.tsx` | 右侧 Lab 详情面板 | 重构（主战场） |
| `platform/src/components/MarkdownRenderer.tsx` | Markdown 渲染器 | 复用，不修改 |
| `platform/src/components/CodeBlock.tsx` | 代码块渲染 | 复用，不修改 |
| `platform/src/lib/api.ts` | API 函数（含 getProgress） | Bug 3 调用 |
| `platform/src/app/lab/[id]/page.tsx` | Lab 工作区 | 参考 markdown 加载方式 |
| `docs/labs/lab-XX/index.md` (×6) | Lab 文档源文件 | 不修改 |

---

## 五、优先级与执行顺序

1. **Bug 3（进度对接后端）** — 最重要，影响所有用户体验
2. **重构（Lab 详情内容）** — 最重要的用户体验改进
3. **Bug 2（入场动画优化）** — 快速修复，提升第一印象
4. **Bug 1（大屏分布适配）** — 影响 2K+ 屏幕，优先级稍低

Bug 1 和 Bug 2 在同一个 PR 里修复（都改 `FloatingCodeBlocks.tsx`）。Bug 3 和重构分别独立 PR。

---

## 六、开发建议

- 使用 `/frontend-design` skill 辅助 UI 设计和实现
- 改动后务必 `npm run dev` 启动页面，亲眼确认效果
- 注意保持深色/浅色主题的兼容性（所有新增样式都需要双主题适配）
- `globals.css` 中的 CSS 变量（`--accent`, `--bg-panel` 等）可以直接使用
- 终端代码预览是品牌特色，不要删除，只是压缩它的高度
