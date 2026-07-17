-- Isolated development telemetry schema. Keep this aligned with
-- TELEMETRY_MIGRATION in @create-something/mcp-core.
CREATE TABLE IF NOT EXISTS mcp_run_counts (
  server_name TEXT NOT NULL,
  account_id TEXT NOT NULL,
  period_start TEXT NOT NULL,
  runs_this_period INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (server_name, account_id, period_start)
);

CREATE TABLE IF NOT EXISTS mcp_tool_invocations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  server_name TEXT NOT NULL,
  account_id TEXT NOT NULL,
  tool_name TEXT NOT NULL,
  success INTEGER NOT NULL DEFAULT 1,
  duration_ms INTEGER,
  error_message TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_mcp_invocations_server_time
  ON mcp_tool_invocations(server_name, created_at);
CREATE INDEX IF NOT EXISTS idx_mcp_invocations_tool
  ON mcp_tool_invocations(server_name, tool_name);
