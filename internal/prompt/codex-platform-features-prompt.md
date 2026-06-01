# Codex 开发提示词：BYOCC 平台三项新功能

> 本文档是给 **OpenAI Codex** 的完整实施提示词。Codex 对本项目零上下文，请按顺序阅读「项目介绍」→「代码导读」→「开发任务」。

---

## 一、项目介绍

### 项目是什么

**Build Your Own Claude Code (BYOCC)** 是一个基于真实 Claude Code 源码的渐进式教学平台。学习者通过 6 个 Lab 逐步实现 Agent Harness 的核心模块，最终将自己写的代码插入 Claude Code 真实系统运行。

### 技术栈

| 层 | 技术 | 说明 |
|----|------|------|
| 前端 | Next.js (App Router) + React + TypeScript | 在 `platform/` 目录 |
| 后端 | Express + TypeScript + better-sqlite3 | 在 `server/` 目录 |
| 容器 | Docker | 给每个用户创建隔离的实验环境 |
| 部署 | 自建 Win11 + Cloudflare Tunnel | 域名 byocc.cc |

### 仓库结构

```
build-your-own-claude-code/
├── platform/              # Next.js 前端
│   ├── src/
│   │   ├── app/           # 页面路由
│   │   │   ├── page.tsx                # 首页（落地页）
│   │   │   ├── platform/page.tsx       # Lab 列表页
│   │   │   └── lab/[id]/page.tsx       # Lab 工作台页
│   │   ├── components/    # React 组件
│   │   │   ├── LandingSections.tsx     # 首页各 Section
│   │   │   ├── HeroParticles.tsx       # 首页粒子动画（核心！）
│   │   │   ├── PlatformPageClient.tsx  # Lab 列表页客户端组件
│   │   │   ├── PlatformTimeline.tsx    # Lab 时间线侧栏
│   │   │   ├── LabDetailPanel.tsx      # Lab 详情面板
│   │   │   ├── DocsPanel.tsx           # Lab 文档面板
│   │   │   ├── LabRightArea.tsx        # 编辑器+终端区域
│   │   │   └── ...
│   │   ├── lib/
│   │   │   ├── labs.ts     # Lab 元数据定义
│   │   │   ├── auth.ts     # 前端认证 API
│   │   │   └── api.ts      # 后端 API 调用封装
│   │   └── ...
│   └── public/             # 静态资源
│       └── terminal-hero.png  # 粒子动画使用的终端图片
├── server/                 # Express 后端
│   ├── src/
│   │   ├── index.ts        # 入口，注册所有路由
│   │   ├── db/
│   │   │   └── database.ts # SQLite 数据库（所有表定义 + CRUD）
│   │   ├── routes/         # API 路由
│   │   │   ├── auth.ts     # 认证（匿名/密码/GitHub OAuth）
│   │   │   ├── session.ts  # 用户会话
│   │   │   ├── progress.ts # Lab 进度
│   │   │   ├── settings.ts # 用户设置（API Key 等）
│   │   │   ├── github.ts   # GitHub OAuth（刚开发完）
│   │   │   └── ...
│   │   └── services/
│   │       ├── auth-token.ts       # Token 签名验证
│   │       ├── session-cookie.ts   # Session cookie
│   │       ├── container-manager.ts # Docker 容器管理
│   │       └── ...
│   └── .env.example       # 环境变量模板
└── docs/                   # MkDocs 文档站源文件
```

### 开发命令

```bash
# 前端（在 platform/ 目录下）
cd platform
npm install
npm run dev          # 启动开发服务器 http://localhost:3000

# 后端（在 server/ 目录下）
cd server
npm install
npm run dev          # 启动开发服务器 http://localhost:3001

# TypeScript 检查
cd platform && npx tsc --noEmit
cd server && npx tsc --noEmit
```

### 分支策略

- 主分支：`main`
- 你的开发分支：`feat/platform-stats-and-particles`
- 提交格式：conventional commits（如 `feat: add visitor counter`, `feat: add new particle phase`）

---

## 二、代码导读（请先阅读以下文件理解代码风格）

### 必读文件（按优先级排序）

1. **`platform/src/components/HeroParticles.tsx`** — 粒子动画系统，710 行，纯 Canvas 2D + Perlin 噪声 + 弹簧物理。这是任务 2 的核心文件。

2. **`platform/src/components/LandingSections.tsx`** — 首页所有 Section（Hero、SellingPoints、SkillTree、Architecture、Difference、FAQ、Footer）。这是任务 1 放置访问计数器的位置。

3. **`platform/src/app/page.tsx`** — 首页入口，组装各 Section。

