/**
 * Scheduler for the webflow-dashboard Pages project, which has no cron triggers.
 *
 * - Tuesdays: POST /api/cron/insights publishes the weekly Marketplace Insights
 *   snapshot (read the Fivetran sellers window, build, publish, verify).
 * - Daily: GET /api/cron/snapshot captures the asset and leaderboard trend rows
 *   behind the dashboard sparklines.
 *
 * The dashboard does the work. This Worker holds only its own credential (the
 * dashboard's SCHEDULER_CRON_SECRET); the Airtable key stays with the dashboard.
 * A failed call throws, so the run shows as an error in Workers observability.
 */

export interface Env {
  DASHBOARD_URL: string;
  CRON_SECRET: string;
}

export const DAILY_SNAPSHOT_CRON = '30 18 * * *';

async function call(env: Env, method: string, path: string, fetchImpl: typeof fetch): Promise<any> {
  if (!env.CRON_SECRET) throw new Error('CRON_SECRET is not configured');
  const response = await fetchImpl(new URL(path, env.DASHBOARD_URL), {
    method,
    headers: { authorization: `Bearer ${env.CRON_SECRET}` },
    // Insights publication pages through ~11k Airtable rows at 5 req/s (about a minute).
    signal: AbortSignal.timeout(10 * 60_000)
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`${path} failed (${response.status}): ${text.slice(0, 500)}`);
  return JSON.parse(text);
}

export async function publishInsights(env: Env, fetchImpl: typeof fetch = fetch): Promise<unknown> {
  return call(env, 'POST', '/api/cron/insights', fetchImpl);
}

/** The endpoint returns 200 even when the marketplace capture fails, so check the nested status. */
export async function captureSnapshot(env: Env, fetchImpl: typeof fetch = fetch): Promise<unknown> {
  const body = await call(env, 'GET', '/api/cron/snapshot', fetchImpl);
  if (body?.marketplace?.success !== true)
    throw new Error(`Marketplace trend capture failed: ${body?.marketplace?.error ?? 'unknown error'}`);
  if (!(body.marketplace.leaderboard?.captured > 0))
    throw new Error('Leaderboard capture wrote 0 rows; trends will not accumulate');
  // Counts only: the response also lists every asset name.
  return { captured: body.captured ?? 0, date: body.date, marketplace: body.marketplace };
}

export default {
  async scheduled(controller: ScheduledController, env: Env): Promise<void> {
    const daily = controller.cron === DAILY_SNAPSHOT_CRON;
    const result = daily ? await captureSnapshot(env) : await publishInsights(env);
    console.log(JSON.stringify({ event: daily ? 'snapshot_captured' : 'insights_published', cron: controller.cron, result }));
  }
} satisfies ExportedHandler<Env>;
