/**
 * WebSocket 代理服务
 *
 * 将浏览器的 WebSocket 连接代理到 Docker 容器内的 ttyd
 *
 * 浏览器 xterm.js ←→ WebSocket ←→ 本服务 ←→ 容器 ttyd:7681
 *
 * TODO: 实现 WebSocket 代理逻辑
 */

import type { Server } from 'http';
// import httpProxy from 'http-proxy';
// import { getTtydPort } from './container-manager.js';

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
  // TODO: 实现 WebSocket 代理
  //
  // 示例代码：
  //
  // const proxy = httpProxy.createProxyServer({ ws: true });
  //
  // server.on('upgrade', async (req, socket, head) => {
  //   // 从 URL 中提取 sessionId
  //   // 例如 /api/terminal/user-abc123 → sessionId = 'user-abc123'
  //   const match = req.url?.match(/\/api\/terminal\/(.+)/);
  //   if (!match) {
  //     socket.destroy();
  //     return;
  //   }
  //
  //   const sessionId = match[1];
  //   const ttydPort = await getTtydPort(sessionId);
  //
  //   proxy.ws(req, socket, head, {
  //     target: `http://localhost:${ttydPort}`,
  //   });
  // });

  console.log('📡 WebSocket proxy: TODO — 待实现');
}
