# BYOCC 营销首页 — 前端开发提示词

> 给新的 Claude Code 会话使用。配合 `/frontend-design` skill 效果最佳。
> 工作目录：D:\code\build-your-own-claude-code

---

## 项目背景

**Build Your Own Claude Code (BYOCC)** 是一个基于真实 Claude Code 源码的渐进式教学平台。学习者在浏览器写 TypeScript 代码，后端把代码注入 Docker 容器，容器内运行真实 claude-code-diy 的构建流程，最终学习者在浏览器终端看到真实 Claude Code TUI 被自己的代码驱动。

这不是一个 toy demo——学习者补全的是真实 416,500 行代码中挖空的关键文件，最终驱动的是真正的 Claude Code。

项目已有完整的前后端：
- 前端：Next.js 14 + Tailwind（`platform/` 目录）
- 后端：Express + Docker + SQLite（`server/` 目录）
- 已跑通完整闭环：写代码 → 注入容器 → build → 终端运行 node cli.js → 看到真实 TUI

**本次任务**：只做营销首页 `/`，不动其他页面。

---

## 当前前端状态

### 已有页面（不要改这些）
- `/platform` — Lab 选择页（6 个 Lab 卡片，深色主题）
- `/lab/:id` — 实验工作台（Monaco 编辑器 + xterm.js 终端）

### 当前首页（需要替换）
- `platform/src/app/page.tsx` — 当前是 Lab 卡片页，需要改写为营销首页
- Lab 卡片页内容将搬迁到 `platform/src/app/platform/page.tsx`（另一个任务，本次不做）

### 技术栈
- Next.js 14（App Router）
- Tailwind CSS
- 已安装的包：@monaco-editor/react, xterm, react-markdown, remark-gfm 等
- 需要新增的包：由你决定（粒子动画库等）

### 重要文件
- `platform/src/app/layout.tsx` — 全局 layout（Navbar 在这里）
- `platform/src/app/page.tsx` — 本次要重写的首页
- `platform/src/components/Navbar.tsx` — 导航栏（需要微调链接）
- `platform/src/app/globals.css` — 全局样式

---

## 设计规范

### 整体风格定位

**"Anthropic 暗色 + 琥珀金 + 代码粒子"**——高级、专业、有辨识度，绝不是 AI 风格的 generic tech landing page。

参考层次：
- Anthropic 官网的温暖感和留白品味
- unipat.ai 的像素粒子变形动画（但不是照搬）
- Apple 产品页的动画节奏和精确感
- Linear/Vercel 的暗色高级感

**绝对不能出现的**：
- 圆形粒子 + 连线（AI 最爱用的烂大街效果）
- 紫色/蓝色/青色渐变（AI 典型配色）
- 3D 旋转几何体
- 模糊光晕 blobs
- 打字机效果 + 光标闪烁（烂大街）
- 滥用 emoji

### 配色系统（双模式）

**暗色模式**（默认）：
```
背景层次：
  主背景    #0B0B0B（极深灰黑，不是纯黑）
  卡片背景  #141414
  悬停      #1C1C1C

边框：
  主边框    #262626
  高亮边框  #3A3A3A

文字：
  主要文字  #E8E4DD（暖白，不是纯白 — 这是 Anthropic 的关键细节）
  次要文字  #8B8578（暖灰）
  禁用      #4A4640

强调色（琥珀金）：
  主强调    #D4A574
  强调亮    #E8C49A
  强调暗    #B8895A
  按钮背景  rgba(212,165,116,0.12)
  按钮文字  #D4A574
  按钮边框  rgba(212,165,116,0.3)

辅助色：
  冷蓝灰    #8B9DAF
  成功绿    #7EBF8E
```

**亮色模式**：
```
背景    #F7F4EF（暖奶油 — Anthropic DNA）
卡片    #FFFFFF
文字    #1A1A1A
次要    #6B7280
强调    #C17F4E（赤陶色）
辅助    #8B9DAF
边框    #E8E4DD
```

**切换方式**：Navbar 右侧放一个太阳/月亮图标按钮，点击切换明暗模式。状态存 localStorage。

### 字体

```
标题字体：'Inter'（无衬线，现代感）
正文字体：'Inter'
代码字体：'JetBrains Mono'（终端/代码区域）
```

通过 Google Fonts 加载，和现有 layout.tsx 里的字体引用保持一致。

---

## Hero 区域设计（核心亮点）

### 动画概念：「代码粒子组装」

**这是整个页面的灵魂。必须让人第一次看到就说"哇"。**

#### 动画流程（循环播放，约 15 秒一个周期）

