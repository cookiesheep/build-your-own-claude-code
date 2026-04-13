/**
 * WebSocket 代理服务
 *
 * 将浏览器的 WebSocket 连接代理到 Docker 容器内的 ttyd
 *
 * 浏览器 xterm.js ←→ WebSocket ←→ 本服务 ←→ 容器 ttyd:7681
 *
 */

import type { Server } from 'http';
import httpProxy from 'http-proxy';
import { getSession, touchSessionActivity } from '../db/database.js';
import { verifyTerminalToken } from './auth-token.js';
import { getTtydPort } from './container-manager.js';

const TERMINAL_PATH_PREFIX = '/api/terminal/';
const activeTerminalSessions = new Map<string, number>();

function markTerminalSessionOpen(sessionId: string): () => void {
  activeTerminalSessions.set(sessionId, (activeTerminalSessions.get(sessionId) ?? 0) + 1);

  let closed = false;
  return () => {
    if (closed) {
      return;
    }
    closed = true;

    const count = activeTerminalSessions.get(sessionId) ?? 0;
    if (count <= 1) {
      activeTerminalSessions.delete(sessionId);
      return;
    }

    activeTerminalSessions.set(sessionId, count - 1);
  };
}

export function getActiveTerminalSessionIds(): string[] {
  return Array.from(activeTerminalSessions.keys());
}

/**
 * 设置 WebSocket 代理
 *
 * @param server - Express 的 HTTP server 实例
 *
 * 实现思路：
 *   1. 监听 server 的 'upgrade' 事件（WebSocket 握手时触发）
 *   2. 从 URL 中提取 sessionId（例如 /api/terminal/user-abc123）
 *   3. 根据 sessionId 查找容器的 ttyd 端口
 *   4. 用 http-proxy 将 WebSocket 连接代理到 http://localhost:{ttydPort}
 */
export function setupWebSocketProxy(server: Server): void {
  const proxy = httpProxy.createProxyServer({
    ws: true,
    changeOrigin: true,
  });

  proxy.on('error', (error, _req, socket) => {
    console.error('WebSocket proxy error:', error);

    // WebSocket upgrade 失败时，没有现成的 Express 错误处理中间件可用，
    // 所以这里直接往底层 socket 写一个最小的 502 响应，然后主动断开。
    if (socket && 'writable' in socket && socket.writable) {
      socket.write('HTTP/1.1 502 Bad Gateway\r\n\r\n');
    }
    socket.destroy();
  });

  server.on('upgrade', async (req, socket, head) => {
    const requestUrl = req.url ?? '';
    const parsedUrl = new URL(requestUrl, 'http://127.0.0.1');

    // 只拦截我们自己的 terminal 通道。
    // 其他升级请求不处理，避免把整个 server 的 upgrade 流量都吞掉。
    if (!parsedUrl.pathname.startsWith(TERMINAL_PATH_PREFIX)) {
      return;
    }

    const rawSessionId = parsedUrl.pathname.slice(TERMINAL_PATH_PREFIX.length);
    const sessionId = decodeURIComponent(rawSessionId).trim();
    const terminalToken = parsedUrl.searchParams.get('token');

    if (sessionId === '') {
      socket.write('HTTP/1.1 400 Bad Request\r\n\r\nMissing sessionId');
      socket.destroy();
      return;
    }

    if (!terminalToken) {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\nMissing terminal token');
      socket.destroy();
      return;
    }

    try {
      const tokenPayload = verifyTerminalToken(terminalToken);
      if (!tokenPayload || tokenPayload.sessionId !== sessionId) {
        socket.write('HTTP/1.1 403 Forbidden\r\n\r\nInvalid terminal token');
        socket.destroy();
        return;
      }

      const session = getSession(sessionId);
      if (!session || session.userId !== tokenPayload.userId) {
        socket.write('HTTP/1.1 403 Forbidden\r\n\r\nTerminal token does not match session owner');
        socket.destroy();
        return;
      }

      const ttydPort = await getTtydPort(sessionId);
      touchSessionActivity(sessionId);
      const markClosed = markTerminalSessionOpen(sessionId);
      socket.once('close', () => {
        markClosed();
        touchSessionActivity(sessionId);
      });

      // 到这里为止，后端真正做的事情是：
      // 1. 根据 sessionId 找到对应容器
      // 2. 读取这个容器 ttyd 暴露到宿主机的随机端口
      // 3. 把当前 WebSocket 流量转发给那个端口
      //
      // 注意：浏览器连的是 /api/terminal/:sessionId，但 ttyd 自己并不认识这个路径。
      // 所以在真正代理前，我们要把请求路径改写成 ttyd 的 websocket 入口。
      req.url = '/ws';
      proxy.ws(req, socket, head, {
        target: `http://127.0.0.1:${ttydPort}`,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown terminal proxy error';

      console.error(`Failed to proxy terminal for session "${sessionId}":`, message);
      socket.write(`HTTP/1.1 404 Not Found\r\n\r\n${message}`);
      socket.destroy();
    }
  });

  console.log('📡 WebSocket proxy: ready for /api/terminal/:sessionId');
}
