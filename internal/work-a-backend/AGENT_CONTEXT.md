# AI Agent 上下文文档 — 后端 API 开发

> 把这份文档发给你的 AI 工具（Codex、Copilot、ChatGPT 等），它就能理解整个项目并帮你完成任务。

---

## 项目概览

**项目名称**：Build Your Own Claude Code (BYOCC)

**一句话介绍**：一个基于真实 Claude Code 源码的渐进式教学平台。学习者在浏览器写代码 → 点提交 → 代码注入 Docker 容器 → 容器内构建 → 浏览器终端显示真实 Claude Code TUI。

**你负责后端 API + Docker 容器管理 + 部署。**

## 架构

```
浏览器 (Next.js 前端)
  ↕ HTTP + WebSocket
Express 后端 (你负责!)
  ├── POST /api/session   → 创建/恢复会话，分配 Docker 容器
  ├── POST /api/submit    → 接收代码 → 注入容器 → 触发构建
  ├── GET  /api/progress  → 查询 Lab 完成进度
  ├── POST /api/reset     → 重置容器
  └── WS /api/terminal/:id → WebSocket 代理到容器 ttyd
  ↕ Docker API (dockerode)
Docker 容器 (每用户一个)
  ├── Node.js 18 + claude-code-diy 源码
  ├── ttyd 端口 7681 (终端 WebSocket)
  └── /workspace/src/query-lab.ts ← 学习者代码注入到这里
```

## 已有的脚手架（你需要实现 TODO）

后端代码在 `server/` 目录下，结构已创建好：

```
server/
├── package.json          ← 依赖已声明（express, dockerode, better-sqlite3 等）
├── tsconfig.json         ← TypeScript 配置
└── src/
    ├── index.ts          ← 主入口（已写好框架，路由已注册）
    ├── routes/
    │   ├── session.ts    ← TODO: 实现会话创建
    │   ├── submit.ts     ← TODO: 实现代码提交（最核心！）
    │   ├── progress.ts   ← TODO: 实现进度查询
    │   └── reset.ts      ← TODO: 实现容器重置
    ├── services/
    │   ├── container-manager.ts  ← TODO: 6 个方法待实现
    │   └── ws-proxy.ts           ← TODO: WebSocket 代理
    └── db/
        └── database.ts   ← TODO: SQLite 初始化和查询
```

**每个 TODO 文件都有详细注释说明输入输出和实现思路。** 直接打开文件看注释即可。

## 核心工作流（submit API 详解）

这是最重要的 API，学习者的代码通过它进入容器：

```
前端点「提交」
  → POST /api/submit { sessionId, code, labNumber }
  → 后端收到代码字符串
  → container-manager.injectCode(): 用 docker exec 把代码写入容器
  → container-manager.buildInContainer(): 在容器内运行 node build.mjs --lab
  → 返回 { success, buildLog }
  → 前端显示构建结果
  → 学习者在终端输入 node cli.js 看到 TUI
```

## Docker 相关

### Lab 容器镜像

镜像构建文件在 `infrastructure/Dockerfile.lab`（已验证可用）。

容器内环境：
- Node.js 18
- ttyd 1.7.7（端口 7681）
- 将来会包含 claude-code-diy 预克隆代码

### dockerode 用法速查

```typescript
import Docker from 'dockerode';
const docker = new Docker(); // 自动连接本地 Docker

// 创建容器
const container = await docker.createContainer({
  Image: 'byocc-lab',
  name: `lab-${sessionId}`,
  ExposedPorts: { '7681/tcp': {} },
  HostConfig: {
    PortBindings: { '7681/tcp': [{ HostPort: '0' }] }, // 随机端口
    Memory: 512 * 1024 * 1024,
  },
});
await container.start();

// 在容器内执行命令
const exec = await container.exec({ Cmd: ['node', '--version'], AttachStdout: true, AttachStderr: true });
const stream = await exec.start({});

// 查看端口映射
const info = await container.inspect();
const hostPort = info.NetworkSettings.Ports['7681/tcp'][0].HostPort;

// 停止并删除
await container.stop();
await container.remove();
```

## 起步步骤

```bash
cd server
npm install          # 安装依赖
npm run dev          # 启动开发服务器（tsx watch 自动重启）
# → http://localhost:3001/api/health 应返回 { status: "ok" }
```

然后按 TODO 注释逐个实现。建议顺序：
1. database.ts（最简单，先跑通数据存储）
2. container-manager.ts 的 createContainer（核心）
3. session.ts 路由
4. submit.ts 路由（最复杂，需要 injectCode + build）
5. ws-proxy.ts（WebSocket 代理）
6. progress.ts 和 reset.ts（简单）

---

## 给 AI 的完整提示词

---

**背景**：我在做一个教学平台后端。学习者在浏览器写 TypeScript 代码，后端接收代码后注入 Docker 容器、触发编译、通过 WebSocket 代理终端连接。

**已有代码**：Express 项目脚手架已创建在 `server/` 目录下，`src/index.ts` 是主入口（路由已注册），4 个路由文件和 3 个服务文件都有详细 TODO 注释。

**需要你实现的**（按优先级）：

1. **server/src/db/database.ts** — SQLite 数据库
   - 使用 `better-sqlite3`
   - sessions 表（id, container_id, created_at）
   - progress 表（session_id, lab_number, completed）
   - 导出 initDatabase, createSession, getSession, updateProgress, getProgress

2. **server/src/services/container-manager.ts** — Docker 容器管理
   - 使用 `dockerode`
   - createContainer(sessionId) → 创建容器，端口映射 7681→随机，返回 containerId
   - injectCode(sessionId, code, labNumber) → docker exec 写文件到容器
   - buildInContainer(sessionId, labNumber) → docker exec 运行 node build.mjs --lab
   - getTtydPort(sessionId) → 获取容器 ttyd 映射的主机端口
   - removeContainer(sessionId) → 停止并删除

3. **server/src/routes/submit.ts** — 代码提交 API
   - POST /api/submit，请求体 { sessionId, code, labNumber }
   - 调用 injectCode → buildInContainer
   - 返回 { success, buildLog }

4. **server/src/services/ws-proxy.ts** — WebSocket 代理
   - 监听 HTTP server 的 'upgrade' 事件
   - 从 URL 提取 sessionId → 查找容器 ttyd 端口 → http-proxy 代理

5. **其他路由**：session.ts, progress.ts, reset.ts（参考文件内 TODO 注释）

**技术约束**：
- TypeScript strict, ESM (type: "module")
- Express 4.x
- dockerode 4.x
- better-sqlite3 11.x
- 端口 3001

请逐个文件实现，包含完整错误处理。代码注入时用 base64 编码防止特殊字符问题。
