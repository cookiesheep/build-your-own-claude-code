/**
 * SQLite 数据库服务
 *
 * 存储：用户会话 + Lab 完成进度
 * 使用 better-sqlite3（同步 API，简单可靠）
 */

import BetterSqlite3 from 'better-sqlite3';
import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { normalizeWorkspaceFiles } from '../services/lab-workspace.js';

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
  disabled: number;
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

type ApiUsageCountRow = {
  request_count: number;
};

type CountRow = {
  count: number;
};

type LearnerLeaderboardRow = {
  id: string;
  username: string | null;
  nickname: string | null;
  avatar_url: string | null;
  completed_labs: number;
  last_completed_at: string | null;
};

const LEADERBOARD_LIMIT = 10;

let db: DatabaseHandle | undefined;

function getDbPath(): string {
  return process.env.BYOCC_DB_PATH ?? join(process.cwd(), 'byocc.sqlite');
}

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
  disabled: boolean;
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

export type WorkspaceSnapshotRecord = {
  files: Record<string, string>;
  updatedAt: string | null;
};

export type ApiKeySource = 'default' | 'user';

export type UserSettingsRecord = {
  userId: string;
  apiKeyEncrypted: string | null;
  apiBaseUrl: string | null;
  apiKeySource: ApiKeySource;
  updatedAt: string;
};

export type LeaderboardEntry = {
  username: string | null;
  nickname: string | null;
  avatarUrl: string | null;
  completedLabs: number;
};

