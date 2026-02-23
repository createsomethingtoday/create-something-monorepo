CREATE TABLE IF NOT EXISTS hub_tool_catalog (
  tool_ref TEXT PRIMARY KEY,
  server_name TEXT NOT NULL,
  downstream_tool_name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  input_schema_json TEXT NOT NULL,
  tags_json TEXT NOT NULL,
  capability_class TEXT NOT NULL CHECK (capability_class IN ('read', 'write', 'mixed')),
  risk_tier TEXT NOT NULL CHECK (risk_tier IN ('low', 'medium', 'high')),
  retry_profile TEXT,
  required_scopes_json TEXT NOT NULL,
  discovered_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_hub_tool_catalog_server_name ON hub_tool_catalog(server_name);
CREATE INDEX IF NOT EXISTS idx_hub_tool_catalog_downstream_tool_name ON hub_tool_catalog(downstream_tool_name);
CREATE INDEX IF NOT EXISTS idx_hub_tool_catalog_updated_at ON hub_tool_catalog(updated_at);

CREATE TABLE IF NOT EXISTS hub_catalog_refresh_runs (
  id TEXT PRIMARY KEY,
  started_at TEXT NOT NULL,
  finished_at TEXT,
  success INTEGER NOT NULL DEFAULT 0,
  servers_json TEXT NOT NULL,
  error TEXT
);

CREATE INDEX IF NOT EXISTS idx_hub_catalog_refresh_runs_started_at ON hub_catalog_refresh_runs(started_at);
