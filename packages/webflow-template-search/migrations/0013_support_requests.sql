-- One row per buyer → creator support request from a template detail page.
-- Source of truth for request counts by type, template, and creator. The
-- message body and buyer email are not stored: the body goes to the creator
-- via Knock, and the buyer email is kept only as a salted hash for rate limits.
CREATE TABLE IF NOT EXISTS support_requests (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  template_document_id TEXT NOT NULL,
  template_slug TEXT NOT NULL,
  creator_record_id TEXT,
  request_type TEXT NOT NULL,
  status TEXT NOT NULL,
  ip_hash TEXT NOT NULL,
  buyer_email_hash TEXT NOT NULL,
  message_chars INTEGER NOT NULL,
  knock_workflow_run_id TEXT,
  error TEXT
);

CREATE INDEX IF NOT EXISTS idx_support_requests_ip ON support_requests (ip_hash, created_at);
CREATE INDEX IF NOT EXISTS idx_support_requests_buyer ON support_requests (buyer_email_hash, template_slug, created_at);
CREATE INDEX IF NOT EXISTS idx_support_requests_template ON support_requests (template_slug, created_at);
CREATE INDEX IF NOT EXISTS idx_support_requests_creator ON support_requests (creator_record_id, created_at);
