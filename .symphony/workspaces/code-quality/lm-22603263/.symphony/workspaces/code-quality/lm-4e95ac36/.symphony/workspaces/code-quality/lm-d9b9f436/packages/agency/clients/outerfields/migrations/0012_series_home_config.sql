-- Adds admin-managed home-row configuration for series.

ALTER TABLE series
  ADD COLUMN visibility TEXT NOT NULL DEFAULT 'published'
  CHECK(visibility IN ('draft', 'published', 'archived'));

ALTER TABLE series
  ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0;

-- JSON array of filter ids, e.g. ["series","bts"].
ALTER TABLE series
  ADD COLUMN home_filters TEXT NOT NULL DEFAULT '[]';

-- Backfill: match current UX intent for filter pills + row ordering.
UPDATE series
SET home_filters = CASE slug
  WHEN 'films' THEN '["films"]'
  WHEN 'coming-soon' THEN '["trailers"]'
  WHEN 'crew-call' THEN '["series","bts"]'
  ELSE '["series"]'
END;

UPDATE series
SET sort_order = CASE slug
  WHEN 'crew-call' THEN 10
  WHEN 'reconnecting-relationships' THEN 20
  WHEN 'kodiak' THEN 30
  WHEN 'lincoln-manufacturing' THEN 40
  WHEN 'guns-out-tv' THEN 50
  WHEN 'films' THEN 60
  WHEN 'coming-soon' THEN 70
  ELSE sort_order
END;

CREATE INDEX IF NOT EXISTS idx_series_visibility_sort_order ON series(visibility, sort_order);

