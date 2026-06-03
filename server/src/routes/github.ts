/**
 * GitHub OAuth 路由
 *
 * 流程：
 *   1. 前端调 POST /api/auth/github/start（带 anonymous Bearer 或不带）
 *      → 后端生成 state，写 byocc_oauth_state httpOnly cookie，返回 GitHub authorize URL
 *   2. 前端跳到该 URL，用户在 GitHub 授权
 *   3. GitHub 回调 GET /api/auth/github/callback?code=...&state=...
 *      → 后端校验 state cookie，code 换 access_token，拉 GitHub /user
 *      → 找/建本地 user（kind='github'）
 *      → 如果 state cookie 里记录了匿名 fromUserId，把数据迁移过去
 *      → 设置 byocc_session cookie，302 回前端
 *
 * 安全要点：
 *   - state 只走 httpOnly cookie，前端 JS 永远拿不到
 *   - state 一次性：回调成功后立刻清掉
 *   - redirect_uri 由后端生成，不接受前端传入
 *   - client_secret 只在后端使用
 */

import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import {
  createGithubUser,
  getGithubUser,
  getUser,
  migrateUserData,
  updateGithubUserProfile,
  type UserRecord,
} from '../db/database.js';
import { getOptionalAuthUser } from '../middleware/auth.js';
import {
  createSessionToken,
  setSessionCookie,
  toSessionUser,
} from '../services/session-cookie.js';

export const githubAuthRouter = Router();

const OAUTH_STATE_COOKIE = 'byocc_oauth_state';
const OAUTH_STATE_TTL_SECONDS = 10 * 60;
const GITHUB_AUTHORIZE_URL = 'https://github.com/login/oauth/authorize';
// 走 Cloudflare Worker 代理，解决华为云直连 GitHub 不稳定的问题
const GITHUB_TOKEN_URL = 'https://byocc.cc/api/github-proxy/token';
const GITHUB_USER_URL = 'https://byocc.cc/api/github-proxy/api/user';
const GITHUB_USER_AGENT = 'byocc-platform';

type StateRecord = {
  state: string;
  fromUserId: string | null;
  redirectAfterLogin: string;
  expiresAt: number;
};

// State 映射：state 字符串 → 元数据。重启后丢失（用户需要重新发起 OAuth），
// 这是可接受的——OAuth state 本来就是短期一次性的。
const pendingStates = new Map<string, StateRecord>();

const STATE_CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
const stateCleanup = setInterval(() => {
  const now = Date.now();
  for (const [key, record] of pendingStates.entries()) {
    if (record.expiresAt <= now) {
      pendingStates.delete(key);
    }
  }
}, STATE_CLEANUP_INTERVAL_MS);
stateCleanup.unref();

function getEnvTrimmed(name: string): string | null {
  const value = process.env[name]?.trim();
  return value && value.length > 0 ? value : null;
}

function getGithubOAuthConfig(): {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  postLoginRedirect: string;
} | null {
  const clientId = getEnvTrimmed('GITHUB_CLIENT_ID');
  const clientSecret = getEnvTrimmed('GITHUB_CLIENT_SECRET');
  const redirectUri = getEnvTrimmed('GITHUB_OAUTH_REDIRECT_URI');
  const postLoginRedirect =
    getEnvTrimmed('GITHUB_OAUTH_POST_LOGIN_REDIRECT') ?? '/platform';

  if (!clientId || !clientSecret || !redirectUri) {
    return null;
  }

  return { clientId, clientSecret, redirectUri, postLoginRedirect };
}

function shouldUseSecureCookie(): boolean {
  const override = process.env.BYOCC_COOKIE_SECURE?.trim().toLowerCase();
  if (override) {
    return !['0', 'false', 'no', 'off'].includes(override);
  }
  return process.env.NODE_ENV === 'production';
}

function readCookie(rawCookie: string | undefined, name: string): string | null {
  if (!rawCookie) return null;
  for (const cookie of rawCookie.split(';')) {
    const [rawName, ...rawValue] = cookie.trim().split('=');
    if (rawName === name) {
      return decodeURIComponent(rawValue.join('='));
    }
  }
  return null;
}

