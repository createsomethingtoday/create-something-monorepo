CREATE TABLE IF NOT EXISTS workspace_receipts (
  sandbox_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  workspace_id TEXT NOT NULL,
  status TEXT NOT NULL,
  receipt_json TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (sandbox_id, session_id)
);

CREATE INDEX IF NOT EXISTS idx_workspace_receipts_updated_at
  ON workspace_receipts(updated_at);

CREATE TABLE IF NOT EXISTS workspace_actions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sandbox_id TEXT NOT NULL,
  session_id TEXT,
  workspace_id TEXT,
  action_kind TEXT NOT NULL,
  status_code INTEGER NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_workspace_actions_sandbox_created
  ON workspace_actions(sandbox_id, created_at);
