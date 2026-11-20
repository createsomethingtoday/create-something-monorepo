import { drainMetaLead, maintainMetaRetention, type MetaMarketingEnv } from '../../../packages/agency/src/lib/server/meta-marketing.ts';

export type MaintenanceEnv = MaintenanceBindings & MetaMarketingEnv;

/** One scheduled run owns a bounded number of existing delivery attempts. */
export async function runMetaMaintenance(env: MetaMarketingEnv & { DB: D1Database }, send: typeof fetch = fetch, now = Date.now()) {
  const retention = await maintainMetaRetention(env.DB, now);
  const summary = { ...retention, attempted: 0, accepted: 0, failed: 0 };
  if (env.META_MARKETING_ENABLED !== 'true') return summary;
  const timestamp = Math.floor(now / 1000);
  const due = await env.DB.withSession('first-primary').prepare(`SELECT d.consent_id
    FROM meta_lead_deliveries d JOIN meta_marketing_consents c ON c.consent_id = d.consent_id
    WHERE d.state IN ('pending', 'transient_failure') AND d.attempts < 3 AND d.next_attempt_at <= ?
      AND d.created_at > ? AND d.payload_json IS NOT NULL AND d.dataset_id = ?
      AND c.revoked_at IS NULL AND c.expires_at > ? AND c.account_subject IS NULL
    GROUP BY d.consent_id ORDER BY MIN(d.created_at), d.consent_id LIMIT 10`)
    .bind(timestamp, timestamp - 86400, env.META_DATASET_ID ?? '', timestamp).all<{ consent_id: string }>();
  if (!due.success) throw new Error('Meta maintenance queue read not acknowledged');
  for (const row of due.results) {
    // Cookies are reconstructed only from stored active receipts, never caller input.
    if (!/^[a-f0-9-]{36}$/i.test(row.consent_id)) continue;
    const request = new Request('https://createsomething.agency/api/marketing/maintenance', {
      headers: { Cookie: `cs_meta_consent=${row.consent_id}` }
    });
    try {
      const outcome = await drainMetaLead(request, env, false, send, now);
      if (!outcome) continue;
      summary.attempted++;
      if (outcome.state === 'accepted') summary.accepted++;
      else summary.failed++;
    } catch { summary.failed++; }
  }
  return summary;
}

export default {
  fetch() { return new Response('Not found', { status: 404, headers: { 'Cache-Control': 'no-store' } }); },
  async scheduled(_controller, env) {
    const summary = await runMetaMaintenance(env);
    // Counts only. No identifiers, payloads, endpoints, or secrets enter logs.
    console.log(JSON.stringify({ event: 'agency_meta_maintenance', ...summary }));
  }
} satisfies ExportedHandler<MaintenanceEnv>;
