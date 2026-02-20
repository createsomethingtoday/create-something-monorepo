-- Hub tool index for brokered discovery and dual-name routing.

CREATE TABLE IF NOT EXISTS hub_tool_index (
  tool_ref TEXT PRIMARY KEY,
  server_name TEXT NOT NULL,
  downstream_tool_name TEXT NOT NULL,
  proxy_tool_name TEXT NOT NULL,
  dotted_alias TEXT NOT NULL,
  description TEXT,
  input_schema_json TEXT,
  connector TEXT,
  category TEXT,
  lifecycle TEXT,
  tags_json TEXT,
  search_text TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  schema_hash TEXT,
  last_seen_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS hub_tool_aliases (
  alias TEXT PRIMARY KEY,
  tool_ref TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'generated',
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS hub_index_builds (
  build_id TEXT PRIMARY KEY,
  started_at TEXT NOT NULL,
  finished_at TEXT,
  tool_count INTEGER NOT NULL DEFAULT 0,
  warning_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL,
  error_text TEXT,
  source TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_hub_tool_index_proxy
  ON hub_tool_index(proxy_tool_name);

CREATE INDEX IF NOT EXISTS idx_hub_tool_index_alias
  ON hub_tool_index(dotted_alias);

CREATE INDEX IF NOT EXISTS idx_hub_tool_index_server
  ON hub_tool_index(server_name);

CREATE INDEX IF NOT EXISTS idx_hub_tool_index_connector
  ON hub_tool_index(connector);

CREATE INDEX IF NOT EXISTS idx_hub_tool_index_active
  ON hub_tool_index(active);
