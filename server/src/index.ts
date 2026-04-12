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
import { authRouter } from './routes/auth.js';
import { sessionRouter } from './routes/session.js';
import { environmentRouter } from './routes/environment.js';
import { submitRouter } from './routes/submit.js';
import { progressRouter } from './routes/progress.js';
import { resetRouter } from './routes/reset.js';
import { initDatabase } from './db/database.js';
import { setupWebSocketProxy } from './services/ws-proxy.js';

const app = express();
const PORT = parseInt(process.env.PORT || '3001', 10);
const HOST = process.env.HOST || '127.0.0.1';
const ALLOWED_ORIGINS = (process.env.CORS_ORIGINS ?? 'http://localhost:3000,http://127.0.0.1:3000')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

// 中间件
app.use(
  cors({
    origin(origin, callback) {
      // 没有 Origin 的请求通常来自 curl、PowerShell 或同机脚本。
      // 本地开发阶段允许这类请求，浏览器跨域请求则必须命中白名单。
      if (!origin || ALLOWED_ORIGINS.includes(origin)) {
        callback(null, true);
        return;
      }

      // 对不在白名单的浏览器来源，不返回 Access-Control-Allow-Origin。
      // 这样浏览器会拦截响应；同时避免把普通请求变成 500。
      callback(null, false);
    },
  })
);
app.use(express.json({ limit: '1mb' })); // 代码提交可能较大

// 初始化数据库
initDatabase();

// API 路由
app.use(authRouter);
app.use(sessionRouter);
app.use(environmentRouter);
app.use(submitRouter);
app.use(progressRouter);
app.use(resetRouter);

// 健康检查
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 启动 HTTP 服务器
const server = app.listen(PORT, HOST, () => {
  console.log(`🚀 BYOCC Server running at http://${HOST}:${PORT}`);
  console.log(`   Health check: http://${HOST}:${PORT}/api/health`);
});

// 设置 WebSocket 代理（升级 HTTP → WebSocket）
setupWebSocketProxy(server);

export default app;
