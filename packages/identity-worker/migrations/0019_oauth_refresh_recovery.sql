-- Additive, bounded recovery for opted-in A2A refresh exchanges. No raw credentials.
CREATE TABLE oauth_refresh_recoveries (
  grant_id TEXT PRIMARY KEY REFERENCES oauth_grant_consumptions(grant_id) ON DELETE CASCADE,
  request_hash TEXT NOT NULL,
  binding TEXT NOT NULL,
  response_ciphertext TEXT NOT NULL,
  recover_until INTEGER NOT NULL
);
CREATE INDEX oauth_refresh_recoveries_expiry ON oauth_refresh_recoveries(recover_until);
