/**
 * Public platform statistics.
 *
 * These endpoints are intentionally unauthenticated so landing/platform pages can
 * fetch aggregate data without creating anonymous users.
 */

import { Router } from 'express';
import { getLearnerLeaderboard, getVisitorCount, incrementPageView } from '../db/database.js';

export const statsRouter = Router();

/* GET — read-only, no side effects */
statsRouter.get('/api/stats/visitors', (_req, res) => {
  res.json({
    total: getVisitorCount(),
  });
});

/* POST — record a new visit (called once per browser session) */
statsRouter.post('/api/stats/visitors', (_req, res) => {
  incrementPageView();
  res.json({
    total: getVisitorCount(),
  });
});

statsRouter.get('/api/stats/leaderboard', (_req, res) => {
  res.json(getLearnerLeaderboard());
});
