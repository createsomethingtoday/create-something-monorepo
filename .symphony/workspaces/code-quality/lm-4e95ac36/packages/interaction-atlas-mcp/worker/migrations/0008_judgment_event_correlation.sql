ALTER TABLE judgment_engine_events
  ADD COLUMN correlation_id TEXT NOT NULL DEFAULT 'unknown';

CREATE INDEX IF NOT EXISTS idx_judgment_engine_events_correlation
  ON judgment_engine_events (account_id, correlation_id, created_at DESC);
