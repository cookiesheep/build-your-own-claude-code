# claude 写的提示词

## 后端提示词（发给 Codex，也重新优化了）

请读取 @internal/work-a-backend/AGENT_CONTEXT.md 了解项目背景。

任务：启动 Express 后端（MVP 阶段）

## 目标

```
cd server && npm run dev
```

服务器启动，http://localhost:3001/api/health 返回 200。

## Step 1：安装依赖

```
cd server
npm install
```

如果报错缺少某个包，用 npm install 单独安装。

## Step 2：实现 database.ts（最优先，其他模块依赖它）

```
// server/src/db/database.ts
// 用 better-sqlite3 实现，同步 API，简单可靠

import Database from 'better-sqlite3';
import { join } from 'path';

const DB_PATH = join(process.cwd(), 'byocc.sqlite');
let db: Database.Database;

export function initDatabase(): void {
  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      container_id TEXT,
      ttyd_port INTEGER,
      created_at TEXT DEFAULT (datetime('now')),
      last_active TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS progress (
      session_id TEXT,
      lab_number INTEGER,
      completed INTEGER DEFAULT 0,
      completed_at TEXT,
      PRIMARY KEY (session_id, lab_number)
    );
  `);
  console.log('💾 Database initialized:', DB_PATH);
}

// 导出 createSession, getSession, updateProgress, getProgress 函数
// 用 better-sqlite3 的 prepare().run() / prepare().get() / prepare().all()
```

## Step 3：让服务器能启动（其他路由先 stub）

修改以下文件，让它们不报错、服务器能启动：

- services/ws-proxy.ts：setupWebSocketProxy 只打印 console.log，不实现
- services/container-manager.ts：所有函数先 throw new Error('TODO')（已经这样了，不要改）
- routes/session.ts：返回 { sessionId: 'mock-session', status: 'ok' }
- routes/submit.ts：返回 { success: true, buildLog: '构建功能待实现' }
- routes/progress.ts：从数据库查询（database.ts 实现后），返回进度数据
- routes/reset.ts：返回 { success: true }

## 完成标准

```
cd server
npm run dev
```

输出：

```
💾 Database initialized: .../byocc.sqlite
📡 WebSocket proxy: TODO — 待实现
🚀 BYOCC Server running at http://localhost:3001
curl http://localhost:3001/api/health
```

返回：

```
{ "status": "ok", "timestamp": "..." }
curl -X POST http://localhost:3001/api/session -H 'Content-Type: application/json' -d '{}'
```

返回：

```
{ "sessionId": "mock-session", "status": "ok" }
```

注意：TypeScript strict 模式，ESM，不要修改 src/index.ts 的整体框架。