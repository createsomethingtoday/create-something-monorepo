CREATE TABLE IF NOT EXISTS governance_product_attachments (
  id TEXT PRIMARY KEY,
  source_product_id TEXT NOT NULL CHECK (source_product_id IN ('atlas', 'signal', 'decision', 'proof')),
  source_record_id TEXT NOT NULL,
  target_product_id TEXT NOT NULL CHECK (target_product_id IN ('atlas', 'signal', 'decision', 'proof')),
  target_record_id TEXT NOT NULL,
  atlas_canvas_id TEXT NOT NULL,
  atlas_node_id TEXT,
  mode TEXT NOT NULL CHECK (mode IN ('connects', 'consumes', 'produces', 'records')),
  label TEXT NOT NULL,
  required INTEGER NOT NULL DEFAULT 0 CHECK (required IN (0, 1)),
  metadata_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(metadata_json)),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  CHECK (source_product_id != target_product_id)
);

CREATE INDEX IF NOT EXISTS idx_governance_product_attachments_atlas_canvas
  ON governance_product_attachments(atlas_canvas_id, created_at);

CREATE INDEX IF NOT EXISTS idx_governance_product_attachments_source
  ON governance_product_attachments(source_product_id, source_record_id, created_at);

CREATE INDEX IF NOT EXISTS idx_governance_product_attachments_target
  ON governance_product_attachments(target_product_id, target_record_id, created_at);
