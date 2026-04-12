/**
 * Auth helper
 *
 * 当前阶段的认证是“可选认证”：
 * - 带 token：后端可以把 session 绑定到 user_id
 * - 不带 token：旧的匿名 session 流程仍能跑，避免一次性打断前端
 *
 * 等前端完全接入 token 后，再考虑把部分 API 改成强制认证。
 */

import type { Request } from 'express';
import { getUser, type UserRecord } from '../db/database.js';
import { verifyUserToken } from '../services/auth-token.js';

function getBearerToken(req: Request): string | null {
  const authorization = req.header('authorization');
  if (!authorization) {
    return null;
  }

  const [scheme, token] = authorization.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return null;
  }

  return token;
}

export function getOptionalAuthUser(req: Request): UserRecord | null {
  const token = getBearerToken(req);
  if (!token) {
    return null;
  }

  const payload = verifyUserToken(token);
  if (!payload) {
    return null;
  }

  return getUser(payload.userId);
}
