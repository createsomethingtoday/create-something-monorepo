-- Transient anonymous quota counters only; no query text or client documents.
CREATE TABLE IF NOT EXISTS foundation_rate_limits (
  bucket TEXT NOT NULL,
  window INTEGER NOT NULL,
  hits INTEGER NOT NULL,
  PRIMARY KEY (bucket, window)
);
CREATE INDEX IF NOT EXISTS foundation_rate_limits_expiry ON foundation_rate_limits(window);
