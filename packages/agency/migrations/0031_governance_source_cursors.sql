CREATE TABLE IF NOT EXISTS governance_source_cursors (
  source_type TEXT NOT NULL,
  source_id TEXT NOT NULL,
  cursor_value TEXT,
  last_seen_at TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(metadata_json)),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (source_type, source_id)
);

CREATE INDEX IF NOT EXISTS idx_governance_source_cursors_updated
  ON governance_source_cursors(updated_at);
