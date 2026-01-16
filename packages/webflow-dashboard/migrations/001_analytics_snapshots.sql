-- Analytics Snapshots Table
-- Stores daily snapshots of asset metrics for historical tracking
-- Used to generate real sparkline trends in the dashboard

CREATE TABLE IF NOT EXISTS analytics_snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  asset_id TEXT NOT NULL,
  captured_at TEXT NOT NULL,  -- ISO date string (YYYY-MM-DD)
  unique_viewers INTEGER DEFAULT 0,
  cumulative_purchases INTEGER DEFAULT 0,
  cumulative_revenue REAL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(asset_id, captured_at)
);

-- Index for efficient queries by asset and date
CREATE INDEX IF NOT EXISTS idx_snapshots_asset_date 
ON analytics_snapshots(asset_id, captured_at DESC);

-- Index for cleanup queries (delete old data)
CREATE INDEX IF NOT EXISTS idx_snapshots_captured_at 
ON analytics_snapshots(captured_at);
