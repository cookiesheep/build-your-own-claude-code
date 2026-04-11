/**
 * 进度查询路由
 *
 * GET /api/progress?sessionId=xxx — 获取用户各 Lab 完成状态
 */

import { Router } from 'express';
import { getProgress } from '../db/database.js';

export const progressRouter = Router();

progressRouter.get('/api/progress', async (req, res) => {
  const sessionId = typeof req.query.sessionId === 'string' ? req.query.sessionId : undefined;

  if (!sessionId || sessionId.trim() === '') {
    res.status(400).json({
      labs: [],
      message: 'sessionId query parameter is required.',
    });
    return;
  }

  res.json({
    labs: getProgress(sessionId),
  });
});
