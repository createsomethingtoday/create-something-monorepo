-- GiGi broker keeps consent/connection receipts only. All music-work records
-- remain in each user's local SQLite database.
CREATE TABLE IF NOT EXISTS gigi_connection_attempts (
  subject TEXT NOT NULL,
  provider TEXT NOT NULL CHECK (provider IN ('gmail', 'googlecalendar')),
  request_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('dispatched', 'linked', 'active', 'attention')),
  connected_account_id TEXT,
  reconnectable INTEGER NOT NULL DEFAULT 0 CHECK (reconnectable IN (0, 1)),
  redirect_url TEXT,
  expires_at TEXT,
  created_at TEXT NOT NULL,
  PRIMARY KEY (subject, provider, request_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS gigi_connection_account_owner
  ON gigi_connection_attempts (connected_account_id)
  WHERE connected_account_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS gigi_connection_latest
  ON gigi_connection_attempts (subject, provider, created_at DESC);

-- One in-flight or active binding per owner/provider. A fresh request ID after
-- an uncertain provider POST cannot dispatch another OAuth link.
CREATE UNIQUE INDEX IF NOT EXISTS gigi_connection_single_outstanding
  ON gigi_connection_attempts (subject, provider)
  WHERE status IN ('dispatched', 'linked', 'active');
