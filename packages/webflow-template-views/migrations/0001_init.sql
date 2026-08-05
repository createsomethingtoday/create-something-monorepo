-- Daily per-template view rollup. One row per (UTC day, template slug).
-- views    = total beacons received
-- sessions = beacons flagged as first view of this template in the visitor's
--            browser session (client-side sessionStorage dedupe) — a cheap
--            stand-in for unique viewers.
CREATE TABLE IF NOT EXISTS template_views_daily (
  day TEXT NOT NULL,
  slug TEXT NOT NULL,
  views INTEGER NOT NULL DEFAULT 0,
  sessions INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (day, slug)
);

CREATE INDEX IF NOT EXISTS idx_template_views_slug ON template_views_daily (slug, day);
