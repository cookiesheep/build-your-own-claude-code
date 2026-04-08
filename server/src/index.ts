/**
 * BYOCC 后端主入口
 *
 * 启动方式：npm run dev（开发模式，自动重启）
 *
 * API 路由：
 *   POST /api/session  — 创建/获取用户会话，分配 Docker 容器
 *   POST /api/submit   — 接收学习者代码，注入容器，触发构建
 *   GET  /api/progress — 获取用户各 Lab 完成状态
 *   POST /api/reset    — 重置容器到初始状态
 *   WS   /api/terminal/:sessionId — WebSocket 代理到容器 ttyd
 */

import express from 'express';
import cors from 'cors';
import { sessionRouter } from './routes/session.js';
import { submitRouter } from './routes/submit.js';
import { progressRouter } from './routes/progress.js';
import { resetRouter } from './routes/reset.js';
import { initDatabase } from './db/database.js';
import { setupWebSocketProxy } from './services/ws-proxy.js';

const app = express();
const PORT = parseInt(process.env.PORT || '3001', 10);

// 中间件
app.use(cors());
app.use(express.json({ limit: '1mb' })); // 代码提交可能较大

// 初始化数据库
initDatabase();

// API 路由
app.use(sessionRouter);
app.use(submitRouter);
app.use(progressRouter);
app.use(resetRouter);

// 健康检查
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 启动 HTTP 服务器
const server = app.listen(PORT, () => {
  console.log(`🚀 BYOCC Server running at http://localhost:${PORT}`);
  console.log(`   Health check: http://localhost:${PORT}/api/health`);
});

// 设置 WebSocket 代理（升级 HTTP → WebSocket）
setupWebSocketProxy(server);

export default app;
