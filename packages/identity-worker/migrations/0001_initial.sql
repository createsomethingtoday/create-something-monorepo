-- Identity Worker Initial Schema
--
-- Canon: One identity, many manifestations.
-- The authentication infrastructure disappears; only the unified self remains.

-- Unified users (single source of truth)
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  email_verified INTEGER DEFAULT 0,
  password_hash TEXT NOT NULL,
  name TEXT,
  avatar_url TEXT,
  tier TEXT DEFAULT 'free' CHECK (tier IN ('free', 'pro', 'agency')),
  source TEXT NOT NULL CHECK (source IN ('workway', 'templates', 'io', 'space')),
  workway_id TEXT UNIQUE,
  templates_id TEXT UNIQUE,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Indexes for user lookup
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_workway_id ON users(workway_id);
CREATE INDEX idx_users_templates_id ON users(templates_id);

-- Refresh tokens (revocable)
CREATE TABLE refresh_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT UNIQUE NOT NULL,
  family_id TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  revoked_at TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Indexes for token lookup and cleanup
CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_family_id ON refresh_tokens(family_id);
CREATE INDEX idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);

-- Service API keys for service-to-service auth
CREATE TABLE api_keys (
  id TEXT PRIMARY KEY,
  service TEXT NOT NULL,
  key_hash TEXT UNIQUE NOT NULL,
  permissions TEXT NOT NULL,
  revoked_at TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_api_keys_service ON api_keys(service);

-- JWT signing keys (ES256)
CREATE TABLE signing_keys (
  id TEXT PRIMARY KEY,
  private_key TEXT NOT NULL,
  public_key TEXT NOT NULL,
  algorithm TEXT DEFAULT 'ES256',
  active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_signing_keys_active ON signing_keys(active);

-- Rate limiting (login attempts)
CREATE TABLE rate_limits (
  key TEXT PRIMARY KEY,
  count INTEGER DEFAULT 0,
  window_start TEXT DEFAULT (datetime('now')),
  blocked_until TEXT
);
