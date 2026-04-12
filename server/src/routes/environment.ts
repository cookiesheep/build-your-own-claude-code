/**
 * 实验环境路由
 *
 * Session 和 Environment 的区别：
 * - session：浏览器访问平台时拿到的会话 ID，创建成本很低。
 * - environment：真实 Docker 容器，创建成本高，只有用户点击“启动实验环境”后才创建。
 *
 * 这层拆分后，用户只是阅读 Lab 文档不会占用 Docker 资源。
 */

import { Router } from 'express';
import {
  type EnvironmentStatus,
  createSession,
  getSession,
  updateSessionEnvironment,
} from '../db/database.js';
import { createContainer, getContainerStatus, removeContainer } from '../services/container-manager.js';

export const environmentRouter = Router();

function getTerminalUrl(req: { protocol: string; get(name: string): string | undefined }, sessionId: string): string {
  const host = req.get('host') ?? '127.0.0.1:3001';
  const wsProtocol = req.protocol === 'https' ? 'wss' : 'ws';
  return `${wsProtocol}://${host}/api/terminal/${encodeURIComponent(sessionId)}`;
}

function readSessionId(body: unknown): string | null {
  if (
    typeof body === 'object' &&
    body !== null &&
    'sessionId' in body &&
    typeof (body as { sessionId?: unknown }).sessionId === 'string' &&
    (body as { sessionId: string }).sessionId.trim() !== ''
  ) {
    return (body as { sessionId: string }).sessionId.trim();
  }

  return null;
}

async function syncEnvironmentStatus(sessionId: string): Promise<{
  containerId: string | null;
  environmentStatus: EnvironmentStatus;
}> {
  const session = getSession(sessionId);
  if (!session) {
    throw new Error('Session not found. Please create a session first.');
  }

  if (!session.containerId) {
    return {
      containerId: null,
      environmentStatus: 'not_started',
    };
  }

  const containerStatus = await getContainerStatus(sessionId);
  if (containerStatus === 'running') {
    updateSessionEnvironment(sessionId, session.containerId, 'running');
    return {
      containerId: session.containerId,
      environmentStatus: 'running',
    };
  }

  if (containerStatus === 'stopped') {
    updateSessionEnvironment(sessionId, session.containerId, 'stopped');
    return {
      containerId: session.containerId,
      environmentStatus: 'stopped',
    };
  }

  // 数据库里有 container_id，但 Docker 里找不到对应容器。
  // 这通常说明 Docker Desktop 重启或容器被手动删了。
  updateSessionEnvironment(sessionId, null, 'expired');
  return {
    containerId: null,
    environmentStatus: 'expired',
  };
}

environmentRouter.post('/api/environment/start', async (req, res) => {
  const sessionId = readSessionId(req.body);

  if (!sessionId) {
    res.status(400).json({
      success: false,
      message: 'sessionId must be a non-empty string.',
    });
    return;
  }

  const session = getSession(sessionId);
  if (!session) {
    res.status(400).json({
      success: false,
      message: 'Session not found. Please create a session first.',
    });
    return;
  }

  try {
    updateSessionEnvironment(sessionId, session.containerId, 'starting');
    const containerId = await createContainer(sessionId);
    createSession(sessionId, containerId, 'running');

    res.json({
      success: true,
      sessionId,
      environmentStatus: 'running',
      containerId,
      terminalUrl: getTerminalUrl(req, sessionId),
    });
  } catch (error) {
    updateSessionEnvironment(sessionId, session.containerId, 'error');
    const message =
      error instanceof Error ? error.message : 'Unknown error while starting environment.';

    res.status(500).json({
      success: false,
      sessionId,
      environmentStatus: 'error',
      message,
    });
  }
});

environmentRouter.get('/api/environment/status', async (req, res) => {
  const sessionId = typeof req.query.sessionId === 'string' ? req.query.sessionId.trim() : '';

  if (!sessionId) {
    res.status(400).json({
      success: false,
      message: 'sessionId query parameter is required.',
    });
    return;
  }

  try {
    const status = await syncEnvironmentStatus(sessionId);

    res.json({
      success: true,
      sessionId,
      environmentStatus: status.environmentStatus,
      containerId: status.containerId,
      terminalUrl:
        status.environmentStatus === 'running' ? getTerminalUrl(req, sessionId) : undefined,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown error while reading environment status.';

    res.status(400).json({
      success: false,
      sessionId,
      environmentStatus: 'error',
      message,
    });
  }
});

environmentRouter.post('/api/environment/reset', async (req, res) => {
  const sessionId = readSessionId(req.body);

  if (!sessionId) {
    res.status(400).json({
      success: false,
      message: 'sessionId must be a non-empty string.',
    });
    return;
  }

  const session = getSession(sessionId);
  if (!session) {
    res.status(400).json({
      success: false,
      message: 'Session not found. Please create a session first.',
    });
    return;
  }

  try {
    updateSessionEnvironment(sessionId, session.containerId, 'starting');
    await removeContainer(sessionId);
    const containerId = await createContainer(sessionId);
    createSession(sessionId, containerId, 'running');

    res.json({
      success: true,
      sessionId,
      containerId,
      environmentStatus: 'running',
      terminalUrl: getTerminalUrl(req, sessionId),
    });
  } catch (error) {
    updateSessionEnvironment(sessionId, session.containerId, 'error');
    const message =
      error instanceof Error ? error.message : 'Unknown error while resetting environment.';

    res.status(500).json({
      success: false,
      sessionId,
      environmentStatus: 'error',
      message,
    });
  }
});
