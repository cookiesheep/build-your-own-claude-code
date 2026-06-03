/**
 * Lab workspace 路由
 *
 * Workspace 指“某个用户在某个 Lab 里写到一半的代码草稿”。
 * 它比 Docker 容器更持久：
 * - 容器可以 reset / TTL 回收
 * - workspace code 仍然保存在数据库里
 */

import { Router } from 'express';
import { getWorkspaceSnapshot, saveWorkspaceSnapshot } from '../db/database.js';
import { getOptionalAuthUser } from '../middleware/auth.js';
import { normalizeWorkspaceFiles } from '../services/lab-workspace.js';

export const workspaceRouter = Router();

function parseLabNumber(rawLabId: string | undefined): number | null {
  if (!rawLabId) {
    return null;
  }

  const labNumber = Number.parseInt(rawLabId, 10);
  return Number.isInteger(labNumber) && labNumber >= 0 ? labNumber : null;
}

function requireAuthUser(req: Parameters<typeof getOptionalAuthUser>[0]) {
  const user = getOptionalAuthUser(req);
  if (!user) {
    return null;
  }

  return user;
}

workspaceRouter.get('/api/labs/:id/workspace', (req, res) => {
  const user = requireAuthUser(req);
  if (!user) {
    res.status(401).json({
      message: 'Missing or invalid auth token.',
    });
    return;
  }

  const labNumber = parseLabNumber(req.params.id);
  if (labNumber === null) {
    res.status(400).json({
      message: 'Lab id must be a non-negative integer.',
    });
    return;
  }

  const snapshot = getWorkspaceSnapshot(user.id, labNumber);

  res.json({
    labNumber,
    files: snapshot.files,
    updatedAt: snapshot.updatedAt,
  });
});

workspaceRouter.put('/api/labs/:id/workspace', (req, res) => {
  const user = requireAuthUser(req);
  if (!user) {
    res.status(401).json({
      message: 'Missing or invalid auth token.',
    });
    return;
  }

  const labNumber = parseLabNumber(req.params.id);
  if (labNumber === null) {
    res.status(400).json({
      message: 'Lab id must be a non-negative integer.',
    });
    return;
  }

  const { files: bodyFiles, code } = req.body ?? {};
  const files = bodyFiles ?? (typeof code === 'string' ? code : null);
  if (!files) {
    res.status(400).json({
      message: 'files must be a file map or code must be a string.',
    });
    return;
  }

  const snapshot = saveWorkspaceSnapshot(
    user.id,
    labNumber,
    normalizeWorkspaceFiles(labNumber, files)
  );

  res.json({
    labNumber,
    files: snapshot.files,
    updatedAt: snapshot.updatedAt,
  });
});
