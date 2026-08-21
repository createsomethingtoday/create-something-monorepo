-- Invalidate ambiguous pre-hardening credentials and bind new refresh rows to one app.
ALTER TABLE refresh_tokens ADD COLUMN audience TEXT;
UPDATE refresh_tokens SET revoked_at = datetime('now') WHERE revoked_at IS NULL;
UPDATE mcp_sessions SET revoked_at = datetime('now'), updated_at = datetime('now') WHERE revoked_at IS NULL;
