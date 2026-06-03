import { randomUUID } from 'node:crypto';
import express, { type Express } from 'express';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  closeDatabaseForTests,
  createAnonymousUser,
  createPasswordUser,
  createSession,
  initDatabase,
  updateUserProgress,
} from '../db/database.js';
import { statsRouter } from './stats.js';

function requestJson(path: string, method = 'GET'): Promise<{ statusCode: number; body: unknown }> {
  const app = express();
  app.use(statsRouter);
  const handleApp = app as Express & {
    handle(
      req: unknown,
      res: unknown,
      callback: (error?: unknown) => void,
    ): void;
  };

  return new Promise((resolve, reject) => {
    const req = {
      method,
      url: path,
      headers: {},
    };
    const chunks: Buffer[] = [];
    const res = {
      statusCode: 200,
      setHeader() {},
      getHeader() {
        return undefined;
      },
      end(chunk?: string | Buffer) {
        if (chunk) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        const rawBody = Buffer.concat(chunks).toString('utf8');
        resolve({
          statusCode: this.statusCode,
          body: rawBody ? JSON.parse(rawBody) : null,
        });
      },
    };

    handleApp.handle(req, res, reject);
  });
}

describe('stats routes', () => {
  let tempDir: string;

  beforeAll(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'byocc-stats-routes-test-'));
    process.env.BYOCC_DB_PATH = join(tempDir, 'byocc.sqlite');
    initDatabase();
  });

  afterAll(() => {
    closeDatabaseForTests();
    delete process.env.BYOCC_DB_PATH;
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('GET returns visitor total without incrementing', async () => {
    /* GET is read-only — calling it twice must not change the count */
    const first = await requestJson('/api/stats/visitors');
    const second = await requestJson('/api/stats/visitors');

    expect(first.statusCode).toBe(200);
    expect(second.statusCode).toBe(200);
    expect(first.body).toEqual(second.body);
  });

  it('POST increments the visitor count', async () => {
    const before = await requestJson('/api/stats/visitors');
    const beforeTotal = (before.body as { total: number }).total;

    const response = await requestJson('/api/stats/visitors', 'POST');

    expect(response.statusCode).toBe(200);
    expect((response.body as { total: number }).total).toBe(beforeTotal + 1);

    /* Subsequent GET must reflect the new count without further increment */
    const after = await requestJson('/api/stats/visitors');
    expect((after.body as { total: number }).total).toBe(beforeTotal + 1);
  });

  it('returns only learners with completed labs through the leaderboard route', async () => {
    const activeUsername = `stats-active-${randomUUID()}`;
    const inactiveUsername = `stats-inactive-${randomUUID()}`;
    const activeUser = createPasswordUser({
      id: `user-${randomUUID()}`,
      username: activeUsername,
      passwordHash: 'hash',
      role: 'user',
    });
    createPasswordUser({
      id: `user-${randomUUID()}`,
      username: inactiveUsername,
      passwordHash: 'hash',
      role: 'user',
    });
    updateUserProgress(activeUser.id, 3, true);

    const response = await requestJson('/api/stats/leaderboard');

    expect(response.statusCode).toBe(200);
    expect(response.body).toMatchObject({
      totalLearners: 2,
      limit: 10,
      leaderboard: [
        {
          username: activeUsername,
          nickname: null,
          avatarUrl: null,
          completedLabs: 1,
        },
      ],
    });
    expect(JSON.stringify(response.body)).not.toContain(inactiveUsername);
  });

  it('returns at most the top 10 learners through the leaderboard route', async () => {
    for (let index = 0; index < 12; index++) {
      const userId = `route-cap-${randomUUID()}`;
      createPasswordUser({
        id: userId,
        username: `route-cap-${index}-${randomUUID()}`,
        passwordHash: 'hash',
        role: 'user',
      });
      updateUserProgress(userId, 0, true);
    }

    const response = await requestJson('/api/stats/leaderboard');
    const body = response.body as { leaderboard?: unknown[] };

    expect(response.statusCode).toBe(200);
    expect(body).toMatchObject({ limit: 10 });
    expect(body.leaderboard).toHaveLength(10);
  });
});
