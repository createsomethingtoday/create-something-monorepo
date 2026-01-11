-- Agent Sessions Table
-- Stores agent state for iterative investigations

CREATE TABLE IF NOT EXISTS agent_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  case_id TEXT NOT NULL,
  iteration INTEGER NOT NULL,
  evidence TEXT NOT NULL,      -- JSON array of Evidence objects
  tools_used TEXT NOT NULL,    -- JSON array of tool names
  reasoning TEXT NOT NULL,     -- JSON array of reasoning strings
  created_at INTEGER NOT NULL,
  FOREIGN KEY (case_id) REFERENCES plagiarism_cases(id)
);

CREATE INDEX idx_agent_sessions_case ON agent_sessions(case_id);
CREATE INDEX idx_agent_sessions_created ON agent_sessions(created_at);
