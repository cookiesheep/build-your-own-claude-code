/**
 * 代码提交路由
 *
 * POST /api/submit — 接收学习者代码，注入容器，触发构建
 *
 * 这是平台最核心的 API：
 *   学习者写完代码 → 点提交 → 代码被注入 Docker 容器
 *   → 容器内运行 node build.mjs --lab N → 构建结果返回前端
 *
 * TODO: 实现代码提交和构建逻辑
 */

import { Router } from 'express';
// import { injectCode, buildInContainer } from '../services/container-manager.js';
// import { updateProgress } from '../db/database.js';

export const submitRouter = Router();

submitRouter.post('/api/submit', async (req, res) => {
  // TODO: 实现代码提交逻辑
  //
  // 请求体：{ sessionId: string, code: string, labNumber: number }
  //
  // 逻辑：
  // 1. 验证请求参数（sessionId、code、labNumber 都不能为空）
  // 2. 调用 injectCode() 将代码注入容器
  // 3. 调用 buildInContainer() 触发构建
  // 4. 如果构建成功，更新数据库进度
  // 5. 返回：{ success: boolean, buildLog: string }
  //
  // 错误处理：
  // - 容器不存在 → 400 "Session not found, please create a new session"
  // - 代码注入失败 → 500 "Failed to inject code"
  // - 构建失败 → 200 但 success: false，附带构建错误日志

  res.json({
    message: 'TODO: 实现代码提交',
    hint: '这是最核心的 API，学习者的代码通过这个接口进入 Docker 容器',
  });
});
