/**
 * 进度查询路由
 *
 * GET /api/progress?sessionId=xxx — 获取用户各 Lab 完成状态
 */

import { Router } from 'express';
import { getProgress, getUserProgress } from '../db/database.js';
import { getOptionalAuthUser } from '../middleware/auth.js';

export const progressRouter = Router();

progressRouter.get('/api/progress', async (req, res) => {
  const sessionId = typeof req.query.sessionId === 'string' ? req.query.sessionId : undefined;
  const authUser = getOptionalAuthUser(req);

  if (authUser) {
    const userProgress = getUserProgress(authUser.id);
    const sessionProgress =
      sessionId && sessionId.trim() !== '' ? getProgress(sessionId) : [];
    const merged = new Map<number, boolean>();

    // MVP 迁移期：先合并旧 session progress，避免老数据突然消失；
    // 再用 user_progress 覆盖，保证新的 user 级进度优先。
    for (const item of sessionProgress) {
      merged.set(item.labNumber, item.completed);
    }
    for (const item of userProgress) {
      merged.set(item.labNumber, item.completed);
    }

    res.json({
      labs: Array.from(merged.entries())
        .sort(([a], [b]) => a - b)
        .map(([labNumber, completed]) => ({ labNumber, completed })),
    });
    return;
  }

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
