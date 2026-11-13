-- One row per version, written on the version's first comment. The primary key
-- makes the pin atomic: a version belongs to exactly one asset, so a comment
-- sent with the wrong asset can never surface in another asset's history.
CREATE TABLE IF NOT EXISTS review_versions (
	version_ref TEXT PRIMARY KEY,
	asset_ref TEXT NOT NULL,
	created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

INSERT OR IGNORE INTO review_versions (version_ref, asset_ref)
SELECT version_ref, MIN(asset_ref) FROM review_comments GROUP BY version_ref;
