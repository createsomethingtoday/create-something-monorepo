-- MCP partner access policy + legacy credential controls
--
-- Canon: policy is explicit, auditable, and revocable.

CREATE TABLE mcp_legacy_keys (
  id TEXT PRIMARY KEY,
  key_hash TEXT NOT NULL UNIQUE,
  key_prefix TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  account_id TEXT NOT NULL,
  user_id TEXT,
  reason TEXT NOT NULL,
  exception_approved_by TEXT,
  issued_by TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  sunset_at TEXT NOT NULL,
  revoked_at TEXT,
  last_used_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_mcp_legacy_keys_tenant_id ON mcp_legacy_keys(tenant_id);
CREATE INDEX idx_mcp_legacy_keys_account_id ON mcp_legacy_keys(account_id);
CREATE INDEX idx_mcp_legacy_keys_expires_at ON mcp_legacy_keys(expires_at);
CREATE INDEX idx_mcp_legacy_keys_sunset_at ON mcp_legacy_keys(sunset_at);
CREATE INDEX idx_mcp_legacy_keys_revoked_at ON mcp_legacy_keys(revoked_at);

CREATE TABLE mcp_policy_rollout (
  policy_id TEXT PRIMARY KEY,
  mode TEXT NOT NULL CHECK (mode IN ('legacy_enforce', 'shadow', 'polar_enforce')) DEFAULT 'legacy_enforce',
  canary_percent INTEGER NOT NULL DEFAULT 0,
  updated_by TEXT NOT NULL,
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE mcp_policy_events (
  id TEXT PRIMARY KEY,
  policy_id TEXT NOT NULL,
  action_name TEXT NOT NULL,
  account_id TEXT,
  actor TEXT,
  rollout_mode TEXT NOT NULL,
  canary_percent INTEGER NOT NULL,
  sampled_polar INTEGER NOT NULL,
  mismatch INTEGER NOT NULL,
  evaluation_path TEXT NOT NULL,
  fallback_used INTEGER NOT NULL,
  fallback_reason TEXT,
  legacy_decision TEXT NOT NULL,
  polar_decision TEXT NOT NULL,
  final_decision TEXT NOT NULL,
  policy_hash TEXT,
  compiler_version TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_mcp_policy_events_policy_id_created_at ON mcp_policy_events(policy_id, created_at DESC);
CREATE INDEX idx_mcp_policy_events_account_id_created_at ON mcp_policy_events(account_id, created_at DESC);
