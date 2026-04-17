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
  last_active: string;
};

type UserRow = {
  id: string;
  kind: string;
  github_id: string | null;
  username: string | null;
  password_hash: string | null;
  role: string | null;
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

type UserSettingsRow = {
  user_id: string;
  api_key_encrypted: string | null;
  api_base_url: string | null;
  api_key_source: string;
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

export type UserKind = 'anonymous' | 'github' | 'password';
export type UserRole = 'admin' | 'user';

export type UserRecord = {
  id: string;
  kind: UserKind;
  githubId: string | null;
  username: string | null;
  role: UserRole | null;
  nickname: string | null;
  avatarUrl: string | null;
};

export type PasswordUserRecord = UserRecord & {
  kind: 'password';
  username: string;
  role: UserRole;
  passwordHash: string;
};

export type SessionRecord = {
  id: string;
  userId: string | null;
  containerId: string | null;
  environmentStatus: EnvironmentStatus;
  lastActive: string;
};

export type CodeSnapshotRecord = {
  userId: string;
  labNumber: number;
  code: string;
  updatedAt: string;
};

export type ApiKeySource = 'default' | 'user';

export type UserSettingsRecord = {
  userId: string;
  apiKeyEncrypted: string | null;
  apiBaseUrl: string | null;
  apiKeySource: ApiKeySource;
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
      username TEXT,
      password_hash TEXT,
      role TEXT DEFAULT 'user',
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

    CREATE TABLE IF NOT EXISTS user_progress (
      user_id TEXT NOT NULL,
      lab_number INTEGER NOT NULL,
      completed INTEGER DEFAULT 0,
      completed_at TEXT,
      PRIMARY KEY (user_id, lab_number),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS code_snapshots (
      user_id TEXT NOT NULL,
      lab_number INTEGER NOT NULL,
      code TEXT NOT NULL,
      updated_at TEXT DEFAULT (datetime('now')),
      PRIMARY KEY (user_id, lab_number),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS user_settings (
      user_id TEXT PRIMARY KEY,
      api_key_encrypted TEXT,
      api_base_url TEXT,
      api_key_source TEXT DEFAULT 'default',
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);

  const sessionColumns = db
    .prepare<[], { name: string }>('PRAGMA table_info(sessions)')
    .all()
    .map((column) => column.name);
  const userColumns = db
    .prepare<[], { name: string }>('PRAGMA table_info(users)')
    .all()
    .map((column) => column.name);
  const userSettingsColumns = db
    .prepare<[], { name: string }>('PRAGMA table_info(user_settings)')
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

  if (!sessionColumns.includes('last_active')) {
    db.exec(`
      ALTER TABLE sessions ADD COLUMN last_active TEXT;
      UPDATE sessions
      SET last_active = datetime('now')
      WHERE last_active IS NULL;
    `);
  }

  if (!userColumns.includes('username')) {
    db.exec('ALTER TABLE users ADD COLUMN username TEXT');
  }

  if (!userColumns.includes('password_hash')) {
    db.exec('ALTER TABLE users ADD COLUMN password_hash TEXT');
  }

  if (!userColumns.includes('role')) {
    db.exec("ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user'");
  }

  db.exec(
    'CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON users(username) WHERE username IS NOT NULL'
  );

  if (!userSettingsColumns.includes('api_base_url')) {
    db.exec('ALTER TABLE user_settings ADD COLUMN api_base_url TEXT');
  }

  console.log(`💾 Database initialized: ${DB_PATH}`);
}

function mapUser(row: UserRow): UserRecord {
  return {
    id: row.id,
    kind: row.kind as UserKind,
    githubId: row.github_id,
    username: row.username,
    role: row.role as UserRole | null,
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

function mapUserSettings(row: UserSettingsRow): UserSettingsRecord {
  return {
    userId: row.user_id,
    apiKeyEncrypted: row.api_key_encrypted,
    apiBaseUrl: row.api_base_url,
    apiKeySource: row.api_key_source === 'user' ? 'user' : 'default',
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
        SELECT id, kind, github_id, username, password_hash, role, nickname, avatar_url
        FROM users
        WHERE id = ?
      `
    )
    .get(userId);

  return row ? mapUser(row) : null;
}

export function getPasswordUserByUsername(username: string): PasswordUserRecord | null {
  const database = getDb();
  const row = database
    .prepare<[string], UserRow>(
      `
        SELECT id, kind, github_id, username, password_hash, role, nickname, avatar_url
        FROM users
        WHERE username = ? AND password_hash IS NOT NULL
      `
    )
    .get(username);

  if (!row || row.kind !== 'password' || !row.username || !row.password_hash || !row.role) {
    return null;
  }

  return {
    ...mapUser(row),
    kind: 'password',
    username: row.username,
    role: row.role as UserRole,
    passwordHash: row.password_hash,
  };
}

export function createPasswordUser(input: {
  id: string;
  username: string;
  passwordHash: string;
  role: UserRole;
}): UserRecord {
  const database = getDb();

  database
    .prepare(
      `
        INSERT INTO users (id, kind, username, password_hash, role)
        VALUES (?, 'password', ?, ?, ?)
      `
    )
    .run(input.id, input.username, input.passwordHash, input.role);

  const user = getUser(input.id);
  if (!user) {
    throw new Error(`Failed to create user "${input.username}"`);
  }

  return user;
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
): SessionRecord | null {
  const database = getDb();
  const row = database
    .prepare<[string], SessionRow>(
      'SELECT id, user_id, container_id, environment_status, last_active FROM sessions WHERE id = ?'
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
    lastActive: row.last_active,
  };
}

/**
 * 只更新 session 活跃时间，不改变容器状态。
 *
 * 这会被 submit / terminal websocket 等“用户正在使用环境”的信号调用。
 */
export function touchSessionActivity(sessionId: string): void {
  const database = getDb();

  database
    .prepare(
      `
        UPDATE sessions
        SET last_active = datetime('now')
        WHERE id = ?
      `
    )
    .run(sessionId);
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
 * 更新用户级 Lab 完成进度。
 *
 * 旧的 progress 表绑定 session_id，只能表示“这次浏览器会话完成了什么”。
 * user_progress 绑定 user_id，表示“这个学习者完成了什么”，可以跨 session 恢复。
 */
export function updateUserProgress(userId: string, labNumber: number, completed: boolean): void {
  const database = getDb();

  database
    .prepare(
      `
        INSERT INTO user_progress (user_id, lab_number, completed, completed_at)
        VALUES (?, ?, ?, CASE WHEN ? = 1 THEN datetime('now') ELSE NULL END)
        ON CONFLICT(user_id, lab_number) DO UPDATE SET
          completed = excluded.completed,
          completed_at = CASE
            WHEN excluded.completed = 1 THEN datetime('now')
            ELSE NULL
          END
      `
    )
    .run(userId, labNumber, completed ? 1 : 0, completed ? 1 : 0);
}

/**
 * 获取用户级 Lab 完成进度。
 */
export function getUserProgress(userId: string): Array<{ labNumber: number; completed: boolean }> {
  const database = getDb();
  const rows = database
    .prepare<[string], ProgressRow>(
      `
        SELECT lab_number, completed
        FROM user_progress
        WHERE user_id = ?
        ORDER BY lab_number ASC
      `
    )
    .all(userId);

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

export function getUserSettings(userId: string): UserSettingsRecord | null {
  const database = getDb();
  const row = database
    .prepare<[string], UserSettingsRow>(
      `
        SELECT user_id, api_key_encrypted, api_key_source, updated_at
        , api_base_url
        FROM user_settings
        WHERE user_id = ?
      `
    )
    .get(userId);

  return row ? mapUserSettings(row) : null;
}

export function upsertUserSettings(
  userId: string,
  settings: {
    apiKeyEncrypted?: string | null;
    apiBaseUrl?: string | null;
    apiKeySource?: ApiKeySource;
  }
): UserSettingsRecord {
  const database = getDb();

  database
    .prepare(
      `
        INSERT INTO user_settings (user_id, api_key_encrypted, api_base_url, api_key_source, updated_at)
        VALUES (?, ?, ?, ?, datetime('now'))
        ON CONFLICT(user_id) DO UPDATE SET
          api_key_encrypted = COALESCE(excluded.api_key_encrypted, api_key_encrypted),
          api_base_url = excluded.api_base_url,
          api_key_source = COALESCE(excluded.api_key_source, api_key_source),
          updated_at = datetime('now')
      `
    )
    .run(
      userId,
      settings.apiKeyEncrypted ?? null,
      settings.apiBaseUrl ?? null,
      settings.apiKeySource ?? 'default'
    );

  const savedSettings = getUserSettings(userId);
  if (!savedSettings) {
    throw new Error(`Failed to save settings for user "${userId}"`);
  }

  return savedSettings;
}

export function clearUserApiKey(userId: string): UserSettingsRecord {
  const database = getDb();

  database
    .prepare(
      `
        INSERT INTO user_settings (user_id, api_key_encrypted, api_base_url, api_key_source, updated_at)
        VALUES (?, NULL, NULL, 'default', datetime('now'))
        ON CONFLICT(user_id) DO UPDATE SET
          api_key_encrypted = NULL,
          api_base_url = NULL,
          api_key_source = 'default',
          updated_at = datetime('now')
      `
    )
    .run(userId);

  const savedSettings = getUserSettings(userId);
  if (!savedSettings) {
    throw new Error(`Failed to clear settings for user "${userId}"`);
  }

  return savedSettings;
}
