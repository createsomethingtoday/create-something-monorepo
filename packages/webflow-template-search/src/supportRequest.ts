// Buyer → creator support requests from Template Marketplace detail pages.
//
// The TemplateSupportRequest code component posts here instead of opening a
// mailto: link. The Worker resolves the creator's email server-side (so it
// never appears in page HTML), logs one D1 row per submission as the source of
// truth for counts by type/template/creator, and emails the creator through
// the Knock workflow `marketplace-template-support-request` (Postmark channel,
// reply-to = buyer).
//
// Disabled unless SUPPORT_REQUESTS_ENABLED = "1". Requires secrets
// KNOCK_API_KEY, SUPPORT_REQUEST_HASH_SALT, AIRTABLE_API_KEY, and
// AIRTABLE_CREATOR_EMAIL_FIELD_IDS (kept out of this public repo).

import { z } from 'zod';

import { isOriginAllowed, jsonResponse } from './http.js';
import type { Env } from './types.js';

// Keep in sync with packages/webflow-components/src/components/marketplace/supportRequest.ts.
export const SUPPORT_REQUEST_TYPES = [
  'pre_purchase',
  'bug_help',
  'customization',
  'file_request',
  'refund_licensing',
  'other',
] as const;

export type SupportRequestType = (typeof SUPPORT_REQUEST_TYPES)[number];

export const SUPPORT_REQUEST_TYPE_LABELS: Readonly<Record<SupportRequestType, string>> = {
  pre_purchase: 'Pre-purchase question',
  bug_help: 'Bug or help using the template',
  customization: 'Customization request',
  file_request: 'File request (Figma, assets)',
  refund_licensing: 'Refund or licensing',
  other: 'Other',
};

export const DEFAULT_SUPPORT_WORKFLOW_KEY = 'marketplace-template-support-request';
const KNOCK_WORKFLOWS_URL = 'https://api.knock.app/v1/workflows';

const MAX_BODY_CHARS = 16_000;
// Read cap in bytes, enforced while streaming so an oversized body is never
// materialized in the isolate the search API shares.
const MAX_BODY_BYTES = 32_000;
// A retry within this window of a still-pending attempt is treated as in progress.
const PENDING_IN_FLIGHT_MS = 60_000;
const MAX_PER_IP_PER_HOUR = 5;
const MAX_PER_BUYER_TEMPLATE_PER_DAY = 3;
const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;


const supportRequestSchema = z
  .object({
    template_slug: z.string().trim().min(1).max(200).regex(/^[a-z0-9][a-z0-9-]*$/i),
    request_type: z.enum(SUPPORT_REQUEST_TYPES),
    buyer_name: z.string().trim().max(120).default(''),
    buyer_email: z.string().trim().email().max(254),
    message: z.string().trim().min(10).max(4_000),
    // Honeypot: real buyers never see or fill this field.
    website: z.string().max(500).default(''),
    // One key per form submission, reused on retries, so Knock never emails twice.
    idempotency_key: z.string().regex(/^[A-Za-z0-9_-]{16,64}$/).optional(),
  })
  .strict();

export type SupportRequestInput = z.infer<typeof supportRequestSchema>;

export type SupportRequestParseResult =
  | { ok: true; value: SupportRequestInput }
  | { ok: false; error: string; fields?: string[] };

export function parseSupportRequestBody(body: string): SupportRequestParseResult {
  if (!body || body.length > MAX_BODY_CHARS) return { ok: false, error: 'invalid_body' };

  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    return { ok: false, error: 'invalid_json' };
  }

  const result = supportRequestSchema.safeParse(parsed);
  if (!result.success) {
    const fields = [...new Set(result.error.issues.map((issue) => String(issue.path[0] ?? 'body')))];
    return { ok: false, error: 'invalid_fields', fields };
  }
  return { ok: true, value: result.data };
}

