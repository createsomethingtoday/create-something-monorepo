CREATE TABLE subscriptions (
  id TEXT PRIMARY KEY,
  owner_subject TEXT NOT NULL,
  agent_id TEXT NOT NULL REFERENCES agents(id),
  event_name TEXT NOT NULL,
  callback_url TEXT NOT NULL,
  secret_ciphertext TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('verifying','active','revoked','expired')),
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  cursor INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX subscriptions_agent ON subscriptions(agent_id,status,expires_at);
CREATE TABLE deliveries (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES outbox_events(id),
  subscription_id TEXT NOT NULL REFERENCES subscriptions(id),
  state TEXT NOT NULL DEFAULT 'pending' CHECK(state IN ('pending','accepted','retrying','failed','suspended','expired')),
  attempts INTEGER NOT NULL DEFAULT 0,
  next_attempt_at INTEGER NOT NULL,
  lease_until INTEGER,
  last_status INTEGER,
  last_error TEXT,
  accepted_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  UNIQUE(event_id,subscription_id)
);
CREATE INDEX deliveries_due ON deliveries(state,next_attempt_at,lease_until);
CREATE TABLE auth_sessions (
  id_hash TEXT PRIMARY KEY,
  owner_subject TEXT NOT NULL,
  token_ciphertext TEXT NOT NULL,
  access_expires_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  refresh_lock_until INTEGER,
  created_at INTEGER NOT NULL
);
CREATE TABLE oauth_states (
  id_hash TEXT PRIMARY KEY,
  verifier_ciphertext TEXT NOT NULL,
  return_to TEXT NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE TABLE admission_buckets (
  bucket_key TEXT PRIMARY KEY,
  count INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
