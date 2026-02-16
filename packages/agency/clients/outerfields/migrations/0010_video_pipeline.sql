-- Video pipeline v1 schema: Stream ingest state + series metadata

CREATE TABLE IF NOT EXISTS series (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

ALTER TABLE videos ADD COLUMN series_id TEXT;
ALTER TABLE videos ADD COLUMN stream_uid TEXT;
ALTER TABLE videos ADD COLUMN ingest_status TEXT NOT NULL DEFAULT 'ready';
ALTER TABLE videos ADD COLUMN ingest_source TEXT NOT NULL DEFAULT 'upload';
ALTER TABLE videos ADD COLUMN duration_seconds INTEGER;
ALTER TABLE videos ADD COLUMN source_bytes INTEGER;
ALTER TABLE videos ADD COLUMN playback_policy TEXT NOT NULL DEFAULT 'private';
ALTER TABLE videos ADD COLUMN playback_ready_at INTEGER;
ALTER TABLE videos ADD COLUMN failure_reason TEXT;

-- Seed series records from existing categories so current catalog has structured series metadata.
INSERT INTO series (id, slug, title, description, created_at, updated_at) VALUES
  ('series_crew_call', 'crew-call', 'Crew Call', 'Crew Call episodic series', strftime('%s', 'now'), strftime('%s', 'now')),
  ('series_reconnecting_relationships', 'reconnecting-relationships', 'Reconnecting Relationships', 'Reconnecting Relationships episodic series', strftime('%s', 'now'), strftime('%s', 'now')),
  ('series_kodiak', 'kodiak', 'Kodiak', 'Kodiak episodic series', strftime('%s', 'now'), strftime('%s', 'now')),
  ('series_lincoln_manufacturing', 'lincoln-manufacturing', 'Lincoln Manufacturing', 'Lincoln Manufacturing episodic series', strftime('%s', 'now'), strftime('%s', 'now')),
  ('series_guns_out_tv', 'guns-out-tv', 'Guns Out TV', 'Guns Out TV episodic series', strftime('%s', 'now'), strftime('%s', 'now')),
  ('series_films', 'films', 'Films', 'Feature films', strftime('%s', 'now'), strftime('%s', 'now')),
  ('series_coming_soon', 'coming-soon', 'Coming Soon', 'Trailers and upcoming content', strftime('%s', 'now'), strftime('%s', 'now')),
  ('series_lmc', 'lmc', 'LMC', 'LMC content and features', strftime('%s', 'now'), strftime('%s', 'now'))
ON CONFLICT(slug) DO UPDATE SET
  title = excluded.title,
  description = excluded.description,
  updated_at = excluded.updated_at;

-- Backfill existing records to preserve current playback while adding new ingest state fields.
UPDATE videos
SET
  series_id = COALESCE(series_id, 'series_' || replace(category, '-', '_')),
  duration_seconds = COALESCE(duration_seconds, duration),
  ingest_status = COALESCE(ingest_status, 'ready'),
  ingest_source = COALESCE(ingest_source, 'upload'),
  playback_policy = COALESCE(playback_policy, 'private'),
  updated_at = strftime('%s', 'now')
WHERE 1 = 1;

CREATE INDEX IF NOT EXISTS idx_series_slug ON series(slug);
CREATE INDEX IF NOT EXISTS idx_videos_series_id ON videos(series_id);
CREATE INDEX IF NOT EXISTS idx_videos_series_episode ON videos(series_id, episode_number);
CREATE INDEX IF NOT EXISTS idx_videos_ingest_status ON videos(ingest_status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_videos_stream_uid ON videos(stream_uid) WHERE stream_uid IS NOT NULL;
