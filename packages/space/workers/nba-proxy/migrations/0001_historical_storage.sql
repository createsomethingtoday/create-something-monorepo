-- Historical NBA Game Storage
-- Stores daily snapshots of scoreboard data for date-based queries

-- Daily scoreboard snapshots (one row per day)
CREATE TABLE game_snapshots (
  date TEXT PRIMARY KEY,                    -- YYYY-MM-DD format
  scoreboard_json TEXT NOT NULL,            -- Full scoreboard JSON from NBA API
  game_count INTEGER NOT NULL,              -- Number of games that day
  captured_at INTEGER NOT NULL,             -- Unix timestamp when captured
  data_source TEXT DEFAULT 'nba_api'        -- Source: 'nba_api' or 'manual'
);

-- Index for efficient date range queries
CREATE INDEX idx_snapshots_date ON game_snapshots(date DESC);
CREATE INDEX idx_snapshots_captured ON game_snapshots(captured_at DESC);

-- Metadata table for tracking capture status
CREATE TABLE snapshot_metadata (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,
  status TEXT NOT NULL,                     -- 'pending', 'captured', 'failed'
  attempt_count INTEGER DEFAULT 0,
  last_attempt_at INTEGER,
  error_message TEXT,
  UNIQUE(date)
);

CREATE INDEX idx_metadata_date ON snapshot_metadata(date DESC);
CREATE INDEX idx_metadata_status ON snapshot_metadata(status);
