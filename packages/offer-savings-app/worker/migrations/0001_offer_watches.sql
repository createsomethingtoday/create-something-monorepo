CREATE TABLE IF NOT EXISTS offer_watches (
  owner_subject TEXT NOT NULL,
  id TEXT NOT NULL,
  idempotency_hash TEXT NOT NULL,
  payload TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (owner_subject, id),
  UNIQUE (owner_subject, idempotency_hash)
);

CREATE INDEX IF NOT EXISTS idx_offer_watches_owner_updated
  ON offer_watches (owner_subject, updated_at DESC);
