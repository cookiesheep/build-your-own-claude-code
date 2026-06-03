# 方向 A：后端 API + 容器管理 + 部署

> **负责人**：cookiesheep（Leader）
> **原因**：后端需要 Docker 环境和台式机部署权限，只有 Leader 有闲置台式机

---

## 你要做什么（一句话）

搭建一个 Node.js 后端服务，让前端能通过 API 提交代码、管理 Docker 容器、代理终端连接。

## 为什么你要做这个

我们的教学平台需要：
1. 学习者在浏览器写代码 → 点提交 → 代码被注入到 Docker 容器
2. 容器里运行 `node build.mjs --lab 3` 构建 → `node cli.js` 启动 TUI
3. 浏览器里的终端（xterm.js）通过 WebSocket 连接到容器的 ttyd
4. 记录学习者完成了哪些 Lab

你要实现的就是把这些连起来的"胶水层"。

---

## 技术栈

| 技术 | 用途 | 你需要学什么 |
|------|------|-------------|
| **Express.js** | HTTP API 框架 | 路由、中间件、JSON 响应 |
| **dockerode** | Node.js 操作 Docker 的 SDK | 创建/启动/停止容器 |
| **http-proxy** | WebSocket 代理 | 把浏览器 WebSocket 转发到容器 ttyd |
| **better-sqlite3** | SQLite 数据库 | 存用户进度（极简，零配置） |
| **Cloudflare Tunnel** | 内网穿透 | 把台式机服务暴露到公网 |

API Key 管理契约见 [API_KEY_SETTINGS_CONTRACT.md](./API_KEY_SETTINGS_CONTRACT.md)。

---

## 起步指南（Step by Step）

### Step 1：初始化项目结构（30 分钟）

在项目根目录的 `src/` 下创建后端代码：

```
src/
├── server.ts              # Express 主入口
├── routes/
│   ├── session.ts         # POST /api/session — 创建会话
│   ├── submit.ts          # POST /api/submit — 提交代码
│   ├── progress.ts        # GET /api/progress — 获取进度
│   └── reset.ts           # POST /api/reset — 重置容器
├── services/
│   ├── container-manager.ts  # dockerode 封装
│   └── ws-proxy.ts           # WebSocket 代理
├── db/
│   └── database.ts        # SQLite 初始化和查询
└── types/
    └── api.ts             # API 请求/响应类型
```

### Step 2：实现容器管理（核心，3-4 小时）

这是后端最重要的部分。用 dockerode 管理 Docker 容器。

```typescript
// src/services/container-manager.ts
import Docker from 'dockerode';

const docker = new Docker(); // 自动连接本地 Docker

export class ContainerManager {
  // 为某个 session 创建容器
  async createContainer(sessionId: string): Promise<string> {
    const container = await docker.createContainer({
      Image: 'byocc-lab',           // 我们的 Lab 镜像
      name: `lab-${sessionId}`,
      ExposedPorts: { '7681/tcp': {} },
      HostConfig: {
        PortBindings: { '7681/tcp': [{ HostPort: '0' }] }, // 随机端口
        Memory: 512 * 1024 * 1024,   // 512MB 限制
        CpuPeriod: 100000,
        CpuQuota: 50000,             // 50% CPU
      },
    });
    await container.start();
    return container.id;
  }

  // 注入学习者代码到容器
  async injectCode(containerId: string, code: string, labNumber: number): Promise<void> {
    // 用 docker exec 写文件
    const container = docker.getContainer(containerId);
    const exec = await container.exec({
      Cmd: ['bash', '-c', `echo '${code}' > /workspace/src/query-lab.ts`],
      AttachStdout: true,
    });
    await exec.start({});
  }

  // 触发构建
  async build(containerId: string, labNumber: number): Promise<string> {
    // docker exec: node build.mjs --lab
    // 返回构建日志
  }

  // 获取容器的 ttyd 端口
  async getTtydPort(containerId: string): Promise<number> {
    const container = docker.getContainer(containerId);
    const info = await container.inspect();
    return parseInt(info.NetworkSettings.Ports['7681/tcp'][0].HostPort);
  }

  // 停止并删除容器
  async removeContainer(sessionId: string): Promise<void> { ... }
}
```

### Step 3：实现 API 路由（2-3 小时）

