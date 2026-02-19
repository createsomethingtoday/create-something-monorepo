PRAGMA foreign_keys = ON;

-- Correlation fields for joining MCP tool invocations with gateway calls.
ALTER TABLE mcp_tool_invocations ADD COLUMN correlation_id TEXT;
ALTER TABLE mcp_tool_invocations ADD COLUMN request_id TEXT;
ALTER TABLE mcp_tool_invocations ADD COLUMN metadata_json TEXT;

CREATE INDEX IF NOT EXISTS idx_mcp_invocations_correlation
  ON mcp_tool_invocations(correlation_id, created_at);

CREATE TABLE IF NOT EXISTS gateway_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  correlation_id TEXT,
  request_id TEXT,
  tenant_id TEXT NOT NULL,
  tenant_slug TEXT,
  runtime_key_prefix TEXT,
  provider_slug TEXT NOT NULL,
  model_name TEXT,
  endpoint TEXT NOT NULL,
  success INTEGER NOT NULL DEFAULT 1,
  status_code INTEGER,
  latency_ms INTEGER,
  prompt_tokens INTEGER,
  completion_tokens INTEGER,
  total_tokens INTEGER,
  estimated_cost_usd REAL NOT NULL DEFAULT 0,
  budget_decision TEXT NOT NULL DEFAULT 'allow',
  rate_limited INTEGER NOT NULL DEFAULT 0,
  failover_activated INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  upstream_request_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_gateway_requests_tenant_time
  ON gateway_requests(tenant_id, created_at);
CREATE INDEX IF NOT EXISTS idx_gateway_requests_correlation
  ON gateway_requests(correlation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_gateway_requests_model
  ON gateway_requests(provider_slug, model_name, created_at);

CREATE TABLE IF NOT EXISTS gateway_alerts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  alert_type TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  tenant_slug TEXT,
  severity TEXT NOT NULL DEFAULT 'warning',
  correlation_id TEXT,
  details_json TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_gateway_alerts_tenant_time
  ON gateway_alerts(tenant_id, created_at);
