/**
 * 会话管理路由
 *
 * POST /api/session — 创建或恢复浏览器会话
 *
 * 注意：
 * - session 只是“这个浏览器是谁”的临时标识。
 * - Docker 容器属于 environment，不在这里创建。
 * - 这样用户只是浏览 Lab 文档时，不会浪费一个容器。
 */

import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { createSession, getSession } from '../db/database.js';
import { getOptionalAuthUser } from '../middleware/auth.js';

export const sessionRouter = Router();

sessionRouter.post('/api/session', async (req, res) => {
  try {
    const requestedSessionId =
      typeof req.body?.sessionId === 'string' && req.body.sessionId.trim() !== ''
        ? req.body.sessionId.trim()
        : undefined;

    const sessionId = requestedSessionId ?? uuidv4();
    const existingSession = getSession(sessionId);
    const authUser = getOptionalAuthUser(req);

    if (existingSession) {
      if (existingSession.userId && !authUser) {
        res.status(401).json({
          message: 'Missing or invalid auth token.',
        });
        return;
      }

      if (existingSession.userId && authUser && existingSession.userId !== authUser.id) {
        res.status(403).json({
          message: 'This session belongs to a different user.',
        });
        return;
      }

      if (!existingSession.userId && authUser) {
        createSession(
          existingSession.id,
          existingSession.containerId,
          existingSession.environmentStatus,
          authUser.id
        );
      }

      res.json({
        sessionId: existingSession.id,
        status: 'restored',
        environmentStatus: existingSession.environmentStatus,
        userId: existingSession.userId ?? authUser?.id ?? null,
      });
      return;
    }

    createSession(sessionId, null, 'not_started', authUser?.id ?? null);

    res.json({
      sessionId,
      status: 'created',
      environmentStatus: 'not_started',
      userId: authUser?.id ?? null,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown error while creating session.';

    res.status(500).json({
      message: 'Failed to create or restore session.',
      error: message,
    });
  }
});
