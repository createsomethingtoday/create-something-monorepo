-- Signed OAuth authorization and refresh grants are single-use credentials.
CREATE TABLE IF NOT EXISTS oauth_grant_consumptions (
  grant_id TEXT PRIMARY KEY,
  grant_kind TEXT NOT NULL CHECK (grant_kind IN ('oauth_authorization_code', 'oauth_refresh_token')),
  client_id TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  consumed_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_oauth_grant_consumptions_expiry
  ON oauth_grant_consumptions(expires_at);

CREATE TABLE IF NOT EXISTS oauth_refresh_families (
  family_id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  revoked_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
