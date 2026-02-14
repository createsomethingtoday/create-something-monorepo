-- Observability tables for agent session tracking
-- Schema matches packages/space/migrations/0001_agentic_layer.sql
-- All timestamps are Unix integers (seconds since epoch)

CREATE TABLE IF NOT EXISTS agentic_sessions (
  id TEXT PRIMARY KEY,
  issue_id TEXT NOT NULL,
  epic_id TEXT,
  convoy_id TEXT,
  budget REAL NOT NULL,
  cost_consumed REAL DEFAULT 0,
  iteration INTEGER DEFAULT 0,
  status TEXT DEFAULT 'running',
  started_at INTEGER NOT NULL,
  completed_at INTEGER,
  updated_at INTEGER,
  termination_reason TEXT
);

CREATE INDEX IF NOT EXISTS idx_sessions_issue ON agentic_sessions(issue_id);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON agentic_sessions(status);
CREATE INDEX IF NOT EXISTS idx_sessions_updated ON agentic_sessions(updated_at);

CREATE TABLE IF NOT EXISTS agentic_iterations (
  session_id TEXT NOT NULL,
  iteration INTEGER NOT NULL,
  cost REAL NOT NULL,
  input_tokens INTEGER NOT NULL,
  output_tokens INTEGER NOT NULL,
  files_modified INTEGER DEFAULT 0,
  tools_used TEXT,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (session_id, iteration)
);

CREATE INDEX IF NOT EXISTS idx_iterations_session ON agentic_iterations(session_id);
CREATE INDEX IF NOT EXISTS idx_iterations_created ON agentic_iterations(created_at);

CREATE TABLE IF NOT EXISTS agentic_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT,
  issue_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  event_data TEXT,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_events_session ON agentic_events(session_id);
CREATE INDEX IF NOT EXISTS idx_events_type ON agentic_events(event_type);
CREATE INDEX IF NOT EXISTS idx_events_created ON agentic_events(created_at);
