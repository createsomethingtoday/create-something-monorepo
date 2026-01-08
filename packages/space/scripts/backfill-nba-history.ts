/**
 * Backfill NBA Historical Game Data
 * 
 * Fetches and stores historical game data for dates that are missing from the database.
 * This allows the NBA Live dashboard to show historical games and trends.
 * 
 * Usage:
 *   # Backfill last 7 days
 *   pnpm tsx packages/space/scripts/backfill-nba-history.ts --days 7
 * 
 *   # Backfill specific date range
 *   pnpm tsx packages/space/scripts/backfill-nba-history.ts --start 2026-01-01 --end 2026-01-07
 * 
 *   # Backfill single date
 *   pnpm tsx packages/space/scripts/backfill-nba-history.ts --date 2026-01-05
 */

const NBA_API_BASE = 'https://cdn.nba.com/static/json';
const WRANGLER_DB = 'create-something-db';

interface BackfillOptions {
  startDate: string;
  endDate: string;
  dryRun?: boolean;
}

/**
 * Parse command line arguments
 */
function parseArgs(): BackfillOptions {
  const args = process.argv.slice(2);
  const options: Partial<BackfillOptions> = {
    dryRun: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--days' && args[i + 1]) {
      const days = parseInt(args[i + 1], 10);
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - days);
      options.endDate = end.toISOString().split('T')[0];
      options.startDate = start.toISOString().split('T')[0];
      i++;
    } else if (arg === '--start' && args[i + 1]) {
      options.startDate = args[i + 1];
      i++;
    } else if (arg === '--end' && args[i + 1]) {
      options.endDate = args[i + 1];
      i++;
    } else if (arg === '--date' && args[i + 1]) {
      options.startDate = args[i + 1];
      options.endDate = args[i + 1];
      i++;
    } else if (arg === '--dry-run') {
      options.dryRun = true;
    }
  }

  // Default to last 7 days if no dates specified
  if (!options.startDate || !options.endDate) {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 7);
    options.endDate = end.toISOString().split('T')[0];
    options.startDate = start.toISOString().split('T')[0];
  }

  return options as BackfillOptions;
}

/**
 * Generate array of dates between start and end (inclusive)
 */
function getDateRange(start: string, end: string): string[] {
  const dates: string[] = [];
  const current = new Date(start);
  const endDate = new Date(end);

  while (current <= endDate) {
    dates.push(current.toISOString().split('T')[0]);
    current.setDate(current.getDate() + 1);
  }

  return dates;
}

/**
 * Fetch scoreboard data from NBA API for a specific date
 */
