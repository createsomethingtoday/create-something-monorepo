-- Review comments for Marketplace asset reviews (replaces Zendesk threads).
--
-- IDs are text UUIDs, not AUTOINCREMENT, so rows import 1:1 into Mongo when
-- the Creator Hub in webflow/webflow takes ownership.
--
-- visibility:
--   internal  reviewer-only note, never shown to the creator
--   draft     reviewer feedback waiting for the version-level release
--   released  visible to the creator (creator replies are always released)
CREATE TABLE IF NOT EXISTS review_comments (
	id TEXT PRIMARY KEY,
	asset_ref TEXT NOT NULL,
	version_ref TEXT NOT NULL,
	mongo_resource_id TEXT,
	parent_id TEXT REFERENCES review_comments (id),
	author_email TEXT NOT NULL,
	author_role TEXT NOT NULL CHECK (author_role IN ('creator', 'reviewer', 'system')),
	body TEXT NOT NULL,
	visibility TEXT NOT NULL CHECK (visibility IN ('internal', 'draft', 'released')),
	released_at TEXT,
	resolution TEXT NOT NULL DEFAULT 'open' CHECK (resolution IN ('open', 'resolved', 'carried_forward')),
	rubric_ref TEXT,
	created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
	edited_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_review_comments_version ON review_comments (version_ref, created_at);
CREATE INDEX IF NOT EXISTS idx_review_comments_asset ON review_comments (asset_ref, created_at);
CREATE INDEX IF NOT EXISTS idx_review_comments_author ON review_comments (author_email);