```
Phase 1 - 散落（0-3秒）
  黑色屏幕上，数百个微小的方块粒子随机漂浮
  每个粒子是一个 4x4 或 6x6 的正方形，颜色是琥珀金 #D4A574
  部分粒子带微弱辉光（box-shadow 或 filter: blur）
  粒子运动缓慢、有机（不是匀速直线，是缓慢的正弦波动）

Phase 2 - 组装终端（3-7秒）
  粒子开始向屏幕中心偏上的位置聚拢
  逐个嵌入位置，形成一个终端窗口的轮廓（圆角矩形）
  终端轮廓由粒子紧密排列形成（像素感）
  终端顶部出现三个圆点（红黄绿 — 终端窗口的经典元素，也由粒子组成）
  终端内部出现代码行——由更多粒子排列组成

  代码内容（由粒子排列形成）：
    $ node cli.js
    > 帮我创建 hello.js
    ⚡ write_file("hello.js", "console.log('Hello!')")
    ✓ hello.js created
    $ 任务完成

Phase 3 - 炸散 + 重组（7-12秒）
  终端内的代码行"执行"到 tool_use 时
  所有粒子瞬间炸散（向外飞出 200-300px）
  0.8 秒后粒子重新聚拢
  这次聚拢后形成的不是终端，而是文字 "Build Your Own"
  再炸散，再重组形成 "Claude Code"

Phase 4 - 稳定态（12秒后）
  粒子形成 "Claude Code" 文字后稳定
  在背景中缓慢浮动（每个粒子有微小的独立运动）
  鼠标经过时粒子微微被推开（力场效果），鼠标离开后归位
  整体呼吸式的亮度变化（明暗微弱脉动）
```

#### 技术实现建议

- 使用 Canvas 2D（不需要 Three.js，2D 粒子性能更好）
- 每个粒子是一个对象：`{ x, y, targetX, targetY, size, color, alpha, vx, vy }`
- 目标位置通过预计算好的点位图（bitmap）确定——把终端形状和文字栅格化为点阵
- 粒子运动使用缓动函数（ease-out）平滑过渡
- 鼠标交互：计算鼠标与每个粒子的距离，在阈值内施加排斥力
- 性能优化：使用 requestAnimationFrame，粒子数量控制在 500-800 个

**不要用 tsParticles 或其他粒子库**——手写 Canvas 粒子系统才能达到定制效果，库的效果看起来都一样。

### Hero 文字内容（动画之上叠加）

```
主标题：Build Your Own Claude Code
副标题：通过 6 个渐进式 Lab，从零实现 Agent Harness 核心——
        最终看到真实 Claude Code TUI 由你的代码驱动

CTA 按钮组：
  [开始实验 →]  （琥珀金填充按钮，hover 时微弱放大）
  [阅读文档]    （透明背景 + 琥珀金边框）
```

文字在粒子动画稳定后淡入（opacity 0 → 1，1秒过渡），不要和粒子动画同时出现。

### Hero 布局

```
┌──────────────────────────────────────────────────┐
│                                                    │
│            （Canvas 粒子动画背景）                   │
│                                                    │
│              Build Your Own                        │
│              Claude Code                           │
│                                                    │
│      通过 6 个渐进式 Lab，从零实现                    │
│      Agent Harness 核心——最终看到                    │
│      真实 Claude Code TUI 由你的代码驱动             │
│                                                    │
│        [开始实验 →]    [阅读文档]                     │
│                                                    │
│              ↓ 向下滚动探索                          │
│                                                    │
└──────────────────────────────────────────────────┘
```

- 全屏高度（100vh）
- 文字居中
- Canvas 绝对定位填满整个 hero
- 文字在 Canvas 之上（z-index）

---

## 后续 Sections 设计

### Section 2：核心卖点（3 张卡片）

标题：「为什么 BYOCC 不一样」

三张卡片，每张一个核心差异化：

```
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│   真实源码        │ │   挖空模式        │ │   即时反馈        │
│                  │ │                  │ │                  │
│  不是 toy demo   │ │  只需补全关键的   │ │  改完代码点提交   │
│  面对的是真正的   │ │  100-300 行代码   │ │  几秒内看到      │
│  416,500 行      │ │  不需要理解全部   │ │  真实 TUI 变化    │
│  Claude Code     │ │  但理解最核心的   │ │  不是测试变绿     │
│                  │ │                  │ │  是 Agent 活了    │
└─────────────────┘ └─────────────────┘ └─────────────────┘
```

卡片设计：
- 背景：暗色 #141414，1px 边框 #262626
- 悬停时：边框变为 #D4A574（琥珀金），有 0.2s 过渡
- 左上角一个小图标（用 SVG inline，不用 emoji）
- 滚动进入视口时有 fadeInUp 动画（Intersection Observer）

### Section 3：Lab 预览（水平滑动）

标题：「6 个 Lab，从 0 到 Agent」

