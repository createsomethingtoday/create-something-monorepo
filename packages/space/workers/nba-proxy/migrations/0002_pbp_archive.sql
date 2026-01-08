-- Play-by-Play Archive for Completed Games
-- Stores play-by-play data for final games to enable historical analysis
-- Currently PBP is only cached in KV with 30s TTL - this provides permanent storage

-- Play-by-play archive (one row per completed game)
CREATE TABLE IF NOT EXISTS pbp_archive (
  game_id TEXT PRIMARY KEY,
  game_date TEXT NOT NULL,                  -- YYYY-MM-DD format
  home_team TEXT NOT NULL,                  -- Team tricode (e.g., 'LAL')
  away_team TEXT NOT NULL,                  -- Team tricode (e.g., 'BOS')
  pbp_json TEXT NOT NULL,                   -- Full play-by-play JSON from NBA API
  action_count INTEGER NOT NULL,            -- Number of actions in the game
  archived_at INTEGER NOT NULL,             -- Unix timestamp when archived
  data_source TEXT DEFAULT 'nba_api'        -- Source: 'nba_api' or 'manual'
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_pbp_game_date ON pbp_archive(game_date DESC);
CREATE INDEX IF NOT EXISTS idx_pbp_teams ON pbp_archive(home_team, away_team);
CREATE INDEX IF NOT EXISTS idx_pbp_archived ON pbp_archive(archived_at DESC);

-- Box score archive (one row per completed game)
CREATE TABLE IF NOT EXISTS boxscore_archive (
  game_id TEXT PRIMARY KEY,
  game_date TEXT NOT NULL,
  home_team TEXT NOT NULL,
  away_team TEXT NOT NULL,
  boxscore_json TEXT NOT NULL,              -- Full box score JSON from NBA API
  player_count INTEGER NOT NULL,            -- Total players in both teams
  archived_at INTEGER NOT NULL,
  data_source TEXT DEFAULT 'nba_api'
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_boxscore_game_date ON boxscore_archive(game_date DESC);
CREATE INDEX IF NOT EXISTS idx_boxscore_teams ON boxscore_archive(home_team, away_team);
CREATE INDEX IF NOT EXISTS idx_boxscore_archived ON boxscore_archive(archived_at DESC);

-- Archive metadata for tracking what's been archived
CREATE TABLE IF NOT EXISTS archive_metadata (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  game_id TEXT NOT NULL UNIQUE,
  game_date TEXT NOT NULL,
  status TEXT NOT NULL,                     -- 'pending', 'archived', 'failed'
  has_pbp INTEGER DEFAULT 0,                -- Boolean: 1 if PBP archived
  has_boxscore INTEGER DEFAULT 0,           -- Boolean: 1 if boxscore archived
  attempt_count INTEGER DEFAULT 0,
  last_attempt_at INTEGER,
  error_message TEXT
);

CREATE INDEX IF NOT EXISTS idx_archive_metadata_game_id ON archive_metadata(game_id);
CREATE INDEX IF NOT EXISTS idx_archive_metadata_date ON archive_metadata(game_date DESC);
CREATE INDEX IF NOT EXISTS idx_archive_metadata_status ON archive_metadata(status);
