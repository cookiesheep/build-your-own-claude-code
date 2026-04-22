import {
  getSessionUsage,
  getTodayUsage,
  type ApiKeySource,
} from '../db/database.js';

export type ApiRateLimitResult = {
  allowed: boolean;
  remaining: number;
  reason?: 'daily' | 'session';
};

function readPositiveIntegerEnv(name: string, fallback: number): number {
  const value = Number.parseInt(process.env[name] ?? '', 10);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

export function checkRateLimit(
  userId: string,
  sessionId: string,
  keySource: ApiKeySource
): ApiRateLimitResult {
  if (keySource === 'user') {
    return {
      allowed: true,
      remaining: Number.POSITIVE_INFINITY,
    };
  }

  const dailyLimit = readPositiveIntegerEnv('BYOCC_DEFAULT_KEY_DAILY_LIMIT', 500);
  const sessionLimit = readPositiveIntegerEnv('BYOCC_DEFAULT_KEY_SESSION_LIMIT', 100);
  const todayUsage = getTodayUsage(userId);
  const sessionUsage = getSessionUsage(sessionId);

  if (todayUsage >= dailyLimit) {
    return {
      allowed: false,
      remaining: 0,
      reason: 'daily',
    };
  }

  if (sessionUsage >= sessionLimit) {
    return {
      allowed: false,
      remaining: 0,
      reason: 'session',
    };
  }

  return {
    allowed: true,
    remaining: Math.min(dailyLimit - todayUsage, sessionLimit - sessionUsage),
  };
}
