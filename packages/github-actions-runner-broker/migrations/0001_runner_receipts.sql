CREATE TABLE IF NOT EXISTS runner_receipts (
  job_id INTEGER PRIMARY KEY,
  delivery_id TEXT NOT NULL,
  repository TEXT NOT NULL,
  workflow_name TEXT NOT NULL,
  job_name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('received', 'starting', 'running', 'succeeded', 'failed')),
  runner_id INTEGER,
  runner_name TEXT,
  received_at TEXT NOT NULL,
  started_at TEXT,
  completed_at TEXT,
  exit_code INTEGER,
  attempts INTEGER NOT NULL DEFAULT 1,
  error TEXT
);

CREATE INDEX IF NOT EXISTS runner_receipts_repository_received
  ON runner_receipts(repository, received_at DESC);
