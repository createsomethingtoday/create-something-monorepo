CREATE TABLE IF NOT EXISTS atlas_versions (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('mcp', 'agent')),
  entity_id TEXT NOT NULL,
  commit_sha TEXT NOT NULL,
  runtime_ref TEXT,
  policy_version_id TEXT NOT NULL,
  parent_version_id TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_atlas_versions_lookup
  ON atlas_versions (account_id, entity_type, entity_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_atlas_versions_commit
  ON atlas_versions (commit_sha);

CREATE TABLE IF NOT EXISTS atlas_visualizations (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  version_id TEXT NOT NULL,
  source_type TEXT NOT NULL,
  source_key TEXT NOT NULL,
  decision TEXT NOT NULL CHECK (decision IN ('allow', 'require_human_review', 'block')),
  decision_reason TEXT NOT NULL,
  workflow_json TEXT,
  mermaid_text TEXT,
  page_path TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (version_id) REFERENCES atlas_versions(id)
);

CREATE INDEX IF NOT EXISTS idx_atlas_visualizations_account_time
  ON atlas_visualizations (account_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_atlas_visualizations_source
  ON atlas_visualizations (source_type, source_key);

CREATE TABLE IF NOT EXISTS atlas_version_policy_bindings (
  version_id TEXT PRIMARY KEY,
  policy_version_id TEXT NOT NULL,
  policy_snapshot_json TEXT NOT NULL,
  enforcement_mode TEXT NOT NULL CHECK (enforcement_mode IN ('hard_gate')),
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (version_id) REFERENCES atlas_versions(id)
);

CREATE TABLE IF NOT EXISTS atlas_version_selection (
  account_id TEXT NOT NULL,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('mcp', 'agent')),
  entity_id TEXT NOT NULL,
  default_version_id TEXT NOT NULL,
  updated_by TEXT NOT NULL,
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  PRIMARY KEY (account_id, entity_type, entity_id),
  FOREIGN KEY (default_version_id) REFERENCES atlas_versions(id)
);
