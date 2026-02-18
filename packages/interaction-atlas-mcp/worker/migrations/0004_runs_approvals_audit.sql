CREATE TABLE IF NOT EXISTS automation_runs (
  run_id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  automation_id TEXT NOT NULL,
  contract_version INTEGER NOT NULL,
  trigger_source TEXT NOT NULL CHECK (trigger_source IN ('schedule', 'event', 'manual', 'retry')),
  state TEXT NOT NULL CHECK (state IN ('queued', 'running', 'awaiting_approval', 'completed', 'failed', 'terminated', 'cancelled')),
  policy_pack_id TEXT NOT NULL,
  policy_version_id TEXT NOT NULL,
  approval_mode TEXT NOT NULL CHECK (approval_mode IN ('untrusted', 'on-failure', 'on-request', 'never')),
  execution_mode TEXT NOT NULL CHECK (execution_mode IN ('direct', 'guided', 'autonomous')),
  assigned_agent_id TEXT,
  assigned_agent_mode TEXT CHECK (assigned_agent_mode IN ('none', 'pinned', 'routed', 'hybrid')),
  started_at INTEGER,
  completed_at INTEGER,
  duration_ms INTEGER,
  cost_usd REAL,
  outcome_summary TEXT,
  error_code TEXT,
  error_message TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (account_id, automation_id, contract_version)
    REFERENCES automation_contracts(account_id, automation_id, version)
);

CREATE TABLE IF NOT EXISTS run_events (
  event_id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL,
  account_id TEXT NOT NULL,
  automation_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  event_ts INTEGER NOT NULL DEFAULT (unixepoch()),
  actor_type TEXT NOT NULL CHECK (actor_type IN ('system', 'user', 'agent')),
  actor_id TEXT,
  payload_json TEXT NOT NULL,
  FOREIGN KEY (run_id) REFERENCES automation_runs(run_id)
);

CREATE TABLE IF NOT EXISTS approval_requests (
  approval_id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL,
  account_id TEXT NOT NULL,
  automation_id TEXT NOT NULL,
  state TEXT NOT NULL CHECK (state IN ('pending', 'approved', 'denied', 'expired', 'cancelled')),
  action_type TEXT NOT NULL,
  reason TEXT,
  proposed_change_json TEXT,
  requested_at INTEGER NOT NULL DEFAULT (unixepoch()),
  expires_at INTEGER,
  decided_at INTEGER,
  decided_by TEXT,
  decision_comment TEXT,
  FOREIGN KEY (run_id) REFERENCES automation_runs(run_id)
);

CREATE TABLE IF NOT EXISTS approval_events (
  approval_event_id TEXT PRIMARY KEY,
  approval_id TEXT NOT NULL,
  run_id TEXT NOT NULL,
  account_id TEXT NOT NULL,
  automation_id TEXT NOT NULL,
  from_state TEXT,
  to_state TEXT NOT NULL CHECK (to_state IN ('pending', 'approved', 'denied', 'expired', 'cancelled')),
  actor_id TEXT,
  actor_type TEXT NOT NULL CHECK (actor_type IN ('system', 'user', 'agent')),
  event_ts INTEGER NOT NULL DEFAULT (unixepoch()),
  payload_json TEXT NOT NULL,
  FOREIGN KEY (approval_id) REFERENCES approval_requests(approval_id),
  FOREIGN KEY (run_id) REFERENCES automation_runs(run_id)
);

CREATE INDEX IF NOT EXISTS idx_automation_runs_lookup
  ON automation_runs (account_id, automation_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_automation_runs_state
  ON automation_runs (account_id, state, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_run_events_run
  ON run_events (run_id, event_ts);

CREATE INDEX IF NOT EXISTS idx_approval_requests_queue
  ON approval_requests (account_id, state, requested_at DESC);

CREATE INDEX IF NOT EXISTS idx_approval_requests_run
  ON approval_requests (run_id);

CREATE INDEX IF NOT EXISTS idx_approval_events_lookup
  ON approval_events (approval_id, event_ts);