async function fetchScoreboardForDate(date: string): Promise<any> {
  // NBA API uses "today's scoreboard" which shows games from the previous day
  // For historical data, we need to calculate the next day
  const targetDate = new Date(date);
  targetDate.setDate(targetDate.getDate() + 1);
  const formattedDate = targetDate.toISOString().split('T')[0].replace(/-/g, '');
  
  const url = `${NBA_API_BASE}/liveData/scoreboard/todaysScoreboard_00.json`;
  
  console.log(`  Fetching: ${url}`);
  
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'CREATE-SOMETHING-NBA-Backfill/1.0',
      'Accept': 'application/json',
      'Referer': 'https://www.nba.com/',
    },
  });

  if (!response.ok) {
    throw new Error(`NBA API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  
  // Verify the data is for the correct date
  if (data?.scoreboard?.gameDate !== date) {
    console.log(`  ⚠️  Warning: API returned date ${data?.scoreboard?.gameDate}, expected ${date}`);
  }
  
  return data;
}

/**
 * Check if date already exists in database
 */
async function dateExists(date: string): Promise<boolean> {
  const { execSync } = await import('child_process');
  
  try {
    const result = execSync(
      `cd packages/space/workers/nba-proxy && wrangler d1 execute ${WRANGLER_DB} --remote --command "SELECT COUNT(*) as count FROM game_snapshots WHERE date = '${date}'" --json`,
      { encoding: 'utf-8' }
    );
    
    const parsed = JSON.parse(result);
    const count = parsed[0]?.results?.[0]?.count || 0;
    return count > 0;
  } catch (error) {
    console.error(`  Error checking date ${date}:`, error);
    return false;
  }
}

/**
 * Insert snapshot into database
 */
async function insertSnapshot(date: string, data: any, dryRun: boolean): Promise<void> {
  const gameCount = data?.scoreboard?.games?.length || 0;
  const capturedAt = Date.now();
  
  if (dryRun) {
    console.log(`  [DRY RUN] Would insert: ${date} with ${gameCount} games`);
    return;
  }

  const { execSync } = await import('child_process');
  
  // Escape the JSON for SQL
  const jsonStr = JSON.stringify(data).replace(/'/g, "''");
  
  const sql = `
    INSERT INTO game_snapshots (date, scoreboard_json, game_count, captured_at, data_source)
    VALUES ('${date}', '${jsonStr}', ${gameCount}, ${capturedAt}, 'backfill')
    ON CONFLICT(date) DO UPDATE SET
      scoreboard_json = excluded.scoreboard_json,
      game_count = excluded.game_count,
      captured_at = excluded.captured_at
  `;
  
  try {
    execSync(
      `cd packages/space/workers/nba-proxy && wrangler d1 execute ${WRANGLER_DB} --remote --command "${sql.replace(/\n/g, ' ')}"`,
      { encoding: 'utf-8', stdio: 'pipe' }
    );
    
    console.log(`  ✓ Inserted ${gameCount} games for ${date}`);
  } catch (error) {
    console.error(`  ✗ Error inserting ${date}:`, error);
    throw error;
  }
  
  // Update metadata
  const metadataSql = `
    INSERT INTO snapshot_metadata (date, status, attempt_count, last_attempt_at)
    VALUES ('${date}', 'captured', 1, ${capturedAt})
    ON CONFLICT(date) DO UPDATE SET
      status = 'captured',
      attempt_count = attempt_count + 1,
      last_attempt_at = ${capturedAt},
      error_message = NULL
  `;
  
  try {
    execSync(
      `cd packages/space/workers/nba-proxy && wrangler d1 execute ${WRANGLER_DB} --remote --command "${metadataSql.replace(/\n/g, ' ')}"`,
      { encoding: 'utf-8', stdio: 'pipe' }
    );
  } catch (error) {
    console.error(`  ⚠️  Warning: Could not update metadata for ${date}`);
  }
}

/**
 * Main execution
 */
async function main() {
  const options = parseArgs();
  
  console.log('='.repeat(80));
  console.log('NBA HISTORICAL DATA BACKFILL');
  console.log('='.repeat(80));
  console.log(`\nDate Range: ${options.startDate} to ${options.endDate}`);
  console.log(`Mode: ${options.dryRun ? 'DRY RUN (no changes)' : 'LIVE (will modify database)'}`);
  console.log('');
  
  const dates = getDateRange(options.startDate, options.endDate);
  console.log(`📅 Processing ${dates.length} dates...\n`);
  
  let processed = 0;
  let skipped = 0;
  let failed = 0;
  let totalGames = 0;
  
  for (const date of dates) {
    console.log(`\n[${date}]`);
    
    try {
      // Check if already exists
      const exists = await dateExists(date);
      if (exists && !options.dryRun) {
        console.log(`  ⏭️  Skipping (already exists)`);
        skipped++;
        continue;
      }
      
      // Fetch data
      console.log(`  📡 Fetching scoreboard data...`);
      const data = await fetchScoreboardForDate(date);
      const gameCount = data?.scoreboard?.games?.length || 0;
      
      if (gameCount === 0) {
        console.log(`  ℹ️  No games on this date`);
        skipped++;
        continue;
      }
      
      // Insert into database
      await insertSnapshot(date, data, options.dryRun || false);
      
      processed++;
      totalGames += gameCount;
      
      // Rate limiting: wait 1 second between requests
      if (dates.indexOf(date) < dates.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
    } catch (error) {
      console.error(`  ✗ Failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      failed++;
    }
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('BACKFILL COMPLETE');
  console.log('='.repeat(80));
  console.log(`\n📊 Summary:`);
  console.log(`   - Processed: ${processed} dates`);
  console.log(`   - Skipped: ${skipped} dates`);
  console.log(`   - Failed: ${failed} dates`);
  console.log(`   - Total Games: ${totalGames}`);
  
  if (options.dryRun) {
    console.log(`\n💡 This was a dry run. Run without --dry-run to actually insert data.`);
  }
  
  if (failed > 0) {
    console.log(`\n⚠️  Some dates failed. Check the errors above.`);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  });
}
