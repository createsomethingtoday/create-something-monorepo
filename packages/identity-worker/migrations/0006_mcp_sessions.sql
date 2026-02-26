-- MCP Session Router schema
--
-- Canon: One identity, many tool surfaces.
-- Sessions bind user + tenant + scoped capabilities for MCP hosts.

CREATE TABLE mcp_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  account_id TEXT NOT NULL,
  host TEXT NOT NULL,
  tool_mode TEXT NOT NULL CHECK (tool_mode IN ('read_only', 'read_write')),
  toolkit_profile_json TEXT NOT NULL DEFAULT '[]',
  allowed_tool_prefixes_json TEXT NOT NULL DEFAULT '[]',
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  revoked_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_mcp_sessions_user_id ON mcp_sessions(user_id);
CREATE INDEX idx_mcp_sessions_tenant_id ON mcp_sessions(tenant_id);
CREATE INDEX idx_mcp_sessions_account_id ON mcp_sessions(account_id);
CREATE INDEX idx_mcp_sessions_expires_at ON mcp_sessions(expires_at);
CREATE INDEX idx_mcp_sessions_revoked_at ON mcp_sessions(revoked_at);

CREATE TABLE mcp_session_scopes (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  scope_type TEXT NOT NULL CHECK (scope_type IN ('toolkit', 'tool_prefix')),
  scope_value TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (session_id) REFERENCES mcp_sessions(id) ON DELETE CASCADE
);

CREATE INDEX idx_mcp_session_scopes_session_id ON mcp_session_scopes(session_id);
CREATE INDEX idx_mcp_session_scopes_type_value ON mcp_session_scopes(scope_type, scope_value);

CREATE TABLE mcp_auth_events (
  id TEXT PRIMARY KEY,
  session_id TEXT,
  user_id TEXT,
  event_type TEXT NOT NULL,
  event_data_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (session_id) REFERENCES mcp_sessions(id) ON DELETE SET NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_mcp_auth_events_session_id ON mcp_auth_events(session_id);
CREATE INDEX idx_mcp_auth_events_user_id ON mcp_auth_events(user_id);
CREATE INDEX idx_mcp_auth_events_event_type ON mcp_auth_events(event_type);
CREATE INDEX idx_mcp_auth_events_created_at ON mcp_auth_events(created_at);
