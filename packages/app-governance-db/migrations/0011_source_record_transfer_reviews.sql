-- Review ledger for source-record transfer gaps.
-- Raw gaps remain visible in the audit; this table records whether a gap is
-- reviewed, waived, or needs a source update before client Atlas rollout.

CREATE TABLE IF NOT EXISTS source_record_transfer_reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_record_id INTEGER NOT NULL REFERENCES source_records(id),
  review_kind TEXT NOT NULL,            -- binding_gap | relation_island | source_truth | other
  status TEXT NOT NULL DEFAULT 'open',  -- open | reviewed | waived | needs_source_update | resolved
  reason TEXT,
  owner TEXT,
  reviewed_by TEXT NOT NULL,
  metadata_json TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (source_record_id, review_kind)
);

CREATE INDEX IF NOT EXISTS idx_source_record_transfer_reviews_record
  ON source_record_transfer_reviews (source_record_id, review_kind, status);
CREATE INDEX IF NOT EXISTS idx_source_record_transfer_reviews_status
  ON source_record_transfer_reviews (review_kind, status, updated_at);
