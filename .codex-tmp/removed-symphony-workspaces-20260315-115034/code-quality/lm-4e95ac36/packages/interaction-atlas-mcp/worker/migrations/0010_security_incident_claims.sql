CREATE TABLE IF NOT EXISTS judgment_security_incident_claims (
  account_id TEXT NOT NULL,
  incident_id TEXT NOT NULL,
  claimed_by TEXT NOT NULL,
  claimed_at INTEGER NOT NULL DEFAULT (unixepoch()),
  claim_expires_at INTEGER NOT NULL,
  PRIMARY KEY (account_id, incident_id),
  FOREIGN KEY (incident_id) REFERENCES judgment_security_incidents(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_judgment_security_incident_claims_account_expiry
  ON judgment_security_incident_claims (account_id, claim_expires_at DESC);
