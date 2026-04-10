/**
 * 会话管理路由
 *
 * POST /api/session — 创建或恢复用户会话
 */

import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { createSession, getSession } from '../db/database.js';
import { createContainer, getContainerStatus } from '../services/container-manager.js';

export const sessionRouter = Router();

sessionRouter.post('/api/session', async (req, res) => {
  try {
    const requestedSessionId =
      typeof req.body?.sessionId === 'string' && req.body.sessionId.trim() !== ''
        ? req.body.sessionId.trim()
        : undefined;

    const sessionId = requestedSessionId ?? uuidv4();
    const existingSession = getSession(sessionId);

    // 如果这个 session 已经对应一台正在运行的实验机，就直接复用。
    if (existingSession) {
      const containerStatus = await getContainerStatus(existingSession.id);
      if (containerStatus === 'running') {
        // 这里重新走一次 createContainer，不是为了新建容器，
        // 而是为了拿到当前真实容器的 id，并顺手把数据库记录补齐。
        const containerId = await createContainer(existingSession.id);
        createSession(existingSession.id, containerId);

        res.json({
          sessionId: existingSession.id,
          status: 'running',
        });
        return;
      }
    }

    // 新 session，或者旧 session 对应的容器已经不存在/已停止：
    // 都走“创建或恢复容器”这条真实路径。
    const containerId = await createContainer(sessionId);
    createSession(sessionId, containerId);

    res.json({
      sessionId,
      status: 'creating',
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown error while creating session.';

    res.status(500).json({
      message: 'Failed to create or resume session.',
      error: message,
    });
  }
});
