import type { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { getUser, type UserRecord } from '../db/database.js';

export type SessionUser = {
  id: string;
  username: string;
  role: string;
};

type SessionPayload = {
  sub: string;
  username: string;
  role: string;
};

export const SESSION_COOKIE_NAME = 'byocc_session';
const SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;
const SESSION_SECRET =
  process.env.SERVER_SESSION_SECRET ??
  process.env.BYOCC_AUTH_SECRET ??
  'byocc-dev-session-secret-change-me-before-public-demo';

if (!process.env.SERVER_SESSION_SECRET && !process.env.BYOCC_AUTH_SECRET) {
  console.warn(
    'SERVER_SESSION_SECRET and BYOCC_AUTH_SECRET are not set. Using a development-only session secret; do not use this for public deployment.'
  );
}

function shouldUseSecureCookie(): boolean {
  const override = process.env.BYOCC_COOKIE_SECURE?.trim().toLowerCase();
  if (override) {
    return !['0', 'false', 'no', 'off'].includes(override);
  }

  return process.env.NODE_ENV === 'production';
}

function readCookie(req: Request, name: string): string | null {
  const rawCookie = req.header('cookie');
  if (!rawCookie) {
    return null;
  }

  const cookies = rawCookie.split(';');
  for (const cookie of cookies) {
    const [rawName, ...rawValue] = cookie.trim().split('=');
    if (rawName === name) {
      return decodeURIComponent(rawValue.join('='));
    }
  }

  return null;
}

export function toSessionUser(user: UserRecord): SessionUser | null {
  if (!user.username || !user.role) {
    return null;
  }

  return {
    id: user.id,
    username: user.username,
    role: user.role,
  };
}

export function createSessionToken(user: SessionUser): string {
  return jwt.sign(
    {
      username: user.username,
      role: user.role,
    } satisfies Omit<SessionPayload, 'sub'>,
    SESSION_SECRET,
    {
      subject: user.id,
      expiresIn: SESSION_MAX_AGE_SECONDS,
    }
  );
}

export function setSessionCookie(res: Response, token: string): void {
  res.cookie(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: shouldUseSecureCookie(),
    sameSite: 'strict',
    path: '/',
    maxAge: SESSION_MAX_AGE_SECONDS * 1000,
  });
}

export function clearSessionCookie(res: Response): void {
  res.clearCookie(SESSION_COOKIE_NAME, {
    httpOnly: true,
    secure: shouldUseSecureCookie(),
    sameSite: 'strict',
    path: '/',
  });
}

export function getSessionUserFromRequest(req: Request): UserRecord | null {
  const token = readCookie(req, SESSION_COOKIE_NAME);
  if (!token) {
    return null;
  }

  try {
    const payload = jwt.verify(token, SESSION_SECRET) as jwt.JwtPayload & SessionPayload;
    if (!payload.sub) {
      return null;
    }

    const user = getUser(payload.sub);
    return user?.kind === 'password' ? user : null;
  } catch {
    return null;
  }
}
