/**
 * 重置路由
 *
 * POST /api/reset — 重置容器到初始状态
 *
 * TODO: 实现重置逻辑
 */

import { Router } from 'express';
// import { removeContainer, createContainer } from '../services/container-manager.js';

export const resetRouter = Router();

resetRouter.post('/api/reset', async (req, res) => {
  // TODO: 实现重置逻辑
  //
  // 请求体：{ sessionId: string }
  //
  // 逻辑：
  // 1. 停止并删除旧容器
  // 2. 创建新容器
  // 3. 返回新容器信息

  res.json({ message: 'TODO: 实现容器重置' });
});
