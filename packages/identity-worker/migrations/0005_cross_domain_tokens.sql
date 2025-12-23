-- Cross-Domain SSO Tokens
--
-- Canon: One identity across all properties.
-- Short-lived tokens enable seamless property transitions.

CREATE TABLE cross_domain_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  target TEXT NOT NULL CHECK (target IN ('ltd', 'io', 'space', 'agency')),
  created_at TEXT DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL,
  used_at TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Index for token lookup (hash-based, single-use)
CREATE INDEX idx_cross_domain_tokens_hash ON cross_domain_tokens(token_hash);

-- Index for cleanup of expired tokens
CREATE INDEX idx_cross_domain_tokens_expires ON cross_domain_tokens(expires_at);

-- Index for user lookup (rate limiting)
CREATE INDEX idx_cross_domain_tokens_user ON cross_domain_tokens(user_id);
