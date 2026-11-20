-- Independent marketing consent. Analytics consent never authorizes Meta delivery.
CREATE TABLE IF NOT EXISTS meta_marketing_consents (
  consent_id TEXT PRIMARY KEY NOT NULL,
  granted_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  revoked_at INTEGER,
  policy_version TEXT NOT NULL CHECK (policy_version = 'agency-meta-v1')
);
CREATE TABLE IF NOT EXISTS meta_lead_deliveries (
  event_id TEXT PRIMARY KEY NOT NULL,
  request_id TEXT NOT NULL UNIQUE REFERENCES contact_request_receipts(request_id),
  consent_id TEXT NOT NULL REFERENCES meta_marketing_consents(consent_id),
  dataset_id TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'pending' CHECK (state IN
    ('pending', 'sending', 'accepted', 'transient_failure', 'permanent_failure', 'unknown', 'cancelled')),
  payload_json TEXT,
  attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts BETWEEN 0 AND 3),
  next_attempt_at INTEGER NOT NULL,
  lease_until INTEGER,
  provider_receipt TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  CHECK (state <> 'accepted' OR provider_receipt IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS meta_leads_due ON meta_lead_deliveries(consent_id, state, next_attempt_at);
CREATE INDEX IF NOT EXISTS meta_leads_payload_age ON meta_lead_deliveries(created_at) WHERE payload_json IS NOT NULL;
