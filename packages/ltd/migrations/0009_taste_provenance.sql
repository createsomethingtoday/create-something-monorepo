-- Preserve observed channel membership independently of a reference's age or type.
-- Existing references intentionally remain unattributed until a successful sync.
CREATE TABLE IF NOT EXISTS taste_reference_channels (
  reference_id TEXT NOT NULL,
  channel_slug TEXT NOT NULL,
  source_url TEXT NOT NULL,
  synced_at INTEGER NOT NULL,
  PRIMARY KEY (reference_id, channel_slug)
);
CREATE INDEX IF NOT EXISTS idx_taste_reference_channels_channel
  ON taste_reference_channels(channel_slug, reference_id);

-- Only complete, committed channel imports advance these checkpoints.
CREATE TABLE IF NOT EXISTS taste_sync_state (
  channel_slug TEXT PRIMARY KEY,
  last_successful_sync_at INTEGER NOT NULL
);
