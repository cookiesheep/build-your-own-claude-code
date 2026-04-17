import { Router } from 'express';
import {
  clearUserApiKey,
  getUserSettings,
  upsertUserSettings,
  type ApiKeySource,
} from '../db/database.js';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth.js';
import { encrypt } from '../services/encryption.js';

type ApiKeySettingsResponse = {
  source: ApiKeySource;
  hasKey: boolean;
  maskedKey?: string;
  apiBaseUrl?: string | null;
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

  try {
    const url = new URL(normalizedApiBaseUrl);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString().replace(/\/$/, '') : null;
  } catch {
    return null;
  }
}

function getDefaultApiBaseUrl(): string | null {
  return process.env.DEFAULT_API_BASE_URL ?? process.env.ANTHROPIC_BASE_URL ?? null;
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

settingsRouter.use('/api/settings', requireAuth);

settingsRouter.get('/api/settings/api-key', (req, res) => {
  const user = (req as AuthenticatedRequest).user;
  if (user.kind !== 'password') {
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

settingsRouter.put('/api/settings/api-key', (req, res) => {
  const user = (req as AuthenticatedRequest).user;
  if (user.kind !== 'password') {
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

  upsertUserSettings(user.id, {
    apiKeyEncrypted: encrypt(apiKey),
    apiBaseUrl,
    apiKeySource: 'user',
  });

  res.json(toSettingsResponse({ source: 'user', rawApiKey: apiKey, apiBaseUrl }));
});

settingsRouter.delete('/api/settings/api-key', (req, res) => {
  const user = (req as AuthenticatedRequest).user;
  if (user.kind !== 'password') {
    res.status(401).json({
      message: 'Please log in to manage API keys.',
    });
    return;
  }

  clearUserApiKey(user.id);
  res.json(toSettingsResponse({ source: 'default', apiBaseUrl: getDefaultApiBaseUrl() }));
});
