CREATE TABLE IF NOT EXISTS automation_contracts (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  automation_id TEXT NOT NULL,
  version INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('enabled', 'disabled', 'paused', 'archived')),
  name TEXT NOT NULL,
  owner_type TEXT NOT NULL CHECK (owner_type IN ('user', 'service')),
  owner_id TEXT NOT NULL,
  execution_mode TEXT NOT NULL CHECK (execution_mode IN ('direct', 'guided', 'autonomous')),
  policy_pack_id TEXT NOT NULL,
  policy_version_id TEXT NOT NULL,
  approval_mode TEXT NOT NULL CHECK (approval_mode IN ('untrusted', 'on-failure', 'on-request', 'never')),
  trigger_type TEXT NOT NULL CHECK (trigger_type IN ('schedule', 'event', 'manual')),
  trigger_cron TEXT,
  trigger_timezone TEXT,
  mcp_profile_id TEXT NOT NULL,
  spec_json TEXT NOT NULL,
  created_by TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  UNIQUE (account_id, automation_id, version)
);

CREATE TABLE IF NOT EXISTS automation_labels (
  account_id TEXT NOT NULL,
  automation_id TEXT NOT NULL,
  version INTEGER NOT NULL,
  label TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  PRIMARY KEY (account_id, automation_id, version, label),
  FOREIGN KEY (account_id, automation_id, version)
    REFERENCES automation_contracts(account_id, automation_id, version)
);

CREATE TABLE IF NOT EXISTS automation_assignments (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  automation_id TEXT NOT NULL,
  version INTEGER NOT NULL,
  mode TEXT NOT NULL CHECK (mode IN ('none', 'pinned', 'routed', 'hybrid')),
  primary_agent_id TEXT,
  routing_policy_id TEXT,
  assignment_json TEXT,
  created_by TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (account_id, automation_id, version)
    REFERENCES automation_contracts(account_id, automation_id, version)
);

CREATE TABLE IF NOT EXISTS automation_assignment_fallbacks (
  assignment_id TEXT NOT NULL,
  ordinal INTEGER NOT NULL,
  fallback_agent_id TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  PRIMARY KEY (assignment_id, ordinal),
  FOREIGN KEY (assignment_id) REFERENCES automation_assignments(id)
);

CREATE INDEX IF NOT EXISTS idx_automation_contracts_lookup
  ON automation_contracts (account_id, automation_id, is_active, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_automation_contracts_status
  ON automation_contracts (account_id, status, created_at DESC);
