CREATE TABLE IF NOT EXISTS sync_jobs (
  lock_key TEXT PRIMARY KEY,
  job_id TEXT NOT NULL,
  mode TEXT NOT NULL,
  status TEXT NOT NULL,
  started_at TEXT NOT NULL,
  heartbeat_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  finished_at TEXT,
  summary_json TEXT,
  error TEXT
);

CREATE INDEX IF NOT EXISTS idx_sync_jobs_status ON sync_jobs (status, expires_at);
