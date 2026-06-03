/**
 * 管理后台：反滥用监控 + 禁用/解禁 kill-switch。
 *
 * 整个 /api/admin 命名空间双层 gate：requireAuth（填 req.user，挡未登录/被禁）
 * + requireAdmin（判 role）。监控只看 key_source='default'（平台共享 key）。
 */

import { Router } from 'express';
import {
  getDefaultKeyAnomalies,
  getDefaultKeyOverview,
  getDefaultKeyTopConsumers,
  getUserUsageDetail,
  setUserDisabled,
  type UserRole,
} from '../db/database.js';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/require-admin.js';

export const adminRouter = Router();

adminRouter.use('/api/admin', requireAuth, requireAdmin);

adminRouter.get('/api/admin/overview', (_req, res) => {
  res.json(getDefaultKeyOverview());
});

adminRouter.get('/api/admin/top-consumers', (req, res) => {
  const rawLimit = req.query.limit;
  const limit = typeof rawLimit === 'string' ? Number.parseInt(rawLimit, 10) : NaN;
  res.json(getDefaultKeyTopConsumers(Number.isFinite(limit) ? limit : 50));
});

adminRouter.get('/api/admin/anomalies', (req, res) => {
  const rawThreshold = req.query.threshold;
  const threshold = typeof rawThreshold === 'string' ? Number.parseFloat(rawThreshold) : NaN;
  res.json(getDefaultKeyAnomalies(Number.isFinite(threshold) ? threshold : 0.8));
});

adminRouter.get('/api/admin/user/:id', (req, res) => {
  const detail = getUserUsageDetail(req.params.id);
  if (!detail) {
    res.status(404).json({ message: 'User not found.' });
    return;
  }
  res.json(detail);
});

adminRouter.post('/api/admin/user/:id/disable', (req, res) => {
  const { user } = req as unknown as AuthenticatedRequest;
  const targetId = req.params.id;

  // 防自锁：管理员不能禁用自己，否则下一个请求就把自己 403 出去了。
  if (targetId === user.id) {
    res.status(400).json({ message: 'You cannot disable your own account.' });
    return;
  }

  try {
    const updated = setUserDisabled(targetId, true);
    res.json(toAdminUserView(updated));
  } catch {
    res.status(404).json({ message: 'User not found.' });
  }
});

adminRouter.post('/api/admin/user/:id/enable', (req, res) => {
  try {
    const updated = setUserDisabled(req.params.id, false);
    res.json(toAdminUserView(updated));
  } catch {
    res.status(404).json({ message: 'User not found.' });
  }
});

function toAdminUserView(user: {
  id: string;
  username: string | null;
  nickname: string | null;
  role: UserRole | null;
  disabled: boolean;
}): {
  userId: string;
  username: string | null;
  nickname: string | null;
  role: UserRole | null;
  disabled: boolean;
} {
  return {
    userId: user.id,
    username: user.username,
    nickname: user.nickname,
    role: user.role,
    disabled: user.disabled,
  };
}
