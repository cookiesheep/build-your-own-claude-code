/**
 * 进度查询路由
 *
 * GET /api/progress?sessionId=xxx — 获取用户各 Lab 完成状态
 *
 * TODO: 实现进度查询逻辑
 */

import { Router } from 'express';
// import { getProgress } from '../db/database.js';

export const progressRouter = Router();

progressRouter.get('/api/progress', async (req, res) => {
  // TODO: 实现进度查询
  //
  // 查询参数：sessionId
  //
  // 逻辑：
  // 1. 从数据库查询该 sessionId 的所有 Lab 完成状态
  // 2. 返回：{ labs: [{ labNumber: 0, completed: true }, { labNumber: 1, completed: false }, ...] }

  res.json({
    labs: [
      { labNumber: 0, completed: false },
      { labNumber: 1, completed: false },
      { labNumber: 2, completed: false },
      { labNumber: 3, completed: false },
    ],
    message: 'TODO: 从数据库查询真实进度',
  });
});
