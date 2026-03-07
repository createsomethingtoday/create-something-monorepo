-- Expand partner access delivery types to support managed bearer delivery bundles.

ALTER TABLE partner_access_deliveries RENAME TO partner_access_deliveries_old;

CREATE TABLE partner_access_deliveries (
  id TEXT PRIMARY KEY,
  partner_client_id TEXT NOT NULL REFERENCES partner_auth_clients(id) ON DELETE CASCADE,
  delivery_type TEXT NOT NULL CHECK (delivery_type IN ('strict_session_bundle', 'legacy_key_bundle', 'managed_bearer_bundle')),
  delivery_channel TEXT NOT NULL DEFAULT 'portal' CHECK (delivery_channel IN ('portal', 'secure_note', 'email', 'manual')),
  delivered_by TEXT NOT NULL,
  recipient TEXT,
  artifact_ref TEXT,
  expires_at TEXT,
  revoked_at TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT DEFAULT (datetime('now'))
);

INSERT INTO partner_access_deliveries (
  id, partner_client_id, delivery_type, delivery_channel, delivered_by, recipient,
  artifact_ref, expires_at, revoked_at, metadata_json, created_at
)
SELECT
  id, partner_client_id, delivery_type, delivery_channel, delivered_by, recipient,
  artifact_ref, expires_at, revoked_at, metadata_json, created_at
FROM partner_access_deliveries_old;

DROP TABLE partner_access_deliveries_old;

CREATE INDEX idx_partner_access_deliveries_client_created
  ON partner_access_deliveries(partner_client_id, created_at DESC);
