PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS tenant_budgets (
  tenant_id TEXT PRIMARY KEY,
  monthly_budget_usd REAL,
  warn_threshold_percent REAL NOT NULL DEFAULT 80,
  hard_limit_enabled INTEGER NOT NULL DEFAULT 1,
  alert_webhook_url TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (tenant_id) REFERENCES gateway_tenants(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS tenant_rate_limits (
  tenant_id TEXT PRIMARY KEY,
  requests_per_minute INTEGER NOT NULL DEFAULT 120,
  burst_limit INTEGER NOT NULL DEFAULT 180,
  window_seconds INTEGER NOT NULL DEFAULT 60,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (tenant_id) REFERENCES gateway_tenants(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS gateway_rate_counters (
  tenant_id TEXT NOT NULL,
  window_start TEXT NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (tenant_id, window_start),
  FOREIGN KEY (tenant_id) REFERENCES gateway_tenants(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_gateway_rate_counters_window ON gateway_rate_counters(window_start);

CREATE TABLE IF NOT EXISTS gateway_idempotency_keys (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  request_hash TEXT NOT NULL,
  response_status INTEGER,
  response_headers_json TEXT,
  response_body TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL,
  FOREIGN KEY (tenant_id) REFERENCES gateway_tenants(id) ON DELETE CASCADE,
  UNIQUE (tenant_id, endpoint, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_gateway_idempotency_expiry ON gateway_idempotency_keys(expires_at);

CREATE TRIGGER IF NOT EXISTS trg_tenant_budgets_updated_at
AFTER UPDATE ON tenant_budgets
FOR EACH ROW
BEGIN
  UPDATE tenant_budgets SET updated_at = datetime('now') WHERE tenant_id = OLD.tenant_id;
END;

CREATE TRIGGER IF NOT EXISTS trg_tenant_rate_limits_updated_at
AFTER UPDATE ON tenant_rate_limits
FOR EACH ROW
BEGIN
  UPDATE tenant_rate_limits SET updated_at = datetime('now') WHERE tenant_id = OLD.tenant_id;
END;
