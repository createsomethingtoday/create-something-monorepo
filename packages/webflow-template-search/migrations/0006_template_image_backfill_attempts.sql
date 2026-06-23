CREATE TABLE IF NOT EXISTS template_image_backfill_attempts (
  template_document_id TEXT PRIMARY KEY,
  last_attempted_at TEXT NOT NULL,
  consecutive_misses INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (template_document_id) REFERENCES template_documents(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_template_image_backfill_attempts_last_attempted
  ON template_image_backfill_attempts (last_attempted_at);
