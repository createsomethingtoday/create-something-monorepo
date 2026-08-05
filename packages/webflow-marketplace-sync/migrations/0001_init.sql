-- Webhook event log: every received Webflow event and what we did with it.
CREATE TABLE IF NOT EXISTS sync_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  received_at TEXT NOT NULL,
  trigger_type TEXT NOT NULL,
  item_id TEXT NOT NULL,
  action TEXT NOT NULL, -- created | updated | noop | shadow-create | shadow-update | ignored | error
  detail TEXT
);
CREATE INDEX IF NOT EXISTS idx_sync_events_item ON sync_events(item_id);
CREATE INDEX IF NOT EXISTS idx_sync_events_received ON sync_events(received_at);

-- Reconciler run history.
CREATE TABLE IF NOT EXISTS reconcile_runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  started_at TEXT NOT NULL,
  finished_at TEXT,
  kind TEXT NOT NULL, -- sweep | full
  items_scanned INTEGER NOT NULL DEFAULT 0,
  rows_scanned INTEGER NOT NULL DEFAULT 0,
  findings INTEGER NOT NULL DEFAULT 0,
  healed INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'running', -- running | ok | error
  error TEXT
);

-- Individual drift findings.
CREATE TABLE IF NOT EXISTS findings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id INTEGER NOT NULL REFERENCES reconcile_runs(id),
  kind TEXT NOT NULL, -- missing_row | field_drift | malformed_unique_id | orphan_row | never_synced
  item_id TEXT,
  airtable_record_id TEXT,
  field TEXT,
  webflow_value TEXT,
  airtable_value TEXT,
  healed INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_findings_run ON findings(run_id);
CREATE INDEX IF NOT EXISTS idx_findings_kind ON findings(kind);
