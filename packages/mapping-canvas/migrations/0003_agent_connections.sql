-- Capability-scoped delegation of one open, local project; no account identity.
CREATE TABLE IF NOT EXISTS draw_agent_sessions (
  id TEXT PRIMARY KEY, project_id TEXT NOT NULL, browser_hash TEXT NOT NULL,
  pairing_hash TEXT, pairing_expires INTEGER NOT NULL, agent_hash TEXT,
  agent_name TEXT, expires INTEGER NOT NULL, heartbeat INTEGER NOT NULL,
  mode TEXT NOT NULL, tools_json TEXT NOT NULL, revoked INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS draw_agent_sessions_expiry ON draw_agent_sessions(expires);
CREATE TABLE IF NOT EXISTS draw_agent_commands (
  session_id TEXT NOT NULL REFERENCES draw_agent_sessions(id) ON DELETE CASCADE,
  id TEXT NOT NULL, tool TEXT NOT NULL, arguments_json TEXT NOT NULL, arguments_hash TEXT NOT NULL,
  mode TEXT NOT NULL, state TEXT NOT NULL, created INTEGER NOT NULL,
  deadline INTEGER NOT NULL, result_json TEXT,
  PRIMARY KEY(session_id, id)
);
CREATE INDEX IF NOT EXISTS draw_agent_commands_queue ON draw_agent_commands(session_id, state, created);
CREATE INDEX IF NOT EXISTS draw_agent_commands_expiry ON draw_agent_commands(created);
