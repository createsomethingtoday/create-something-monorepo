CREATE TABLE IF NOT EXISTS capture_review_decisions (
  id TEXT PRIMARY KEY,
  surface TEXT NOT NULL,
  source_id TEXT NOT NULL,
  email TEXT,
  email_hash TEXT,
  classification_label TEXT NOT NULL CHECK (
    classification_label IN (
      'actual_user',
      'customer_record',
      'internal_test',
      'fixture',
      'likely_bot',
      'spam',
      'legacy_placeholder',
      'operational_access',
      'needs_review'
    )
  ),
  confidence TEXT NOT NULL DEFAULT 'high' CHECK (confidence IN ('high', 'medium', 'low')),
  recommended_action TEXT NOT NULL CHECK (recommended_action IN ('keep', 'review', 'ignore', 'suppress')),
  notes TEXT,
  reviewed_by TEXT NOT NULL,
  reviewed_at TEXT NOT NULL DEFAULT (datetime('now')),
  metadata_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(metadata_json)),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(surface, source_id)
);

CREATE INDEX IF NOT EXISTS idx_capture_review_decisions_email
  ON capture_review_decisions(email);

CREATE INDEX IF NOT EXISTS idx_capture_review_decisions_email_hash
  ON capture_review_decisions(email_hash);

CREATE INDEX IF NOT EXISTS idx_capture_review_decisions_classification
  ON capture_review_decisions(classification_label, recommended_action);
