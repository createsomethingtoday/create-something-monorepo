/**
 * Weekly bell for Marketplace Insights.
 *
 * The webflow-dashboard Pages project does the work in POST /api/cron/insights
 * (read the Fivetran sellers window, build, publish, verify). Pages projects
 * have no cron triggers, so this Worker calls it on Tuesdays. It holds only that
 * endpoint's secret (the dashboard's INSIGHTS_CRON_SECRET); the Airtable key
 * stays with the dashboard.
 *
 * A non-2xx response throws, so a failed run shows as an error in Workers
 * observability. The second cron slot is the retry.
 */

export interface Env {
  DASHBOARD_URL: string;
  CRON_SECRET: string;
}

export async function publishInsights(env: Env, fetchImpl: typeof fetch = fetch): Promise<unknown> {
  if (!env.CRON_SECRET) throw new Error('CRON_SECRET is not configured');
  const response = await fetchImpl(new URL('/api/cron/insights', env.DASHBOARD_URL), {
    method: 'POST',
    headers: { authorization: `Bearer ${env.CRON_SECRET}` },
    // Publication pages through ~11k Airtable rows at 5 req/s (about a minute).
    signal: AbortSignal.timeout(10 * 60_000)
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`Insights publication failed (${response.status}): ${text.slice(0, 500)}`);
  return JSON.parse(text) as unknown;
}

export default {
  async scheduled(controller: ScheduledController, env: Env): Promise<void> {
    const result = await publishInsights(env);
    console.log(JSON.stringify({ event: 'insights_published', cron: controller.cron, result }));
  }
} satisfies ExportedHandler<Env>;
