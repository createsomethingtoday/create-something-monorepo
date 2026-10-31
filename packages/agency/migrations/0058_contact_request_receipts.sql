-- Contact-only, additive; independent of the Abundance migration backlog.
CREATE TABLE IF NOT EXISTS contact_request_receipts (
  request_id TEXT PRIMARY KEY NOT NULL,
  payload_sha256 TEXT NOT NULL,
  submission_id INTEGER NOT NULL UNIQUE REFERENCES contact_submissions(id),
  owner_token TEXT NOT NULL,
  schema_version INTEGER NOT NULL DEFAULT 1 CHECK (schema_version = 1),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS contact_email_receipts (
  request_id TEXT NOT NULL REFERENCES contact_request_receipts(request_id),
  kind TEXT NOT NULL CHECK (kind IN ('confirmation', 'notification')),
  state TEXT NOT NULL DEFAULT 'pending' CHECK (state IN
    ('pending', 'sending', 'accepted', 'permanent_failure', 'transient_failure', 'unknown')),
  provider_id TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (request_id, kind),
  CHECK (state <> 'accepted' OR (provider_id IS NOT NULL AND length(provider_id) > 0))
);
