import { randomUUID } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  closeDatabaseForTests,
  createAnonymousUser,
  createPasswordUser,
  createSession,
  getLearnerLeaderboard,
  getVisitorCount,
  initDatabase,
  updateUserProgress,
} from './database.js';

describe('platform stats', () => {
  let tempDir: string;

  beforeAll(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'byocc-stats-test-'));
    process.env.BYOCC_DB_PATH = join(tempDir, 'byocc.sqlite');
    initDatabase();
  });

  afterAll(() => {
    closeDatabaseForTests();
    delete process.env.BYOCC_DB_PATH;
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('counts users and legacy unattached sessions as visitors', () => {
    const before = getVisitorCount();
    createAnonymousUser();
    createSession(`legacy-${randomUUID()}`);

    expect(getVisitorCount()).toBeGreaterThanOrEqual(before + 2);
  });

  it('aggregates learner progress for password users', () => {
    const userId = `user-${randomUUID()}`;
    const username = `zz-stats-leader-${randomUUID()}`;
    createPasswordUser({
      id: userId,
      username,
      passwordHash: 'hash',
      role: 'user',
    });

    for (let labNumber = 0; labNumber < 6; labNumber++) {
      updateUserProgress(userId, labNumber, true);
    }

    const stats = getLearnerLeaderboard();
    const entry = stats.leaderboard.find((item) => item.username === username);

    expect(stats.totalLearners).toBeGreaterThanOrEqual(1);
    expect(stats.limit).toBe(10);
    expect(entry).toMatchObject({
      username,
      completedLabs: 6,
    });
  });

  it('omits registered learners with no completed labs from leaderboard entries', () => {
    const username = `zz-stats-empty-${randomUUID()}`;
    createPasswordUser({
      id: `user-${randomUUID()}`,
      username,
      passwordHash: 'hash',
      role: 'user',
    });

    const stats = getLearnerLeaderboard();

    expect(stats.totalLearners).toBeGreaterThanOrEqual(1);
    expect(stats.leaderboard.some((item) => item.username === username)).toBe(false);
  });

  it('limits leaderboard entries to the default top 10', () => {
    for (let index = 0; index < 12; index++) {
      const userId = `user-${randomUUID()}`;
      createPasswordUser({
        id: userId,
        username: `zz-stats-cap-${index}-${randomUUID()}`,
        passwordHash: 'hash',
        role: 'user',
      });
      updateUserProgress(userId, 0, true);
    }

    const stats = getLearnerLeaderboard();

    expect(stats.limit).toBe(10);
    expect(stats.leaderboard).toHaveLength(10);
  });
});
