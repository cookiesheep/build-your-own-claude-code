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
import { getUser, type SessionRecord, type UserRecord } from '../db/database.js';
import { verifyUserToken } from '../services/auth-token.js';
import { getSessionUserFromRequest } from '../services/session-cookie.js';

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
  const sessionUser = getSessionUserFromRequest(req);
  if (sessionUser) {
    return sessionUser;
  }

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

export type SessionAccessResult =
  | {
      ok: true;
      user: UserRecord;
      shouldBindSession: boolean;
    }
  | {
      ok: false;
      statusCode: 401 | 403;
      message: string;
    };

/**
 * Container-backed APIs must not treat sessionId as the authority.
 *
 * A session can be:
 * - owned by the current token user: allow
 * - owned by another user: reject
 * - legacy/unowned: allow only when a valid token exists, then bind it upstream
 */
export function requireSessionAccess(req: Request, session: SessionRecord): SessionAccessResult {
  const user = getOptionalAuthUser(req);
  if (!user) {
    return {
      ok: false,
      statusCode: 401,
      message: 'Missing or invalid auth token.',
    };
  }

  if (session.userId && session.userId !== user.id) {
    return {
      ok: false,
      statusCode: 403,
      message: 'This session belongs to a different user.',
    };
  }

  return {
    ok: true,
    user,
    shouldBindSession: !session.userId,
  };
}
