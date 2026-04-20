-- Funnel lead automation ledger
--
-- Tracks outbound automation attempts for funnel leads so background actions
-- are observable, auditable, and manually rerunnable.

CREATE TABLE funnel_automation_events (
  id TEXT PRIMARY KEY,
  lead_id TEXT NOT NULL,
  trigger TEXT NOT NULL CHECK (trigger IN ('lead_created', 'stage_changed', 'manual')),
  destination TEXT NOT NULL CHECK (destination IN ('slack', 'notion', 'gmail')),
  status TEXT NOT NULL CHECK (status IN ('pending', 'succeeded', 'failed', 'skipped')),
  stage TEXT CHECK (stage IN ('awareness', 'consideration', 'decision', 'won', 'lost')),
  attempt_count INTEGER NOT NULL DEFAULT 1,
  external_ref TEXT,
  summary TEXT,
  request_payload TEXT,
  response_payload TEXT,
  error_message TEXT,
  started_at TEXT NOT NULL,
  completed_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE
);

CREATE INDEX idx_funnel_automation_events_lead_id
  ON funnel_automation_events(lead_id, created_at DESC);

CREATE INDEX idx_funnel_automation_events_destination
  ON funnel_automation_events(destination, status, created_at DESC);
