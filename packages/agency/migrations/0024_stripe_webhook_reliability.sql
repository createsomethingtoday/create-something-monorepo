-- Durable Stripe webhook receipt, retry, and agent-queryable error state.
--
-- Stripe deliveries should be acknowledged after signature verification and
-- durable receipt persistence, not after downstream fulfillment succeeds.

CREATE TABLE IF NOT EXISTS stripe_webhook_events (
  event_id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  api_version TEXT,
  livemode INTEGER NOT NULL DEFAULT 0,
  object_id TEXT,
  object_type TEXT,
  payload_json TEXT NOT NULL CHECK (json_valid(payload_json)),
  status TEXT NOT NULL DEFAULT 'received'
    CHECK (status IN ('received', 'processing', 'processed', 'failed', 'ignored')),
  delivery_count INTEGER NOT NULL DEFAULT 1,
  processing_attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  received_at TEXT DEFAULT (datetime('now')),
  last_received_at TEXT DEFAULT (datetime('now')),
  last_attempt_at TEXT,
  processed_at TEXT,
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_status_updated
  ON stripe_webhook_events(status, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_type_received
  ON stripe_webhook_events(event_type, received_at DESC);

CREATE TABLE IF NOT EXISTS agent_error_logs (
  id TEXT PRIMARY KEY DEFAULT ('err_' || lower(hex(randomblob(16)))),
  level TEXT NOT NULL CHECK (level IN ('warn', 'error', 'fatal')),
  service TEXT NOT NULL,
  message TEXT NOT NULL,
  correlation_id TEXT,
  path TEXT,
  method TEXT,
  user_id TEXT,
  metadata TEXT CHECK (metadata IS NULL OR json_valid(metadata)),
  error_name TEXT,
  error_message TEXT,
  stack_trace TEXT,
  resolution_status TEXT NOT NULL DEFAULT 'new'
    CHECK (resolution_status IN ('new', 'analyzing', 'resolved', 'wontfix', 'recurring')),
  analyzed_at TEXT,
  analyzed_by TEXT,
  resolution_notes TEXT,
  linked_issue_id TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_agent_error_logs_service_created
  ON agent_error_logs(service, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_agent_error_logs_resolution_created
  ON agent_error_logs(resolution_status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_agent_error_logs_correlation
  ON agent_error_logs(correlation_id);

CREATE VIEW IF NOT EXISTS v_error_patterns AS
SELECT
  service,
  message,
  error_name,
  path,
  COUNT(*) AS occurrence_count,
  MIN(created_at) AS first_seen,
  MAX(created_at) AS last_seen,
  COUNT(DISTINCT correlation_id) AS unique_requests,
  COUNT(DISTINCT user_id) AS affected_users
FROM agent_error_logs
WHERE created_at >= datetime('now', '-7 days')
GROUP BY service, message, error_name, path;

CREATE VIEW IF NOT EXISTS v_error_daily_summary AS
SELECT
  date(created_at) AS date,
  service,
  level,
  COUNT(*) AS error_count
FROM agent_error_logs
WHERE created_at >= datetime('now', '-30 days')
GROUP BY date(created_at), service, level
ORDER BY date DESC, error_count DESC;