function isSafeRelativePath(value: unknown): value is string {
  return typeof value === 'string' && value.startsWith('/') && !value.startsWith('//');
}

githubAuthRouter.post('/api/auth/github/start', (req, res) => {
  const config = getGithubOAuthConfig();
  if (!config) {
    res.status(503).json({
      message:
        'GitHub OAuth is not configured. Set GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, and GITHUB_OAUTH_REDIRECT_URI on the server.',
    });
    return;
  }

  const currentUser = getOptionalAuthUser(req);
  // 只有匿名用户才需要触发数据迁移；已登录的密码/GitHub 用户重新发起 OAuth 视为换号或刷新授权，
  // 不迁移别的用户的数据。
  const fromUserId = currentUser?.kind === 'anonymous' ? currentUser.id : null;

  const requestedRedirect =
    typeof (req.body as { redirect?: unknown })?.redirect === 'string'
      ? (req.body as { redirect: string }).redirect
      : '';
  const redirectAfterLogin = isSafeRelativePath(requestedRedirect)
    ? requestedRedirect
    : config.postLoginRedirect;

  const state = randomUUID();
  pendingStates.set(state, {
    state,
    fromUserId,
    redirectAfterLogin,
    expiresAt: Date.now() + OAUTH_STATE_TTL_SECONDS * 1000,
  });

  res.cookie(OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    secure: shouldUseSecureCookie(),
    sameSite: 'lax', // GitHub callback 是 top-level GET 跨站回跳，不能用 strict
    path: '/',
    maxAge: OAUTH_STATE_TTL_SECONDS * 1000,
  });

  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    scope: 'read:user user:email',
    state,
    allow_signup: 'true',
  });

  res.json({
    url: `${GITHUB_AUTHORIZE_URL}?${params.toString()}`,
  });
});

type GithubTokenResponse = {
  access_token?: string;
  token_type?: string;
  scope?: string;
  error?: string;
  error_description?: string;
};

type GithubUserResponse = {
  id?: number;
  login?: string;
  name?: string | null;
  avatar_url?: string | null;
};

async function exchangeCodeForToken(
  config: { clientId: string; clientSecret: string; redirectUri: string },
  code: string
): Promise<string> {
  const response = await fetch(GITHUB_TOKEN_URL, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'User-Agent': GITHUB_USER_AGENT,
    },
    body: JSON.stringify({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code,
      redirect_uri: config.redirectUri,
    }),
  });

  if (!response.ok) {
    throw new Error(`GitHub token endpoint returned HTTP ${response.status}`);
  }

  const payload = (await response.json()) as GithubTokenResponse;
  if (!payload.access_token) {
    throw new Error(
      payload.error_description ?? payload.error ?? 'GitHub did not return an access token'
    );
  }

  return payload.access_token;
}

