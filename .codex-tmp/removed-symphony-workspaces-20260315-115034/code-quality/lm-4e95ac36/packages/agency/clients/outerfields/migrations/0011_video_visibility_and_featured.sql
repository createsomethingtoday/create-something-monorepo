-- Adds visibility + featured curation fields for admin-managed catalog.

ALTER TABLE videos
  ADD COLUMN visibility TEXT NOT NULL DEFAULT 'draft'
  CHECK(visibility IN ('draft', 'published', 'archived'));

ALTER TABLE videos
  ADD COLUMN is_featured INTEGER NOT NULL DEFAULT 0;

ALTER TABLE videos
  ADD COLUMN featured_order INTEGER NOT NULL DEFAULT 0;

-- Backfill: existing seeded catalog should remain visible.
UPDATE videos
SET visibility = 'published'
WHERE visibility = 'draft';

CREATE INDEX IF NOT EXISTS idx_videos_visibility ON videos(visibility);
CREATE INDEX IF NOT EXISTS idx_videos_is_featured_order ON videos(is_featured, featured_order, updated_at);
CREATE INDEX IF NOT EXISTS idx_videos_series_visibility_episode ON videos(series_id, visibility, episode_number);

