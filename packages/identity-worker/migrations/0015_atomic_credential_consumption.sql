-- Atomically rotate first-party refresh credentials and invalidate every
-- intermediary credential issued before this cutover.
ALTER TABLE refresh_tokens ADD COLUMN rotation_id TEXT;
CREATE INDEX idx_refresh_tokens_rotation_id ON refresh_tokens(rotation_id);

UPDATE refresh_tokens
SET revoked_at = datetime('now')
WHERE revoked_at IS NULL;

UPDATE cross_domain_tokens
SET used_at = datetime('now')
WHERE used_at IS NULL;
