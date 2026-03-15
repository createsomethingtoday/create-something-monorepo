CREATE TABLE IF NOT EXISTS judgment_policy_versions (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('mcp', 'agent')),
  entity_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('draft', 'active', 'archived')),
  policy_json TEXT NOT NULL,
  created_by TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_judgment_policy_versions_lookup
  ON judgment_policy_versions (account_id, entity_type, entity_id, created_at DESC);

CREATE TABLE IF NOT EXISTS judgment_policy_selection (
  account_id TEXT NOT NULL,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('mcp', 'agent')),
  entity_id TEXT NOT NULL,
  active_policy_version_id TEXT NOT NULL,
  updated_by TEXT NOT NULL,
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  PRIMARY KEY (account_id, entity_type, entity_id),
  FOREIGN KEY (active_policy_version_id) REFERENCES judgment_policy_versions(id)
);

CREATE TABLE IF NOT EXISTS judgment_estimate_reports (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('mcp', 'agent')),
  entity_id TEXT NOT NULL,
  before_policy_version_id TEXT,
  after_policy_version_id TEXT NOT NULL,
  scenario_set_json TEXT NOT NULL,
  summary_json TEXT NOT NULL,
  created_by TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (before_policy_version_id) REFERENCES judgment_policy_versions(id),
  FOREIGN KEY (after_policy_version_id) REFERENCES judgment_policy_versions(id)
);

CREATE INDEX IF NOT EXISTS idx_judgment_estimate_reports_lookup
  ON judgment_estimate_reports (account_id, entity_type, entity_id, created_at DESC);

ALTER TABLE atlas_visualizations ADD COLUMN estimate_report_id TEXT REFERENCES judgment_estimate_reports(id);
