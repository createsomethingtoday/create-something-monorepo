-- Asset draft persistence
-- This migration was applied to production after 004_marketplace_snapshots.sql.
-- Keep the duplicate 004 prefix to match the production d1_migrations ledger.

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
