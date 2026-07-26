-- Guardian-managed, email-free Player Access for private youth applications.
-- Credentials remain in Identity; applications continue to own subject bindings.

CREATE TABLE player_access_credentials (
  subject_id TEXT PRIMARY KEY,
  player_code TEXT UNIQUE NOT NULL COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  manager_subject TEXT NOT NULL,
  display_name TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked')),
  created_by_actor TEXT NOT NULL,
  last_used_at TEXT,
  rotated_at TEXT,
  revoked_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_player_access_manager ON player_access_credentials(manager_subject);
CREATE INDEX idx_player_access_status ON player_access_credentials(status);

CREATE TABLE player_access_sessions (
  id TEXT PRIMARY KEY,
  subject_id TEXT NOT NULL REFERENCES player_access_credentials(subject_id) ON DELETE CASCADE,
  token_hash TEXT UNIQUE NOT NULL,
  family_id TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  revoked_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_player_access_sessions_subject ON player_access_sessions(subject_id);
CREATE INDEX idx_player_access_sessions_family ON player_access_sessions(family_id);
CREATE INDEX idx_player_access_sessions_expires ON player_access_sessions(expires_at);

CREATE TABLE player_access_events (
  id TEXT PRIMARY KEY,
  subject_id TEXT NOT NULL REFERENCES player_access_credentials(subject_id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('issued', 'rotated', 'login_succeeded', 'login_failed', 'session_refreshed', 'revoked')),
  actor TEXT NOT NULL,
  event_data_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_player_access_events_subject ON player_access_events(subject_id);
CREATE INDEX idx_player_access_events_type ON player_access_events(event_type);
CREATE INDEX idx_player_access_events_created ON player_access_events(created_at);
