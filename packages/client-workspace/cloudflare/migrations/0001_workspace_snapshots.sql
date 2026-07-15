CREATE TABLE IF NOT EXISTS workspace_snapshots (
  sandbox_id TEXT PRIMARY KEY NOT NULL,
  object_key TEXT NOT NULL,
  size_bytes INTEGER NOT NULL CHECK (size_bytes >= 0),
  captured_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_workspace_snapshots_captured_at
  ON workspace_snapshots(captured_at);
