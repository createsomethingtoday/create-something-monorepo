CREATE TABLE IF NOT EXISTS policy_os_manifest_versions (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  policy_id TEXT NOT NULL,
  version INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('draft', 'active', 'archived')),
  description TEXT,
  constraint_policy_json TEXT NOT NULL,
  polar_source TEXT,
  fallback_ir_json TEXT,
  compiler_version TEXT,
  policy_hash TEXT,
  commit_sha TEXT NOT NULL,
  rollout_defaults_json TEXT,
  created_by TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  UNIQUE (account_id, policy_id, version)
);

CREATE INDEX IF NOT EXISTS idx_policy_os_manifest_versions_lookup
  ON policy_os_manifest_versions (account_id, policy_id, status, created_at DESC);

CREATE TABLE IF NOT EXISTS policy_os_judgment_pack_versions (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  pack_id TEXT NOT NULL,
  version INTEGER NOT NULL,
  label TEXT NOT NULL,
  description TEXT,
  sandbox_policy_json TEXT NOT NULL,
  approval_policy TEXT NOT NULL CHECK (approval_policy IN ('untrusted', 'on-failure', 'on-request', 'never')),
  non_interactive_decision TEXT NOT NULL CHECK (non_interactive_decision IN ('decline', 'cancel')),
  auto_approve_json TEXT,
  developer_instructions TEXT,
  status TEXT NOT NULL CHECK (status IN ('draft', 'active', 'archived')),
  created_by TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  UNIQUE (account_id, pack_id, version)
);

CREATE INDEX IF NOT EXISTS idx_policy_os_judgment_pack_versions_lookup
  ON policy_os_judgment_pack_versions (account_id, pack_id, status, created_at DESC);

CREATE TABLE IF NOT EXISTS policy_os_bindings (
  binding_id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  environment TEXT NOT NULL DEFAULT 'production',
  workflow_id TEXT,
  tool_prefix TEXT,
  resource_kind TEXT,
  access_type TEXT,
  risk_level TEXT,
  service_tier TEXT CHECK (service_tier IS NULL OR service_tier IN ('mcp_only', 'policy_os_trial', 'policy_os_core')),
  authz_policy_version_id TEXT NOT NULL,
  judgment_pack_version_id TEXT NOT NULL,
  priority INTEGER NOT NULL DEFAULT 100,
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  created_by TEXT NOT NULL,
  updated_by TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (authz_policy_version_id) REFERENCES policy_os_manifest_versions(id),
  FOREIGN KEY (judgment_pack_version_id) REFERENCES policy_os_judgment_pack_versions(id)
);

CREATE INDEX IF NOT EXISTS idx_policy_os_bindings_match
  ON policy_os_bindings (account_id, environment, active, priority, workflow_id, resource_kind, access_type, service_tier);

CREATE INDEX IF NOT EXISTS idx_policy_os_bindings_tool_prefix
  ON policy_os_bindings (account_id, tool_prefix);

CREATE TABLE IF NOT EXISTS policy_os_approval_cases (
  approval_id TEXT PRIMARY KEY,
  correlation_id TEXT,
  account_id TEXT NOT NULL,
  actor_id TEXT,
  agent_id TEXT,
  action_name TEXT NOT NULL,
  resource_kind TEXT NOT NULL,
  resource_id TEXT,
  request_payload_json TEXT NOT NULL DEFAULT '{}',
  binding_id TEXT,
  status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'denied', 'expired', 'cancelled')),
  reason TEXT NOT NULL,
  decision_note TEXT,
  decided_by TEXT,
  expires_at INTEGER,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  decided_at INTEGER,
  FOREIGN KEY (binding_id) REFERENCES policy_os_bindings(binding_id)
);

CREATE INDEX IF NOT EXISTS idx_policy_os_approval_cases_queue
  ON policy_os_approval_cases (account_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_policy_os_approval_cases_correlation
  ON policy_os_approval_cases (account_id, correlation_id, created_at DESC);

CREATE TABLE IF NOT EXISTS policy_os_decision_events (
  id TEXT PRIMARY KEY,
  correlation_id TEXT,
  account_id TEXT NOT NULL,
  actor_id TEXT,
  agent_id TEXT,
  action_name TEXT NOT NULL,
  resource_kind TEXT NOT NULL,
  resource_id TEXT,
  resource_access_type TEXT,
  binding_id TEXT,
  authz_policy_version_id TEXT,
  judgment_pack_version_id TEXT,
  approval_id TEXT,
  final_decision TEXT NOT NULL CHECK (final_decision IN ('allow', 'require_human_review', 'block')),
  reason TEXT NOT NULL,
  matched_rule_ids_json TEXT NOT NULL DEFAULT '[]',
  policy_hash TEXT,
  evaluation_path TEXT NOT NULL DEFAULT 'legacy',
  fallback_reason TEXT,
  latency_ms INTEGER,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (binding_id) REFERENCES policy_os_bindings(binding_id),
  FOREIGN KEY (authz_policy_version_id) REFERENCES policy_os_manifest_versions(id),
  FOREIGN KEY (judgment_pack_version_id) REFERENCES policy_os_judgment_pack_versions(id),
  FOREIGN KEY (approval_id) REFERENCES policy_os_approval_cases(approval_id)
);

CREATE INDEX IF NOT EXISTS idx_policy_os_decision_events_lookup
  ON policy_os_decision_events (account_id, correlation_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_policy_os_decision_events_decision
  ON policy_os_decision_events (account_id, final_decision, created_at DESC);

CREATE TABLE IF NOT EXISTS policy_os_andon_events (
  andon_id TEXT PRIMARY KEY,
  correlation_id TEXT,
  account_id TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('authz', 'runtime', 'operator', 'model')),
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  question TEXT NOT NULL,
  context TEXT NOT NULL,
  proposed_action TEXT NOT NULL,
  confidence REAL,
  approval_id TEXT,
  resolved_by TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  resolved_at INTEGER,
  FOREIGN KEY (approval_id) REFERENCES policy_os_approval_cases(approval_id)
);

CREATE INDEX IF NOT EXISTS idx_policy_os_andon_events_lookup
  ON policy_os_andon_events (account_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_policy_os_andon_events_correlation
  ON policy_os_andon_events (account_id, correlation_id, created_at DESC);

CREATE TABLE IF NOT EXISTS policy_os_entitlement_snapshots (
  snapshot_id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  tenant_id TEXT,
  service_tier TEXT NOT NULL CHECK (service_tier IN ('mcp_only', 'policy_os_trial', 'policy_os_core')),
  service_entitled INTEGER NOT NULL CHECK (service_entitled IN (0, 1)),
  policy_accepted INTEGER NOT NULL CHECK (policy_accepted IN (0, 1)),
  contract_active INTEGER NOT NULL CHECK (contract_active IN (0, 1)),
  billing_active INTEGER NOT NULL CHECK (billing_active IN (0, 1)),
  approved_exception_json TEXT,
  effective_at INTEGER NOT NULL,
  recorded_by TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_policy_os_entitlement_snapshots_lookup
  ON policy_os_entitlement_snapshots (account_id, effective_at DESC);
