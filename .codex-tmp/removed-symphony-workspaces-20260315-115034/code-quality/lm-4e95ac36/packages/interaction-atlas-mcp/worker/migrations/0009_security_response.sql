CREATE TABLE IF NOT EXISTS judgment_account_access (
  account_id TEXT PRIMARY KEY,
  mode TEXT NOT NULL CHECK (mode IN ('normal', 'read_only', 'off')) DEFAULT 'normal',
  reason TEXT,
  incident_id TEXT,
  updated_by TEXT NOT NULL,
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  expires_at INTEGER
);

CREATE TABLE IF NOT EXISTS judgment_security_incidents (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  incident_type TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  action_mode TEXT NOT NULL CHECK (action_mode IN ('normal', 'read_only', 'off')),
  reason TEXT NOT NULL,
  signal_json TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('open', 'resolved')) DEFAULT 'open',
  correlation_id TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  resolved_at INTEGER,
  resolved_by TEXT
);

CREATE INDEX IF NOT EXISTS idx_judgment_security_incidents_account
  ON judgment_security_incidents (account_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_judgment_security_incidents_status
  ON judgment_security_incidents (status, created_at DESC);
