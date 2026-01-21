-- Analytics events table for custom event tracking
CREATE TABLE IF NOT EXISTS analytics_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_name TEXT NOT NULL,
    user_hash TEXT,  -- hashed email for privacy
    page_path TEXT,
    properties TEXT,  -- JSON string for custom properties
    created_at TEXT DEFAULT (datetime('now'))
);

-- Index for querying by event name
CREATE INDEX IF NOT EXISTS idx_events_name ON analytics_events(event_name);

-- Index for time-based queries
CREATE INDEX IF NOT EXISTS idx_events_created ON analytics_events(created_at DESC);

-- Index for user activity queries
CREATE INDEX IF NOT EXISTS idx_events_user ON analytics_events(user_hash);

-- Composite index for common queries
CREATE INDEX IF NOT EXISTS idx_events_name_date ON analytics_events(event_name, created_at DESC);
