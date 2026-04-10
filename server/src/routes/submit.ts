/**
 * 代码提交路由
 *
 * POST /api/submit — 接收学习者代码，注入容器，触发构建
 *
 * 这是平台最核心的 API：
 *   学习者写完代码 → 点提交 → 代码被注入 Docker 容器
 *   → 容器内运行 node build.mjs --lab N → 构建结果返回前端
 */

import { Router } from 'express';
// import { injectCode, buildInContainer } from '../services/container-manager.js';
// import { updateProgress } from '../db/database.js';

export const submitRouter = Router();

submitRouter.post('/api/submit', async (req, res) => {
  const { sessionId, code, labNumber } = req.body ?? {};

  if (typeof sessionId !== 'string' || sessionId.trim() === '') {
    res.status(400).json({
      success: false,
      buildLog: 'Invalid request: sessionId must be a non-empty string.',
    });
    return;
  }

  if (typeof code !== 'string') {
    res.status(400).json({
      success: false,
      buildLog: 'Invalid request: code must be a string.',
    });
    return;
  }

  if (!Number.isInteger(labNumber) || labNumber < 0) {
    res.status(400).json({
      success: false,
      buildLog: 'Invalid request: labNumber must be a non-negative integer.',
    });
    return;
  }

  res.json({
    success: false,
    buildLog: 'submit/build chain not implemented yet',
  });
});
