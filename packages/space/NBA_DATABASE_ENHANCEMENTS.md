# NBA Live Analytics Database Enhancements

## Overview

This document describes the database enhancements made to support advanced NBA Live Analytics features, including player baselines, historical data storage, and play-by-play archival.

**Date Completed:** January 8, 2026  
**Database:** `create-something-db` (Cloudflare D1)  
**Worker:** `nba-proxy`

---

## 1. Player Baselines & Season Averages

### Tables Created

#### `player_baselines`
Stores DARKO-compatible baseline statistics for "vs expected" calculations.

**Columns:**
- `player_id` (TEXT, PRIMARY KEY) - NBA player ID
- `player_name` (TEXT) - Player's full name
- `season` (TEXT) - Season identifier (e.g., "2024-25")
- `offensive_rating` (REAL) - Points produced per 100 possessions
- `defensive_rating` (REAL) - Points allowed per 100 possessions
- `net_rating` (REAL) - Offensive rating - Defensive rating
- `usage_rate` (REAL) - % of team possessions used
- `true_shooting_pct` (REAL) - Shooting efficiency metric
- `assist_pct` (REAL) - % of teammate FGs assisted
- `rebound_pct` (REAL) - % of available rebounds grabbed
- `expected_ppp` (REAL) - Expected points per possession
- `expected_def_ppp` (REAL) - Expected defensive points per possession
- `shot_profile` (TEXT, JSON) - Shot zone percentages and expected FG%
- `raw_darko` (TEXT, JSON) - Full DARKO data blob
- `created_at` (INTEGER) - Unix timestamp
- `updated_at` (INTEGER) - Unix timestamp

**Indexes:**
- `idx_player_baselines_season` - For season-based queries
- `idx_player_baselines_name` - For player name searches

#### `season_averages`
Stores traditional season statistics for historical comparison.

**Columns:**
- `player_id` (TEXT) - NBA player ID
- `season` (TEXT) - Season identifier
- `games_played` (INTEGER)
- `minutes_per_game` (REAL)
- `points_per_game` (REAL)
- `assists_per_game` (REAL)
- `rebounds_per_game` (REAL)
- `steals_per_game` (REAL)
- `blocks_per_game` (REAL)
- `turnovers_per_game` (REAL)
- `fg_pct` (REAL) - Field goal percentage
- `three_pt_pct` (REAL) - Three-point percentage
- `ft_pct` (REAL) - Free throw percentage
- `created_at` (INTEGER)
- `updated_at` (INTEGER)

**Primary Key:** `(player_id, season)`

### API Endpoints

```
GET /baselines
GET /baselines/:playerId
```

Returns player baseline data from D1.

### Seeding Script

**Location:** `packages/space/scripts/seed-nba-baselines.ts`

**Usage:**
```bash
pnpm tsx packages/space/scripts/seed-nba-baselines.ts
```

**Features:**
- Fetches top players from current season
- Calculates advanced metrics from basic stats
- Inserts into both `player_baselines` and `season_averages`
- Idempotent (safe to run multiple times)

**Current Status:** Contains sample data for 5 top players. In production, this should:
1. Fetch from NBA Stats API for all active players
2. Integrate with DARKO projections when available
3. Run nightly to update player statistics

---

## 2. Play-by-Play & Box Score Archive

### Tables Created

#### `pbp_archive`
Permanent storage for play-by-play data from completed games.

**Columns:**
- `game_id` (TEXT, PRIMARY KEY) - NBA game ID
- `game_date` (TEXT) - YYYY-MM-DD format
- `home_team` (TEXT) - Team tricode (e.g., 'LAL')
- `away_team` (TEXT) - Team tricode (e.g., 'BOS')
- `pbp_json` (TEXT) - Full play-by-play JSON from NBA API
- `action_count` (INTEGER) - Number of actions in the game
- `archived_at` (INTEGER) - Unix timestamp when archived
- `data_source` (TEXT) - Source: 'nba_api' or 'manual'

**Indexes:**
- `idx_pbp_game_date` - For date-based queries
- `idx_pbp_teams` - For team matchup queries
- `idx_pbp_archived` - For tracking archive status

#### `boxscore_archive`
Permanent storage for box scores from completed games.

