import { clayRequestSchema, clayResultSchema } from './abundance-clay-contract';
import { latestSuccessfulNationwideRun } from './abundance-healthcare-nationwide';
export class ClayQuotaError extends Error {}
export class ClayCallbackError extends Error {}
interface Job {
  id: string;
  npi: string;
  status: string;
  source_run_id: string;
  source_payload_hash: string;
  result_json: string | null;
  created_at: string;
  completed_at: string | null;
  callback_hash: string;
}
const digest = async (value: string) =>
  Array.from(
    new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))),
    (b) => b.toString(16).padStart(2, '0')
  ).join('');
function publicJob(job: Job) {
  return {
    id: job.id,
    npi: job.npi,
    status: job.status,
    source_run_id: job.source_run_id,
    created_at: job.created_at,
    completed_at: job.completed_at,
    result: job.result_json ? JSON.parse(job.result_json) : null,
    contact_status: 'public_professional_candidate_unverified',
    outreach_authority: 'not_established',
    review_required: job.status === 'review_required'
  };
}
export async function readClayJob(db: D1Database, id: string) {
  if (!/^npgclay_[a-f0-9-]{36}$/.test(id)) throw new TypeError('Invalid job');
  const job = await db
    .prepare('SELECT * FROM abundance_clay_jobs WHERE id=?')
    .bind(id)
    .first<Job>();
  if (!job) throw new TypeError('Unknown job');
  return publicJob(job);
}
export async function requestClayJob(
  db: D1Database,
  input: unknown,
  config: { webhookUrl: string; webhookToken: string },
  fetchFn: typeof fetch = fetch
) {
  const parsed = clayRequestSchema.parse(input);
  const run = await latestSuccessfulNationwideRun(db, 'all_np_taxonomies');
  if (!run) throw new TypeError('Broad registry snapshot required');
  const row = await db
    .prepare(
      'SELECT provider_snapshot_json FROM abundance_healthcare_nationwide_memberships WHERE run_id=? AND provider_npi=?'
    )
    .bind(run.id, parsed.npi)
    .first<{ provider_snapshot_json: string }>();
  if (!row) throw new TypeError('NPI not in snapshot');
  const provider = JSON.parse(row.provider_snapshot_json);
  if (typeof provider.name !== 'string' || typeof provider.source_payload_hash !== 'string')
    throw new TypeError('Invalid registry record');
  const now = new Date().toISOString();
  // Cache by immutable provider version and calendar week. Unknown delivery is
  // retained: retries return the original job and cannot duplicate a paid run.
  const week = Math.floor(Date.now() / (7 * 86400000));
  const cacheKey = await digest(`${parsed.npi}:${provider.source_payload_hash}:${week}`);
  const existing = await db
    .prepare('SELECT * FROM abundance_clay_jobs WHERE cache_key=?')
    .bind(cacheKey)
    .first<Job>();
  if (existing) return { ...publicJob(existing), cache_hit: true };
  const url = new URL(config.webhookUrl);
  if (
    url.protocol !== 'https:' ||
    url.hostname !== 'api.clay.com' ||
    url.username ||
    url.password ||
    url.port ||
    !url.pathname.startsWith('/v3/sources/webhook/')
  )
    throw new TypeError('Invalid Clay endpoint');
  const id = `npgclay_${crypto.randomUUID()}`;
  const token = crypto.randomUUID() + crypto.randomUUID();
  const tokenHash = await digest(token);
  // Single write statement serializes concurrent reservations, including quota.
  const inserted = await db
    .prepare(
      `INSERT OR IGNORE INTO abundance_clay_jobs
 (id,cache_key,npi,status,callback_hash,source_run_id,source_payload_hash,created_at)
 SELECT ?,?,?,'pending',?,?,?,? WHERE
 (SELECT count(*) FROM abundance_clay_jobs WHERE created_at>=?)<5`
    )
    .bind(
      id,
      cacheKey,
      parsed.npi,
      tokenHash,
      run.id,
      provider.source_payload_hash,
      now,
      new Date(Date.now() - 86400000).toISOString()
    )
    .run();
  if (!inserted.meta.changes) {
    const concurrent = await db
      .prepare('SELECT * FROM abundance_clay_jobs WHERE cache_key=?')
      .bind(cacheKey)
      .first<Job>();
    if (concurrent) return { ...publicJob(concurrent), cache_hit: true };
    throw new ClayQuotaError('Daily request allowance exhausted');
  }
  const payload = {
    request_id: id,
    npi: parsed.npi,
    name: provider.name,
    city: provider.practice_city ?? null,
    state: provider.practice_state ?? null,
    source_payload_hash: provider.source_payload_hash,
    enrichment_requested: true,
    scope: 'public_professional_only',
    callback_url: 'https://createsomething.agency/api/webhooks/npg-clay',
    callback_token: token
  };
  try {
    const response = await fetchFn(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-clay-webhook-auth': config.webhookToken },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(15000)
    });
    if (!response.ok) throw Error('Clay did not acknowledge');
  } catch {
    await db
      .prepare(
        "UPDATE abundance_clay_jobs SET status='delivery_unknown' WHERE id=? AND status='pending'"
      )
      .bind(id)
      .run();
  }
  return { ...(await readClayJob(db, id)), cache_hit: false };
}
export async function completeClayJob(db: D1Database, input: unknown) {
  if (!input || typeof input !== 'object') throw new ClayCallbackError();
  const raw = input as Record<string, unknown>;
  if (
    typeof raw.request_id !== 'string' ||
    typeof raw.callback_token !== 'string' ||
    raw.callback_token.length > 200
  )
    throw new ClayCallbackError();
  const job = await db
    .prepare('SELECT * FROM abundance_clay_jobs WHERE id=?')
    .bind(raw.request_id)
    .first<Job>();
  const suppliedHash = await digest(raw.callback_token);
  let mismatch = job ? suppliedHash.length ^ job.callback_hash.length : 1;
  for (let i = 0; i < suppliedHash.length; i++)
    mismatch |= suppliedHash.charCodeAt(i) ^ (job?.callback_hash.charCodeAt(i) ?? 0);
  if (!job || mismatch !== 0) throw new ClayCallbackError();
  const result = clayResultSchema.parse(raw.result);
  const serialized = JSON.stringify(result);
  if (job.result_json) {
    if (job.result_json !== serialized) throw new ClayCallbackError();
    return { accepted: true, repeated: true };
  }
  if (Date.now() - Date.parse(job.created_at) > 86400000) throw new ClayCallbackError();
  const status = result.outcome === 'candidate' ? 'review_required' : result.outcome;
  const updated = await db
    .prepare(
      `UPDATE abundance_clay_jobs SET result_json=?,status=?,completed_at=? WHERE id=? AND result_json IS NULL`
    )
    .bind(serialized, status, new Date().toISOString(), job.id)
    .run();
  if (!updated.meta.changes) {
    const current = await db
      .prepare('SELECT result_json FROM abundance_clay_jobs WHERE id=?')
      .bind(job.id)
      .first<{ result_json: string }>();
    if (current?.result_json !== serialized) throw new ClayCallbackError();
  }
  return { accepted: true };
}
