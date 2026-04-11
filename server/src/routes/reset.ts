/**
 * 重置路由
 *
 * POST /api/reset — 重置容器到初始状态
 */

import { Router } from 'express';
// import { removeContainer, createContainer } from '../services/container-manager.js';

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

  res.json({
    success: false,
    message: 'reset flow not implemented yet',
  });
});
