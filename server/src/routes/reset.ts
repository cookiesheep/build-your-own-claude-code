/**
 * 重置路由
 *
 * POST /api/reset — 重置容器到初始状态
 */

import { Router } from 'express';
import { createSession, getSession } from '../db/database.js';
import { requireSessionAccess } from '../middleware/auth.js';
import { createContainer, removeContainer } from '../services/container-manager.js';

export const resetRouter = Router();

resetRouter.post('/api/reset', async (req, res) => {
  const { sessionId } = req.body ?? {};

  if (typeof sessionId !== 'string' || sessionId.trim() === '') {
    res.status(400).json({
      success: false,
      message: 'Invalid request: sessionId must be a non-empty string.',
    });
    return;
  }

  const session = getSession(sessionId);
  if (!session) {
    res.status(400).json({
      success: false,
      message: 'Session not found. Please create a session before resetting.',
    });
    return;
  }

  const access = requireSessionAccess(req, session);
  if (!access.ok) {
    res.status(access.statusCode).json({
      success: false,
      message: access.message,
    });
    return;
  }

  try {
    if (access.shouldBindSession) {
      createSession(sessionId, session.containerId, session.environmentStatus, access.user.id);
    }

    // MVP reset 策略：直接删旧容器，再从镜像创建新容器。
    // 这样比在容器里手动清理文件更可靠，也更容易给新同学理解。
    await removeContainer(sessionId);
    const containerId = await createContainer(sessionId);
    createSession(sessionId, containerId, 'running', access.user.id);

    res.json({
      success: true,
      sessionId,
      containerId,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown error while resetting session.';

    res.status(500).json({
      success: false,
      message,
    });
  }
});
