-- Shared across callers and Workers; reservations survive uncertain vendor failures.
CREATE TABLE IF NOT EXISTS abundance_travel_credit_reservations (
 id TEXT PRIMARY KEY,
 credits INTEGER NOT NULL CHECK(credits > 0 AND credits <= 300),
 reserved_at_ms INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_abundance_travel_credit_time ON abundance_travel_credit_reservations(reserved_at_ms);
