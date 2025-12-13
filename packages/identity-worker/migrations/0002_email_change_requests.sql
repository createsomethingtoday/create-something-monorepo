-- Email Change Requests
--
-- Canon: Security through verification.
-- The new email must prove itself before becoming identity.

-- Pending email change requests
CREATE TABLE email_change_requests (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  new_email TEXT NOT NULL,
  token_hash TEXT UNIQUE NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Indexes for lookup and cleanup
CREATE INDEX idx_email_change_user_id ON email_change_requests(user_id);
CREATE INDEX idx_email_change_expires ON email_change_requests(expires_at);

-- Add 'lms' to user source options
-- Note: SQLite doesn't support ALTER CHECK constraints
-- New users with 'lms' source are already supported via code
