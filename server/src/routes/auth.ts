/**
 * 匿名身份路由
 *
 * 这一步不是 GitHub OAuth，也不是完整登录系统。
 * 它只先建立一个稳定的 user_id，让后续 progress / code snapshot 可以挂到 user 上。
 */

import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { createAnonymousUser, getPasswordUserByUsername } from '../db/database.js';
import { getOptionalAuthUser } from '../middleware/auth.js';
import { createUserToken } from '../services/auth-token.js';
import {
  clearSessionCookie,
  createSessionToken,
  setSessionCookie,
  toSessionUser,
} from '../services/session-cookie.js';

export const authRouter = Router();
const DUMMY_PASSWORD_HASH = '$2a$10$CCCCCCCCCCCCCCCCCCCCCuOBSVG0.Qp3SS/fzJ8l4zYxLfFH/eaS6';
const ANONYMOUS_AUTH_ENABLED = !['0', 'false', 'no', 'off'].includes(
  (process.env.BYOCC_ANONYMOUS_AUTH_ENABLED ?? 'true').trim().toLowerCase()
);

function readCredentials(body: unknown): { username: string; password: string } | null {
  if (typeof body !== 'object' || body === null) {
    return null;
  }

  const { username, password } = body as { username?: unknown; password?: unknown };
  if (typeof username !== 'string' || typeof password !== 'string') {
    return null;
  }

  const normalizedUsername = username.trim();
  if (!normalizedUsername || !password) {
    return null;
  }

  return {
    username: normalizedUsername,
    password,
  };
}

function publicUser(user: ReturnType<typeof toSessionUser>) {
  return user;
}

authRouter.post('/api/auth/anonymous', (req, res) => {
  const existingUser = getOptionalAuthUser(req);
  if (existingUser) {
    res.json({
      token: createUserToken(existingUser),
      user: existingUser,
    });
    return;
  }

  if (!ANONYMOUS_AUTH_ENABLED) {
    res.status(403).json({
      message: 'Anonymous auth is disabled. Please log in.',
    });
    return;
  }

  const user = createAnonymousUser();

  res.json({
    token: createUserToken(user),
    user,
  });
});

authRouter.post('/api/auth/login', async (req, res) => {
  const credentials = readCredentials(req.body);
  if (!credentials) {
    res.status(400).json({
      success: false,
      error: '请输入用户名和密码。',
    });
    return;
  }

  const user = getPasswordUserByUsername(credentials.username);
  const passwordMatches = await bcrypt.compare(
    credentials.password,
    user?.passwordHash ?? DUMMY_PASSWORD_HASH
  );

  if (!user || !passwordMatches) {
    res.status(401).json({
      success: false,
      error: '用户名或密码错误。',
    });
    return;
  }

  const sessionUser = toSessionUser(user);
  if (!sessionUser) {
    res.status(500).json({
      success: false,
      error: '用户记录不完整。',
    });
    return;
  }

  setSessionCookie(res, createSessionToken(sessionUser));
  res.json({
    success: true,
    user: publicUser(sessionUser),
  });
});

authRouter.post('/api/auth/logout', (_req, res) => {
  clearSessionCookie(res);
  res.json({
    success: true,
  });
});

authRouter.get('/api/auth/me', (req, res) => {
  const user = getOptionalAuthUser(req);
  const sessionUser = user ? toSessionUser(user) : null;
  if (!sessionUser) {
    res.status(401).json({
      authenticated: false,
      user: null,
    });
    return;
  }

  res.json({
    authenticated: true,
    user: publicUser(sessionUser),
  });
});

authRouter.get('/api/me', (req, res) => {
  const user = getOptionalAuthUser(req);
  if (!user) {
    res.status(401).json({
      message: 'Missing or invalid auth token.',
    });
    return;
  }

  res.json({
    user,
  });
});