4. **`platform/src/app/platform/page.tsx`** — Lab 列表页入口（Server Component），读取 Markdown 后传给 Client Component。

5. **`platform/src/components/PlatformPageClient.tsx`** — Lab 列表页 Client Component，包含时间线侧栏和详情面板。这是任务 3 展示学习统计的位置。

6. **`platform/src/components/PlatformTimeline.tsx`** — Lab 时间线组件，展示 6 个 Lab 的状态。

7. **`server/src/db/database.ts`** — 全部数据库表定义 + CRUD 函数。重点看表结构：`users`、`user_progress`、`sessions`、`api_usage`。

8. **`server/src/index.ts`** — 后端入口，看路由注册模式。新增路由需要在这里 `app.use()`。

9. **`server/src/routes/progress.ts`** — 进度 API，看路由写法风格。

10. **`platform/src/lib/api.ts`** — 前端 API 调用封装，看前端如何调后端。

### 代码风格要点

- **TypeScript strict mode**，ESM 模块
- 前端组件用 `"use client"` 标记客户端组件
- 后端路由用 `Router()` 创建，在 `index.ts` 中 `app.use(router)` 注册
- CSS 使用 CSS 变量（`var(--accent)`、`var(--bg-page)` 等），定义在 `globals.css`
- 配色：暗色主题，主色调为 `--accent: #D4A574`（温暖的铜/金色调）
- 不使用 Tailwind 之外的其他 CSS 框架

---

## 三、开发任务

### 任务 1：访问人数统计（首页）

#### 需求

在首页合适位置展示「本站已被访问 XXX 次」。关键要求：
- **统计口径**：独立访客数（按 IP 或 user_id 去重），不只是 PV
- **审美要求**：必须与当前页面风格协调，不能突兀。BYOCC 的设计风格是「温暖的深色学术风」，主色调铜金色 `#D4A574`
- **有新意**：不是简单的数字计数器，要有设计感。比如：
  - 用粒子数字动画展示
  - 或者用极简的数字 + 微妙的呼吸动画
  - 或者融入 Footer 的某个位置
  - 或者作为 Hero Section 底部的一个小标签
- **性能**：不能拖慢首页加载。统计数据异步获取，不阻塞渲染。

#### 后端实现

在 `server/src/routes/` 新建 `stats.ts`：

```typescript
// server/src/routes/stats.ts
import { Router } from 'express';
import { getDb } from '../db/database.js';

export const statsRouter = Router();

// GET /api/stats/visitors — 返回独立访客数
statsRouter.get('/api/stats/visitors', (_req, res) => {
  // 方案：统计 users 表的总行数（每个用户注册/匿名登录时都有记录）
  // 加上 sessions 表的独立 user_id 数（兜底未注册用户）
  // 返回格式：{ total: number }
  // ...
});
```

然后在 `server/src/index.ts` 中注册：
```typescript
import { statsRouter } from './routes/stats.js';
// ...
app.use(statsRouter);
```

**注意**：database.ts 中已有的 `users` 表记录了所有用户（匿名 + GitHub + password）。可以直接 `SELECT COUNT(*) FROM users` 作为基础访客数。如果需要更精确，可以新加一个 `page_views` 表记录每次访问。

#### 前端实现

在 `platform/src/lib/api.ts` 中添加：
```typescript
export async function getVisitorCount(): Promise<number> { ... }
```

在 `platform/src/components/LandingSections.tsx` 的合适位置添加展示组件。**建议放在 FooterSection 或 HeroSection 底部**，用小字号 + 低对比度文字，不喧宾夺主。

设计参考方向（选择一个你觉得最好的）：
- 方向 A：Footer 左列底部，小字 `已接待 N 位访客`，配合微妙的数字滚动动画
- 方向 B：Hero Section 滚动指示器上方，一个小小的徽章 `N visitors`
- 方向 C：SellingPoints 和 SkillTree 之间，一个独立的极简统计条

---

### 任务 2：新增粒子状态（Logo 粒子形态）

#### 需求

首页的 Hero 区域有一个粒子动画系统，目前有 6 个 Phase 循环：
1. `scatter` — 自由飘散
2. `terminal` — 粒子组成终端窗口图片
3. `explode1` — 爆散
4. `buildYourOwn` — 粒子组成文字 "BUILD YOUR OWN"
5. `explode2` — 再次爆散
6. `stable` — 粒子组成文字 "CLAUDE CODE"

**现在要加第 7 个 Phase**：粒子组成一张新图片。

#### 实现步骤

**Step 1：准备新图片**

