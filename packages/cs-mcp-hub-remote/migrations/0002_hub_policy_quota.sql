-- Hub tenant policy + quota model for gateway pre-invoke checks.

CREATE TABLE IF NOT EXISTS hub_tenant_policy (
  tenant_id TEXT NOT NULL,
  tool_ref TEXT NOT NULL,
  effect TEXT NOT NULL CHECK(effect IN ('allow', 'deny')),
  read_only_override INTEGER,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (tenant_id, tool_ref)
);

CREATE TABLE IF NOT EXISTS hub_tenant_quotas (
  tenant_id TEXT NOT NULL,
  scope_type TEXT NOT NULL CHECK(scope_type IN ('global', 'connector', 'server', 'tool')),
  scope_key TEXT NOT NULL,
  window_seconds INTEGER NOT NULL,
  max_calls INTEGER NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (tenant_id, scope_type, scope_key)
);

CREATE TABLE IF NOT EXISTS hub_quota_counters (
  tenant_id TEXT NOT NULL,
  scope_type TEXT NOT NULL,
  scope_key TEXT NOT NULL,
  window_start INTEGER NOT NULL,
  calls INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (tenant_id, scope_type, scope_key, window_start)
);

CREATE INDEX IF NOT EXISTS idx_hub_tenant_policy_tool
  ON hub_tenant_policy(tenant_id, tool_ref);

CREATE INDEX IF NOT EXISTS idx_hub_tenant_quotas_lookup
  ON hub_tenant_quotas(tenant_id, scope_type, scope_key);

CREATE INDEX IF NOT EXISTS idx_hub_quota_counters_lookup
  ON hub_quota_counters(tenant_id, scope_type, scope_key, window_start);
