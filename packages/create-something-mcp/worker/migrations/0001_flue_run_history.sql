CREATE TABLE IF NOT EXISTS flue_run_history (
  run_id TEXT PRIMARY KEY,
  checked_at TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('ready', 'review_required', 'blocked')),
  deployable INTEGER NOT NULL DEFAULT 0 CHECK (deployable IN (0, 1)),
  issue TEXT,
  resource_uri TEXT NOT NULL,
  workflow_name TEXT NOT NULL,
  deployment_target TEXT NOT NULL CHECK (deployment_target IN ('node', 'cloudflare')),
  record_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_flue_run_history_checked_at
  ON flue_run_history (checked_at DESC);

CREATE INDEX IF NOT EXISTS idx_flue_run_history_status
  ON flue_run_history (status);

CREATE INDEX IF NOT EXISTS idx_flue_run_history_issue
  ON flue_run_history (issue);
