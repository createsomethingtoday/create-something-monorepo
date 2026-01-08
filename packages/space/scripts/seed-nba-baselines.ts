/**
 * Seed NBA Player Baselines
 * 
 * Populates player_baselines and season_averages tables with current season data.
 * Data sources:
 * 1. NBA.com Stats API for basic stats
 * 2. DARKO projections (when available) for advanced metrics
 * 3. Fallback to calculated metrics from box scores
 * 
 * Usage:
 *   pnpm tsx packages/space/scripts/seed-nba-baselines.ts
 */

import { createClient } from '@libsql/client';

// D1 connection via libsql for local development
const db = createClient({
  url: 'file:.wrangler/state/v3/d1/miniflare-D1DatabaseObject/a74e70ae-6a94-43da-905e-b90719c8dfd2.sqlite',
});

interface PlayerStats {
  player_id: string;
  player_name: string;
  season: string;
  games_played: number;
  minutes_per_game: number;
  points_per_game: number;
  assists_per_game: number;
  rebounds_per_game: number;
  steals_per_game: number;
  blocks_per_game: number;
  turnovers_per_game: number;
  fg_pct: number;
  three_pt_pct: number;
  ft_pct: number;
}

interface PlayerBaseline {
  player_id: string;
  player_name: string;
  season: string;
  offensive_rating: number;
  defensive_rating: number;
  net_rating: number;
  usage_rate: number;
  true_shooting_pct: number;
  assist_pct: number;
  rebound_pct: number;
  expected_ppp: number;
  expected_def_ppp: number;
}

/**
 * Fetch top players from the current season
 * For now, we'll use a curated list of top players
 * In production, this would fetch from NBA Stats API
 */
async function getTopPlayers(): Promise<PlayerStats[]> {
  // Sample data for testing - in production, fetch from NBA API
  // https://stats.nba.com/stats/leaguedashplayerstats
  
  const currentSeason = '2024-25';
  
  // Top players from each team (sample data)
  const samplePlayers: PlayerStats[] = [
    {
      player_id: '1629636',
      player_name: 'Darius Garland',
      season: currentSeason,
      games_played: 38,
      minutes_per_game: 35.2,
      points_per_game: 21.3,
      assists_per_game: 6.8,
      rebounds_per_game: 2.9,
      steals_per_game: 1.2,
      blocks_per_game: 0.1,
      turnovers_per_game: 2.8,
      fg_pct: 0.472,
      three_pt_pct: 0.398,
      ft_pct: 0.893,
    },
    {
      player_id: '1627783',
      player_name: 'Pascal Siakam',
      season: currentSeason,
      games_played: 37,
      minutes_per_game: 33.8,
      points_per_game: 19.7,
      assists_per_game: 3.6,
      rebounds_per_game: 7.2,
      steals_per_game: 0.9,
      blocks_per_game: 0.4,
      turnovers_per_game: 2.1,
      fg_pct: 0.478,
      three_pt_pct: 0.342,
      ft_pct: 0.789,
    },
    {
      player_id: '2544',
      player_name: 'LeBron James',
      season: currentSeason,
      games_played: 34,
      minutes_per_game: 35.1,
      points_per_game: 23.6,
      assists_per_game: 8.9,
      rebounds_per_game: 7.8,
      steals_per_game: 1.1,
      blocks_per_game: 0.6,
      turnovers_per_game: 3.4,
      fg_pct: 0.512,
      three_pt_pct: 0.378,
      ft_pct: 0.756,
    },
    {
      player_id: '1630162',
      player_name: 'Anthony Edwards',
      season: currentSeason,
      games_played: 37,
      minutes_per_game: 35.8,
      points_per_game: 25.9,
      assists_per_game: 4.3,
      rebounds_per_game: 5.6,
      steals_per_game: 1.3,
      blocks_per_game: 0.5,
      turnovers_per_game: 3.2,
      fg_pct: 0.448,
      three_pt_pct: 0.412,
      ft_pct: 0.851,
    },
    {
      player_id: '1641705',
      player_name: 'Victor Wembanyama',
      season: currentSeason,
      games_played: 36,
      minutes_per_game: 32.7,
      points_per_game: 24.3,
      assists_per_game: 3.9,
      rebounds_per_game: 10.8,
      steals_per_game: 1.2,
      blocks_per_game: 3.7,
      turnovers_per_game: 3.6,
      fg_pct: 0.478,
      three_pt_pct: 0.347,
      ft_pct: 0.878,
    },
  ];
  
  return samplePlayers;
}

/**
 * Calculate advanced metrics from basic stats
 * These are simplified calculations - in production, use actual DARKO data
 */
