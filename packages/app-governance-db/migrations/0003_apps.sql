-- Marketplace apps registry synced from the Webflow Apps admin view
-- (https://webflow.com/apps, ADMIN VIEW). Drift detection on visibility/status
-- serves the tracker parking-lot item: listing/visibility drift (apps silently
-- going private, installs breaking from param changes).

CREATE TABLE IF NOT EXISTS apps (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,            -- /apps/detail/<slug>
  name TEXT,
  client_id TEXT,                       -- OAuth hex id (from edit page / admin)
  app_id TEXT,                          -- Mongo ObjectId when known
  workspace_id TEXT,
  visibility TEXT,                      -- PUBLIC | PRIVATE (admin badge)
  review_status TEXT,                   -- APPROVED | PENDING | DENIED ... (admin badge)
  categories TEXT,                      -- JSON array of category labels
  detail_url TEXT,
  payload_json TEXT,                    -- raw snapshot payload
  first_seen_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_seen_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_changed_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_apps_client ON apps (client_id);
CREATE INDEX IF NOT EXISTS idx_apps_visibility ON apps (visibility, review_status);

INSERT OR IGNORE INTO sources (source_type, external_id, name, workspace, atlas_canvas_id) VALUES
  ('webflow_admin', 'webflow.com/apps', 'Webflow Apps Admin (Marketplace listings)', NULL, 'F0BB96552KG');
