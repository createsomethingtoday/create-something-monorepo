CREATE TABLE IF NOT EXISTS draw_shares (
  share_id TEXT PRIMARY KEY NOT NULL,
  management_hash TEXT NOT NULL,
  document_json TEXT NOT NULL,
  title TEXT NOT NULL,
  revision INTEGER NOT NULL DEFAULT 1,
  published_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  expires_at TEXT,
  revoked_at TEXT
);
CREATE TABLE IF NOT EXISTS draw_publish_limits (
  bucket_key TEXT PRIMARY KEY NOT NULL,
  window_started_at INTEGER NOT NULL,
  publish_count INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS draw_shares_active ON draw_shares(share_id, revoked_at, expires_at);
