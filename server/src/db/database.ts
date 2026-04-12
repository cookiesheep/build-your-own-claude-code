/**
 * SQLite 数据库服务
 *
 * 存储：用户会话 + Lab 完成进度
 * 使用 better-sqlite3（同步 API，简单可靠）
 */

import BetterSqlite3 from 'better-sqlite3';
import { randomUUID } from 'node:crypto';
import { join } from 'node:path';

type DatabaseHandle = BetterSqlite3.Database;

type SessionRow = {
  id: string;
  user_id: string | null;
  container_id: string | null;
  environment_status: string;
};

type UserRow = {
  id: string;
  kind: string;
  github_id: string | null;
  nickname: string | null;
  avatar_url: string | null;
};

type ProgressRow = {
  lab_number: number;
  completed: number;
};

type CodeSnapshotRow = {
  user_id: string;
  lab_number: number;
  code: string;
  updated_at: string;
};

const DB_PATH = join(process.cwd(), 'byocc.sqlite');
let db: DatabaseHandle | undefined;

export type EnvironmentStatus =
  | 'not_started'
  | 'starting'
  | 'running'
  | 'stopped'
  | 'expired'
  | 'error';

export type UserKind = 'anonymous' | 'github';

export type UserRecord = {
  id: string;
  kind: UserKind;
  githubId: string | null;
  nickname: string | null;
  avatarUrl: string | null;
};

export type CodeSnapshotRecord = {
  userId: string;
  labNumber: number;
  code: string;
  updatedAt: string;
};

function getDb(): DatabaseHandle {
  if (!db) {
    throw new Error('Database has not been initialized');
  }

  return db;
}

/**
 * 初始化数据库
 *
 * 创建 sessions 表和 progress 表（如果不存在）
 */
export function initDatabase(): void {
  if (db) {
    return;
  }

  db = new BetterSqlite3(DB_PATH);
  db.pragma('journal_mode = WAL');

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      kind TEXT NOT NULL DEFAULT 'anonymous',
      github_id TEXT UNIQUE,
      nickname TEXT,
      avatar_url TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      container_id TEXT,
      environment_status TEXT DEFAULT 'not_started',
      created_at TEXT DEFAULT (datetime('now')),
      last_active TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS progress (
      session_id TEXT,
      lab_number INTEGER,
      completed INTEGER DEFAULT 0,
      completed_at TEXT,
      PRIMARY KEY (session_id, lab_number)
    );

    CREATE TABLE IF NOT EXISTS code_snapshots (
      user_id TEXT NOT NULL,
      lab_number INTEGER NOT NULL,
      code TEXT NOT NULL,
      updated_at TEXT DEFAULT (datetime('now')),
      PRIMARY KEY (user_id, lab_number),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);

  const sessionColumns = db
    .prepare<[], { name: string }>('PRAGMA table_info(sessions)')
    .all()
    .map((column) => column.name);

  // SQLite 的 CREATE TABLE IF NOT EXISTS 不会自动给旧表补新列。
  // 所以这里显式做一次轻量迁移，保证老本地数据库也能继续用。
  if (!sessionColumns.includes('environment_status')) {
    db.exec("ALTER TABLE sessions ADD COLUMN environment_status TEXT DEFAULT 'not_started'");
  }

  if (!sessionColumns.includes('user_id')) {
    db.exec('ALTER TABLE sessions ADD COLUMN user_id TEXT REFERENCES users(id)');
  }

  console.log(`💾 Database initialized: ${DB_PATH}`);
}

function mapUser(row: UserRow): UserRecord {
  return {
    id: row.id,
    kind: row.kind as UserKind,
    githubId: row.github_id,
    nickname: row.nickname,
    avatarUrl: row.avatar_url,
  };
}

function mapCodeSnapshot(row: CodeSnapshotRow): CodeSnapshotRecord {
  return {
    userId: row.user_id,
    labNumber: row.lab_number,
    code: row.code,
    updatedAt: row.updated_at,
  };
}

/**
 * 创建匿名用户。
 *
 * 匿名 user 不是登录系统，它只是一个稳定的数据库归属点：
 * - 现在用来把 session 绑定到 user_id
 * - 下一步可用于 progress / code snapshot
 * - 以后 GitHub OAuth 可以把匿名 user 升级成 github user
 */
export function createAnonymousUser(): UserRecord {
  const database = getDb();
  const userId = randomUUID();

  database
    .prepare(
      `
        INSERT INTO users (id, kind)
        VALUES (?, 'anonymous')
      `
    )
    .run(userId);

  const user = getUser(userId);
  if (!user) {
    throw new Error(`Failed to create anonymous user "${userId}"`);
  }

  return user;
}

/**
 * 根据 user_id 获取用户。
 */
