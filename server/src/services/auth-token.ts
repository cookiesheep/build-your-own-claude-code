/**
 * 轻量身份 token 服务
 *
 * 这不是完整用户系统，也不是完整 JWT 实现。
 * 它只解决当前 MVP 的一个问题：
 *   “前端如何证明自己代表某个 anonymous user？”
 *
 * 格式：
 *   base64url(payload).base64url(hmacSignature)
 *
 * 后续如果接 GitHub OAuth，可以保留这个签名机制，也可以替换成标准 JWT 库。
 */

import { createHmac, timingSafeEqual } from 'node:crypto';
import type { UserKind, UserRecord } from '../db/database.js';
import { getRuntimeSecret } from './runtime-security.js';

type TokenPayload = {
  userId: string;
  kind: UserKind;
  issuedAt: string;
};

type TerminalTokenPayload = {
  purpose: 'terminal';
  sessionId: string;
  userId: string;
  issuedAt: string;
  expiresAt: string;
};

const AUTH_SECRET = getRuntimeSecret({
  envNames: ['BYOCC_AUTH_SECRET'],
  fallback: 'byocc-dev-auth-secret-do-not-use-in-prod',
  description: 'auth token secret',
});
const ANONYMOUS_TOKEN_TTL_SECONDS_INPUT = Number.parseInt(
  process.env.BYOCC_ANONYMOUS_TOKEN_TTL_SECONDS ?? '86400',
  10
);
const ANONYMOUS_TOKEN_TTL_SECONDS = Number.isInteger(ANONYMOUS_TOKEN_TTL_SECONDS_INPUT)
  ? Math.max(1, ANONYMOUS_TOKEN_TTL_SECONDS_INPUT)
  : 86400;
const TERMINAL_TOKEN_TTL_SECONDS_INPUT = Number.parseInt(
  process.env.BYOCC_TERMINAL_TOKEN_TTL_SECONDS ?? '300',
  10
);
const TERMINAL_TOKEN_TTL_SECONDS = Number.isInteger(TERMINAL_TOKEN_TTL_SECONDS_INPUT)
  ? Math.max(30, TERMINAL_TOKEN_TTL_SECONDS_INPUT)
  : 300;

function encodeJson(value: unknown): string {
  return Buffer.from(JSON.stringify(value), 'utf8').toString('base64url');
}

function decodeJson<T>(encoded: string): T | null {
  try {
    return JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as T;
  } catch {
    return null;
  }
}

function sign(encodedPayload: string): string {
  return createHmac('sha256', AUTH_SECRET).update(encodedPayload).digest('base64url');
}

function signaturesMatch(actual: string, expected: string): boolean {
  const actualBuffer = Buffer.from(actual);
  const expectedBuffer = Buffer.from(expected);

  if (actualBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(actualBuffer, expectedBuffer);
}

export function createUserToken(user: Pick<UserRecord, 'id' | 'kind'>): string {
  const payload: TokenPayload = {
    userId: user.id,
    kind: user.kind,
    issuedAt: new Date().toISOString(),
  };

  const encodedPayload = encodeJson(payload);
  return `${encodedPayload}.${sign(encodedPayload)}`;
}

export function verifyUserToken(token: string): TokenPayload | null {
  const [encodedPayload, signature] = token.split('.');
  if (!encodedPayload || !signature) {
    return null;
  }

  const expectedSignature = sign(encodedPayload);
  if (!signaturesMatch(signature, expectedSignature)) {
    return null;
  }

  const payload = decodeJson<TokenPayload>(encodedPayload);
  if (!payload?.userId || !payload.kind || !payload.issuedAt) {
    return null;
  }

  if (payload.kind !== 'anonymous') {
    return null;
  }

  const issuedAtMs = Date.parse(payload.issuedAt);
  if (Number.isNaN(issuedAtMs)) {
    return null;
  }

  if (issuedAtMs + ANONYMOUS_TOKEN_TTL_SECONDS * 1000 <= Date.now()) {
    return null;
  }

  return payload;
}

export function createTerminalToken(input: { sessionId: string; userId: string }): string {
  const issuedAt = new Date();
  const expiresAt = new Date(
    issuedAt.getTime() + TERMINAL_TOKEN_TTL_SECONDS * 1000
  );
  const payload: TerminalTokenPayload = {
    purpose: 'terminal',
    sessionId: input.sessionId,
    userId: input.userId,
    issuedAt: issuedAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
  };

  const encodedPayload = encodeJson(payload);
  return `${encodedPayload}.${sign(encodedPayload)}`;
}

export function verifyTerminalToken(token: string): TerminalTokenPayload | null {
  const [encodedPayload, signature] = token.split('.');
  if (!encodedPayload || !signature) {
    return null;
  }

  const expectedSignature = sign(encodedPayload);
  if (!signaturesMatch(signature, expectedSignature)) {
    return null;
  }

  const payload = decodeJson<TerminalTokenPayload>(encodedPayload);
  if (!payload || payload.purpose !== 'terminal') {
    return null;
  }

  if (!payload.sessionId || !payload.userId || !payload.expiresAt) {
    return null;
  }

  if (Date.parse(payload.expiresAt) <= Date.now()) {
    return null;
  }

  return payload;
}
