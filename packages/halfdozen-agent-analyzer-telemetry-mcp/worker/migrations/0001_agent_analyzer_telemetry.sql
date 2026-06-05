CREATE TABLE IF NOT EXISTS agent_analyzer_telemetry_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id TEXT NOT NULL UNIQUE,
  run_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  event_status TEXT NOT NULL,
  agent_page_url TEXT NOT NULL,
  agent_name TEXT,
  eval_case_id TEXT,
  test_report_url TEXT,
  target_url TEXT,
  summary TEXT NOT NULL,
  details_json TEXT NOT NULL DEFAULT '{}',
  source TEXT NOT NULL DEFAULT 'agent-analyzer',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_agent_analyzer_events_run_time
  ON agent_analyzer_telemetry_events(run_id, created_at);

CREATE INDEX IF NOT EXISTS idx_agent_analyzer_events_agent_time
  ON agent_analyzer_telemetry_events(agent_page_url, created_at);

CREATE INDEX IF NOT EXISTS idx_agent_analyzer_events_type_time
  ON agent_analyzer_telemetry_events(event_type, created_at);
