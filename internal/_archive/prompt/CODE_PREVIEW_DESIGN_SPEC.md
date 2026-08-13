# Code Preview 组件视觉设计规格

> 创建：2026-04-18 | 配套文档：LANDING_PAGE_REDESIGN.md v2
> 这是整个页面最核心的差异化组件

---

## 设计方向

**风格**：「交互式终端」— 极简但精致的代码编辑器，感觉像真实开发环境。核心体验是"逐个揭示"——像填空一样点亮每个 TODO。

**与左右分栏对比的优势**：
1. 交互性强 — 用户主动探索
2. 教学隐喻精准 — "填空" = BYOCC 核心模式
3. 空间利用更好 — 单编辑器，移动端友好
4. 悬念感 — 每点一个 TODO 就多揭示一点

---

## 三态 ASCII 模型

### 初始状态

```
┌─────────────────────────────────────────────────────────────┐
│ [lab-1 ○] [lab-2 ○] [lab-3 ●] [lab-4 ○] [lab-5 ○]         │ ← Tab Bar
├─────────────────────────────────────────────────────────────┤
│  agent-loop.ts                                              │ ← File name
├─────────────────────────────────────────────────────────────┤
│  1 │ async function query(messages) {                       │
│  2 │                                                        │
│  3 │   ┌──────────────────────────────────────┐             │
│  4 │   │ // TODO 1: 初始化消息历史            │  ← 可点击   │
│  5 │   │ // 你的代码...                      │             │
│  6 │   └──────────────────────────────────────┘             │
│  7 │                                                        │
│  8 │   while (true) {                                       │
│  9 │                                                        │
│ 10 │     ┌──────────────────────────────────────┐           │
│ 11 │     │ // TODO 2: 调用 LLM                  │  ← 可点击 │
│ 12 │     │ // 你的代码...                      │           │
│ 13 │     └──────────────────────────────────────┘           │
│ 14 │                                                        │
│ 15 │     ┌──────────────────────────────────────┐           │
│ 16 │     │ // TODO 3: 处理工具调用              │  ← 可点击 │
│ 17 │     │ // 你的代码...                      │           │
│ 18 │     └──────────────────────────────────────┘           │
│ 19 │                                                        │
│ 20 │   }                                                    │
│ 21 │ }                                                      │
├─────────────────────────────────────────────────────────────┤
│ TypeScript • 3 TODOs remaining          [●●●○○]            │ ← Footer
└─────────────────────────────────────────────────────────────┘
```

### 部分揭示（1/3 点击后）

```
├─────────────────────────────────────────────────────────────┤
│  1 │ async function query(messages) {                       │
│  2 │                                                        │
│  3 │ ✓ const history = [userMsg];  ← 已揭示，绿色 ✓        │
│  4 │                                                        │
│  5 │   while (true) {                                       │
│  6 │                                                        │
│  7 │     ┌──────────────────────────────────────┐           │
│  8 │     │ // TODO 2: 调用 LLM                  │  ← 待点击 │
│  9 │     │ // 你的代码...                      │           │
│ 10 │     └──────────────────────────────────────┘           │
├─────────────────────────────────────────────────────────────┤
│ TypeScript • 2 TODOs remaining          [●●●●○]            │
└─────────────────────────────────────────────────────────────┘
```

### 全部揭示（CTA 出现）

```
├─────────────────────────────────────────────────────────────┤
│  1 │ async function query(messages) {                       │
│  2 │                                                        │
│  3 │ ✓ const history = [userMsg];                           │
│  4 │                                                        │
│  5 │   while (true) {                                       │
│  6 │                                                        │
│  7 │ ✓   const response = await llm.chat(messages);        │
│  8 │                                                        │
│  9 │ ✓   if (response.tool_calls) {                        │
│ 10 │ ✓     const results = await executeTools(...);        │
│ 11 │ ✓     messages.push(...results);                      │
│ 12 │ ✓   } else {                                          │
│ 13 │ ✓     return response.content;                        │
│ 14 │ ✓   }                                                 │
│ 15 │   }                                                    │
│ 16 │ }                                                      │
├─────────────────────────────────────────────────────────────┤
│ TypeScript • All revealed!  [●●●●●]  [▶ 尝试 Lab 3]       │
└─────────────────────────────────────────────────────────────┘
```

---

## 组件结构

```
Outer Container (relative, rounded-xl, border, shadow)
├── Tab Bar (flex, border-bottom, bg)
│   └── Tab × 5 (Lab 1-5, active/completed/inactive 状态)
├── File Name Bar (flex, border-bottom, bg)
│   └── "agent-loop.ts"
├── Code Area (relative, overflow-hidden)
│   ├── Line Numbers (fixed left 40px, opacity 0.4)
│   ├── Code Content (JetBrains Mono, 14px)
│   │   ├── Static lines (syntax highlighted)
│   │   └── TODO blocks / Revealed blocks (interactive)
│   └── Hint text (💡 点击每个 TODO 查看答案)
└── Footer (flex, border-top, bg)
    ├── Language badge
    ├── Progress dots [●●●○○]
    └── CTA button (全部揭示后出现)
```

---

## 颜色规格

### 编辑器框架