function firstEmail(value: unknown): string | null {
  const candidates = Array.isArray(value) ? value : [value];
  for (const candidate of candidates) {
    if (typeof candidate !== 'string') continue;
    const email = candidate.split(',')[0]?.trim();
    if (email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return email;
  }
  return null;
}

/**
 * 👛Assets email fields are addressed by ID, in priority order (per-asset
 * override first, then the creator rollup): the shared Airtable key has no
 * schema access, and field names drift. Exported for tests.
 */
export function parseFieldIds(value: string | undefined): string[] {
  return (value ?? '').split(',').map((id) => id.trim()).filter(Boolean);
}

export function resolveCreatorEmail(fields: Record<string, unknown>, fieldIds: readonly string[]): string | null {
  for (const fieldId of fieldIds) {
    const email = firstEmail(fields[fieldId]);
    if (email) return email;
  }
  return null;
}

/** Listing URLs in Airtable can carry campaign UTMs; the creator email links to the clean page. */
export function cleanListingUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value, 'https://webflow.com');
    url.search = '';
    url.hash = '';
    return url.toString();
  } catch {
    return null;
  }
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

interface TemplateRow {
  id: string;
  name: string;
  listing_url: string | null;
  creator_name: string | null;
  creator_record_id: string | null;
}

async function fetchAssetFields(env: Env, recordId: string): Promise<Record<string, unknown> | null> {
  const tableId = env.AIRTABLE_ASSETS_TABLE_ID;
  if (!env.AIRTABLE_API_KEY || !tableId) return null;
  const url =
    `https://api.airtable.com/v0/${env.AIRTABLE_BASE_ID}/${encodeURIComponent(tableId)}/` +
    `${encodeURIComponent(recordId)}?returnFieldsByFieldId=true`;
  const response = await fetch(url, { headers: { Authorization: `Bearer ${env.AIRTABLE_API_KEY}` } });
  if (!response.ok) throw new Error(`Airtable asset lookup failed (${response.status})`);
  const record = (await response.json()) as { fields?: Record<string, unknown> };
  return record.fields ?? {};
}

