-- NBA Live Analytics: Player Baselines
-- Meta-experiment for spec-driven development with harness/Gastown
-- Stores DARKO-compatible baseline statistics for "vs expected" calculations

-- Player baselines (DARKO metrics)
CREATE TABLE IF NOT EXISTS player_baselines (
    player_id TEXT PRIMARY KEY,
    player_name TEXT NOT NULL,
    season TEXT NOT NULL DEFAULT '2024-25',
    -- DARKO-style metrics
    offensive_rating REAL,
    defensive_rating REAL,
    net_rating REAL,
    -- Usage and efficiency
    usage_rate REAL,
    true_shooting_pct REAL,
    assist_pct REAL,
    rebound_pct REAL,
    -- Per-possession expectations
    expected_ppp REAL,           -- Expected points per possession when on court
    expected_def_ppp REAL,       -- Expected points allowed per possession
    -- Shot profile (JSON for flexibility as we discover DARKO schema)
    shot_profile TEXT,           -- JSON: zone percentages and expected FG%
    -- Raw DARKO data (for future parsing)
    raw_darko TEXT,              -- Full JSON blob from DARKO
    -- Metadata
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_player_baselines_season
    ON player_baselines(season);
CREATE INDEX IF NOT EXISTS idx_player_baselines_name
    ON player_baselines(player_name);

-- Season averages for historical comparison
CREATE TABLE IF NOT EXISTS season_averages (
    player_id TEXT NOT NULL,
    season TEXT NOT NULL,
    games_played INTEGER NOT NULL DEFAULT 0,
    minutes_per_game REAL,
    points_per_game REAL,
    assists_per_game REAL,
    rebounds_per_game REAL,
    steals_per_game REAL,
    blocks_per_game REAL,
    turnovers_per_game REAL,
    fg_pct REAL,
    three_pt_pct REAL,
    ft_pct REAL,
    -- Metadata
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
    PRIMARY KEY (player_id, season)
);

-- Index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_season_averages_season
    ON season_averages(season);

-- League averages for comparison (one row per season)
CREATE TABLE IF NOT EXISTS league_averages (
    season TEXT PRIMARY KEY,
    avg_ppp REAL,                -- League average points per possession
    avg_def_ppp REAL,            -- League average defensive PPP
    avg_true_shooting REAL,
    avg_usage REAL,
    -- Shot zone averages
    restricted_area_fg_pct REAL,
    paint_non_ra_fg_pct REAL,
    mid_range_fg_pct REAL,
    corner_three_fg_pct REAL,
    above_break_three_fg_pct REAL,
    -- Metadata
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Insert default 2024-25 league averages (approximate)
INSERT OR IGNORE INTO league_averages (
    season,
    avg_ppp,
    avg_def_ppp,
    avg_true_shooting,
    avg_usage,
    restricted_area_fg_pct,
    paint_non_ra_fg_pct,
    mid_range_fg_pct,
    corner_three_fg_pct,
    above_break_three_fg_pct
) VALUES (
    '2024-25',
    1.12,   -- League avg PPP
    1.12,   -- League avg defensive PPP (same as offensive)
    0.58,   -- ~58% TS
    0.20,   -- ~20% usage
    0.66,   -- ~66% at rim
    0.42,   -- ~42% in paint non-RA
    0.41,   -- ~41% mid-range
    0.39,   -- ~39% corner 3
    0.36    -- ~36% above break 3
);
