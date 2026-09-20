import { PLAN } from './billing';
type Env = App.Platform['env'];
export interface Usage {
  period: string;
  delivered_minutes: number;
  checked_at: number;
}
export function usagePeriod(now = new Date()) {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  return {
    period: start.toISOString().slice(0, 7),
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10)
  };
}
export async function deliveryUsage(env: Env, networkId: string): Promise<Usage> {
  const { period, start, end } = usagePeriod();
  const now = Math.floor(Date.now() / 1000);
  const cached = await env.DB.prepare(
    'SELECT period,delivered_minutes,checked_at FROM network_usage WHERE network_id=? AND period=?'
  )
    .bind(networkId, period)
    .first<Usage>();
  if (cached && cached.checked_at > now - 300) return cached;
  const token = env.CLOUDFLARE_ANALYTICS_API_TOKEN || env.CLOUDFLARE_STREAM_API_TOKEN;
  if (typeof token !== 'string') throw new Error('Delivery usage is unavailable.');
  await env.DB.prepare(
    'INSERT INTO network_usage(network_id,period) VALUES(?,?) ON CONFLICT(network_id,period) DO NOTHING'
  )
    .bind(networkId, period)
    .run();
  const lease = crypto.randomUUID();
  const claimed = await env.DB.prepare(
    'UPDATE network_usage SET lease_id=?,lease_until=? WHERE network_id=? AND period=? AND lease_until<? RETURNING network_id'
  )
    .bind(lease, now + 30, networkId, period, now)
    .first();
  if (!claimed) throw new Error('Usage is updating. Please try again in a moment.');
  try {
    const response = await fetch('https://api.cloudflare.com/client/v4/graphql', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(10000),
      body: JSON.stringify({
        query: `query PrivateNetworkDelivery($accountTag: string!, $start: Date, $end: Date, $creator: string) {
    viewer { accounts(filter: {accountTag: $accountTag}) {
     streamMinutesViewedAdaptiveGroups(filter: {date_geq: $start, date_lt: $end, creator: $creator}, limit: 1) {sum {minutesViewed}}
    }}
   }`,
        variables: { accountTag: env.CLOUDFLARE_ACCOUNT_ID, start, end, creator: networkId }
      })
    });
    const result = (await response.json()) as {
      errors?: unknown[];
      data?: {
        viewer?: {
          accounts?: Array<{
            streamMinutesViewedAdaptiveGroups?: Array<{ sum?: { minutesViewed?: number } }>;
          }>;
        };
      };
    };
    const accounts = result.data?.viewer?.accounts;
    const groups = accounts?.[0]?.streamMinutesViewedAdaptiveGroups;
    if (
      !response.ok ||
      result.errors?.length ||
      accounts?.length !== 1 ||
      !Array.isArray(groups) ||
      groups.length > 1
    )
      throw new Error('Delivery usage could not be verified.');
    const minutes = groups.length === 0 ? 0 : groups[0].sum?.minutesViewed;
    if (typeof minutes !== 'number' || !Number.isFinite(minutes) || minutes < 0)
      throw new Error('Invalid delivery usage.');
    const saved = await env.DB.prepare(
      'UPDATE network_usage SET delivered_minutes=MAX(delivered_minutes,?),checked_at=? WHERE network_id=? AND period=? AND lease_id=? RETURNING period,delivered_minutes,checked_at'
    )
      .bind(minutes, now, networkId, period, lease)
      .first<Usage>();
    if (!saved) throw new Error('Usage changed during refresh. Please try again.');
    return saved;
  } finally {
    await env.DB.prepare(
      'UPDATE network_usage SET lease_id=NULL,lease_until=0 WHERE network_id=? AND period=? AND lease_id=?'
    )
      .bind(networkId, period, lease)
      .run();
  }
}
export async function withinDeliveryAllowance(env: Env, networkId: string) {
  if (networkId === 'default') return true;
  return (await deliveryUsage(env, networkId)).delivered_minutes < PLAN.deliveryMinutes;
}