将用户提供的图片放到 `platform/public/` 目录下（例如 `logo-hero.png`）。图片要求：
- 透明背景的 PNG
- 对比度高（深色图形在透明背景上），这样粒子采样效果好
- 建议 512x512 左右

**Step 2：在 HeroParticles.tsx 中添加新的 Phase**

```typescript
// 1. 扩展 Phase 类型（约第 29 行）
type Phase =
  | 'scatter'
  | 'terminal'
  | 'logo'          // ← 新增
  | 'explode1'
  | 'buildYourOwn'
  | 'explode2'
  | 'stable';

// 2. 设置持续时间（约第 38 行）
const PHASE_DURATION: Record<Phase, number> = {
  scatter: 6,
  terminal: 12,
  logo: 10,         // ← 新增，10 秒展示
  explode1: 4,
  buildYourOwn: 7,
  explode2: 4,
  stable: 12,
};

// 3. 加入循环顺序（约第 48 行）
const PHASE_ORDER: Phase[] = [
  'scatter', 'terminal', 'logo', 'explode1', 'buildYourOwn', 'explode2', 'stable',
];
```

**Step 3：预加载新图片**

参照现有的 `terminalImg` 预加载模式（第 132-146 行），添加新图片的预加载：

```typescript
let logoImg: HTMLImageElement | null = null;
let logoImgPromise: Promise<HTMLImageElement | null> | null = null;

function preloadLogoImage(): Promise<HTMLImageElement | null> {
  if (logoImg) return Promise.resolve(logoImg);
  if (logoImgPromise) return logoImgPromise;
  logoImgPromise = new Promise((resolve) => {
    const img = new Image();
    img.onload = () => { logoImg = img; resolve(img); };
    img.onerror = () => resolve(null);
    img.src = '/logo-hero.png';  // ← 新图片路径
  });
  return logoImgPromise;
}
```

在 `init()` 函数中也要调用 `preloadLogoImage()`（找到 `preloadTerminalImage()` 的调用位置，紧随其后添加）。

**Step 4：在 switch 中添加新 Phase 的粒子生成逻辑**

找到 `switch (phase)` 语句（约第 388 行），在 `terminal` case 后面添加：

```typescript
case 'logo':
  if (logoImg) {
    pts = sampleImageToPoints(logoImg, w, h, count);
  } else {
    pts = [];
  }
  if (pts.length === 0) pts = generateFallbackPoints(w, h, count);
  break;
```

这完全复用了已有的 `sampleImageToPoints` 函数——它会读取图片像素，在有颜色的位置生成粒子目标点。

#### 注意事项

- 不要修改 `sampleImageToPoints` 函数本身，它已经是通用的图片采样器
- `explode1` 和 `explode2` 两个 explode Phase 的作用是在文字/图片 Phase 之间制造「打散→重组」的视觉节奏
- 如果新图片采样后粒子太少或太多，可以调整 `sampleImageToPoints` 的 `scanGap` 参数（在函数内部），但优先不要改

---

### 任务 3：学习排行榜（Lab 列表页右侧面板）

#### 需求

在 Lab 列表页（`/platform`）右侧添加一个**排行榜面板**，展示学习者及其 Lab 完成进度。

**视觉参考**（来自另一个项目的截图）：

```
┌─────────────────────────┐
│        [BYOCC LOGO]      │  ← 用 platform/src/app/icon.png 作为头部 logo
│                           │
│   RECENT LEARNERS   [N]   │  ← 标题 + 学习者总数 badge
│                           │
│  ┌─────────────────────┐ │
│  │  cookiesheep  ██████ │ │  ← 用户名 + 水平进度条（6/6 Labs）
│  │  teammateA   ████░░░ │ │  ← 进度条按完成 Lab 数量等比例填充
│  │  user123     ███░░░░ │ │
│  │  learner42   ██░░░░░ │ │
│  │  newbie      █░░░░░░ │ │
│  └─────────────────────┘ │
│                           │
│  ┌─────────────────────┐ │
│  │  + 分享给朋友       │ │  ← 底部 CTA 按钮
│  └─────────────────────┘ │
└─────────────────────────┘
```

**设计规格**：
- **位置**：Lab 列表页右侧，与左侧的 `PlatformTimeline` 形成「时间线 | 详情 | 排行榜」三栏布局（桌面端）。移动端收起到详情面板下方。
- **头部**：BYOCC logo（`platform/src/app/icon.png`）居中展示，下方是标题 "LEARNERS" + 人数 badge
- **用户行**：每行左侧是用户名（GitHub 用户用 `nickname` 或 `username`），右侧是水平进度条
- **进度条**：填充色用 `var(--accent)`（铜金色 #D4A574），未填充色用低对比度暗色。长度 = 该用户完成的 Lab 数 / 6
- **排序**：按完成的 Lab 数降序，相同完成数按最近完成时间排序
- **限制**：最多展示 Top 20，超出不显示
- **底部 CTA**：「分享给朋友」按钮，点击复制平台链接（`https://byocc.cc/platform`）
- **整体风格**：深色背景，与 BYOCC 暗色主题一致。圆角卡片，微妙边框 `var(--border)`

