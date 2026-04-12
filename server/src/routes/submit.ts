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
import { getSession, updateProgress, upsertCodeSnapshot } from '../db/database.js';
import { getOptionalAuthUser } from '../middleware/auth.js';
import { buildInContainer, injectCode } from '../services/container-manager.js';

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

  // 提交代码之前，先确认这个 session 至少在数据库里存在。
  // 否则用户很可能是绕过了 /api/session，直接打 submit。
  const session = getSession(sessionId);
  if (!session) {
    res.status(400).json({
      success: false,
      buildLog: 'Session not found. Please create a session before submitting code.',
    });
    return;
  }

  const authUser = getOptionalAuthUser(req);

  try {
    // submit 本身仍然以 session 为入口，保持旧链路兼容。
    // 如果请求带了有效 user token，就顺手保存一份代码快照。
    if (authUser) {
      upsertCodeSnapshot(authUser.id, labNumber, code);
    }

    await injectCode(sessionId, code, labNumber);
    const buildResult = await buildInContainer(sessionId, labNumber);

    if (buildResult.success) {
      updateProgress(sessionId, labNumber, true);
    }

    res.json({
      success: buildResult.success,
      buildLog: buildResult.log,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown error while submitting code.';

    const statusCode = message.includes('No container found for session') ? 400 : 500;

    res.status(statusCode).json({
      success: false,
      buildLog: message,
    });
  }
});