```typescript
// src/routes/submit.ts
import { Router } from 'express';
import { containerManager } from '../services/container-manager';

const router = Router();

// 学习者提交代码
router.post('/api/submit', async (req, res) => {
  const { sessionId, code, labNumber } = req.body;

  try {
    // 1. 注入代码到容器
    await containerManager.injectCode(sessionId, code, labNumber);
    // 2. 触发构建
    const buildLog = await containerManager.build(sessionId, labNumber);
    // 3. 返回结果
    res.json({ success: true, buildLog });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
```

### Step 4：实现 WebSocket 代理（1-2 小时）

```typescript
// src/services/ws-proxy.ts
import httpProxy from 'http-proxy';

const proxy = httpProxy.createProxyServer({ ws: true });

// 根据 sessionId 代理到对应容器的 ttyd
export function proxyWebSocket(req, socket, head, ttydPort: number) {
  proxy.ws(req, socket, head, {
    target: `http://localhost:${ttydPort}`,
  });
}
```

### Step 5：SQLite 数据库（1 小时）

```typescript
// src/db/database.ts
import Database from 'better-sqlite3';

const db = new Database('byocc.sqlite');

// 初始化表
db.exec(`
  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    container_id TEXT
  );
  CREATE TABLE IF NOT EXISTS progress (
    session_id TEXT,
    lab_number INTEGER,
    completed BOOLEAN DEFAULT FALSE,
    completed_at TEXT,
    PRIMARY KEY (session_id, lab_number)
  );
`);
```

### Step 6：部署到台式机（Sprint 2-3）

> 当前部署前置清单已迁移到 [PUBLIC_DEMO_SECURITY_CHECKLIST.md](./PUBLIC_DEMO_SECURITY_CHECKLIST.md)。
> 公开分享 URL 前，必须先按该清单设置 `BYOCC_AUTH_SECRET`、`CORS_ORIGINS`、Cloudflare Access policy 和 E2E regression。

```bash
# 1. 在台式机上安装 Cloudflare Tunnel
winget install cloudflare.cloudflared

# 2. 登录
cloudflared tunnel login

# 3. 创建 tunnel
cloudflared tunnel create byocc

# 4. 配置 DNS（需要一个域名，或用 *.trycloudflare.com 临时域名）
# 临时方式（无需域名）：
cloudflared tunnel --url http://localhost:3000

# 5. 启动服务
npm run start  # Express 在 3000 端口
```

---

## AI 工具使用指南

### 推荐工具
- **Claude Code**（如果有）或 **Codex CLI**（免费）
- **GitHub Copilot**（学生可免费申请）

### 给 AI 的提示词模板

**初始化项目时：**
```
在 D:\code\build-your-own-claude-code\src\ 目录下，
初始化一个 Express.js 后端项目。

要求：
1. TypeScript strict 模式
2. ESM (import/export)
3. 创建以下路由：
   - POST /api/session — 创建用户会话
   - POST /api/submit — 接收代码并注入容器
   - GET /api/progress — 获取用户进度
   - POST /api/reset — 重置容器
4. 使用 dockerode 管理 Docker 容器
5. 使用 better-sqlite3 存储用户进度
6. 端口 3000

请先创建目录结构，再逐个实现文件。
```

**遇到问题时：**
```
我在实现 WebSocket 代理时遇到问题。
前端用 xterm.js 通过 WebSocket 连接，
后端需要把这个连接代理到 Docker 容器内的 ttyd（端口 7681）。

当前代码：[粘贴你的代码]
错误信息：[粘贴错误]

请帮我修复。
```

---

## 交付清单（Sprint 1 结束时）

- [ ] Express 服务器启动正常（`npm run dev` → localhost:3000 响应）
- [ ] `POST /api/session` 能创建 Docker 容器
- [ ] `POST /api/submit` 能注入代码并触发构建
- [ ] WebSocket 代理能连通容器 ttyd
- [ ] SQLite 数据库能记录进度
- [ ] 基本错误处理（容器不存在、构建失败等）

## 进度记录

在此文件下方记录你的工作进度：

---

### 工作日志

> 每次完成工作后在这里添加记录，格式：
> `### YYYY-MM-DD`
> `- ✅ 完成了什么`
> `- 🔄 正在做什么`
> `- ⚠️ 遇到什么问题`
