-- First-class Atlas/workflow records for the database layer.
-- Renderers such as SvelteFlow are projections over these records; agents and
-- MCP tools operate on the same canonical state.

CREATE TABLE IF NOT EXISTS atlas_canvases (
  canvas_id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  client TEXT,
  workflow TEXT,
  owner TEXT,
  status TEXT NOT NULL DEFAULT 'unknown', -- run | wait | stop | unknown
  source_kind TEXT,                       -- notion | atlas_studio | slack_canvas | manual | api
  source_id TEXT,
  metadata_json TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS atlas_nodes (
  node_id TEXT PRIMARY KEY,
  canvas_id TEXT NOT NULL REFERENCES atlas_canvases(canvas_id),
  kind TEXT NOT NULL,                     -- actor | human | ai | system | data | constraint | touchpoint
  label TEXT NOT NULL,
  owner TEXT,
  status TEXT NOT NULL DEFAULT 'unknown', -- run | wait | stop | unknown
  notes TEXT,
  evidence TEXT,
  x REAL,
  y REAL,
  width REAL,
  height REAL,
  metadata_json TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS atlas_edges (
  edge_id TEXT PRIMARY KEY,
  canvas_id TEXT NOT NULL REFERENCES atlas_canvases(canvas_id),
  source_node_id TEXT NOT NULL REFERENCES atlas_nodes(node_id),
  target_node_id TEXT NOT NULL REFERENCES atlas_nodes(node_id),
  label TEXT,
  evidence TEXT,
  metadata_json TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS workflow_runs (
  run_id TEXT PRIMARY KEY,
  canvas_id TEXT NOT NULL REFERENCES atlas_canvases(canvas_id),
  node_id TEXT REFERENCES atlas_nodes(node_id),
  status TEXT NOT NULL,                   -- started | succeeded | failed | skipped | blocked
  actor TEXT NOT NULL,
  started_at TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at TEXT,
  input_json TEXT,
  output_json TEXT,
  receipt_url TEXT,
  error TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS workflow_receipts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id TEXT REFERENCES workflow_runs(run_id),
  canvas_id TEXT NOT NULL REFERENCES atlas_canvases(canvas_id),
  node_id TEXT REFERENCES atlas_nodes(node_id),
  receipt_type TEXT NOT NULL,             -- proof | decision | handoff | sync | error | note
  summary TEXT NOT NULL,
  artifact_url TEXT,
  payload_json TEXT,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_atlas_nodes_canvas ON atlas_nodes (canvas_id, status);
CREATE INDEX IF NOT EXISTS idx_atlas_edges_canvas ON atlas_edges (canvas_id);
CREATE INDEX IF NOT EXISTS idx_workflow_runs_canvas ON workflow_runs (canvas_id, status);
CREATE INDEX IF NOT EXISTS idx_workflow_runs_node ON workflow_runs (node_id, status);
CREATE INDEX IF NOT EXISTS idx_workflow_receipts_canvas ON workflow_receipts (canvas_id, created_at);
CREATE INDEX IF NOT EXISTS idx_workflow_receipts_node ON workflow_receipts (node_id, created_at);
