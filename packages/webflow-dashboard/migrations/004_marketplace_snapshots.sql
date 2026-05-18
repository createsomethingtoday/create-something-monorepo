-- Marketplace snapshot tables
-- Store periodic leaderboard/category snapshots so the dashboard can render
-- real historical trends for marketplace insights.

CREATE TABLE IF NOT EXISTS marketplace_leaderboard_snapshots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    snapshot_at TEXT NOT NULL,
    freshness_timestamp TEXT,
    freshness_source TEXT NOT NULL DEFAULT 'captured-at',
    record_key TEXT NOT NULL,
    template_name TEXT NOT NULL,
    category TEXT NOT NULL,
    creator_email TEXT NOT NULL,
    total_sales_30d INTEGER DEFAULT 0,
    total_revenue_30d REAL DEFAULT 0,
    avg_revenue_per_sale REAL DEFAULT 0,
    sales_rank INTEGER DEFAULT 0,
    revenue_rank INTEGER DEFAULT 0,
    captured_at TEXT DEFAULT (datetime('now')),
    UNIQUE(snapshot_at, record_key)
);

CREATE INDEX IF NOT EXISTS idx_marketplace_leaderboard_key_date
ON marketplace_leaderboard_snapshots(record_key, snapshot_at DESC);

CREATE INDEX IF NOT EXISTS idx_marketplace_leaderboard_snapshot
ON marketplace_leaderboard_snapshots(snapshot_at DESC);

CREATE TABLE IF NOT EXISTS marketplace_category_snapshots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    snapshot_at TEXT NOT NULL,
    freshness_timestamp TEXT,
    freshness_source TEXT NOT NULL DEFAULT 'captured-at',
    record_key TEXT NOT NULL,
    category TEXT NOT NULL,
    subcategory TEXT NOT NULL,
    templates_in_subcategory INTEGER DEFAULT 0,
    total_sales_30d INTEGER DEFAULT 0,
    total_revenue_30d REAL DEFAULT 0,
    avg_revenue_per_template REAL DEFAULT 0,
    revenue_rank INTEGER DEFAULT 0,
    captured_at TEXT DEFAULT (datetime('now')),
    UNIQUE(snapshot_at, record_key)
);

CREATE INDEX IF NOT EXISTS idx_marketplace_category_key_date
ON marketplace_category_snapshots(record_key, snapshot_at DESC);

CREATE INDEX IF NOT EXISTS idx_marketplace_category_snapshot
ON marketplace_category_snapshots(snapshot_at DESC);
