# 前端重构规划

> 更新时间：2026-04-16
> 状态：规划完成，待实施
> 前置条件：后端已完成 12 个 PR，所有 API 可用

---

## 一、当前前端状态

### 已有的页面
- `/` — 首页（6 个 Lab 卡片 + 深色主题）
- `/lab/:id` — 实验工作台（文档 + Monaco 编辑器 + xterm.js 终端）

### 已有的组件
- `Navbar` — 顶部导航，Lab 0-5 tab
- `LabWorkspace` — 工作台主组件，管理 session/submit/build 状态
- `CodeEditor` — Monaco Editor 封装
- `Terminal` — xterm.js 终端（支持 ttyd WebSocket 协议）
- `SubmitButton` — 提交按钮（带 loading 状态）

### 已有的 API 客户端
- `platform/src/lib/api.ts` — 完整的后端 API 客户端（auth + session + environment + submit + progress + workspace）

### 当前问题
1. 首页是 Lab 选择页，不是营销首页
2. Lab 工作台布局固定，无法调整各区域大小
3. 文档区太小，没有目录栏
4. 没有文件目录树，用户只能修改固定的一个文件
5. 代码编辑区和终端区宽度不够

---

## 二、重构目标

### 页面结构变更

```
/ (新)              → 营销首页
  ├── /docs         → 文档站（MkDocs，外部）
  ├── /platform (新) → Lab 选择页（原首页内容搬迁）
  │   └── /lab/:id  → 实验工作台（重构）
  ├── /team (新)    → 团队介绍
  └── /resources (新) → 相关资源
```

### 实验工作台布局变更

从固定双栏改为四区域可调整布局：

```
┌──────────────────────────────────────────────────────────────┐
│ Navbar                                                        │
├────────┬─────────────────────────────────────────────────────┤
│        │  ┌─ 代码编辑器 ──────────────────────────────────┐ │
│ 文件树  │  │  Monaco Editor                                │ │
│ (可折叠) │  │                                                │ │
│  ▸ src/ │  └────────────────────────────────────────────────┘ │
│   ▸ ... │  ──── 拖拽分割线（可调高度）────                     │
│        │  ┌─ 终端 ────────────────────────────────────────┐ │
│ ────── │  │  xterm.js                                     │ │
│        │  │  $ node cli.js                                 │ │
│ 文档区  │  └────────────────────────────────────────────────┘ │
│ (可折叠) │                                                    │
│  📖 Lab  │                                                    │
│  核心要点 │                                                    │
└────────┴─────────────────────────────────────────────────────┘
```

### 文件目录树功能（MVP）

- 预生成静态 `file-tree.json`
- 每个 Lab 配置 `editableFiles`（哪些文件可编辑）
- 目标文件高亮引导，其他文件显示 🔒（只读）
- 点击只读文件 → Monaco 以只读模式显示
- 点击目标文件 → 加载 workspace snapshot 或默认骨架

---

## 三、实施 PR 拆分

### PR-F1：页面路由重构

**目标**：新增营销首页，搬迁现有首页到 /platform

**涉及文件**：
- `platform/src/app/page.tsx` — 改写为营销首页
- `platform/src/app/platform/page.tsx` — 新增，搬迁现有首页内容
- `platform/src/app/layout.tsx` — 更新 Navbar 链接
- `platform/src/components/Navbar.tsx` — 更新导航项（首页/平台/文档/团队）

**验收标准**：
- `/` 显示营销首页（项目介绍 + CTA 按钮）
- `/platform` 显示 Lab 选择卡片
- 点击「进入平台」跳转到 `/platform`
- 点击「阅读文档」跳转到 MkDocs 站点
- `/lab/3` 不受影响

**是否需要后端配合**：否

---

### PR-F2：实验工作台可调整面板

**目标**：Lab 页面从固定布局改为可拖拽调整的四区域布局

**涉及文件**：
- `platform/src/components/LabWorkspace.tsx` — 重构布局
- `platform/src/components/FileTree.tsx` — 新增（先用占位内容）
- `platform/src/components/DocPanel.tsx` — 新增，文档区独立组件
- `platform/package.json` — 新增 `react-resizable-panels` 依赖

**验收标准**：
- 文件树区域可折叠
- 文档区域可折叠
- 编辑器和终端之间可拖拽调整高度
- 所有区域折叠/展开有平滑过渡
- 双击分割线可重置为默认比例

**是否需要后端配合**：否

---

### PR-F3：文件目录树

**目标**：在左侧显示 claude-code-diy 的源码目录结构

**涉及文件**：
- `platform/src/components/FileTree.tsx` — 实现目录树渲染
- `platform/src/lib/file-tree-data.ts` — 新增，静态目录树数据
- `platform/src/lib/lab-config.ts` — 新增，每个 Lab 的 editableFiles 配置
- `platform/src/components/LabWorkspace.tsx` — 接入文件树

**验收标准**：
- 目录树正确显示 claude-code-diy 源码结构
- 当前 Lab 目标文件高亮
- 其他文件显示 🔒 图标
- 点击 🔒 文件提示"当前 Lab 不可编辑此文件"
- 点击目标文件 → Monaco 加载对应内容

**是否需要后端配合**：查看只读文件内容需要 `GET /api/files/:path`（PR-B1）

---

### PR-F4：文档区优化

**目标**：文档区显示核心要点 + 外链完整文档

**涉及文件**：
- `platform/src/components/DocPanel.tsx` — 实现文档渲染
- `platform/src/lib/lab-docs.ts` — 新增，每个 Lab 的精简文档内容

**验收标准**：
- 文档区显示当前 Lab 的核心概念 + TODO 提示
- 底部有「📖 阅读完整文档」按钮，新标签页打开 MkDocs
- Markdown 渲染正常（代码块、表格、列表）

**是否需要后端配合**：否

---

## 四、后端待做（配合前端重构）

### PR-B1：文件读取 API

**目标**：支持前端读取容器内任意文件内容

**涉及文件**：
- `server/src/routes/files.ts` — 新增
- `server/src/index.ts` — 注册路由

**API**：`GET /api/files/:path?sessionId=xxx`
- 后端 `docker exec cat /workspace/:path`
- 需要路径安全校验（只允许 /workspace/ 下的文件）
- 需要 auth + session ownership 校验

---

### PR-B2：API Key 注入（答辩前）

**目标**：支持用户使用自己的 API Key 或使用默认 Key

**涉及文件**：
- `server/src/routes/settings.ts` — 新增
- `server/src/services/container-manager.ts` — createContainer 加 ENV 注入
- `platform/src/components/SettingsModal.tsx` — 新增

---

## 五、优先级排序

| 顺序 | PR | 说明 | 前端/后端 |
|------|-----|------|----------|
| 1 | PR-F1 | 页面路由重构 | 前端 |
| 2 | PR-F2 | 可调整面板 | 前端 |
| 3 | PR-F3 | 文件目录树 | 前端 |
| 4 | PR-B1 | 文件读取 API | 后端 |
| 5 | PR-F4 | 文档区优化 | 前端 |
| 6 | PR-B2 | API Key 注入 | 前后端 |

---

## 六、不能动的地方

前端重构时必须保留的后端 API 调用链路：
- auth token flow（`/api/auth/anonymous` + Bearer header）
- session/environment split（先 session 后 environment/start）
- workspace auto-save（`PUT /api/labs/:id/workspace`）
- submit flow（`POST /api/submit`）
- terminal wss:// support（`WS /api/terminal/:sessionId?token=`）
- progress user-level state（`GET /api/progress`）

重构后必须验证：`cd server && npm run e2e:regression` 通过。