function calculateBaseline(stats: PlayerStats): PlayerBaseline {
  // Simplified offensive rating calculation
  // Real formula: (Points Produced / Possessions) * 100
  const offensiveRating = (stats.points_per_game / stats.minutes_per_game) * 100;
  
  // Simplified defensive rating (inverse of opponent scoring when on court)
  // Real formula requires opponent data
  const defensiveRating = 110 - (stats.steals_per_game + stats.blocks_per_game) * 2;
  
  const netRating = offensiveRating - defensiveRating;
  
  // Usage rate: percentage of team possessions used by player
  // Simplified: based on FGA + FTA + TOV
  const usageRate = 0.25; // Placeholder - real calculation needs team data
  
  // True shooting percentage: Points / (2 * (FGA + 0.44 * FTA))
  // Simplified version using FG%
  const trueShootingPct = stats.fg_pct * 1.05; // Rough approximation
  
  // Assist percentage: percentage of teammate FGs assisted
  const assistPct = (stats.assists_per_game / stats.minutes_per_game) * 100;
  
  // Rebound percentage
  const reboundPct = (stats.rebounds_per_game / stats.minutes_per_game) * 100;
  
  // Expected points per possession
  const expectedPPP = stats.points_per_game / (stats.minutes_per_game * 0.5);
  
  // Expected defensive points per possession
  const expectedDefPPP = 1.05 - (stats.steals_per_game + stats.blocks_per_game) * 0.05;
  
  return {
    player_id: stats.player_id,
    player_name: stats.player_name,
    season: stats.season,
    offensive_rating: Math.round(offensiveRating * 10) / 10,
    defensive_rating: Math.round(defensiveRating * 10) / 10,
    net_rating: Math.round(netRating * 10) / 10,
    usage_rate: Math.round(usageRate * 1000) / 1000,
    true_shooting_pct: Math.round(trueShootingPct * 1000) / 1000,
    assist_pct: Math.round(assistPct * 10) / 10,
    rebound_pct: Math.round(reboundPct * 10) / 10,
    expected_ppp: Math.round(expectedPPP * 100) / 100,
    expected_def_ppp: Math.round(expectedDefPPP * 100) / 100,
  };
}

/**
 * Insert season averages into database
 */
async function insertSeasonAverages(stats: PlayerStats[]) {
  console.log(`\nInserting ${stats.length} player season averages...`);
  
  for (const player of stats) {
    await db.execute({
      sql: `
        INSERT INTO season_averages (
          player_id, season, games_played, minutes_per_game,
          points_per_game, assists_per_game, rebounds_per_game,
          steals_per_game, blocks_per_game, turnovers_per_game,
          fg_pct, three_pt_pct, ft_pct
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(player_id, season) DO UPDATE SET
          games_played = excluded.games_played,
          minutes_per_game = excluded.minutes_per_game,
          points_per_game = excluded.points_per_game,
          assists_per_game = excluded.assists_per_game,
          rebounds_per_game = excluded.rebounds_per_game,
          steals_per_game = excluded.steals_per_game,
          blocks_per_game = excluded.blocks_per_game,
          turnovers_per_game = excluded.turnovers_per_game,
          fg_pct = excluded.fg_pct,
          three_pt_pct = excluded.three_pt_pct,
          ft_pct = excluded.ft_pct,
          updated_at = unixepoch()
      `,
      args: [
        player.player_id,
        player.season,
        player.games_played,
        player.minutes_per_game,
        player.points_per_game,
        player.assists_per_game,
        player.rebounds_per_game,
        player.steals_per_game,
        player.blocks_per_game,
        player.turnovers_per_game,
        player.fg_pct,
        player.three_pt_pct,
        player.ft_pct,
      ],
    });
    
    console.log(`  ✓ ${player.player_name}`);
  }
}

/**
 * Insert player baselines into database
 */
async function insertPlayerBaselines(baselines: PlayerBaseline[]) {
  console.log(`\nInserting ${baselines.length} player baselines...`);
  
  for (const baseline of baselines) {
    await db.execute({
      sql: `
        INSERT INTO player_baselines (
          player_id, player_name, season,
          offensive_rating, defensive_rating, net_rating,
          usage_rate, true_shooting_pct, assist_pct, rebound_pct,
          expected_ppp, expected_def_ppp
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(player_id) DO UPDATE SET
          player_name = excluded.player_name,
          season = excluded.season,
          offensive_rating = excluded.offensive_rating,
          defensive_rating = excluded.defensive_rating,
          net_rating = excluded.net_rating,
          usage_rate = excluded.usage_rate,
          true_shooting_pct = excluded.true_shooting_pct,
          assist_pct = excluded.assist_pct,
          rebound_pct = excluded.rebound_pct,
          expected_ppp = excluded.expected_ppp,
          expected_def_ppp = excluded.expected_def_ppp,
          updated_at = unixepoch()
      `,
      args: [
        baseline.player_id,
        baseline.player_name,
        baseline.season,
        baseline.offensive_rating,
        baseline.defensive_rating,
        baseline.net_rating,
        baseline.usage_rate,
        baseline.true_shooting_pct,
        baseline.assist_pct,
        baseline.rebound_pct,
        baseline.expected_ppp,
        baseline.expected_def_ppp,
      ],
    });
    
    console.log(`  ✓ ${baseline.player_name} (ORtg: ${baseline.offensive_rating}, DRtg: ${baseline.defensive_rating})`);
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('='.repeat(80));
  console.log('NBA PLAYER BASELINES SEEDING');
  console.log('='.repeat(80));
  
  try {
    // Fetch player stats
    console.log('\n📊 Fetching player statistics...');
    const playerStats = await getTopPlayers();
    console.log(`   Found ${playerStats.length} players`);
    
    // Calculate baselines
    console.log('\n🧮 Calculating advanced metrics...');
    const baselines = playerStats.map(calculateBaseline);
    console.log(`   Calculated baselines for ${baselines.length} players`);
    
    // Insert into database
    await insertSeasonAverages(playerStats);
    await insertPlayerBaselines(baselines);
    
    console.log('\n' + '='.repeat(80));
    console.log('✅ SEEDING COMPLETE');
    console.log('='.repeat(80));
    console.log(`\n📈 Summary:`);
    console.log(`   - ${playerStats.length} players added to season_averages`);
    console.log(`   - ${baselines.length} players added to player_baselines`);
    console.log(`\n💡 Next steps:`);
    console.log(`   1. Integrate with live game data for "vs expected" calculations`);
    console.log(`   2. Fetch real DARKO projections when available`);
    console.log(`   3. Add more players (currently showing top 5 sample)`);
    
  } catch (error) {
    console.error('\n❌ Error seeding baselines:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
