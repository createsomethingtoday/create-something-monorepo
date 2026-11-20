-- Durable public read model for creator storefronts (CONTRACT.md §7).
-- One row per creator slug. Rows are never deleted; tombstones keep their
-- revision so a delayed older operation cannot overwrite them.
CREATE TABLE IF NOT EXISTS storefront_public (
  creator_slug TEXT PRIMARY KEY,
  creator_id TEXT NOT NULL,
  revision INTEGER NOT NULL CHECK (revision > 0),
  state TEXT NOT NULL CHECK (state IN ('live', 'unpublished', 'suspended', 'moved')),
  snapshot_json TEXT,
  payload_hash TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  CHECK ((state = 'live') = (snapshot_json IS NOT NULL))
);

CREATE INDEX IF NOT EXISTS storefront_public_creator ON storefront_public (creator_id);
