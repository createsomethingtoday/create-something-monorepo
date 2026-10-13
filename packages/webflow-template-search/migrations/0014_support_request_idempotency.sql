-- The client's per-submission idempotency key, so a retry reuses its original
-- reservation (and Knock idempotency key) instead of taking another rate-limit
-- slot. Unique while set; released (NULL) when a rate-limited row is retried.
ALTER TABLE support_requests ADD COLUMN idempotency_key TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_support_requests_idempotency_key
  ON support_requests (idempotency_key)
  WHERE idempotency_key IS NOT NULL;
