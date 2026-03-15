/**
 * D1 Database Helpers
 *
 * Typed wrappers for the D1 tables used by the Zoom Clips MCP server.
 * Provides query functions for sync_runs, clips_cache, and session_state.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Minimal D1-compatible interface for both real D1 and in-memory stub. */
export interface D1Database {
  prepare(query: string): D1PreparedStatement;
  exec(query: string): Promise<unknown>;
}

export interface D1PreparedStatement {
  bind(...params: unknown[]): D1PreparedStatement;
  first<T = Record<string, unknown>>(column?: string): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<{ results: T[] }>;
  run(): Promise<{ success: boolean; meta: Record<string, unknown> }>;
}

export interface SyncRun {
  id: number;
  started_at: string;
  completed_at: string | null;
  status: 'running' | 'success' | 'failed' | 'session_expired';
  clips_found: number;
  clips_synced: number;
  clips_skipped: number;
  error: string | null;
}

export interface CachedClip {
  id: number;
  zoom_url: string;
  title: string | null;
  speaker: string | null;
  created_at: string | null;
  notion_page_id: string | null;
  synced_at: string;
}

// ---------------------------------------------------------------------------
// Schema initialization
// ---------------------------------------------------------------------------

export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS sync_runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  started_at TEXT NOT NULL,
  completed_at TEXT,
  status TEXT NOT NULL DEFAULT 'running',
  clips_found INTEGER DEFAULT 0,
  clips_synced INTEGER DEFAULT 0,
  clips_skipped INTEGER DEFAULT 0,
  error TEXT
);

CREATE TABLE IF NOT EXISTS clips_cache (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  zoom_url TEXT UNIQUE NOT NULL,
  title TEXT,
  speaker TEXT,
  created_at TEXT,
  notion_page_id TEXT,
  synced_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS session_state (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
`;

export async function initSchema(db: D1Database): Promise<void> {
  await db.exec(SCHEMA_SQL);
}

// ---------------------------------------------------------------------------
// Sync runs
// ---------------------------------------------------------------------------

export async function createSyncRun(db: D1Database): Promise<number> {
  const result = await db
    .prepare('INSERT INTO sync_runs (started_at, status) VALUES (?, ?)')
    .bind(new Date().toISOString(), 'running')
    .run();
  return result.meta.last_row_id as number;
}

export async function completeSyncRun(
  db: D1Database,
  id: number,
  status: SyncRun['status'],
  stats: { clips_found?: number; clips_synced?: number; clips_skipped?: number; error?: string },
): Promise<void> {
  await db
    .prepare(
      `UPDATE sync_runs SET
        completed_at = ?,
        status = ?,
        clips_found = COALESCE(?, clips_found),
        clips_synced = COALESCE(?, clips_synced),
        clips_skipped = COALESCE(?, clips_skipped),
        error = ?
      WHERE id = ?`,
    )
    .bind(
      new Date().toISOString(),
      status,
      stats.clips_found ?? null,
      stats.clips_synced ?? null,
      stats.clips_skipped ?? null,
      stats.error ?? null,
      id,
    )
    .run();
}

export async function getLatestSyncRun(db: D1Database): Promise<SyncRun | null> {
  return db
    .prepare('SELECT * FROM sync_runs ORDER BY id DESC LIMIT 1')
    .first<SyncRun>();
}

export async function listSyncRuns(db: D1Database, limit = 10): Promise<SyncRun[]> {
  const result = await db
    .prepare('SELECT * FROM sync_runs ORDER BY id DESC LIMIT ?')
    .bind(limit)
    .all<SyncRun>();
  return result.results;
}

// ---------------------------------------------------------------------------
// Clips cache
// ---------------------------------------------------------------------------

export async function cacheClip(
  db: D1Database,
  clip: { zoom_url: string; title?: string; speaker?: string; created_at?: string; notion_page_id?: string },
): Promise<void> {
  await db
    .prepare(
      `INSERT OR REPLACE INTO clips_cache (zoom_url, title, speaker, created_at, notion_page_id, synced_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      clip.zoom_url,
      clip.title ?? null,
      clip.speaker ?? null,
      clip.created_at ?? null,
      clip.notion_page_id ?? null,
      new Date().toISOString(),
    )
    .run();
}

export async function listCachedClips(db: D1Database, limit = 50): Promise<CachedClip[]> {
  const result = await db
    .prepare('SELECT * FROM clips_cache ORDER BY synced_at DESC LIMIT ?')
    .bind(limit)
    .all<CachedClip>();
  return result.results;
}

export async function getCachedClipByUrl(db: D1Database, url: string): Promise<CachedClip | null> {
  return db
    .prepare('SELECT * FROM clips_cache WHERE zoom_url = ?')
    .bind(url)
    .first<CachedClip>();
}

// ---------------------------------------------------------------------------
// Session state
// ---------------------------------------------------------------------------

export async function setSessionState(
  db: D1Database,
  key: string,
  value: string,
): Promise<void> {
  await db
    .prepare(
      `INSERT OR REPLACE INTO session_state (key, value, updated_at)
       VALUES (?, ?, ?)`,
    )
    .bind(key, value, new Date().toISOString())
    .run();
}

export async function getSessionState(
  db: D1Database,
  key: string,
): Promise<{ value: string; updated_at: string } | null> {
  return db
    .prepare('SELECT value, updated_at FROM session_state WHERE key = ?')
    .bind(key)
    .first<{ value: string; updated_at: string }>();
}
