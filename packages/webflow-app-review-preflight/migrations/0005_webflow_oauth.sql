CREATE TABLE webflow_oauth_states (
  state_sha256 TEXT PRIMARY KEY,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX idx_webflow_oauth_states_expires_at
  ON webflow_oauth_states(expires_at);

CREATE TABLE webflow_oauth_installations (
  id TEXT PRIMARY KEY,
  access_token_ciphertext TEXT NOT NULL,
  access_token_iv TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  CHECK (id = 'active')
);
