-- Additive learning material; video publication remains the access authority.
CREATE TABLE lesson_material (
 video_id TEXT PRIMARY KEY REFERENCES videos(id) ON DELETE CASCADE,
 network_id TEXT NOT NULL REFERENCES networks(id),
 outcome TEXT NOT NULL DEFAULT '',
 prerequisites TEXT NOT NULL DEFAULT '',
 tools TEXT NOT NULL DEFAULT '',
 transcript TEXT NOT NULL DEFAULT '',
 practice TEXT NOT NULL DEFAULT '',
 release_id TEXT REFERENCES asset_releases(id) ON DELETE SET NULL,
 updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
