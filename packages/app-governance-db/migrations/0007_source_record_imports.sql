-- Row-level source import ledger for Notion and other database-layer sources.
-- Source rows are recorded before they are projected into Atlas, findings, or
-- workflow runs so identity hygiene and resumability are first-class.

CREATE TABLE IF NOT EXISTS source_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_id INTEGER NOT NULL REFERENCES sources(id),
  external_id TEXT NOT NULL,
  parent_external_id TEXT,
  record_kind TEXT NOT NULL DEFAULT 'row',       -- database | page | row | block | relation | other
  title TEXT,
  canonical_type TEXT NOT NULL DEFAULT 'unknown',-- client | engagement | workflow | agent | mcp_service | evidence | decision | task | risk | deliverable | milestone | unknown
  substrate_id TEXT,                             -- CREATE SOMETHING canonical identity, when known
  atlas_canvas_id TEXT REFERENCES atlas_canvases(canvas_id),
  atlas_node_id TEXT REFERENCES atlas_nodes(node_id),
  identity_state TEXT NOT NULL DEFAULT 'unmapped', -- unmapped | mapped | missing_substrate | duplicate | blocked
  migration_state TEXT NOT NULL DEFAULT 'discovered', -- discovered | ready | imported | skipped | error
  source_updated_at TEXT,
  last_seen_at TEXT NOT NULL DEFAULT (datetime('now')),
  payload_json TEXT,
  error TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (source_id, external_id)
);

CREATE TABLE IF NOT EXISTS source_import_runs (
  run_id TEXT PRIMARY KEY,
  source_id INTEGER NOT NULL REFERENCES sources(id),
  status TEXT NOT NULL,                         -- started | succeeded | failed | blocked | rate_limited
  actor TEXT NOT NULL,
  cursor_before TEXT,
  cursor_after TEXT,
  retry_after_seconds INTEGER,
  received INTEGER NOT NULL DEFAULT 0,
  upserted INTEGER NOT NULL DEFAULT 0,
  missing_substrate INTEGER NOT NULL DEFAULT 0,
  error_count INTEGER NOT NULL DEFAULT 0,
  error TEXT,
  payload_json TEXT,
  started_at TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_source_records_source ON source_records (source_id, migration_state, identity_state);
CREATE INDEX IF NOT EXISTS idx_source_records_canonical ON source_records (canonical_type, substrate_id);
CREATE INDEX IF NOT EXISTS idx_source_records_atlas ON source_records (atlas_canvas_id, atlas_node_id);
CREATE INDEX IF NOT EXISTS idx_source_import_runs_source ON source_import_runs (source_id, updated_at);
