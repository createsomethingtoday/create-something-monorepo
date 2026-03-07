-- Managed long-lived MCP bearer tokens
--
-- Canon: customer-facing bearer tokens are first-class credentials, not legacy exceptions.

CREATE TABLE mcp_long_lived_tokens (
  id TEXT PRIMARY KEY,
  auth_subject TEXT NOT NULL UNIQUE,
  auth_email TEXT,
  tenant_id TEXT NOT NULL,
  account_id TEXT NOT NULL,
  tool_mode TEXT NOT NULL CHECK (tool_mode IN ('read_only', 'read_write')),
  toolkit_profile_json TEXT NOT NULL DEFAULT '[]',
  allowed_tool_prefixes_json TEXT NOT NULL DEFAULT '[]',
  token_hash TEXT NOT NULL UNIQUE,
  token_prefix TEXT NOT NULL,
  issued_by TEXT NOT NULL,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  last_used_at TEXT,
  revoked_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_mcp_long_lived_tokens_account_id ON mcp_long_lived_tokens(account_id);
CREATE INDEX idx_mcp_long_lived_tokens_tenant_id ON mcp_long_lived_tokens(tenant_id);
CREATE INDEX idx_mcp_long_lived_tokens_revoked_at ON mcp_long_lived_tokens(revoked_at);
