/**
 * 重置路由
 *
 * POST /api/reset — 重置容器到初始状态
 */

import { Router } from 'express';
import { createSession, getSession } from '../db/database.js';
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

  try {
    // MVP reset 策略：直接删旧容器，再从镜像创建新容器。
    // 这样比在容器里手动清理文件更可靠，也更容易给新同学理解。
    await removeContainer(sessionId);
    const containerId = await createContainer(sessionId);
    createSession(sessionId, containerId);

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
