/** Durable spend tracking. The historical filename is retained for internal clients;
 * this module does not impose dollar, credit or daily limits. */
export type EnrichmentProvider = 'pdl' | 'clay' | 'exa' | 'apify';
const PROVIDERS: EnrichmentProvider[] = ['pdl', 'clay', 'exa', 'apify'];
export function requireEnrichmentProvider(value: unknown): EnrichmentProvider {
  if (!PROVIDERS.includes(value as EnrichmentProvider))
    throw new TypeError('Unknown enrichment provider');
  return value as EnrichmentProvider;
}
export class EnrichmentBudgetError extends Error {}
export type BudgetGrant = { id: string; provider: EnrichmentProvider; token: string; npi: string };
export type SpendReceipt = {
  event_id: string;
  status: 'pending' | 'complete' | 'failed' | 'uncertain';
  actual_usd?: number | null;
  estimated_usd?: number | null;
  credits?: number | null;
  credit_unit?: string | null;
  receipt_ref?: string | null;
};
const MICRO = 1_000_000;
const hash = async (value: string) =>
  Array.from(
    new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))),
    (b) => b.toString(16).padStart(2, '0')
  ).join('');
function validateGrant(grant: BudgetGrant) {
  if (
    !grant ||
    Object.keys(grant).sort().join(',') !== 'id,npi,provider,token' ||
    !/^[a-f0-9]{64}$/.test(grant.id) ||
    typeof grant.npi !== 'string' ||
    (!(grant.npi === '' && grant.provider === 'pdl') && !/^\d{10}$/.test(grant.npi)) ||
    typeof grant.token !== 'string' ||
    grant.token.length < 1 ||
    grant.token.length > 100
  )
    throw new TypeError('Invalid tracking grant');
  requireEnrichmentProvider(grant.provider);
}
function micros(value: unknown) {
  if (value === undefined || value === null) return null;
  if (
    typeof value !== 'number' ||
    !Number.isFinite(value) ||
    value < 0 ||
    !Number.isSafeInteger(Math.round(value * MICRO))
  )
    throw new TypeError('Invalid USD amount');
  return Math.round(value * MICRO);
}
function safeLabel(value: unknown, maximum: number) {
  if (value === undefined || value === null) return null;
  if (
    typeof value !== 'string' ||
    !value.trim() ||
    value.length > maximum ||
    /[\r\n\u0000-\u001f]/.test(value)
  )
    throw new TypeError('Invalid receipt reference');
  // References are opaque IDs, never URLs with credentials, tokens, or contact data.
  if (!/^[a-zA-Z0-9_.:\/-]+$/.test(value)) throw new TypeError('Invalid receipt reference');
  return value;
}
export async function enrichmentReadiness(db: D1Database, provider: EnrichmentProvider) {
  requireEnrichmentProvider(provider);
  const by_provider = [];
  for (const p of PROVIDERS) {
    const row = await db
      .prepare(
        `SELECT COUNT(*) AS request_count,
 COALESCE(SUM((SELECT actual_micros FROM npg_enrichment_receipts r WHERE r.request_id=g.reservation_id AND r.provider=g.provider AND actual_micros IS NOT NULL ORDER BY id DESC LIMIT 1)),0) AS actual,
 SUM(CASE WHEN NOT EXISTS(SELECT 1 FROM npg_enrichment_receipts r WHERE r.request_id=g.reservation_id AND r.provider=g.provider AND actual_micros IS NOT NULL) THEN (SELECT estimated_micros FROM npg_enrichment_receipts r WHERE r.request_id=g.reservation_id AND r.provider=g.provider AND estimated_micros IS NOT NULL ORDER BY id DESC LIMIT 1) END) AS estimated,
 SUM(CASE WHEN NOT EXISTS(SELECT 1 FROM npg_enrichment_receipts r WHERE r.request_id=g.reservation_id AND r.provider=g.provider AND actual_micros IS NOT NULL) THEN 1 ELSE 0 END) AS pending_count
 FROM npg_enrichment_grants g WHERE provider=?`
      )
      .bind(p)
      .first<{
        request_count: number;
        actual: number;
        estimated: number | null;
        pending_count: number | null;
      }>();
    const creditRow = await db
      .prepare(
        `SELECT json_group_array(json_object('unit',credit_unit,'amount',amount)) AS entries FROM (
 SELECT credit_unit,SUM(credits) AS amount FROM npg_enrichment_receipts r
 WHERE provider=? AND credits IS NOT NULL AND id=(SELECT MAX(id) FROM npg_enrichment_receipts latest WHERE latest.request_id=r.request_id AND latest.provider=r.provider AND latest.credits IS NOT NULL)
 GROUP BY credit_unit ORDER BY credit_unit)`
      )
      .bind(p)
      .first<{ entries: string }>();
    const credits = JSON.parse(creditRow?.entries ?? '[]') as Array<{
      unit: string;
      amount: number;
    }>;
    by_provider.push({
      provider: p,
      credits,
      confirmed_usd: (row?.actual ?? 0) / MICRO,
      estimated_usd:
        row?.estimated === null || row?.estimated === undefined ? null : row.estimated / MICRO,
      pending_count: row?.pending_count ?? 0,
      request_count: row?.request_count ?? 0
    });
  }
  const estimates = by_provider.filter((p) => p.estimated_usd !== null);
  return {
    provider,
    ready: true,
    reason: 'Spend is tracked without an application spend limit.',
    blocking_reasons: [],
    cost: { estimated_usd: null },
    spend: {
      currency: 'USD',
      confirmed_usd: by_provider.reduce((s, p) => s + p.confirmed_usd, 0),
      estimated_usd: estimates.length ? estimates.reduce((s, p) => s + p.estimated_usd!, 0) : null,
      pending_count: by_provider.reduce((s, p) => s + p.pending_count, 0),
      history_complete: false,
      historical_usd: null,
      by_provider
    }
  };
}
/** Unique request identity prevents replay; unrelated pending receipts never block. */
export async function reserveEnrichment(
  db: D1Database,
  provider: EnrichmentProvider | 'complete',
  digest: string,
  npi = ''
) {
  if (provider !== 'complete') requireEnrichmentProvider(provider);
  if (
    typeof npi !== 'string' ||
    !/^[a-f0-9]{64}$/.test(digest) ||
    (!(provider === 'pdl' && npi === '') && !/^\d{10}$/.test(npi))
  )
    throw new TypeError('Invalid tracking identity');
  const r = await db
    .prepare(
      'INSERT OR IGNORE INTO npg_enrichment_requests(digest,provider,subject_npi,created_at) VALUES(?,?,?,?)'
    )
    .bind(digest, provider, npi, new Date().toISOString())
    .run();
  if (r.meta.changes !== 1)
    throw new EnrichmentBudgetError(
      'This enrichment request is already tracked. Read its existing provider receipts; do not repeat dispatch.'
    );
  const grants: Partial<Record<EnrichmentProvider, BudgetGrant>> = {};
  for (const p of provider === 'complete' ? PROVIDERS : [provider]) {
    const token = crypto.randomUUID() + crypto.randomUUID();
    await db
      .prepare(
        'INSERT INTO npg_enrichment_grants(reservation_id,provider,token_hash) VALUES(?,?,?)'
      )
      .bind(digest, p, await hash(token))
      .run();
    grants[p] = { id: digest, provider: p, token, npi };
  }
  return { id: digest, provider, status: 'pending' as const, grants };
}
export async function claimEnrichment(db: D1Database, grant: BudgetGrant) {
  validateGrant(grant);
  const r = await db
    .prepare(
      `UPDATE npg_enrichment_grants SET consumed=1 WHERE reservation_id=? AND provider=? AND token_hash=? AND consumed=0 AND EXISTS(SELECT 1 FROM npg_enrichment_requests r WHERE r.digest=reservation_id AND r.subject_npi=?)`
    )
    .bind(grant.id, grant.provider, await hash(grant.token), grant.npi)
    .run();
  if (r.meta.changes !== 1)
    throw new EnrichmentBudgetError(
      'Tracking grant missing, mismatched or already consumed. Read the existing receipt; do not repeat dispatch.'
    );
  return { claimed: true };
}
/** Receipt writes are authenticated to the exact claimed provider operation and append-only. */
export async function recordEnrichment(db: D1Database, grant: BudgetGrant, receipt: SpendReceipt) {
  validateGrant(grant);
  if (!receipt || !['pending', 'complete', 'failed', 'uncertain'].includes(receipt.status))
    throw new TypeError('Invalid receipt status');
  const event = safeLabel(receipt.event_id, 160);
  if (!event) throw new TypeError('Missing receipt event');
  const actual = micros(receipt.actual_usd),
    estimated = micros(receipt.estimated_usd);
  if (
    receipt.credits !== undefined &&
    receipt.credits !== null &&
    (typeof receipt.credits !== 'number' ||
      !Number.isFinite(receipt.credits) ||
      receipt.credits < 0)
  )
    throw new TypeError('Invalid credit amount');
  const unit = safeLabel(receipt.credit_unit, 40),
    ref = safeLabel(receipt.receipt_ref, 200);
  if (receipt.credits !== undefined && receipt.credits !== null && !unit)
    throw new TypeError('Credit amount requires its provider unit');
  const valid = await db
    .prepare(
      `SELECT g.consumed FROM npg_enrichment_grants g JOIN npg_enrichment_requests r ON r.digest=g.reservation_id WHERE g.reservation_id=? AND g.provider=? AND g.token_hash=? AND r.subject_npi=?`
    )
    .bind(grant.id, grant.provider, await hash(grant.token), grant.npi)
    .first<{ consumed: number }>();
  if (valid?.consumed !== 1)
    throw new EnrichmentBudgetError('Receipt does not match a claimed provider operation.');
  const fields = [
    grant.id,
    grant.provider,
    event,
    receipt.status,
    actual,
    estimated,
    receipt.credits ?? null,
    unit,
    ref
  ];
  const existing = await db
    .prepare(
      'SELECT status,actual_micros,estimated_micros,credits,credit_unit,receipt_ref FROM npg_enrichment_receipts WHERE request_id=? AND provider=? AND event_id=?'
    )
    .bind(grant.id, grant.provider, event)
    .first<Record<string, unknown>>();
  if (existing) {
    if (
      JSON.stringify(
        [
          'status',
          'actual_micros',
          'estimated_micros',
          'credits',
          'credit_unit',
          'receipt_ref'
        ].map((k) => existing[k])
      ) !== JSON.stringify(fields.slice(3))
    )
      throw new EnrichmentBudgetError(
        'Receipt event already exists with different evidence. Append a new correction event.'
      );
    return { recorded: true, repeated: true };
  }
  const result = await db
    .prepare(
      'INSERT OR IGNORE INTO npg_enrichment_receipts(request_id,provider,event_id,status,actual_micros,estimated_micros,credits,credit_unit,receipt_ref,recorded_at) VALUES(?,?,?,?,?,?,?,?,?,?)'
    )
    .bind(...fields, new Date().toISOString())
    .run();
  if (result.meta.changes !== 1) return recordEnrichment(db, grant, receipt);
  return { recorded: true, repeated: false };
}

/** Internal callback path: caller has already authenticated the Clay job callback. */
export async function recordClayCompletion(db: D1Database, jobId: string) {
  if (!/^npgclay_[a-f0-9-]{36}$/.test(jobId)) throw new TypeError('Invalid Clay receipt');
  await db
    .prepare(
      `INSERT OR IGNORE INTO npg_enrichment_receipts(request_id,provider,event_id,status,receipt_ref,recorded_at)
 SELECT request_id,'clay',?,'complete',?,? FROM npg_enrichment_receipts WHERE provider='clay' AND receipt_ref=? ORDER BY id LIMIT 1`
    )
    .bind('clay:callback:' + jobId, jobId, new Date().toISOString(), jobId)
    .run();
}
