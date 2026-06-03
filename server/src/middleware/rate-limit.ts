import type { Request } from 'express';

const MAX_FAILED_ATTEMPTS = 5;
const FAILURE_WINDOW_MS = 15 * 60 * 1000;
const LOCKOUT_MS = 15 * 60 * 1000;
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;

type LoginAttemptRecord = {
  failedAttempts: number;
  firstFailedAt: number;
  lastFailedAt: number;
  blockedUntil: number | null;
};

type LoginRateLimitResult =
  | { allowed: true }
  | { allowed: false; retryAfterSeconds: number };

const loginAttempts = new Map<string, LoginAttemptRecord>();

function getClientIp(req: Request): string {
  return req.ip || req.socket.remoteAddress || 'unknown';
}

function getLoginAttemptKey(req: Request, username: string): string {
  return `${getClientIp(req)}:${username.trim().toLowerCase()}`;
}

function isExpired(record: LoginAttemptRecord, now: number): boolean {
  if (record.blockedUntil && record.blockedUntil > now) {
    return false;
  }

  return now - record.lastFailedAt > FAILURE_WINDOW_MS;
}

export function checkLoginRateLimit(req: Request, username: string): LoginRateLimitResult {
  const key = getLoginAttemptKey(req, username);
  const record = loginAttempts.get(key);
  const now = Date.now();

  if (!record) {
    return { allowed: true };
  }

  if (record.blockedUntil && record.blockedUntil > now) {
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil((record.blockedUntil - now) / 1000),
    };
  }

  if (isExpired(record, now)) {
    loginAttempts.delete(key);
  }

  return { allowed: true };
}

export function recordLoginFailure(req: Request, username: string): void {
  const key = getLoginAttemptKey(req, username);
  const now = Date.now();
  const existing = loginAttempts.get(key);
  const shouldReset = !existing || isExpired(existing, now);
  const nextRecord: LoginAttemptRecord = shouldReset
    ? {
        failedAttempts: 1,
        firstFailedAt: now,
        lastFailedAt: now,
        blockedUntil: null,
      }
    : {
        ...existing,
        failedAttempts: existing.failedAttempts + 1,
        lastFailedAt: now,
      };

  if (nextRecord.failedAttempts >= MAX_FAILED_ATTEMPTS) {
    nextRecord.blockedUntil = now + LOCKOUT_MS;
  }

  loginAttempts.set(key, nextRecord);
}

export function clearLoginRateLimit(req: Request, username: string): void {
  loginAttempts.delete(getLoginAttemptKey(req, username));
}

const cleanupTimer = setInterval(() => {
  const now = Date.now();
  for (const [key, record] of loginAttempts.entries()) {
    if (isExpired(record, now)) {
      loginAttempts.delete(key);
    }
  }
}, CLEANUP_INTERVAL_MS);

cleanupTimer.unref();
