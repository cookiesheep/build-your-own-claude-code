import { randomUUID } from 'node:crypto';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  createPasswordUser,
  initDatabase,
  upsertUserSettings,
} from '../db/database.js';

describe('container API config resolution', () => {
  beforeAll(() => {
    initDatabase();
  });

  beforeEach(() => {
    process.env.DEFAULT_API_KEY = 'sk-ant-default-test-key';
    process.env.DEFAULT_API_BASE_URL = 'https://api.anthropic.com';
    process.env.ENCRYPTION_KEY = 'b'.repeat(64);
  });

  it('falls back to the default key when a saved user key cannot be decrypted', async () => {
    const { resolveContainerApiConfig } = await import('./container-manager.js');
    const userId = `user-${randomUUID()}`;
    createPasswordUser({
      id: userId,
      username: `user-${randomUUID()}`,
      passwordHash: 'hash',
      role: 'user',
    });
    upsertUserSettings(userId, {
      apiKeyEncrypted: 'not-valid-ciphertext',
      apiBaseUrl: 'https://example.invalid',
      apiKeySource: 'user',
    });

    expect(resolveContainerApiConfig(userId)).toEqual({
      apiKey: 'sk-ant-default-test-key',
      apiBaseUrl: 'https://api.anthropic.com',
      keySource: 'default',
      keyFallback: true,
    });
  });
});
