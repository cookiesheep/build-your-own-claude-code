import { Router } from 'express';
import { createSession, getSession, touchSessionActivity } from '../db/database.js';
import {
  requireAuth,
  requireSessionAccess,
  type AuthenticatedRequest,
} from '../middleware/auth.js';
import { resolveContainer, runExecCommand } from '../services/container-manager.js';

export const filesRouter = Router();

const MAX_FILE_SIZE_BYTES = 100 * 1024;
const READABLE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.mjs', '.json', '.md']);

function hasReadableExtension(filePath: string): boolean {
  return Array.from(READABLE_EXTENSIONS).some((extension) => filePath.endsWith(extension));
}

function inferLanguage(filePath: string): string {
  if (filePath.endsWith('.ts') || filePath.endsWith('.tsx')) {
    return 'typescript';
  }
  if (filePath.endsWith('.js') || filePath.endsWith('.mjs')) {
    return 'javascript';
  }
  if (filePath.endsWith('.json')) {
    return 'json';
  }
  if (filePath.endsWith('.md')) {
    return 'markdown';
  }
  return 'plaintext';
}

filesRouter.get('/api/files/:path(*)', requireAuth, async (req, res) => {
  const filePath = req.params.path;
  const sessionId = typeof req.query.sessionId === 'string' ? req.query.sessionId : undefined;
  const user = (req as AuthenticatedRequest).user;

  if (!filePath || typeof filePath !== 'string') {
    res.status(400).json({ error: '缺少文件路径' });
    return;
  }

  if (!sessionId) {
    res.status(400).json({ error: '缺少 sessionId' });
    return;
  }

  if (filePath.includes('..')) {
    res.status(400).json({ error: '路径不允许包含 ".."' });
    return;
  }

  if (filePath.startsWith('/')) {
    res.status(400).json({ error: '路径不允许以 / 开头' });
    return;
  }

  if (!/^[a-zA-Z0-9_/.-]+$/.test(filePath)) {
    res.status(400).json({ error: '路径包含非法字符' });
    return;
  }

  if (!hasReadableExtension(filePath)) {
    res.status(400).json({ error: '只支持查看文本源码文件' });
    return;
  }

  const session = getSession(sessionId);
  if (!session) {
    res.status(404).json({ error: 'Session 不存在' });
    return;
  }

  const access = requireSessionAccess(req, session);
  if (!access.ok) {
    res.status(access.statusCode).json({ error: access.message });
    return;
  }

  if (access.shouldBindSession) {
    createSession(sessionId, session.containerId, session.environmentStatus, access.user.id);
  }

  const resolved = await resolveContainer(sessionId);
  if (!resolved) {
    res.status(404).json({ error: '容器不存在，请先启动实验环境' });
    return;
  }

  if (resolved.info.State.Status !== 'running') {
    res.status(400).json({ error: '容器未运行，请先启动实验环境' });
    return;
  }

  try {
    touchSessionActivity(sessionId);
    const { exitCode, output } = await runExecCommand(resolved.container, [
      'bash',
      '-c',
      [
        `resolved_path="$(realpath -e "/workspace/${filePath}" 2>/dev/null)"`,
        '[ -n "$resolved_path" ]',
        'case "$resolved_path" in /workspace/*) ;; *) exit 42 ;; esac',
        `head -c ${MAX_FILE_SIZE_BYTES + 1} "$resolved_path"`,
      ].join(' && '),
    ], {
      sanitizeOutput: false,
    });

    if (exitCode === 42) {
      res.status(400).json({ error: '路径超出 /workspace 范围' });
      return;
    }

    if (exitCode !== 0) {
      res.status(404).json({ error: '文件不存在或无法读取' });
      return;
    }

    if (Buffer.byteLength(output, 'utf8') > MAX_FILE_SIZE_BYTES) {
      res.status(413).json({ error: '文件过大，最大支持 100KB' });
      return;
    }

    res.json({
      path: filePath,
      content: output,
      language: inferLanguage(filePath),
    });
  } catch {
    res.status(500).json({ error: '读取文件失败' });
  }
});
