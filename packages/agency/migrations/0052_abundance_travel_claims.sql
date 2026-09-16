-- Leased claims serialize identical cache misses before reserving vendor credits.
CREATE TABLE IF NOT EXISTS abundance_travel_claims (
 cache_key TEXT PRIMARY KEY,
 owner TEXT NOT NULL,
 expires_at_ms INTEGER NOT NULL
);
