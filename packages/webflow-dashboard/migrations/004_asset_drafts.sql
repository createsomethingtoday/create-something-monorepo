CREATE TABLE IF NOT EXISTS asset_drafts (
    id TEXT PRIMARY KEY,
    user_email TEXT NOT NULL,
    asset_type TEXT NOT NULL CHECK (asset_type IN ('Template', 'App')),
    title TEXT NOT NULL,
    thumbnail_url TEXT,
    data_json TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_asset_drafts_user_updated
    ON asset_drafts (user_email, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_asset_drafts_type
    ON asset_drafts (asset_type);
