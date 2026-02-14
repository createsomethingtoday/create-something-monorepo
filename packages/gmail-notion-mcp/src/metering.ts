/**
 * Run metering: 1 run = 1 tool call. Free tier 100 runs, then 1¢/run.
 * Period = calendar month (YYYY-MM).
 */

const FREE_TIER_RUNS = 100;

function getCurrentPeriod(): string {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

export interface RunCountRow {
  account_id: string;
  period_start: string;
  runs_this_period: number;
  updated_at: string;
}

export interface MeteringResult {
  accountId: string;
  period: string;
  runsThisPeriod: number;
  freeRuns: number;
  billableRuns: number;
  limit: number;
}

export async function incrementRun(
  db: D1Database,
  accountId: string,
): Promise<MeteringResult> {
  const period = getCurrentPeriod();
  await db
    .prepare(
      `INSERT INTO run_counts (account_id, period_start, runs_this_period, updated_at)
       VALUES (?, ?, 1, datetime('now'))
       ON CONFLICT(account_id, period_start) DO UPDATE SET
         runs_this_period = run_counts.runs_this_period + 1,
         updated_at = datetime('now')`,
    )
    .bind(accountId, period)
    .run();

  return getUsage(db, accountId);
}

export async function getUsage(db: D1Database, accountId: string): Promise<MeteringResult> {
  const period = getCurrentPeriod();
  const row = await db
    .prepare(
      `SELECT account_id, period_start, runs_this_period, updated_at
       FROM run_counts WHERE account_id = ? AND period_start = ?`,
    )
    .bind(accountId, period)
    .first<RunCountRow>();

  const runsThisPeriod = row?.runs_this_period ?? 0;
  const billableRuns = Math.max(0, runsThisPeriod - FREE_TIER_RUNS);

  return {
    accountId,
    period,
    runsThisPeriod,
    freeRuns: Math.min(runsThisPeriod, FREE_TIER_RUNS),
    billableRuns,
    limit: FREE_TIER_RUNS,
  };
}
