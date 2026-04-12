/**
 * 匿名身份路由
 *
 * 这一步不是 GitHub OAuth，也不是完整登录系统。
 * 它只先建立一个稳定的 user_id，让后续 progress / code snapshot 可以挂到 user 上。
 */

import { Router } from 'express';
import { createAnonymousUser } from '../db/database.js';
import { getOptionalAuthUser } from '../middleware/auth.js';
import { createUserToken } from '../services/auth-token.js';

export const authRouter = Router();

authRouter.post('/api/auth/anonymous', (req, res) => {
  const existingUser = getOptionalAuthUser(req);
  if (existingUser) {
    res.json({
      token: createUserToken(existingUser),
      user: existingUser,
    });
    return;
  }

  const user = createAnonymousUser();

  res.json({
    token: createUserToken(user),
    user,
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