async function triggerKnock(
  env: Env,
  idempotencyKey: string,
  recipient: { id: string; email: string; name?: string },
  data: Record<string, string>,
): Promise<string | null> {
  const workflowKey = env.KNOCK_SUPPORT_WORKFLOW_KEY?.trim() || DEFAULT_SUPPORT_WORKFLOW_KEY;
  const response = await fetch(`${KNOCK_WORKFLOWS_URL}/${encodeURIComponent(workflowKey)}/trigger`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.KNOCK_API_KEY}`,
      'Content-Type': 'application/json',
      // A retried submission must not email the creator twice.
      'Idempotency-Key': idempotencyKey,
    },
    body: JSON.stringify({ recipients: [recipient], data }),
  });
  if (!response.ok) throw new Error(`Knock trigger failed (${response.status})`);
  const result = (await response.json().catch(() => ({}))) as { workflow_run_id?: string };
  return result.workflow_run_id ?? null;
}

type SupportRequestStatus = 'pending' | 'sent' | 'send_failed' | 'creator_unreachable' | 'rate_limited';

/** Reads at most `maxBytes` of the body; null when it is (or declares itself) larger. */
export async function readBodyCapped(request: Request, maxBytes: number): Promise<string | null> {
  const declared = Number(request.headers.get('Content-Length') ?? '0');
  if (Number.isFinite(declared) && declared > maxBytes) return null;
  if (!request.body) return '';

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel().catch(() => undefined);
      return null;
    }
    chunks.push(value);
  }
  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(merged);
}

interface PriorAttempt {
  id: string;
  created_at: string;
  status: SupportRequestStatus;
  template_slug: string;
  buyer_email_hash: string;
  delivery_snapshot: string | null;
}

/** Server-derived trigger fields, frozen on the row so retries send identical parameters. */
interface DeliverySnapshot {
  recipient: { id: string; email: string; name?: string };
  template_name: string;
  listing_url: string;
}

function readSnapshot(value: string | null | undefined): DeliverySnapshot | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as DeliverySnapshot;
    return parsed?.recipient?.email ? parsed : null;
  } catch {
    return null;
  }
}

async function finishRow(
  env: Env,
  requestId: string,
  status: SupportRequestStatus,
  extra: { knockRunId?: string | null; error?: string | null } = {},
): Promise<void> {
  await env.DB.prepare(
    `UPDATE support_requests
     SET status = ?1, knock_workflow_run_id = ?2, error = ?3,
         delivery_snapshot = CASE WHEN ?1 = 'sent' THEN NULL ELSE delivery_snapshot END
     WHERE id = ?4`,
  )
    .bind(status, extra.knockRunId ?? null, extra.error?.slice(0, 300) ?? null, requestId)
    .run();
}

interface RateWindow {
  count: number;
  max: number;
  oldest: string | null;
  windowMs: number;
}

/**
 * Seconds until every exceeded window has room again, or null when none is
 * exceeded. Counts include the current request. Exported for tests.
 */
export function rateLimitRetrySeconds(now: number, windows: readonly RateWindow[]): number | null {
  let retry: number | null = null;
  for (const window of windows) {
    if (window.count <= window.max) continue;
    const oldest = window.oldest ? Date.parse(window.oldest) : now;
    const seconds = Math.max(1, Math.ceil((oldest + window.windowMs - now) / 1000));
    retry = Math.max(retry ?? 0, seconds);
  }
  return retry;
}

export async function handleSupportRequest(request: Request, env: Env): Promise<Response> {
  const respond = (data: unknown, status: number) => jsonResponse(request, env, data, status);

  // A browser on another site must not spend its visitors' quotas emailing creators.
  const origin = request.headers.get('Origin');
  if (origin && !isOriginAllowed(origin, env)) {
    return respond({ success: false, error: 'origin_not_allowed' }, 403);
  }

  if (env.SUPPORT_REQUESTS_ENABLED !== '1') {
    return respond({ success: false, error: 'support_requests_disabled' }, 503);
  }
  const creatorEmailFieldIds = parseFieldIds(env.AIRTABLE_CREATOR_EMAIL_FIELD_IDS);
  if (
    !env.KNOCK_API_KEY ||
    !env.SUPPORT_REQUEST_HASH_SALT ||
    !env.AIRTABLE_API_KEY ||
    !env.AIRTABLE_ASSETS_TABLE_ID ||
    creatorEmailFieldIds.length === 0
  ) {
    // Fail before reserving anything: a missing credential is a service fault,
    // not an unreachable creator, and must not spend anyone's quota.
    console.error(JSON.stringify({ event: 'support_request_misconfigured' }));
    return respond({ success: false, error: 'support_requests_unavailable' }, 503);
  }

  const body = await readBodyCapped(request, MAX_BODY_BYTES).catch(() => '');
  if (body === null) return respond({ success: false, error: 'payload_too_large' }, 413);
  const parsed = parseSupportRequestBody(body);
  if (!parsed.ok) return respond({ success: false, error: parsed.error, fields: parsed.fields }, 400);
  const input = parsed.value;
  const idempotencyKey = input.idempotency_key ?? null;

  // Bots that fill the honeypot get a normal-looking success and no email.
  if (input.website) return respond({ success: true, data: { request_id: crypto.randomUUID() } }, 200);

  const salt = env.SUPPORT_REQUEST_HASH_SALT;
  const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown';
  const [ipHash, buyerEmailHash] = await Promise.all([
    sha256Hex(`${salt}:ip:${ip}`),
    sha256Hex(`${salt}:email:${input.buyer_email.toLowerCase()}`),
  ]);

  const template = await env.DB.prepare(
    'SELECT id, name, listing_url, creator_name, creator_record_id FROM template_documents WHERE template_slug = ?',
  )
    .bind(input.template_slug)
    .first<TemplateRow>();
  if (!template) return respond({ success: false, error: 'template_not_found' }, 404);

  const now = Date.now();
  const findPrior = (key: string) =>
    env.DB.prepare(
      'SELECT id, created_at, status, template_slug, buyer_email_hash, delivery_snapshot FROM support_requests WHERE idempotency_key = ?',
    )
      .bind(key)
      .first<PriorAttempt>();

  // A retry of an earlier submission reuses that attempt's reservation rather
  // than taking another slot, so a lost response at the cap can't turn into a
  // false rate-limit failure for an email that was already sent.
  let requestId: string | null = null;
  // Carried into a fresh reservation so a re-reserved retry still sends what
  // the original attempt would have.
  let carriedSnapshot: string | null = null;
  const releaseAndReserveAfresh = async (prior: PriorAttempt) => {
    carriedSnapshot = prior.delivery_snapshot;
    await env.DB.prepare('UPDATE support_requests SET idempotency_key = NULL WHERE id = ?').bind(prior.id).run();
  };
  const resolvePrior = async (prior: PriorAttempt): Promise<Response | null> => {
    if (prior.buyer_email_hash !== buyerEmailHash || prior.template_slug !== input.template_slug) {
      return respond({ success: false, error: 'invalid_fields', fields: ['idempotency_key'] }, 400);
    }
    if (prior.status === 'sent') return respond({ success: true, data: { request_id: prior.id } }, 200);
    if (prior.status === 'pending' && now - Date.parse(prior.created_at) < PENDING_IN_FLIGHT_MS) {
      return respond({ success: false, error: 'request_in_progress', request_id: prior.id }, 409);
    }
    // A rate-limited attempt never held a slot, and an attempt older than the
    // shortest window no longer holds one: release the key and go through the
    // quota again, so old failures can't send alongside a full current quota.
    if (prior.status === 'rate_limited' || now - Date.parse(prior.created_at) >= HOUR_MS) {
      await releaseAndReserveAfresh(prior);
      return null;
    }
    // send_failed, creator_unreachable, or a stale pending attempt: deliver again
    // under the same Knock key, which dedupes if the first attempt did land.
    requestId = prior.id;
    await finishRow(env, prior.id, 'pending');
    return null;
  };

  if (idempotencyKey) {
    const prior = await findPrior(idempotencyKey);
    if (prior) {
      const early = await resolvePrior(prior);
      if (early) return early;
    }
  }

  if (!requestId) {
    // Reserve the slot first, then count only the reservations inserted at or
    // before this one. Order comes from the rowid SQLite assigns atomically at
    // insert, not from a timestamp taken earlier, so however a burst interleaves
    // or stalls, exactly the first requests up to each cap proceed. The row also
    // records attempts that later fail to send.
    const newId = crypto.randomUUID();
    let seq: number;
    try {
      const reservation = await env.DB.prepare(
        `INSERT INTO support_requests
           (id, created_at, template_document_id, template_slug, creator_record_id, request_type,
            status, ip_hash, buyer_email_hash, message_chars, idempotency_key, delivery_snapshot)
         VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?)
         RETURNING rowid AS seq`,
      )
        .bind(
          newId,
          new Date(now).toISOString(),
          template.id,
          input.template_slug,
          template.creator_record_id,
          input.request_type,
          ipHash,
          buyerEmailHash,
          input.message.length,
          idempotencyKey,
          carriedSnapshot,
        )
        .first<{ seq: number }>();
      seq = reservation?.seq ?? Number.MAX_SAFE_INTEGER;
    } catch (error) {
      // A concurrent retry with the same key won the unique index.
      const prior = idempotencyKey ? await findPrior(idempotencyKey) : null;
      if (!prior) throw error;
      return respond({ success: false, error: 'request_in_progress', request_id: prior.id }, 409);
    }

    const hourAgo = new Date(now - HOUR_MS).toISOString();
    const dayAgo = new Date(now - DAY_MS).toISOString();
    const rankedAtOrBefore = `AND status != 'rate_limited' AND rowid <= ?`;
    const [ipWindow, buyerWindow] = await Promise.all([
      env.DB.prepare(
        `SELECT COUNT(*) AS n, MIN(created_at) AS oldest FROM support_requests
         WHERE ip_hash = ? AND created_at >= ? ${rankedAtOrBefore}`,
      )
        .bind(ipHash, hourAgo, seq)
        .first<{ n: number; oldest: string | null }>(),
      env.DB.prepare(
        `SELECT COUNT(*) AS n, MIN(created_at) AS oldest FROM support_requests
         WHERE buyer_email_hash = ? AND template_slug = ? AND created_at >= ? ${rankedAtOrBefore}`,
      )
        .bind(buyerEmailHash, input.template_slug, dayAgo, seq)
        .first<{ n: number; oldest: string | null }>(),
    ]);
    const retryAfterSeconds = rateLimitRetrySeconds(now, [
      { count: ipWindow?.n ?? 0, max: MAX_PER_IP_PER_HOUR, oldest: ipWindow?.oldest ?? null, windowMs: HOUR_MS },
      { count: buyerWindow?.n ?? 0, max: MAX_PER_BUYER_TEMPLATE_PER_DAY, oldest: buyerWindow?.oldest ?? null, windowMs: DAY_MS },
    ]);
    if (retryAfterSeconds !== null) {
      await finishRow(env, newId, 'rate_limited');
      return jsonResponse(
        request,
        env,
        { success: false, error: 'rate_limited', retry_after_seconds: retryAfterSeconds },
        429,
        { 'Retry-After': String(retryAfterSeconds) },
      );
    }
    requestId = newId;
  }

  const attemptId: string = requestId;
  try {
    // Knock replays a retry only when its parameters match the original, so the
    // server-derived fields are frozen on the row before the first send and
    // reused on every retry; the rest comes from the client's submission.
    const row = await env.DB.prepare('SELECT delivery_snapshot FROM support_requests WHERE id = ?')
      .bind(attemptId)
      .first<{ delivery_snapshot: string | null }>();
    let snapshot = readSnapshot(row?.delivery_snapshot);
    if (!snapshot) {
      const fields = await fetchAssetFields(env, template.id);
      const creatorEmail = fields ? resolveCreatorEmail(fields, creatorEmailFieldIds) : null;
      if (!creatorEmail) {
        await finishRow(env, attemptId, 'creator_unreachable');
        return respond({ success: false, error: 'creator_unreachable', request_id: attemptId }, 422);
      }
      snapshot = {
        recipient: {
          id: `marketplace-creator-${template.creator_record_id ?? template.id}`,
          email: creatorEmail,
          ...(template.creator_name ? { name: template.creator_name } : {}),
        },
        template_name: template.name,
        listing_url: cleanListingUrl(template.listing_url) ?? '',
      };
      await env.DB.prepare('UPDATE support_requests SET delivery_snapshot = ? WHERE id = ?')
        .bind(JSON.stringify(snapshot), attemptId)
        .run();
    }

    const reference = idempotencyKey ?? attemptId;
    const knockRunId = await triggerKnock(
      env,
      `support-request:${reference}`,
      snapshot.recipient,
      {
        request_id: reference,
        template_name: snapshot.template_name,
        listing_url: snapshot.listing_url,
        request_type: input.request_type,
        request_type_label: SUPPORT_REQUEST_TYPE_LABELS[input.request_type],
        buyer_name: input.buyer_name,
        buyer_email: input.buyer_email,
        message: input.message,
      },
    );
    await finishRow(env, attemptId, 'sent', { knockRunId });
    return respond({ success: true, data: { request_id: attemptId } }, 200);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(JSON.stringify({ event: 'support_request_failed', request_id: attemptId, error: message }));
    await finishRow(env, attemptId, 'send_failed', { error: message }).catch(() => undefined);
    return respond({ success: false, error: 'send_failed', request_id: attemptId }, 502);
  }
}
