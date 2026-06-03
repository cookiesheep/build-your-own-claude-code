import type { Request } from 'express';

const USER_WINDOW_MS = 60 * 1000;
const IP_WINDOW_MS = 60 * 1000;
const USER_LIMIT = 5;
const IP_LIMIT = 20;

type Bucket = {
  count: number;
  resetAt: number;
};

const userBuckets = new Map<string, Bucket>();
const ipBuckets = new Map<string, Bucket>();
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;

function getClientIp(req: Request): string {
  return req.ip || req.socket.remoteAddress || 'unknown';
}

function consumeBucket(
  buckets: Map<string, Bucket>,
  key: string,
  limit: number,
  windowMs: number
): { allowed: boolean; retryAfterSeconds?: number } {
  const now = Date.now();
  const existing = buckets.get(key);
  const bucket = !existing || existing.resetAt <= now
    ? { count: 0, resetAt: now + windowMs }
    : existing;

  if (bucket.count >= limit) {
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000),
    };
  }

  bucket.count += 1;
  buckets.set(key, bucket);
  return { allowed: true };
}

export function checkApiKeyValidationRateLimit(
  req: Request,
  userId: string
): { allowed: boolean; retryAfterSeconds?: number } {
  const userLimit = consumeBucket(userBuckets, userId, USER_LIMIT, USER_WINDOW_MS);
  if (!userLimit.allowed) {
    return userLimit;
  }

  return consumeBucket(ipBuckets, getClientIp(req), IP_LIMIT, IP_WINDOW_MS);
}

function cleanupExpiredBuckets(): void {
  const now = Date.now();
  for (const [key, bucket] of userBuckets.entries()) {
    if (bucket.resetAt <= now) {
      userBuckets.delete(key);
    }
  }

  for (const [key, bucket] of ipBuckets.entries()) {
    if (bucket.resetAt <= now) {
      ipBuckets.delete(key);
    }
  }
}

const cleanupTimer = setInterval(cleanupExpiredBuckets, CLEANUP_INTERVAL_MS);
cleanupTimer.unref();
