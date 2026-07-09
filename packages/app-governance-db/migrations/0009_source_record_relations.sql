-- Durable source-record relationship ledger for Notion-to-Atlas migration.
-- Relations are recorded before or alongside Atlas projection so agents can
-- inspect workflow topology through API/MCP without depending on canvas state.

CREATE TABLE IF NOT EXISTS source_record_relations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_record_id INTEGER NOT NULL REFERENCES source_records(id),
  target_source_record_id INTEGER NOT NULL REFERENCES source_records(id),
  relation_kind TEXT NOT NULL,      -- owns | references | corresponds_to | depends_on | blocks | related_to
  evidence_kind TEXT NOT NULL,      -- imported | payload_explicit | alias_inferred | title_inferred | manual
  confidence REAL NOT NULL DEFAULT 1.0,
  reason TEXT,
  metadata_json TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (source_record_id, target_source_record_id, relation_kind, evidence_kind)
);

CREATE INDEX IF NOT EXISTS idx_source_record_relations_source
  ON source_record_relations (source_record_id, relation_kind);
CREATE INDEX IF NOT EXISTS idx_source_record_relations_target
  ON source_record_relations (target_source_record_id, relation_kind);
CREATE INDEX IF NOT EXISTS idx_source_record_relations_evidence
  ON source_record_relations (evidence_kind, confidence);
