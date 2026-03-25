CREATE TABLE IF NOT EXISTS submissions (
  id TEXT PRIMARY KEY,
  submission_type TEXT NOT NULL,
  app_name TEXT NOT NULL,
  client_id TEXT,
  creator_email TEXT,
  form_data TEXT NOT NULL,
  blob_urls TEXT,
  blobs_cleaned_at TEXT,
  status TEXT NOT NULL DEFAULT 'processing',
  airtable_submission_id TEXT,
  webhook_response TEXT,
  webhook_sent_at TEXT,
  error_message TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_submissions_client_id ON submissions(client_id);
CREATE INDEX IF NOT EXISTS idx_submissions_creator_email ON submissions(creator_email);
CREATE INDEX IF NOT EXISTS idx_submissions_created_at ON submissions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_submissions_status ON submissions(status);
CREATE INDEX IF NOT EXISTS idx_submissions_app_name ON submissions(app_name);
CREATE INDEX IF NOT EXISTS idx_submissions_failed_retry
  ON submissions(status, retry_count, webhook_sent_at);
CREATE INDEX IF NOT EXISTS idx_submissions_blob_cleanup
  ON submissions(status, created_at, blobs_cleaned_at);
