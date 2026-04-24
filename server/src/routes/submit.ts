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
import {
  createSession,
  getSession,
  saveWorkspaceSnapshot,
  touchSessionActivity,
  updateProgress,
  updateUserProgress,
} from '../db/database.js';
import { requireSessionAccess } from '../middleware/auth.js';
import { buildInContainer, injectFiles } from '../services/container-manager.js';
import { getPrimaryLabFilePath, normalizeWorkspaceFiles } from '../services/lab-workspace.js';

export const submitRouter = Router();

submitRouter.post('/api/submit', async (req, res) => {
  const { sessionId, code, files, labNumber } = req.body ?? {};

  if (typeof sessionId !== 'string' || sessionId.trim() === '') {
    res.status(400).json({
      success: false,
      buildLog: 'Invalid request: sessionId must be a non-empty string.',
    });
    return;
  }

  const fileMap = files ?? (typeof code === 'string' ? { [getPrimaryLabFilePath(labNumber)]: code } : null);
  if (!fileMap || Object.keys(fileMap).length === 0) {
    res.status(400).json({
      success: false,
      buildLog: 'Invalid request: must provide code or files.',
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

  const access = requireSessionAccess(req, session);
  if (!access.ok) {
    res.status(access.statusCode).json({
      success: false,
      buildLog: access.message,
    });
    return;
  }

  try {
    if (access.shouldBindSession) {
      createSession(sessionId, session.containerId, session.environmentStatus, access.user.id);
    }

    const normalizedFiles = normalizeWorkspaceFiles(labNumber, fileMap);
    saveWorkspaceSnapshot(access.user.id, labNumber, normalizedFiles);

    touchSessionActivity(sessionId);
    await injectFiles(sessionId, normalizedFiles);
    const buildResult = await buildInContainer(sessionId, labNumber);
    touchSessionActivity(sessionId);

    if (buildResult.success) {
      updateProgress(sessionId, labNumber, true);
      updateUserProgress(access.user.id, labNumber, true);
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