#### 后端实现

在 `server/src/routes/stats.ts`（任务 1 已创建）中添加端点：

```typescript
// GET /api/stats/leaderboard — 返回学习排行榜
statsRouter.get('/api/stats/leaderboard', (_req, res) => {
  // 1. 查询有进度记录的 GitHub/password 用户
  //    SELECT u.id, u.username, u.nickname, u.avatar_url,
  //           COUNT(up.lab_number) as completed_labs,
  //           MAX(up.completed_at) as last_completed_at
  //    FROM users u
  //    LEFT JOIN user_progress up ON u.id = up.user_id AND up.completed = 1
  //    WHERE u.kind IN ('github', 'password')
  //    GROUP BY u.id
  //    ORDER BY completed_labs DESC, last_completed_at DESC
  //    LIMIT 20
  //
  // 2. 返回格式：
  // {
  //   totalLearners: number,  // kind='github' 或 'password' 的用户总数
  //   leaderboard: Array<{
  //     username: string,
  //     nickname: string | null,
  //     avatarUrl: string | null,
  //     completedLabs: number,  // 0-6
  //   }>
  // }
});
```

**注意**：
- 只统计 `kind IN ('github', 'password')` 的用户（匿名用户不进排行榜）
- `user_progress` 表中 `completed = 1` 的记录数就是完成的 Lab 数
- 最多返回 20 条

#### 前端实现

**新组件 `LeaderboardPanel.tsx`**：

```typescript
// platform/src/components/LeaderboardPanel.tsx
"use client";

// Props 接口
type LeaderboardEntry = {
  username: string;
  nickname: string | null;
  avatarUrl: string | null;
  completedLabs: number;
};

type LeaderboardData = {
  totalLearners: number;
  leaderboard: LeaderboardEntry[];
};
```

**集成到 PlatformPageClient.tsx**：

当前 Lab 列表页是两栏布局（左 Timeline + 右 DetailPanel）。改为三栏：
- 左栏（20%）：`PlatformTimeline` 不变
- 中栏（45%）：`LabDetailPanel` 不变
- 右栏（35%）：新增 `LeaderboardPanel`，可折叠

在移动端，排行榜折叠为详情面板底部的一个可展开区域。

**图标**：头部 logo 直接用 `<img src="/icon.png" />`（Next.js 会从 `platform/src/app/icon.png` 自动生成到 `public`，如果不行就用 `<Image>` 组件引用）。

#### 注意事项

- 排行榜数据不需要实时刷新，首次加载时获取一次即可
- 如果后端接口暂时没有数据（没有注册用户），排行榜面板应显示友好的空状态：「成为第一个学习者 →」
- GitHub 用户的 `avatar_url` 可能为 null（未授权头像），此时用默认头像或首字母

---

## 四、实施顺序

```
1. 创建分支 feat/platform-stats-and-particles
2. 先做任务 2（粒子状态）—— 最简单，2-3h，快速出成果
3. 再做任务 1（访问计数器）—— 需要前后端协同，设计是关键
4. 最后做任务 3（学习排行榜）—— 需要前后端协同，三栏布局改动
5. 每个任务完成后：
   cd platform && npx tsc --noEmit  # 确认前端编译通过
   cd server && npx tsc --noEmit    # 确认后端编译通过
6. 全部完成后 git push origin feat/platform-stats-and-particles
```

---

## 五、关键约束

1. **不要修改已有的数据库表结构**（users, sessions, progress 等表不能加列改列）。如果要新表，用 `CREATE TABLE IF NOT EXISTS`。
2. **不要安装新的 npm 包**，除非绝对必要（优先用已有的依赖）。
3. **不要修改 `HeroParticles.tsx` 中 `sampleImageToPoints` 函数的签名或核心逻辑**，它是通用的图片采样器。
4. **前端配色只用 CSS 变量**（`var(--accent)`, `var(--text-primary)` 等），不要硬编码颜色值。
5. **后端路由文件命名**：与现有风格一致，如 `stats.ts`，在 `index.ts` 中注册。
6. **TypeScript strict**：所有新代码必须通过 `tsc --noEmit`。