| 元素 | Dark Mode | Light Mode |
|------|-----------|------------|
| 编辑器背景 | `#0A0A0A` | `#FFFFFF` |
| 编辑器边框 | `#2A2A2A` | `#E8E4DD` |
| Header 背景 | `#141414` | `#FAF8F5` |
| Header 边框 | `#222222` | `#E8E4DD` |
| 行号背景 | `#0D0D0D` | `#F7F4EF` |
| 行号文字 | `#4A4640` | `#D1D5DB` |
| 行号边框 | `#1A1A1A` | `#E8E4DD` |
| 编辑器阴影 | `0 4px 24px rgba(0,0,0,0.4)` | `0 4px 24px rgba(0,0,0,0.08)` |

### TODO 块

| 元素 | Dark Mode | Light Mode |
|------|-----------|------------|
| 背景 | `linear-gradient(135deg, rgba(212,165,116,0.08), rgba(212,165,116,0.04))` | `linear-gradient(135deg, rgba(193,127,78,0.06), rgba(193,127,78,0.02))` |
| 边框 | `rgba(212,165,116,0.15)` | `rgba(193,127,78,0.12)` |
| 边框 (hover) | `rgba(212,165,116,0.35)` | `rgba(193,127,78,0.28)` |
| 文字 | `#8B8578` | `#6B7280` |

### 语法高亮

| Token | Dark Mode | Light Mode |
|-------|-----------|------------|
| keyword (async, while, if) | `#C792EA` | `#6B4C9A` |
| function (query, llm.chat) | `#82AAFF` | `#2F5F9F` |
| string | `#C3E88D` | `#4A7A4A` |
| comment | `#546E7A` | `#9CA3AF` |
| number | `#F78C6C` | `#D97706` |
| variable | `#AABFC9` | `#374151` |
| operator (=, ., =>) | `#89DDFF` | `#1F2937` |

### 揭示后

| 元素 | Dark Mode | Light Mode |
|------|-----------|------------|
| ✓ 颜色 | `#7EBF8E` | `#5A9A5A` |

---

## 交互动效规格

### TODO 块 Hover

- 边框亮度增加 (0.15 → 0.35)
- 微缩放 (scale 1.0 → 1.01)
- 阴影出现
- 过渡：`all 0.2s ease-out`
- cursor: pointer

### 点击揭示动画序列

```
0ms:     点击瞬间，微缩 scale(0.98)
0-200ms: TODO 块淡出 (opacity 1→0, translateY 0→4px)
200-400ms: 揭示代码淡入 (opacity 0→1, translateY 4px→0)
         ✓ 标记弹跳出现 (scale 1→1.2→1)
400ms+:  动画完成，状态切换为 revealed
```

关键帧：
```css
@keyframes code-reveal {
  0%   { opacity: 0; transform: translateY(-4px); }
  50%  { opacity: 0.6; transform: translateY(2px); }
  100% { opacity: 1; transform: translateY(0); }
}

@keyframes checkmark-bounce {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.2); }
}
```

### CTA 按钮脉冲

```css
@keyframes pulse-glow {
  0%   { box-shadow: 0 0 0 0 rgba(212,165,116,0.4); }
  70%  { box-shadow: 0 0 0 8px rgba(212,165,116,0); }
  100% { box-shadow: 0 0 0 0 rgba(212,165,116,0); }
}
```

### Lab 标签切换

- 旧代码区向上淡出 (opacity 1→0, translateY 0→-8px)
- 新代码区从下淡入 (opacity 0→1, translateY 8px→0)
- 过渡时间：0.3s

---

## 排版规格

| 元素 | 字体 | 大小 | 行高 |
|------|------|------|------|
| 代码区 | JetBrains Mono | 14px (mobile 13px) | 1.6 |
| TODO 注释 | JetBrains Mono | 12px | 1.5 |
| Tab 标签 | Inter | 14px | — |
| File name | JetBrains Mono | 13px | — |
| Footer 文字 | Inter | 12px | — |
| CTA 按钮 | Inter | 14px semibold | — |

行号：
- 固定宽度 40px
- 右对齐
- 透明度 0.4
- 移动端隐藏

---

## 间距规格

| 元素 | Desktop | Mobile |
|------|---------|--------|
| 容器 padding | 24px | 16px |
| TODO 块 padding | 12px 16px | 10px 12px |
| TODO 块 margin | 8px 0 | 6px 0 |
| TODO 块 border-radius | 6px | 6px |
| Tab 高度 | 44px | 40px |
| Tab padding | 0 20px | 0 16px |

---

## 移动端适配

- 行号隐藏（节省空间）
- 字号 14px → 13px（<400px 时 12px）
- Tab 栏可横向滚动
- Footer 精简（隐藏非必要信息）
- TODO 块 padding 缩小

---

## 状态管理

```typescript
interface CodePreviewState {
  activeLab: number;         // 当前显示的 Lab (1-5)
  revealedTodos: Set<number>; // 已揭示的 TODO 索引集合
  isAnimating: boolean;      // 动画中禁止重复点击
}
```

## 无障碍

- TODO 块设置 `role="button"` + `tabindex="0"`
- 键盘：Enter/Space 触发揭示
- ARIA label：`"TODO 1: 初始化消息历史，点击查看答案"`
- Focus ring：2px accent 色描边

## 性能

- 动画只用 `transform` + `opacity`（GPU 加速）
- 不动画 `width/height/margin/padding`
- 快速点击防抖
- CSS transition 优先于 JS animation
