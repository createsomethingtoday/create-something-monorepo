-- Magic Link Authentication
-- Enables passwordless authentication for MCP server integration
--
-- Philosophy: Authentication should recede into use.
-- Magic links eliminate password friction—click and you're in.

-- ─────────────────────────────────────────────────────────────────────────────
-- Magic Link Sessions
-- Tracks pending authentication requests from MCP clients
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS magic_link_sessions (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  session_id TEXT NOT NULL UNIQUE,  -- UUID from MCP client for polling
  token_hash TEXT NOT NULL,         -- SHA-256 hash of the magic link token
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'expired')),
  access_token TEXT,                -- JWT access token (set after verification)
  refresh_token TEXT,               -- JWT refresh token (set after verification)
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  expires_at INTEGER NOT NULL,      -- Token expires after 15 minutes
  verified_at INTEGER               -- When user clicked the link
);

CREATE INDEX IF NOT EXISTS idx_magic_session_id ON magic_link_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_magic_token_hash ON magic_link_sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_magic_email ON magic_link_sessions(email);
CREATE INDEX IF NOT EXISTS idx_magic_expires ON magic_link_sessions(expires_at);

-- ─────────────────────────────────────────────────────────────────────────────
-- Rate Limiting
-- Prevent abuse: max 3 requests per email per hour
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS magic_link_rate_limits (
  email TEXT PRIMARY KEY,
  request_count INTEGER DEFAULT 1,
  window_start INTEGER NOT NULL DEFAULT (unixepoch()),
  last_request INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_rate_limit_window ON magic_link_rate_limits(window_start);
