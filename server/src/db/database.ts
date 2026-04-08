/**
 * SQLite 数据库服务
 *
 * 存储：用户会话 + Lab 完成进度
 * 使用 better-sqlite3（同步 API，简单可靠）
 *
 * TODO: 实现数据库初始化和查询方法
 */

// import Database from 'better-sqlite3';

// let db: Database.Database;

/**
 * 初始化数据库
 *
 * 创建 sessions 表和 progress 表（如果不存在）
 */
export function initDatabase(): void {
  // TODO: 实现数据库初始化
  //
  // 示例：
  // db = new Database('byocc.sqlite');
  //
  // db.exec(`
  //   CREATE TABLE IF NOT EXISTS sessions (
  //     id TEXT PRIMARY KEY,
  //     container_id TEXT,
  //     created_at TEXT DEFAULT (datetime('now')),
  //     last_active TEXT DEFAULT (datetime('now'))
  //   );
  //
  //   CREATE TABLE IF NOT EXISTS progress (
  //     session_id TEXT,
  //     lab_number INTEGER,
  //     completed INTEGER DEFAULT 0,
  //     completed_at TEXT,
  //     PRIMARY KEY (session_id, lab_number)
  //   );
  // `);

  console.log('💾 Database: TODO — 待实现（目前使用内存存储）');
}

/**
 * 创建会话记录
 */
export function createSession(sessionId: string, containerId: string): void {
  // TODO: INSERT INTO sessions
  throw new Error('TODO: 实现 createSession');
}

/**
 * 获取会话
 */
export function getSession(sessionId: string): { id: string; containerId: string } | null {
  // TODO: SELECT FROM sessions WHERE id = ?
  return null;
}

/**
 * 更新 Lab 完成进度
 */
export function updateProgress(sessionId: string, labNumber: number, completed: boolean): void {
  // TODO: INSERT OR REPLACE INTO progress
  throw new Error('TODO: 实现 updateProgress');
}

/**
 * 获取用户所有 Lab 进度
 */
export function getProgress(sessionId: string): Array<{ labNumber: number; completed: boolean }> {
  // TODO: SELECT FROM progress WHERE session_id = ?
  return [];
}
