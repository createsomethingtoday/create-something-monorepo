-- Stable MCP account identity mapping
--
-- Canon: session tokens are ephemeral; account identity is durable.

CREATE TABLE mcp_accounts (
  account_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE (user_id, tenant_id)
);

CREATE INDEX idx_mcp_accounts_user_id ON mcp_accounts(user_id);
CREATE INDEX idx_mcp_accounts_tenant_id ON mcp_accounts(tenant_id);

-- Backfill one canonical account_id per (user_id, tenant_id), preferring
-- the most recently issued session group and then a deterministic account_id.
INSERT OR IGNORE INTO mcp_accounts (account_id, user_id, tenant_id, created_at, updated_at)
SELECT
  latest.account_id,
  latest.user_id,
  latest.tenant_id,
  latest.created_at,
  datetime('now')
FROM (
  SELECT
    ms.user_id,
    ms.tenant_id,
    MIN(ms.account_id) AS account_id,
    MIN(ms.created_at) AS created_at
  FROM mcp_sessions ms
  INNER JOIN (
    SELECT user_id, tenant_id, MAX(created_at) AS latest_created_at
    FROM mcp_sessions
    GROUP BY user_id, tenant_id
  ) newest
    ON newest.user_id = ms.user_id
   AND newest.tenant_id = ms.tenant_id
   AND newest.latest_created_at = ms.created_at
  GROUP BY ms.user_id, ms.tenant_id
) AS latest;
