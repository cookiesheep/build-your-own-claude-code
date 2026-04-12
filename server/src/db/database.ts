/**
 * SQLite 数据库服务
 *
 * 存储：用户会话 + Lab 完成进度
 * 使用 better-sqlite3（同步 API，简单可靠）
 */

import BetterSqlite3 from 'better-sqlite3';
import { join } from 'node:path';

type DatabaseHandle = BetterSqlite3.Database;

type SessionRow = {
  id: string;
  container_id: string | null;
  environment_status: string;
};

type ProgressRow = {
  lab_number: number;
  completed: number;
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
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      container_id TEXT,
      environment_status TEXT DEFAULT 'not_started',
      created_at TEXT DEFAULT (datetime('now')),
      last_active TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS progress (
      session_id TEXT,
      lab_number INTEGER,
      completed INTEGER DEFAULT 0,
      completed_at TEXT,
      PRIMARY KEY (session_id, lab_number)
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

  console.log(`💾 Database initialized: ${DB_PATH}`);
}

/**
 * 创建会话记录
 */
export function createSession(
  sessionId: string,
  containerId: string | null = null,
  environmentStatus: EnvironmentStatus = containerId ? 'running' : 'not_started'
): void {
  const database = getDb();

  database
    .prepare(
      `
        INSERT INTO sessions (id, container_id, environment_status, last_active)
        VALUES (?, ?, ?, datetime('now'))
        ON CONFLICT(id) DO UPDATE SET
          container_id = excluded.container_id,
          environment_status = excluded.environment_status,
          last_active = datetime('now')
      `
    )
    .run(sessionId, containerId, environmentStatus);
}

/**
 * 获取会话
 */
export function getSession(
  sessionId: string
): { id: string; containerId: string | null; environmentStatus: EnvironmentStatus } | null {
  const database = getDb();
  const row = database
    .prepare<[string], SessionRow>(
      'SELECT id, container_id, environment_status FROM sessions WHERE id = ?'
    )
    .get(sessionId);

  if (!row) {
    return null;
  }

  return {
    id: row.id,
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
