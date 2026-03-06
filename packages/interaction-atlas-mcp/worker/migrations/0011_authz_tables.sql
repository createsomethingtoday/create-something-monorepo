CREATE TABLE IF NOT EXISTS authz_policy_rollouts (
  scope_key TEXT PRIMARY KEY,
  scope_type TEXT NOT NULL CHECK (scope_type IN ('policy', 'entity')),
  policy_id TEXT NOT NULL,
  account_id TEXT,
  entity_type TEXT,
  entity_id TEXT,
  mode TEXT NOT NULL CHECK (mode IN ('legacy_enforce', 'shadow', 'polar_enforce')) DEFAULT 'legacy_enforce',
  canary_percent INTEGER NOT NULL DEFAULT 0,
  mismatch_threshold REAL NOT NULL DEFAULT 0.005,
  fallback_rate_threshold REAL NOT NULL DEFAULT 0.01,
  updated_by TEXT NOT NULL,
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS authz_decision_events (
  id TEXT PRIMARY KEY,
  scope_key TEXT NOT NULL,
  scope_type TEXT NOT NULL CHECK (scope_type IN ('policy', 'entity')),
  policy_id TEXT NOT NULL,
  account_id TEXT,
  tenant_id TEXT,
  entity_type TEXT,
  entity_id TEXT,
  actor_id TEXT,
  actor_role TEXT,
  action_name TEXT NOT NULL,
  resource_kind TEXT NOT NULL,
  resource_id TEXT,
  resource_access_type TEXT,
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
  matched_rule_ids_json TEXT NOT NULL,
  reason TEXT NOT NULL,
  policy_hash TEXT,
  compiler_version TEXT,
  correlation_id TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_authz_decision_events_scope_time
  ON authz_decision_events (scope_key, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_authz_decision_events_account_time
  ON authz_decision_events (account_id, created_at DESC);

CREATE TABLE IF NOT EXISTS authz_policy_drafts (
  id TEXT PRIMARY KEY,
  policy_id TEXT NOT NULL,
  account_id TEXT,
  entity_type TEXT,
  entity_id TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  draft_json TEXT NOT NULL,
  created_by TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);
