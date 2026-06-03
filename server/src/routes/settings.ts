import { Router } from 'express';
import {
  clearUserApiKey,
  getUserSettings,
  getUserDailyRemaining,
  upsertUserSettings,
  type ApiKeySource,
} from '../db/database.js';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth.js';
import { checkApiKeyValidationRateLimit } from '../services/api-key-validation-rate-limit.js';
import { assertSafeApiBaseUrl, normalizeApiBaseUrl, resolvePinnedAddresses } from '../services/api-base-url.js';
import { createPinnedDispatcher, pinnedFetch } from '../services/ssrf-pinned-fetch.js';
import type { Agent } from 'undici';
import { encrypt } from '../services/encryption.js';

type ApiKeySettingsResponse = {
  source: ApiKeySource;
  hasKey: boolean;
  maskedKey?: string;
  apiBaseUrl?: string | null;
};

type ApiKeyValidationResponse = {
  valid: boolean;
  message?: string;
  warning?: string;
};

export const settingsRouter = Router();

function maskApiKey(apiKey: string): string {
  if (apiKey.length <= 9) {
    return `${apiKey.slice(0, 3)}***`;
  }

  return `${apiKey.slice(0, 6)}***${apiKey.slice(-3)}`;
}

function readApiKey(body: unknown): string | null {
  if (typeof body !== 'object' || body === null) {
    return null;
  }

  const { apiKey } = body as { apiKey?: unknown };
  if (typeof apiKey !== 'string') {
    return null;
  }

  const normalizedApiKey = apiKey.trim();
  return normalizedApiKey.length > 10 ? normalizedApiKey : null;
}

function readApiBaseUrl(body: unknown): string | null {
  if (typeof body !== 'object' || body === null) {
    return null;
  }

  const { apiBaseUrl } = body as { apiBaseUrl?: unknown };
  if (apiBaseUrl === undefined || apiBaseUrl === null) {
    return null;
  }

  if (typeof apiBaseUrl !== 'string') {
    return null;
  }

  const normalizedApiBaseUrl = apiBaseUrl.trim();
  if (!normalizedApiBaseUrl) {
    return null;
  }

  return normalizeApiBaseUrl(normalizedApiBaseUrl);
}

function hasInvalidExplicitApiBaseUrl(body: unknown, parsedApiBaseUrl: string | null): boolean {
  if (typeof body !== 'object' || body === null || !Object.hasOwn(body, 'apiBaseUrl')) {
    return false;
  }

  const { apiBaseUrl } = body as { apiBaseUrl?: unknown };
  if (apiBaseUrl === undefined || apiBaseUrl === null) {
    return false;
  }

  return parsedApiBaseUrl === null;
}

function getDefaultApiBaseUrl(): string | null {
  return process.env.DEFAULT_API_BASE_URL ?? process.env.ANTHROPIC_BASE_URL ?? null;
}

function getValidationApiBaseUrl(body: unknown): string {
  return readApiBaseUrl(body) ?? getDefaultApiBaseUrl() ?? 'https://api.anthropic.com';
}

function toSettingsResponse(input: {
  source: ApiKeySource;
  rawApiKey?: string;
  apiBaseUrl?: string | null;
}): ApiKeySettingsResponse {
  return {
    source: input.source,
    hasKey: input.source === 'user',
    maskedKey: input.rawApiKey ? maskApiKey(input.rawApiKey) : undefined,
    apiBaseUrl: input.apiBaseUrl ?? null,
  };
}

function isLoggedInUser(kind: string | undefined): boolean {
  return kind === 'password' || kind === 'github';
}

settingsRouter.use('/api/settings', requireAuth);

settingsRouter.get('/api/settings/api-key', (req, res) => {
  const user = (req as AuthenticatedRequest).user;
  if (!isLoggedInUser(user.kind)) {
    res.status(401).json({
      message: 'Please log in to manage API keys.',
    });
    return;
  }

  const settings = getUserSettings(user.id);
  if (!settings?.apiKeyEncrypted || settings.apiKeySource !== 'user') {
    res.json(toSettingsResponse({ source: 'default', apiBaseUrl: getDefaultApiBaseUrl() }));
    return;
  }

  res.json({
    source: 'user',
    hasKey: true,
    maskedKey: '已保存自定义 Key',
    apiBaseUrl: settings.apiBaseUrl ?? getDefaultApiBaseUrl(),
  } satisfies ApiKeySettingsResponse);
});

settingsRouter.get('/api/settings/api-key/status', (req, res) => {
  const user = (req as AuthenticatedRequest).user;
  if (!isLoggedInUser(user.kind)) {
    res.status(401).json({
      message: 'Please log in to read API key status.',
    });
    return;
  }

  const settings = getUserSettings(user.id);
  const hasUserKey = settings?.apiKeySource === 'user' && Boolean(settings.apiKeyEncrypted);
  res.json({
    source: hasUserKey ? 'user' : 'default',
    hasKey: hasUserKey,
    remaining: hasUserKey ? undefined : getUserDailyRemaining(user.id),
  });
});