export type LeaderboardStats = {
  totalLearners: number;
  limit: number;
  leaderboard: LeaderboardEntry[];
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

  const dbPath = getDbPath();
  db = new BetterSqlite3(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('busy_timeout = 5000');
  db.pragma('foreign_keys = ON');

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

    CREATE TABLE IF NOT EXISTS api_usage (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      session_id TEXT NOT NULL,
      model TEXT,
      input_tokens INTEGER DEFAULT 0,
      output_tokens INTEGER DEFAULT 0,
      key_source TEXT NOT NULL DEFAULT 'default',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE INDEX IF NOT EXISTS idx_api_usage_user_date
      ON api_usage(user_id, date(created_at));

    CREATE INDEX IF NOT EXISTS idx_api_usage_session
      ON api_usage(session_id);

    CREATE TABLE IF NOT EXISTS page_views (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      total INTEGER NOT NULL DEFAULT 0
    );

    INSERT OR IGNORE INTO page_views (id, total) VALUES (1, 0);
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

  if (!userColumns.includes('disabled')) {
    db.exec('ALTER TABLE users ADD COLUMN disabled INTEGER NOT NULL DEFAULT 0');
  }

  db.exec(
    'CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON users(username) WHERE username IS NOT NULL'
  );

  if (!userSettingsColumns.includes('api_base_url')) {
    db.exec('ALTER TABLE user_settings ADD COLUMN api_base_url TEXT');
  }

  console.log(`💾 Database initialized: ${dbPath}`);
}

export function closeDatabaseForTests(): void {
  if (!db) {
    return;
  }

  db.close();
  db = undefined;
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
    disabled: row.disabled === 1,
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
        SELECT id, kind, github_id, username, password_hash, role, nickname, avatar_url, disabled
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
        SELECT id, kind, github_id, username, password_hash, role, nickname, avatar_url, disabled
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

export function getGithubUser(githubId: string): UserRecord | null {
  const database = getDb();
  const row = database
    .prepare<[string], UserRow>(
      `
        SELECT id, kind, github_id, username, password_hash, role, nickname, avatar_url, disabled
        FROM users
        WHERE github_id = ?
      `
    )
    .get(githubId);

  return row ? mapUser(row) : null;
}

export function createGithubUser(input: {
  id?: string;
  githubId: string;
  username: string;
  nickname: string | null;
  avatarUrl: string | null;
}): UserRecord {
  const database = getDb();
  const userId = input.id ?? randomUUID();

  database
    .prepare(
      `
        INSERT INTO users (id, kind, github_id, username, role, nickname, avatar_url)
        VALUES (?, 'github', ?, ?, 'user', ?, ?)
      `
    )
    .run(userId, input.githubId, input.username, input.nickname, input.avatarUrl);

  const user = getUser(userId);
  if (!user) {
    throw new Error(`Failed to create GitHub user "${input.githubId}"`);
  }

  return user;
}

export function updateGithubUserProfile(
  userId: string,
  input: {
    username: string;
    nickname: string | null;
    avatarUrl: string | null;
  }
): UserRecord {
  const database = getDb();

  database
    .prepare(
      `
        UPDATE users
        SET username = ?,
            nickname = ?,
            avatar_url = ?
        WHERE id = ? AND kind = 'github'
      `
    )
    .run(input.username, input.nickname, input.avatarUrl, userId);

  const user = getUser(userId);
  if (!user) {
    throw new Error(`Failed to update GitHub user "${userId}"`);
  }

  return user;
}

/**
 * 把 fromUserId 的所有数据搬到 toUserId 名下，最后删掉 fromUserId。
 *
 * 主要用途：匿名用户首次通过 GitHub 登录时，把匿名期间积累的 progress/workspace
 * 接到 GitHub user 名下。整段必须在事务里执行——任何一步失败都不应该留下半边数据。
 *
 * `code_snapshots` 和 `user_progress` 主键是 (user_id, lab_number)：双方都有同一个 lab
 * 时直接 UPDATE 会触发 UNIQUE 冲突。这里走 INSERT OR REPLACE，让匿名期间最新的草稿/进度
 * 覆盖 GitHub 用户原有的同 lab 记录——常见场景里 GitHub 用户是新建的，根本没有冲突；
 * 真正发生冲突时（多次登录），匿名期间的工作通常更新，让它胜出更符合直觉。
 */
export function migrateUserData(fromUserId: string, toUserId: string): void {
  if (fromUserId === toUserId) {
    return;
  }

  const database = getDb();
  const migrate = database.transaction(() => {
    const target = database
      .prepare<[string], { id: string }>('SELECT id FROM users WHERE id = ?')
      .get(toUserId);
    if (!target) {
      throw new Error(`Target user "${toUserId}" not found`);
    }

    const source = database
      .prepare<[string], { id: string }>('SELECT id FROM users WHERE id = ?')
      .get(fromUserId);
    if (!source) {
      return;
    }

    database
      .prepare(
        `
          INSERT OR REPLACE INTO code_snapshots (user_id, lab_number, code, updated_at)
          SELECT ?, lab_number, code, updated_at
          FROM code_snapshots WHERE user_id = ?
        `
      )
      .run(toUserId, fromUserId);
    database.prepare('DELETE FROM code_snapshots WHERE user_id = ?').run(fromUserId);

    database
      .prepare(
        `
          INSERT OR REPLACE INTO user_progress (user_id, lab_number, completed, completed_at)
          SELECT ?, lab_number, completed, completed_at
          FROM user_progress WHERE user_id = ?
        `
      )
      .run(toUserId, fromUserId);
    database.prepare('DELETE FROM user_progress WHERE user_id = ?').run(fromUserId);

    // user_settings: PK 仅 user_id。target 已有时不覆盖（API key 这种敏感配置以 target 为准）。
    const targetHasSettings = database
      .prepare<[string], { user_id: string }>('SELECT user_id FROM user_settings WHERE user_id = ?')
      .get(toUserId);
    if (targetHasSettings) {
      database.prepare('DELETE FROM user_settings WHERE user_id = ?').run(fromUserId);
    } else {
      database
        .prepare('UPDATE user_settings SET user_id = ? WHERE user_id = ?')
        .run(toUserId, fromUserId);
    }

    // sessions / api_usage 没有 (user_id, X) 的复合 UNIQUE，直接改归属即可。
    database
      .prepare('UPDATE sessions SET user_id = ? WHERE user_id = ?')
      .run(toUserId, fromUserId);
    database
      .prepare('UPDATE api_usage SET user_id = ? WHERE user_id = ?')
      .run(toUserId, fromUserId);

    database.prepare('DELETE FROM users WHERE id = ?').run(fromUserId);
  });

  migrate();
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

export function getWorkspaceSnapshot(
  userId: string,
  labNumber: number
): WorkspaceSnapshotRecord {
  const snapshot = getCodeSnapshot(userId, labNumber);
  if (!snapshot) {
    return {
      files: {},
      updatedAt: null,
    };
  }

  try {
    const parsed = JSON.parse(snapshot.code);
    return {
      files: normalizeWorkspaceFiles(labNumber, parsed),
      updatedAt: snapshot.updatedAt,
    };
  } catch {
    return {
      files: normalizeWorkspaceFiles(labNumber, snapshot.code),
      updatedAt: snapshot.updatedAt,
    };
  }
}

export function saveWorkspaceSnapshot(
  userId: string,
  labNumber: number,
  files: Record<string, string>
): WorkspaceSnapshotRecord {
  const sanitizedFiles = normalizeWorkspaceFiles(labNumber, files);
  const snapshot = upsertCodeSnapshot(userId, labNumber, JSON.stringify(sanitizedFiles));
  return {
    files: sanitizedFiles,
    updatedAt: snapshot.updatedAt,
  };
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

export function recordApiUsage(input: {
  userId: string;
  sessionId: string;
  model: string | null;
  inputTokens: number;
  outputTokens: number;
  keySource: ApiKeySource;
}): void {
  const database = getDb();

  database
    .prepare(
      `
        INSERT INTO api_usage (
          user_id,
          session_id,
          model,
          input_tokens,
          output_tokens,
          key_source
        )
        VALUES (?, ?, ?, ?, ?, ?)
      `
    )
    .run(
      input.userId,
      input.sessionId,
      input.model,
      Math.max(0, Math.floor(input.inputTokens)),
      Math.max(0, Math.floor(input.outputTokens)),
      input.keySource
    );
}

export function getTodayUsage(userId: string): number {
  const database = getDb();
  const row = database
    .prepare<[string], ApiUsageCountRow>(
      `
        SELECT COUNT(*) AS request_count
        FROM api_usage
        WHERE user_id = ?
          AND date(created_at) = date('now')
          AND key_source = 'default'
      `
    )
    .get(userId);

  return row?.request_count ?? 0;
}

export function getSessionUsage(sessionId: string): number {
  const database = getDb();
  const row = database
    .prepare<[string], ApiUsageCountRow>(
      `
        SELECT COUNT(*) AS request_count
        FROM api_usage
        WHERE session_id = ?
          AND key_source = 'default'
      `
    )
    .get(sessionId);

  return row?.request_count ?? 0;
}

export function getDefaultKeyDailyLimit(): number {
  const dailyLimit = Number.parseInt(process.env.BYOCC_DEFAULT_KEY_DAILY_LIMIT ?? '500', 10);
  return Number.isFinite(dailyLimit) && dailyLimit > 0 ? dailyLimit : 500;
}

export function getUserDailyRemaining(userId: string): number {
  return Math.max(0, getDefaultKeyDailyLimit() - getTodayUsage(userId));
}

export function incrementPageView(): void {
  const database = getDb();
  database.prepare('UPDATE page_views SET total = total + 1 WHERE id = 1').run();
}

export function getVisitorCount(): number {
  const database = getDb();
  const row = database
    .prepare<[], CountRow>('SELECT total AS count FROM page_views WHERE id = 1')
    .get();
  return row?.count ?? 0;
}

export function getLearnerLeaderboard(): LeaderboardStats {
  const database = getDb();
  const totalRow = database
    .prepare<[], CountRow>(
      `
        SELECT COUNT(*) AS count
        FROM users
        WHERE kind IN ('github', 'password')
      `
    )
    .get();
  const rows = database
    .prepare<[number], LearnerLeaderboardRow>(
      `
        SELECT
          u.id,
          u.username,
          u.nickname,
          u.avatar_url,
          COUNT(up.lab_number) AS completed_labs,
          MAX(up.completed_at) AS last_completed_at
        FROM users u
        INNER JOIN user_progress up
          ON up.user_id = u.id
          AND up.completed = 1
        WHERE u.kind IN ('github', 'password')
        GROUP BY u.id, u.username, u.nickname, u.avatar_url
        ORDER BY
          completed_labs DESC,
          last_completed_at IS NULL ASC,
          last_completed_at DESC,
          COALESCE(NULLIF(u.nickname, ''), NULLIF(u.username, ''), u.id) COLLATE NOCASE ASC
        LIMIT ?
      `
    )
    .all(LEADERBOARD_LIMIT);

  return {
    totalLearners: totalRow?.count ?? 0,
    limit: LEADERBOARD_LIMIT,
    leaderboard: rows.map((row) => ({
      username: row.username,
      nickname: row.nickname,
      avatarUrl: row.avatar_url,
      completedLabs: Math.min(6, Math.max(0, row.completed_labs)),
    })),
  };
}

// ============================================================================
// 管理后台：反滥用监控 + 禁用/解禁
//
// 监控只看 key_source = 'default'（平台共享 key，平台掏钱的部分）。用户自带 key
// 的调用与平台成本无关，不计入。禁用通过 users.disabled 列实现，拦截点在 requireAuth
// 与 llm-proxy（见各自文件）。
// ============================================================================

export type AdminOverview = {
  date: string;
  defaultKeyRequests: number;
  defaultKeyInputTokens: number;
  defaultKeyOutputTokens: number;
  activeUsers: number;
  dailyLimit: number;
};

export type TopConsumer = {
  userId: string;
  username: string | null;
  nickname: string | null;
  kind: UserKind;
  disabled: boolean;
  requests: number;
  inputTokens: number;
  outputTokens: number;
};

export type AdminTopConsumers = {
  date: string;
  limit: number;
  consumers: TopConsumer[];
};

export type UserUsageDay = {
  date: string;
  requests: number;
  inputTokens: number;
  outputTokens: number;
};

export type UserUsageSession = {
  sessionId: string;
  requests: number;
  inputTokens: number;
  outputTokens: number;
  lastUsedAt: string | null;
};

export type AdminUserDetail = {
  user: {
    userId: string;
    username: string | null;
    nickname: string | null;
    kind: UserKind;
    role: UserRole | null;
    disabled: boolean;
  };
  byDay: UserUsageDay[];
  bySession: UserUsageSession[];
};

export type AnomalyUser = TopConsumer & { remaining: number };

export type AdminAnomalies = {
  date: string;
  dailyLimit: number;
  threshold: number;
  users: AnomalyUser[];
};

type OverviewRow = {
  requests: number;
  input_tokens: number;
  output_tokens: number;
  active_users: number;
};

type TopConsumerRow = {
  user_id: string;
  username: string | null;
  nickname: string | null;
  kind: string;
  disabled: number;
  requests: number;
  input_tokens: number;
  output_tokens: number;
};

type UserUsageDayRow = {
  date: string;
  requests: number;
  input_tokens: number;
  output_tokens: number;
};

type UserUsageSessionRow = {
  session_id: string;
  requests: number;
  input_tokens: number;
  output_tokens: number;
  last_used_at: string | null;
};

/**
 * 当前 user 是否被禁用。
 *
 * 热路径（llm-proxy 每次调用）专用：单列主键查询。查不到行（用户不存在）返回 false，
 * 即 fail-open——DB 抖动或脏 token 绝不会把全员误锁在外。
 */
export function isUserDisabled(userId: string): boolean {
  const row = getDb()
    .prepare<[string], { disabled: number }>('SELECT disabled FROM users WHERE id = ?')
    .get(userId);
  return row?.disabled === 1;
}

export function setUserDisabled(userId: string, disabled: boolean): UserRecord {
  getDb()
    .prepare('UPDATE users SET disabled = ? WHERE id = ?')
    .run(disabled ? 1 : 0, userId);
  const user = getUser(userId);
  if (!user) {
    throw new Error(`User not found: ${userId}`);
  }
  return user;
}

export function getDefaultKeyOverview(): AdminOverview {
  const row = getDb()
    .prepare<[], OverviewRow>(
      `
        SELECT
          COUNT(*) AS requests,
          COALESCE(SUM(input_tokens), 0) AS input_tokens,
          COALESCE(SUM(output_tokens), 0) AS output_tokens,
          COUNT(DISTINCT user_id) AS active_users
        FROM api_usage
        WHERE key_source = 'default' AND date(created_at) = date('now')
      `
    )
    .get();

  return {
    date: new Date().toISOString().slice(0, 10),
    defaultKeyRequests: row?.requests ?? 0,
    defaultKeyInputTokens: row?.input_tokens ?? 0,
    defaultKeyOutputTokens: row?.output_tokens ?? 0,
    activeUsers: row?.active_users ?? 0,
    dailyLimit: getDefaultKeyDailyLimit(),
  };
}

function mapTopConsumer(row: TopConsumerRow): TopConsumer {
  return {
    userId: row.user_id,
    username: row.username,
    nickname: row.nickname,
    kind: row.kind as UserKind,
    disabled: row.disabled === 1,
    requests: row.requests,
    inputTokens: row.input_tokens,
    outputTokens: row.output_tokens,
  };
}

export function getDefaultKeyTopConsumers(limit = 50): AdminTopConsumers {
  const normalizedLimit = Math.min(200, Math.max(1, Math.floor(limit)));
  const rows = getDb()
    .prepare<[number], TopConsumerRow>(
      `
        SELECT
          au.user_id,
          u.username,
          u.nickname,
          u.kind,
          u.disabled,
          COUNT(*) AS requests,
          COALESCE(SUM(au.input_tokens), 0) AS input_tokens,
          COALESCE(SUM(au.output_tokens), 0) AS output_tokens
        FROM api_usage au
        JOIN users u ON u.id = au.user_id
        WHERE au.key_source = 'default' AND date(au.created_at) = date('now')
        GROUP BY au.user_id, u.username, u.nickname, u.kind, u.disabled
        ORDER BY requests DESC, input_tokens DESC
        LIMIT ?
      `
    )
    .all(normalizedLimit);

  return {
    date: new Date().toISOString().slice(0, 10),
    limit: normalizedLimit,
    consumers: rows.map(mapTopConsumer),
  };
}

export function getUserUsageDetail(userId: string, days = 14): AdminUserDetail | null {
  const user = getUser(userId);
  if (!user) {
    return null;
  }

  const normalizedDays = Math.min(90, Math.max(1, Math.floor(days)));
  const sinceModifier = `-${normalizedDays - 1} days`;

  const byDay = getDb()
    .prepare<[string, string], UserUsageDayRow>(
      `
        SELECT
          date(created_at) AS date,
          COUNT(*) AS requests,
          COALESCE(SUM(input_tokens), 0) AS input_tokens,
          COALESCE(SUM(output_tokens), 0) AS output_tokens
        FROM api_usage
        WHERE user_id = ? AND key_source = 'default'
          AND date(created_at) >= date('now', ?)
        GROUP BY date(created_at)
        ORDER BY date DESC
      `
    )
    .all(userId, sinceModifier);

  const bySession = getDb()
    .prepare<[string], UserUsageSessionRow>(
      `
        SELECT
          session_id,
          COUNT(*) AS requests,
          COALESCE(SUM(input_tokens), 0) AS input_tokens,
          COALESCE(SUM(output_tokens), 0) AS output_tokens,
          MAX(created_at) AS last_used_at
        FROM api_usage
        WHERE user_id = ? AND key_source = 'default'
        GROUP BY session_id
        ORDER BY requests DESC
        LIMIT 100
      `
    )
    .all(userId);

  return {
    user: {
      userId: user.id,
      username: user.username,
      nickname: user.nickname,
      kind: user.kind,
      role: user.role,
      disabled: user.disabled,
    },
    byDay: byDay.map((row) => ({
      date: row.date,
      requests: row.requests,
      inputTokens: row.input_tokens,
      outputTokens: row.output_tokens,
    })),
    bySession: bySession.map((row) => ({
      sessionId: row.session_id,
      requests: row.requests,
      inputTokens: row.input_tokens,
      outputTokens: row.output_tokens,
      lastUsedAt: row.last_used_at,
    })),
  };
}

export function getDefaultKeyAnomalies(threshold = 0.8): AdminAnomalies {
  const normalizedThreshold = Math.min(1, Math.max(0, threshold));
  const dailyLimit = getDefaultKeyDailyLimit();
  const cutoff = Math.ceil(dailyLimit * normalizedThreshold);

  // 复用 top-consumers 的当日聚合，再按 cutoff 过滤。limit 取 200 足够覆盖逼近上限的账号。
  const consumers = getDefaultKeyTopConsumers(200).consumers;
  const users: AnomalyUser[] = consumers
    .filter((consumer) => consumer.requests >= cutoff)
    .map((consumer) => ({
      ...consumer,
      remaining: Math.max(0, dailyLimit - consumer.requests),
    }));

  return {
    date: new Date().toISOString().slice(0, 10),
    dailyLimit,
    threshold: normalizedThreshold,
    users,
  };
}
