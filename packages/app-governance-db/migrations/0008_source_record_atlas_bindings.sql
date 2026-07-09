-- Many-to-many bindings between captured source records and Atlas projections.
-- `source_records.atlas_canvas_id` remains the primary/source-led binding;
-- this table records additional client/workflow canvases derived from the same
-- canonical source row without moving the source row out of its first map.

CREATE TABLE IF NOT EXISTS source_record_atlas_bindings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_record_id INTEGER NOT NULL REFERENCES source_records(id),
  canvas_id TEXT NOT NULL REFERENCES atlas_canvases(canvas_id),
  node_id TEXT NOT NULL REFERENCES atlas_nodes(node_id),
  binding_kind TEXT NOT NULL DEFAULT 'projection', -- source_map | client_map | workflow_map | projection
  confidence REAL,
  reason TEXT,
  metadata_json TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (source_record_id, canvas_id, node_id, binding_kind)
);

CREATE INDEX IF NOT EXISTS idx_source_record_atlas_bindings_record ON source_record_atlas_bindings (source_record_id);
CREATE INDEX IF NOT EXISTS idx_source_record_atlas_bindings_canvas ON source_record_atlas_bindings (canvas_id, binding_kind);
