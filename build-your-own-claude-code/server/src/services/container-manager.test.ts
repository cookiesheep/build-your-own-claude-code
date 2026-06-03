import { randomUUID } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  closeDatabaseForTests,
  createPasswordUser,
  initDatabase,
  upsertUserSettings,
} from '../db/database.js';

describe('container API config resolution', () => {
  let tempDir: string;

  beforeAll(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'byocc-container-manager-test-'));
    process.env.BYOCC_DB_PATH = join(tempDir, 'byocc.sqlite');
    initDatabase();
  });

  afterAll(() => {
    closeDatabaseForTests();
    delete process.env.BYOCC_DB_PATH;
    rmSync(tempDir, { recursive: true, force: true });
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
