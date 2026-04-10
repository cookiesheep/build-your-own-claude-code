/**
 * 会话管理路由
 *
 * POST /api/session — 创建或恢复用户会话
 */

import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { createSession, getSession } from '../db/database.js';
// import { createContainer, getContainerStatus } from '../services/container-manager.js';

export const sessionRouter = Router();

sessionRouter.post('/api/session', async (req, res) => {
  const requestedSessionId =
    typeof req.body?.sessionId === 'string' && req.body.sessionId.trim() !== ''
      ? req.body.sessionId.trim()
      : undefined;

  if (requestedSessionId) {
    const existingSession = getSession(requestedSessionId);
    if (existingSession) {
      res.json({
        sessionId: existingSession.id,
        status: 'creating',
      });
      return;
    }
  }

  const sessionId = requestedSessionId ?? uuidv4();
  createSession(sessionId, null);

  res.json({
    sessionId,
    status: 'creating',
  });
});