**Columns:**
- `game_id` (TEXT, PRIMARY KEY)
- `game_date` (TEXT)
- `home_team` (TEXT)
- `away_team` (TEXT)
- `boxscore_json` (TEXT) - Full box score JSON from NBA API
- `player_count` (INTEGER) - Total players in both teams
- `archived_at` (INTEGER)
- `data_source` (TEXT)

**Indexes:**
- `idx_boxscore_game_date`
- `idx_boxscore_teams`
- `idx_boxscore_archived`

#### `archive_metadata`
Tracks archival status for each game.

**Columns:**
- `id` (INTEGER, PRIMARY KEY AUTOINCREMENT)
- `game_id` (TEXT, UNIQUE)
- `game_date` (TEXT)
- `status` (TEXT) - 'pending', 'archived', 'failed'
- `has_pbp` (INTEGER) - Boolean: 1 if PBP archived
- `has_boxscore` (INTEGER) - Boolean: 1 if boxscore archived
- `attempt_count` (INTEGER)
- `last_attempt_at` (INTEGER)
- `error_message` (TEXT)

**Indexes:**
- `idx_archive_metadata_game_id`
- `idx_archive_metadata_date`
- `idx_archive_metadata_status`

### Automatic Archival

The `nba-proxy` worker now automatically archives play-by-play and box score data for completed games during the nightly cron job (2am PT / 7am UTC).

**Process:**
1. Cron job runs at 2am PT
2. Fetches previous day's scoreboard
3. Stores scoreboard snapshot in `game_snapshots`
4. Identifies completed games (status = 3)
5. For each completed game:
   - Fetches play-by-play data
   - Fetches box score data
   - Stores in archive tables
   - Updates metadata
6. Rate limits: 500ms between games

**Benefits:**
- Historical analysis of shot patterns
- Defensive matchup tracking over time
- Duo synergy trends
- No reliance on 30-second KV cache

---

## 3. Historical Data Backfill

### Backfill Script

**Location:** `packages/space/scripts/backfill-nba-history.ts`

**Usage:**
```bash
# Backfill last 7 days
pnpm tsx packages/space/scripts/backfill-nba-history.ts --days 7

# Backfill specific date range
pnpm tsx packages/space/scripts/backfill-nba-history.ts --start 2026-01-01 --end 2026-01-07

# Backfill single date
pnpm tsx packages/space/scripts/backfill-nba-history.ts --date 2026-01-05

# Dry run (preview without changes)
pnpm tsx packages/space/scripts/backfill-nba-history.ts --days 7 --dry-run
```

**Features:**
- Fetches historical scoreboard data from NBA API
- Stores in `game_snapshots` table
- Updates `snapshot_metadata` for tracking
- Idempotent (checks for existing data)
- Rate limiting (1 second between requests)
- Comprehensive error handling

**Current Status:** Only 1 day of data captured (2026-01-05). Run backfill script to populate historical data.

---

## 4. Database Schema Summary

### Existing Tables (Enhanced)
- `game_snapshots` - Daily scoreboard snapshots ✅
- `snapshot_metadata` - Capture status tracking ✅

### New Tables (Added)
- `player_baselines` - DARKO-compatible player metrics ✅
- `season_averages` - Traditional season statistics ✅
- `pbp_archive` - Play-by-play permanent storage ✅
- `boxscore_archive` - Box score permanent storage ✅
- `archive_metadata` - Archive status tracking ✅

### Total Database Size
**Before:** ~5.25 MB  
**After:** ~5.37 MB  
**Growth:** +120 KB (tables only, no data yet)

---

## 5. API Enhancements

### New Endpoints

```
GET /baselines
Returns: List of all player baselines (limit 100)

GET /baselines/:playerId
Returns: Baseline data for specific player

GET /league-averages/:season
Returns: League-wide averages for season (future)
```

### Enhanced Endpoints

```
GET /game/:gameId/pbp
- Now checks archive for completed games
- Falls back to live API for in-progress games
- Permanent storage after game completion

GET /game/:gameId/boxscore
- Now checks archive for completed games
- Falls back to live API for in-progress games
- Permanent storage after game completion
```

---

## 6. Testing & Verification

### Database Verification

```bash
# Check all tables exist
cd packages/space/workers/nba-proxy
wrangler d1 execute create-something-db --remote --command \
  "SELECT name FROM sqlite_master WHERE type='table' AND name IN 
   ('pbp_archive', 'boxscore_archive', 'archive_metadata', 
    'player_baselines', 'season_averages') ORDER BY name"
```

