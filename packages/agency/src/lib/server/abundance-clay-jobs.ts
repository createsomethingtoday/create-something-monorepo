import {
  recordClayCompletion
} from './enrichment-budget';
import { clayResultSchema } from './abundance-clay-contract';
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
    await recordClayCompletion(db, job.id);
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
  await recordClayCompletion(db, job.id);
  return { accepted: true };
}
