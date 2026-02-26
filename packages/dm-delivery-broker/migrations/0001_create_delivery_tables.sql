-- DM Delivery Broker
-- One-time secure package delivery for client onboarding (issue -> redeem -> revoke).

CREATE TABLE IF NOT EXISTS delivery_packages (
  id TEXT PRIMARY KEY,
  token_hash TEXT NOT NULL UNIQUE,
  code_hash TEXT NOT NULL,
  payload_ciphertext TEXT NOT NULL,
  expires_at_epoch INTEGER NOT NULL,
  max_redemptions INTEGER NOT NULL DEFAULT 1,
  redemption_count INTEGER NOT NULL DEFAULT 0,
  revoked_at_epoch INTEGER,
  last_redeemed_at_epoch INTEGER,
  created_by TEXT,
  recipient TEXT,
  note TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_delivery_packages_expires_at_epoch
  ON delivery_packages(expires_at_epoch);

CREATE INDEX IF NOT EXISTS idx_delivery_packages_revoked_at_epoch
  ON delivery_packages(revoked_at_epoch);

CREATE TABLE IF NOT EXISTS delivery_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  package_id TEXT,
  event_type TEXT NOT NULL,
  actor_type TEXT NOT NULL,
  actor_id TEXT,
  ip TEXT,
  user_agent TEXT,
  metadata_json TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (package_id) REFERENCES delivery_packages(id)
);

CREATE INDEX IF NOT EXISTS idx_delivery_events_package_id
  ON delivery_events(package_id);

CREATE INDEX IF NOT EXISTS idx_delivery_events_event_type
  ON delivery_events(event_type);

