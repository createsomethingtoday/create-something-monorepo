-- Zoom Clips MCP — D1 initial schema
-- Tables: sync_runs, clips_cache, session_state (see src/lib/db.ts)

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
