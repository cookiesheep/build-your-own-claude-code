import { randomUUID } from 'node:crypto';
import { beforeAll, describe, expect, it } from 'vitest';
import { createPasswordUser, initDatabase, recordApiUsage } from '../db/database.js';
import { checkRateLimit } from './rate-limit.js';

describe('API usage rate limit', () => {
  beforeAll(() => {
    initDatabase();
  });

  function createTestUser(): string {
    const userId = `user-${randomUUID()}`;
    createPasswordUser({
      id: userId,
      username: `rate-limit-${randomUUID()}`,
      passwordHash: 'hash',
      role: 'user',
    });
    return userId;
  }

  it('blocks default-key users at the daily request limit', () => {
    const userId = createTestUser();
    const sessionId = `session-${randomUUID()}`;
    process.env.BYOCC_DEFAULT_KEY_DAILY_LIMIT = '2';
    process.env.BYOCC_DEFAULT_KEY_SESSION_LIMIT = '10';

    recordApiUsage({
      userId,
      sessionId,
      model: 'claude-test',
      inputTokens: 1,
      outputTokens: 1,
      keySource: 'default',
    });
    recordApiUsage({
      userId,
      sessionId: `other-${sessionId}`,
      model: 'claude-test',
      inputTokens: 1,
      outputTokens: 1,
      keySource: 'default',
    });

    expect(checkRateLimit(userId, sessionId, 'default')).toEqual({
      allowed: false,
      remaining: 0,
      reason: 'daily',
    });
  });

  it('blocks default-key users at the session request limit', () => {
    const userId = createTestUser();
    const sessionId = `session-${randomUUID()}`;
    process.env.BYOCC_DEFAULT_KEY_DAILY_LIMIT = '10';
    process.env.BYOCC_DEFAULT_KEY_SESSION_LIMIT = '1';

    recordApiUsage({
      userId,
      sessionId,
      model: 'claude-test',
      inputTokens: 1,
      outputTokens: 1,
      keySource: 'default',
    });

    expect(checkRateLimit(userId, sessionId, 'default')).toEqual({
      allowed: false,
      remaining: 0,
      reason: 'session',
    });
  });

  it('does not rate-limit BYOK users', () => {
    expect(checkRateLimit(`user-${randomUUID()}`, `session-${randomUUID()}`, 'user')).toEqual({
      allowed: true,
      remaining: Number.POSITIVE_INFINITY,
    });
  });
});
