/**
 * 会话管理路由
 *
 * POST /api/session — 创建或恢复用户会话
 *
 * TODO: 实现会话创建逻辑
 */

import { Router } from 'express';
// import { createContainer, getContainerStatus } from '../services/container-manager.js';
// import { createSession, getSession } from '../db/database.js';

export const sessionRouter = Router();

sessionRouter.post('/api/session', async (req, res) => {
  // TODO: 实现会话创建
  //
  // 逻辑：
  // 1. 从请求中获取 sessionId（如果没有则生成新的 UUID）
  // 2. 检查数据库中是否已有此会话
  //    - 有 → 检查容器是否还在运行，返回现有会话信息
  //    - 没有 → 创建新容器，记录到数据库，返回新会话信息
  // 3. 返回：{ sessionId, containerId, status }

  res.json({
    message: 'TODO: 实现会话创建',
    hint: '参考 server/src/services/container-manager.ts 的 createContainer 方法',
  });
});
