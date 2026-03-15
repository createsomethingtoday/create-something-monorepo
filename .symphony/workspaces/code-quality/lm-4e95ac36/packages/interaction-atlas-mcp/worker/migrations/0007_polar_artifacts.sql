ALTER TABLE judgment_policy_versions ADD COLUMN policy_engine TEXT NOT NULL DEFAULT 'polar_v1';
ALTER TABLE judgment_policy_versions ADD COLUMN policy_polar TEXT;
ALTER TABLE judgment_policy_versions ADD COLUMN policy_hash TEXT;
ALTER TABLE judgment_policy_versions ADD COLUMN compiler_version TEXT;
ALTER TABLE judgment_policy_versions ADD COLUMN fallback_ir_json TEXT;

CREATE TABLE IF NOT EXISTS judgment_engine_rollout (
  account_id TEXT NOT NULL,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('mcp', 'agent')),
  entity_id TEXT NOT NULL,
  mode TEXT NOT NULL CHECK (mode IN ('legacy_enforce', 'shadow', 'polar_enforce')) DEFAULT 'legacy_enforce',
  canary_percent INTEGER NOT NULL DEFAULT 0,
  mismatch_threshold REAL NOT NULL DEFAULT 0.005,
  fallback_rate_threshold REAL NOT NULL DEFAULT 0.01,
  updated_by TEXT NOT NULL,
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  PRIMARY KEY (account_id, entity_type, entity_id)
);

CREATE TABLE IF NOT EXISTS judgment_engine_events (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('mcp', 'agent')),
  entity_id TEXT NOT NULL,
  tool_name TEXT NOT NULL,
  rollout_mode TEXT NOT NULL,
  canary_percent INTEGER NOT NULL,
  sampled_polar INTEGER NOT NULL,
  mismatch INTEGER NOT NULL,
  evaluation_path TEXT NOT NULL,
  fallback_used INTEGER NOT NULL,
  legacy_decision TEXT NOT NULL,
  polar_decision TEXT NOT NULL,
  final_decision TEXT NOT NULL,
  latency_ms INTEGER NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_judgment_engine_events_lookup
  ON judgment_engine_events (account_id, entity_type, entity_id, created_at DESC);