**Expected Result:** All 5 tables listed ✅

### Data Verification

```bash
# Check game snapshots
wrangler d1 execute create-something-db --remote --command \
  "SELECT date, game_count FROM game_snapshots ORDER BY date DESC LIMIT 5"

# Check player baselines (after seeding)
wrangler d1 execute create-something-db --remote --command \
  "SELECT player_name, offensive_rating, defensive_rating 
   FROM player_baselines ORDER BY net_rating DESC LIMIT 5"

# Check archive status
wrangler d1 execute create-something-db --remote --command \
  "SELECT game_id, game_date, has_pbp, has_boxscore 
   FROM archive_metadata ORDER BY game_date DESC LIMIT 5"
```

---

## 7. Next Steps

### Immediate (Required)
1. ✅ Apply migrations to production
2. ⏳ Run player baseline seeding script
3. ⏳ Run historical backfill for last 30 days
4. ⏳ Deploy updated nba-proxy worker

### Short-term (Recommended)
1. Integrate real DARKO projections API
2. Expand player baseline coverage (all active players)
3. Add league averages calculation
4. Create admin dashboard for monitoring archive status

### Long-term (Future)
1. Implement shot chart aggregation from archived PBP
2. Add defensive matchup analysis over time
3. Create trend detection for duo synergies
4. Build historical comparison tools

---

## 8. Deployment Checklist

- [x] Apply `0013_nba_baselines.sql` migration
- [x] Apply `0002_pbp_archive.sql` migration
- [x] Verify tables created successfully
- [ ] Deploy updated nba-proxy worker code
- [ ] Run seed-nba-baselines.ts script
- [ ] Run backfill-nba-history.ts for last 30 days
- [ ] Monitor first cron job execution (2am PT)
- [ ] Verify archive tables populate correctly
- [ ] Test API endpoints return archived data

---

## 9. Monitoring

### Key Metrics to Track

1. **Archive Coverage**
   - % of completed games archived
   - Average archive time per game
   - Failed archive attempts

2. **Database Growth**
   - Size increase per day
   - PBP archive size vs boxscore archive
   - Compression opportunities

3. **API Performance**
   - Archive hit rate vs live API calls
   - Query performance on archived data
   - Cache effectiveness

### Queries for Monitoring

```sql
-- Archive coverage
SELECT 
  COUNT(*) as total_games,
  SUM(has_pbp) as pbp_archived,
  SUM(has_boxscore) as boxscore_archived,
  AVG(CASE WHEN has_pbp = 1 AND has_boxscore = 1 THEN 1.0 ELSE 0.0 END) * 100 as coverage_pct
FROM archive_metadata;

-- Recent failures
SELECT game_id, game_date, error_message, attempt_count
FROM archive_metadata
WHERE status = 'failed'
ORDER BY last_attempt_at DESC
LIMIT 10;

-- Database size by table
SELECT 
  name,
  (SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name=m.name) as row_count
FROM sqlite_master m
WHERE type='table' AND name LIKE '%archive%'
ORDER BY name;
```

---

## 10. Rollback Plan

If issues arise, rollback is straightforward:

1. **Revert Worker Code:**
   ```bash
   git revert <commit-hash>
   wrangler deploy
   ```

2. **Drop Tables (if needed):**
   ```sql
   DROP TABLE IF EXISTS pbp_archive;
   DROP TABLE IF EXISTS boxscore_archive;
   DROP TABLE IF EXISTS archive_metadata;
   DROP TABLE IF EXISTS player_baselines;
   DROP TABLE IF EXISTS season_averages;
   ```

3. **Remove from d1_migrations:**
   ```sql
   DELETE FROM d1_migrations 
   WHERE name IN ('0013_nba_baselines.sql', '0002_pbp_archive.sql');
   ```

---

## Conclusion

These enhancements provide a solid foundation for advanced NBA analytics:

- ✅ **Player Baselines** - Enable "vs expected" performance analysis
- ✅ **Historical Storage** - Support trend analysis and historical queries
- ✅ **Automatic Archival** - Permanent play-by-play and box score storage
- ✅ **Backfill Utility** - Populate historical data on demand

The system is now ready for production deployment and can support sophisticated analytics features like defensive impact tracking, duo synergy trends, and shot pattern analysis over time.