export function getUser(userId: string): UserRecord | null {
  const database = getDb();
  const row = database
    .prepare<[string], UserRow>(
      `
        SELECT id, kind, github_id, nickname, avatar_url
        FROM users
        WHERE id = ?
      `
    )
    .get(userId);

  return row ? mapUser(row) : null;
}

/**
 * 创建会话记录
 */
export function createSession(
  sessionId: string,
  containerId: string | null = null,
  environmentStatus: EnvironmentStatus = containerId ? 'running' : 'not_started',
  userId: string | null = null
): void {
  const database = getDb();

  database
    .prepare(
      `
        INSERT INTO sessions (id, user_id, container_id, environment_status, last_active)
        VALUES (?, ?, ?, ?, datetime('now'))
        ON CONFLICT(id) DO UPDATE SET
          user_id = COALESCE(excluded.user_id, user_id),
          container_id = excluded.container_id,
          environment_status = excluded.environment_status,
          last_active = datetime('now')
      `
    )
    .run(sessionId, userId, containerId, environmentStatus);
}

/**
 * 获取会话
 */
export function getSession(
  sessionId: string
): {
  id: string;
  userId: string | null;
  containerId: string | null;
  environmentStatus: EnvironmentStatus;
} | null {
  const database = getDb();
  const row = database
    .prepare<[string], SessionRow>(
      'SELECT id, user_id, container_id, environment_status FROM sessions WHERE id = ?'
    )
    .get(sessionId);

  if (!row) {
    return null;
  }

  return {
    id: row.id,
    userId: row.user_id,
    containerId: row.container_id,
    environmentStatus: row.environment_status as EnvironmentStatus,
  };
}

/**
 * 更新某个 session 对应的容器状态。
 *
 * 这和 progress 不同：
 * - progress 描述“学习者做到哪一步”
 * - environment 描述“当前临时实验机是否存在/是否可用”
 */
export function updateSessionEnvironment(
  sessionId: string,
  containerId: string | null,
  environmentStatus: EnvironmentStatus
): void {
  const database = getDb();

  database
    .prepare(
      `
        UPDATE sessions
        SET container_id = ?,
            environment_status = ?,
            last_active = datetime('now')
        WHERE id = ?
      `
    )
    .run(containerId, environmentStatus, sessionId);
}

/**
 * 更新 Lab 完成进度
 */
export function updateProgress(sessionId: string, labNumber: number, completed: boolean): void {
  const database = getDb();

  database
    .prepare(
      `
        INSERT INTO progress (session_id, lab_number, completed, completed_at)
        VALUES (?, ?, ?, CASE WHEN ? = 1 THEN datetime('now') ELSE NULL END)
        ON CONFLICT(session_id, lab_number) DO UPDATE SET
          completed = excluded.completed,
          completed_at = CASE
            WHEN excluded.completed = 1 THEN datetime('now')
            ELSE NULL
          END
      `
    )
    .run(sessionId, labNumber, completed ? 1 : 0, completed ? 1 : 0);
}

/**
 * 获取用户所有 Lab 进度
 */
export function getProgress(sessionId: string): Array<{ labNumber: number; completed: boolean }> {
  const database = getDb();
  const rows = database
    .prepare<[string], ProgressRow>(
      `
        SELECT lab_number, completed
        FROM progress
        WHERE session_id = ?
        ORDER BY lab_number ASC
      `
    )
    .all(sessionId);

  return rows.map((row) => ({
    labNumber: row.lab_number,
    completed: row.completed === 1,
  }));
}

/**
 * 保存某个用户在某个 Lab 的最新代码草稿。
 *
 * 这是“代码不因容器销毁而丢失”的基础能力。
 * 这里采用覆盖写：当前 MVP 只保留最新版，不做历史版本。
 */
export function upsertCodeSnapshot(
  userId: string,
  labNumber: number,
  code: string
): CodeSnapshotRecord {
  const database = getDb();

  database
    .prepare(
      `
        INSERT INTO code_snapshots (user_id, lab_number, code, updated_at)
        VALUES (?, ?, ?, datetime('now'))
        ON CONFLICT(user_id, lab_number) DO UPDATE SET
          code = excluded.code,
          updated_at = datetime('now')
      `
    )
    .run(userId, labNumber, code);

  const snapshot = getCodeSnapshot(userId, labNumber);
  if (!snapshot) {
    throw new Error(`Failed to save code snapshot for user "${userId}" lab ${labNumber}`);
  }

  return snapshot;
}

/**
 * 获取某个用户在某个 Lab 的代码草稿。
 */
export function getCodeSnapshot(
  userId: string,
  labNumber: number
): CodeSnapshotRecord | null {
  const database = getDb();
  const row = database
    .prepare<[string, number], CodeSnapshotRow>(
      `
        SELECT user_id, lab_number, code, updated_at
        FROM code_snapshots
        WHERE user_id = ? AND lab_number = ?
      `
    )
    .get(userId, labNumber);

  return row ? mapCodeSnapshot(row) : null;
}
