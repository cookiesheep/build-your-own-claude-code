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

type TokenPayload = {
  userId: string;
  kind: UserKind;
  issuedAt: string;
};

const AUTH_SECRET =
  process.env.BYOCC_AUTH_SECRET ?? 'byocc-dev-secret-change-me-before-public-demo';

if (!process.env.BYOCC_AUTH_SECRET) {
  console.warn(
    'BYOCC_AUTH_SECRET is not set. Using a development-only auth secret; do not use this for public deployment.'
  );
}

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

  return decodeJson<TokenPayload>(encodedPayload);
}