settingsRouter.post('/api/settings/validate-key', async (req, res) => {
  const user = (req as AuthenticatedRequest).user;
  if (!isLoggedInUser(user.kind)) {
    res.status(401).json({ message: 'Please log in.' });
    return;
  }

  const apiKey = readApiKey(req.body);
  const apiBaseUrl = getValidationApiBaseUrl(req.body);
  if (!apiKey) {
    res.status(400).json({ message: 'apiKey is required.' });
    return;
  }

  if (hasInvalidExplicitApiBaseUrl(req.body, readApiBaseUrl(req.body))) {
    res.status(400).json({
      message: 'apiBaseUrl must be a valid http(s) URL.',
    });
    return;
  }

  const rateLimit = checkApiKeyValidationRateLimit(req, user.id);
  if (!rateLimit.allowed) {
    res.status(429).json({
      message: `验证请求过于频繁，请 ${rateLimit.retryAfterSeconds ?? 60} 秒后再试。`,
    });
    return;
  }

  let dispatcher: Agent | undefined;
  try {
    // 与代理热路径同一套钉 IP 逻辑：解析一次、校验非私网、把出站连接钉死到这组 IP，
    // 避免“校验后 fetch 再解析”被 DNS rebinding 翻转到内网。
    const { hostname } = new URL(apiBaseUrl);
    const addresses = await resolvePinnedAddresses(hostname);
    dispatcher = createPinnedDispatcher(addresses);
    const response = await pinnedFetch(
      `${apiBaseUrl.replace(/\/$/, '')}/v1/messages`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 1,
          messages: [{ role: 'user', content: 'hi' }],
        }),
      },
      dispatcher
    );

    if (response.ok || response.status === 400) {
      res.json({ valid: true } satisfies ApiKeyValidationResponse);
      return;
    }

    if (response.status === 401) {
      res.json({
        valid: false,
        message: 'API Key 无效或已过期。',
      } satisfies ApiKeyValidationResponse);
      return;
    }

    if (response.status === 429) {
      res.json({
        valid: true,
        warning: 'Key 有效但当前被限流，可能影响使用。',
      } satisfies ApiKeyValidationResponse);
      return;
    }

    const body = (await response.json().catch(() => ({}))) as {
      error?: { message?: string };
    };
    res.json({
      valid: false,
      message: body.error?.message ?? `验证失败 (HTTP ${response.status})`,
    } satisfies ApiKeyValidationResponse);
  } catch (error) {
    console.error('[settings/validate-key] Failed to validate API key', error);
    res.json({
      valid: false,
      message: `无法连接到 API 服务：${error instanceof Error ? error.message : 'Unknown error'}`,
    } satisfies ApiKeyValidationResponse);
  } finally {
    // validate-key 是非流式、响应已在 try 内读完，这里直接关掉钉 IP 连接池。
    await dispatcher?.close().catch(() => undefined);
  }
});

settingsRouter.put('/api/settings/api-key', async (req, res) => {
  try {
    const user = (req as AuthenticatedRequest).user;
    if (!isLoggedInUser(user.kind)) {
      res.status(401).json({
        message: 'Please log in to manage API keys.',
      });
      return;
    }

    const apiKey = readApiKey(req.body);
    const apiBaseUrl = readApiBaseUrl(req.body);
    if (!apiKey) {
      res.status(400).json({
        message: 'apiKey must be a non-empty string longer than 10 characters.',
      });
      return;
    }

    if (hasInvalidExplicitApiBaseUrl(req.body, apiBaseUrl)) {
      res.status(400).json({
        message: 'apiBaseUrl must be a valid http(s) URL.',
      });
      return;
    }

    if (apiBaseUrl) {
      await assertSafeApiBaseUrl(apiBaseUrl);
    }

    upsertUserSettings(user.id, {
      apiKeyEncrypted: encrypt(apiKey),
      apiBaseUrl,
      apiKeySource: 'user',
    });

    res.json(toSettingsResponse({ source: 'user', rawApiKey: apiKey, apiBaseUrl }));
  } catch {
    res.status(500).json({
      message: '保存 API Key 失败，请检查服务端配置。',
    });
  }
});

settingsRouter.delete('/api/settings/api-key', (req, res) => {
  try {
    const user = (req as AuthenticatedRequest).user;
    if (!isLoggedInUser(user.kind)) {
      res.status(401).json({
        message: 'Please log in to manage API keys.',
      });
      return;
    }

    clearUserApiKey(user.id);
    res.json(toSettingsResponse({ source: 'default', apiBaseUrl: getDefaultApiBaseUrl() }));
  } catch {
    res.status(500).json({
      message: '恢复默认 API Key 失败，请稍后重试。',
    });
  }
});