async function fetchGithubUser(accessToken: string): Promise<{
  githubId: string;
  username: string;
  nickname: string | null;
  avatarUrl: string | null;
}> {
  const response = await fetch(GITHUB_USER_URL, {
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${accessToken}`,
      'User-Agent': GITHUB_USER_AGENT,
    },
  });

  if (!response.ok) {
    throw new Error(`GitHub /user returned HTTP ${response.status}`);
  }

  const payload = (await response.json()) as GithubUserResponse;
  if (typeof payload.id !== 'number' || !payload.login) {
    throw new Error('GitHub user payload missing id or login');
  }

  return {
    githubId: String(payload.id),
    username: payload.login,
    nickname: payload.name ?? null,
    avatarUrl: payload.avatar_url ?? null,
  };
}

function clearOauthStateCookie(res: import('express').Response): void {
  res.clearCookie(OAUTH_STATE_COOKIE, {
    httpOnly: true,
    secure: shouldUseSecureCookie(),
    sameSite: 'lax',
    path: '/',
  });
}

function buildErrorRedirect(redirectAfter: string, message: string): string {
  const normalized = isSafeRelativePath(redirectAfter) ? redirectAfter : '/login';
  const url = normalized.startsWith('/login')
    ? normalized
    : `/login?redirect=${encodeURIComponent(normalized)}`;
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}oauth_error=${encodeURIComponent(message)}`;
}

githubAuthRouter.get('/api/auth/github/callback', async (req, res) => {
  const config = getGithubOAuthConfig();
  if (!config) {
    res.status(503).send('GitHub OAuth is not configured.');
    return;
  }

  const code = typeof req.query.code === 'string' ? req.query.code : '';
  const stateFromQuery = typeof req.query.state === 'string' ? req.query.state : '';
  const errorFromGithub =
    typeof req.query.error === 'string' ? req.query.error : null;

  const stateCookie = readCookie(req.header('cookie'), OAUTH_STATE_COOKIE);
  clearOauthStateCookie(res);

  // 不论怎样，state 一旦命中就立刻删掉，防止重放。
  const stateRecord = stateFromQuery ? pendingStates.get(stateFromQuery) : undefined;
  if (stateRecord) {
    pendingStates.delete(stateFromQuery);
  }

  const fallbackRedirect = stateRecord?.redirectAfterLogin ?? config.postLoginRedirect;

  if (errorFromGithub) {
    res.redirect(buildErrorRedirect(fallbackRedirect, errorFromGithub));
    return;
  }

  if (!code || !stateFromQuery || !stateCookie || stateFromQuery !== stateCookie || !stateRecord) {
    res.redirect(buildErrorRedirect(fallbackRedirect, 'invalid_state'));
    return;
  }

  if (stateRecord.expiresAt <= Date.now()) {
    res.redirect(buildErrorRedirect(fallbackRedirect, 'state_expired'));
    return;
  }

  let profile: Awaited<ReturnType<typeof fetchGithubUser>>;
  try {
    const accessToken = await exchangeCodeForToken(config, code);
    profile = await fetchGithubUser(accessToken);
  } catch (error) {
    console.warn(
      `[github-oauth] callback failed: ${error instanceof Error ? error.message : String(error)}`
    );
    res.redirect(buildErrorRedirect(fallbackRedirect, 'github_exchange_failed'));
    return;
  }

  let user: UserRecord | null = getGithubUser(profile.githubId);
  const isNewUser = !user;
  if (!user) {
    user = createGithubUser({
      githubId: profile.githubId,
      username: profile.username,
      nickname: profile.nickname,
      avatarUrl: profile.avatarUrl,
    });
  } else {
    user = updateGithubUserProfile(user.id, {
      username: profile.username,
      nickname: profile.nickname,
      avatarUrl: profile.avatarUrl,
    });
  }

  // 把当前匿名 user 的数据迁移到 GitHub user。
  // 仅在“当前匿名 user 仍然存在 + 不是同一个 user”时迁移。
  if (stateRecord.fromUserId && stateRecord.fromUserId !== user.id) {
    const fromUser = getUser(stateRecord.fromUserId);
    if (fromUser?.kind === 'anonymous') {
      try {
        migrateUserData(fromUser.id, user.id);
      } catch (error) {
        console.warn(
          `[github-oauth] data migration failed for ${fromUser.id} → ${user.id}: ${error instanceof Error ? error.message : String(error)}`
        );
        // 迁移失败不阻塞登录：用户至少能正常登录，匿名数据仍然留在原 user 下。
      }
    }
  }

  const sessionUser = toSessionUser(user);
  if (!sessionUser) {
    res.redirect(buildErrorRedirect(fallbackRedirect, 'incomplete_user'));
    return;
  }

  setSessionCookie(res, createSessionToken(sessionUser));

  const successRedirect = stateRecord.redirectAfterLogin || config.postLoginRedirect;
  const separator = successRedirect.includes('?') ? '&' : '?';
  res.redirect(
    `${successRedirect}${separator}oauth=github${isNewUser ? '&new=1' : ''}`
  );
});
