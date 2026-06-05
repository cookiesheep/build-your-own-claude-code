/**
 * 管理员鉴权中间件。
 *
 * 必须挂在 requireAuth 之后：requireAuth 负责把 req.user 填好（并已经把被禁用的账号
 * 403 挡掉），这里只判 role。把职责拆开，requireAdmin 自身不碰 DB。
 */

import type { NextFunction, Request, Response } from 'express';
import type { AuthenticatedRequest } from './auth.js';

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const { user } = req as AuthenticatedRequest;
  if (!user || user.role !== 'admin') {
    res.status(403).json({
      message: 'Admin access required.',
    });
    return;
  }

  next();
}
