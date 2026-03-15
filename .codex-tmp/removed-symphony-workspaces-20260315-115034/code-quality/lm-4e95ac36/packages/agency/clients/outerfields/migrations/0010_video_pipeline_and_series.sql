-- Adds Series table + Stream ingestion fields (portable schema for Replit/Postgres + local SQLite).

-- ============================================================
-- 1) Series table
-- ============================================================
CREATE TABLE IF NOT EXISTS series (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_series_slug ON series(slug);

-- Seed series rows from existing video categories (id is derived from slug).
INSERT INTO series (id, slug, title, description, created_at, updated_at)
SELECT
  'series_' || REPLACE(category, '-', '_') as id,
  category as slug,
  category as title,
  NULL as description,
  strftime('%s', 'now') as created_at,
  strftime('%s', 'now') as updated_at
FROM (SELECT DISTINCT category FROM videos)
WHERE category IS NOT NULL AND category != ''
ON CONFLICT(slug) DO NOTHING;

-- Friendly default titles for seeded categories (admins can edit later).
UPDATE series
SET title = CASE slug
  WHEN 'crew-call' THEN 'Crew Call'
  WHEN 'reconnecting-relationships' THEN 'Reconnecting Relationships'
  WHEN 'kodiak' THEN 'Kodiak'
  WHEN 'lincoln-manufacturing' THEN 'Lincoln Manufacturing Council'
  WHEN 'guns-out-tv' THEN 'Guns Out TV'
  WHEN 'films' THEN 'Films'
  WHEN 'coming-soon' THEN 'Coming Soon'
  ELSE title
END
WHERE slug IN (
  'crew-call',
  'reconnecting-relationships',
  'kodiak',
  'lincoln-manufacturing',
  'guns-out-tv',
  'films',
  'coming-soon'
);

-- ============================================================
-- 2) Videos: link to series + Stream ingestion fields
-- ============================================================
ALTER TABLE videos ADD COLUMN series_id TEXT;

-- Backfill series_id from existing category slugs.
UPDATE videos
SET series_id = (SELECT s.id FROM series s WHERE s.slug = videos.category LIMIT 1)
WHERE series_id IS NULL;

ALTER TABLE videos ADD COLUMN stream_uid TEXT;

ALTER TABLE videos
  ADD COLUMN ingest_status TEXT NOT NULL DEFAULT 'ready'
  CHECK(ingest_status IN ('pending_upload', 'processing', 'ready', 'failed'));

ALTER TABLE videos
  ADD COLUMN ingest_source TEXT NOT NULL DEFAULT 'generated'
  CHECK(ingest_source IN ('upload', 'generated'));

ALTER TABLE videos ADD COLUMN source_bytes INTEGER;
ALTER TABLE videos ADD COLUMN duration_seconds INTEGER;

ALTER TABLE videos
  ADD COLUMN playback_policy TEXT NOT NULL DEFAULT 'public'
  CHECK(playback_policy IN ('private', 'public'));

ALTER TABLE videos ADD COLUMN playback_ready_at INTEGER;
ALTER TABLE videos ADD COLUMN failure_reason TEXT;

-- For legacy seeded catalog, duration_seconds matches duration (seconds).
UPDATE videos
SET duration_seconds = duration
WHERE duration_seconds IS NULL;

CREATE INDEX IF NOT EXISTS idx_videos_series_id ON videos(series_id);
CREATE INDEX IF NOT EXISTS idx_videos_stream_uid ON videos(stream_uid);
CREATE INDEX IF NOT EXISTS idx_videos_ingest_status ON videos(ingest_status);