```
← 滑动或拖拽 →

┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐
│ 0  │ │ 1  │ │ 2  │ │ 3  │ │ 4  │ │ 5  │
│环境│ │消息│ │工具│ │Loop│ │规划│ │压缩│
│    │ │    │ │    │ │ ★  │ │    │ │    │
│    │ │    │ │    │ │核心│ │    │ │    │
└────┘ └────┘ └────┘ └────┘ └────┘ └────┘
```

- Lab 3 卡片有特殊的琥珀金边框 + "CORE" 标签
- 其他卡片暗色
- 每张卡片显示：编号、名称、一句话描述、难度指示条
- 点击跳转到 `/platform`（不是 `/lab/:id`，因为需要先启动环境）

### Section 4：技术架构

标题：「它是怎么工作的」

一个简化的架构示意图（用 CSS/SVG 实现，不要用图片）：

```
学习者浏览器 → Express 后端 → Docker 容器 → Claude Code TUI
   Monaco      API + Auth     代码注入       真实 Agent
   xterm.js    SQLite         构建触发       工具调用循环
```

用流动的线条连接各节点，线条上有小光点从左到右移动（CSS 动画）。

### Section 5：团队 + 资源 + Footer

简洁的团队介绍 + GitHub 链接 + 文档链接 + MIT License。

---

## 交互细节

### 滚动动画
- 每个 Section 进入视口时 fadeInUp（transform: translateY(20px) → 0, opacity: 0 → 1）
- 间隔 0.1s 依次出现（staggered）
- 使用 Intersection Observer，不用 scroll 事件监听

### 按钮交互
- 琥珀金按钮：hover 时 `transform: scale(1.02)` + `box-shadow: 0 0 20px rgba(212,165,116,0.2)`
- 过渡 0.2s ease
- 点击时有轻微的 scale(0.98) 回弹

### 导航栏
- 透明背景（backdrop-blur），滚动 100px 后变为 #0B0B0B（暗色模式）或 #F7F4EF（亮色模式）
- 右侧：明暗模式切换（太阳/月亮 SVG 图标）
- 链接：首页 | 平台 | 文档 | 团队

### 响应式
- 移动端：Hero 文字缩小，粒子数量减半
- 平板：正常布局
- 桌面：最佳展示

---

## 导航链接

```
首页    → /
平台    → /platform
文档    → https://cookiesheep.github.io/build-your-own-claude-code/ （新标签页）
团队    → /team （本次不实现，用 #team 占位）
GitHub  → https://github.com/cookiesheep/build-your-own-claude-code （新标签页）
```

---

## 文件操作指引

### 需要修改的文件
- `platform/src/app/page.tsx` — 完全重写为营销首页
- `platform/src/components/Navbar.tsx` — 更新导航链接 + 加明暗模式切换
- `platform/src/app/globals.css` — 添加明暗模式 CSS 变量 + 动画 keyframes
- `platform/src/app/layout.tsx` — 可能需要微调（字体、metadata）

### 需要新建的文件
- `platform/src/components/HeroParticles.tsx` — Canvas 粒子动画组件（Client Component）
- `platform/src/components/ThemeProvider.tsx` — 明暗模式切换（Client Component）
- `platform/src/components/LandingSections.tsx` — 首页各 Section 组件

### 不要修改的文件
- `platform/src/components/LabWorkspace.tsx` — 实验工作台，不动
- `platform/src/components/Terminal.tsx` — 终端，不动
- `platform/src/components/CodeEditor.tsx` — 编辑器，不动
- `platform/src/lib/api.ts` — API 客户端，不动

---

## 完成标准

```bash
cd platform
npm install  # 安装新增依赖
npm run dev  # 启动开发服务器

# 验证：
# 1. http://localhost:3000 显示营销首页
# 2. 粒子动画流畅运行
# 3. 明暗模式切换正常
# 4. 滚动动画正常
# 5. 所有链接可点击
# 6. 移动端布局正常
# 7. http://localhost:3000/platform 仍能正常访问（Lab 选择页）
# 8. http://localhost:3000/lab/3 仍能正常访问（实验工作台）

npm run build  # 无报错
```

---

## 关键提醒

1. **粒子动画是整个页面的灵魂**——花最多时间在这上面。不要用任何粒子库，手写 Canvas。
2. **琥珀金不是黄色**——它是 #D4A574，偏暖偏沉稳。不要做成金色闪烁的廉价感。
3. **Anthropic 的品味在于克制**——留白、精确的间距、温暖的灰调。不要塞满内容。
4. **明暗模式切换必须真实生效**——不只是换个背景色，文字、边框、卡片、粒子颜色都要跟着变。
5. **先跑起来再优化**——先确保 `npm run dev` 能看到页面，再打磨动画细节。
