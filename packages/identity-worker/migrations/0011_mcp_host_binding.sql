-- Host-bound MCP credentials for transparent named lanes.
--
-- Canon: named URLs must be enforceable, not cosmetic.

ALTER TABLE mcp_sessions
ADD COLUMN bound_host TEXT;

ALTER TABLE mcp_long_lived_tokens
ADD COLUMN bound_host TEXT;

CREATE INDEX idx_mcp_sessions_bound_host ON mcp_sessions(bound_host);
CREATE INDEX idx_mcp_long_lived_tokens_bound_host ON mcp_long_lived_tokens(bound_host);
