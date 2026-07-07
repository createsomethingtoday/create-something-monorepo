-- Per-operator/agent API keys. Bearer tokens are stored as SHA-256 hashes;
-- the label becomes the authenticated operator identity attached to presence
-- events and receipts. The legacy shared MCP_API_KEY continues to work with
-- operator label 'shared'.

CREATE TABLE IF NOT EXISTS api_keys (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  token_hash TEXT NOT NULL UNIQUE,      -- hex sha-256 of the bearer token
  label TEXT NOT NULL,                  -- e.g. 'micah', 'pablo', 'shea', 'paige'
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
