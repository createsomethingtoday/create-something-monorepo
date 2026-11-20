import { Data, Effect, Either } from 'effect';
import { sanitizeMetaPageUrl } from '../analytics/meta-policy.ts';

export const META_CONSENT_COOKIE = 'cs_meta_consent';
export const META_CONSENT_MAX_AGE = 180 * 24 * 60 * 60;
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const noStore = { 'Cache-Control': 'no-store, private', Vary: 'Cookie, Sec-GPC, DNT', 'Content-Type': 'application/json' };

export interface MetaMarketingEnv {
  DB?: D1Database;
  ENVIRONMENT?: string;
  META_MARKETING_ENABLED?: string;
  META_DATASET_ID?: string;
  META_CAPI_ACCESS_TOKEN?: string;
  META_GRAPH_VERSION?: string;
  META_TEST_EVENT_CODE?: string;
}
interface MetaConfig { datasetId: string; token: string; version: string; testCode?: string }
interface ConsentRow { consent_id: string; granted_at: number; expires_at: number; revoked_at: number | null; account_subject: string | null }
export interface MetaConsentState { marketing: boolean; available: boolean; blocked: boolean; consentId?: string; accountSubject?: string }
type LeadPayload = { event_name: 'Lead'; event_time: number; event_id: string; action_source: 'website'; event_source_url: string;
  user_data: { em: string[]; client_user_agent?: string; client_ip_address?: string } };
type PageViewPayload = Omit<LeadPayload, 'event_name' | 'user_data'> & { event_name: 'PageView';
  user_data: { client_user_agent: string; client_ip_address: string } };
interface LeadRow { event_id: string; consent_id: string; dataset_id: string; payload_json: string | null; attempts: number }
export interface PreparedMetaLead { consentId: string; datasetId: string; payload: LeadPayload; preparedAt: number; accountSubject?: string }
export type MetaDeliveryOutcome = { state: 'accepted'; receipt: string } | { state: 'transient_failure' | 'permanent_failure' | 'unknown' };
export class MetaProviderError extends Data.TaggedError('MetaProviderError')<{ kind: 'transport' | 'timeout'; cause?: unknown }> {}

function config(env: MetaMarketingEnv): MetaConfig | undefined {
  if (env.META_MARKETING_ENABLED !== 'true' || !env.DB || !/^\d{5,25}$/.test(env.META_DATASET_ID ?? '') ||
    !env.META_CAPI_ACCESS_TOKEN || !/^v\d{1,3}\.0$/.test(env.META_GRAPH_VERSION ?? '')) return;
  return { datasetId: env.META_DATASET_ID!, token: env.META_CAPI_ACCESS_TOKEN, version: env.META_GRAPH_VERSION!,
    ...(env.META_TEST_EVENT_CODE && env.ENVIRONMENT !== 'production' ? { testCode: env.META_TEST_EVENT_CODE } : {}) };
}
function browserPrivacyBlock(request: Request): boolean {
  return request.headers.get('DNT') === '1' || request.headers.get('Sec-GPC') === '1';
}
export function isMetaRequestBlocked(request: Request, optedOut = false, accountSubject?: string): boolean {
  const hasAccountCookie = /(?:^|;\s*)cs_access_token=/.test(request.headers.get('Cookie') ?? '');
  return optedOut || browserPrivacyBlock(request) || (hasAccountCookie && !accountSubject);
}
function consentCookie(request: Request): string | undefined {
  const value = request.headers.get('Cookie')?.split(';').map(part => part.trim()).find(part => part.startsWith(`${META_CONSENT_COOKIE}=`))?.slice(META_CONSENT_COOKIE.length + 1);
  return value && UUID.test(value) ? value : undefined;
}
function primary(db: D1Database) { return db.withSession('first-primary'); }
function seconds(now: number) { return Math.floor(now / 1000); }
function json(value: unknown, status = 200, cookie?: string): Response {
  return new Response(JSON.stringify(value), { status, headers: { ...noStore, ...(cookie ? { 'Set-Cookie': cookie } : {}) } });
}
const cookieValue = (id?: string) => `${META_CONSENT_COOKIE}=${id ?? ''}; Path=/; Max-Age=${id ? META_CONSENT_MAX_AGE : 0}; HttpOnly; Secure; SameSite=Strict`;
const publicState = ({ marketing, available, blocked }: MetaConsentState) => ({ marketing, available, blocked });

export async function readMetaConsent(request: Request, env: MetaMarketingEnv, optedOut = false, now = Date.now(), accountSubject?: string): Promise<MetaConsentState> {
  const available = Boolean(config(env));
  const blocked = isMetaRequestBlocked(request, optedOut, accountSubject);
  const id = consentCookie(request);
  if (!id || !env.DB) return { marketing: false, available, blocked };
  if (blocked) {
    if (browserPrivacyBlock(request)) await revoke(env.DB, id, seconds(now));
    else if (optedOut && accountSubject) {
      const owner = await primary(env.DB).prepare('SELECT account_subject FROM meta_marketing_consents WHERE consent_id = ?')
        .bind(id).first<{ account_subject: string | null }>();
      if (owner && (owner.account_subject === null || owner.account_subject === accountSubject)) await revoke(env.DB, id, seconds(now));
    }
    // Missing fresh identity blocks this request but cannot permanently change another account's choice.
    return { marketing: false, available, blocked };
  }
  if (!available) return { marketing: false, available, blocked };
  const row = await primary(env.DB).prepare('SELECT consent_id, granted_at, expires_at, revoked_at, account_subject FROM meta_marketing_consents WHERE consent_id = ?')
    .bind(id).first<ConsentRow>();
  const marketing = Boolean(row && row.revoked_at === null && row.expires_at > seconds(now) &&
    (row.account_subject === null || row.account_subject === accountSubject));
  return { marketing, available, blocked, ...(marketing ? { consentId: id, ...(row?.account_subject ? { accountSubject: row.account_subject } : {}) } : {}) };
}
async function revoke(db: D1Database, id: string, now: number): Promise<void> {
  const session = primary(db);
  const results = await session.batch([
    session.prepare('UPDATE meta_marketing_consents SET revoked_at = COALESCE(revoked_at, ?) WHERE consent_id = ?').bind(now, id),
    session.prepare(`UPDATE meta_lead_deliveries SET state = CASE WHEN state = 'accepted' THEN state ELSE 'cancelled' END,
      payload_json = NULL, updated_at = ? WHERE consent_id = ?`).bind(now, id)
  ]);
  if (results.some(result => !result.success)) throw new Error('Marketing withdrawal not acknowledged');
}
async function boundedJson(request: Request | Response, max = 2048): Promise<unknown> {
  if (!request.body) throw new Error('Missing body');
  const reader = request.body.getReader();
  let text = ''; let size = 0;
  const decoder = new TextDecoder();
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > max) throw new Error('Body too large');
      text += decoder.decode(value, { stream: true });
    }
    return JSON.parse(text + decoder.decode());
  } finally { await reader.cancel().catch(() => {}); }
}
function sameOrigin(request: Request) { return request.headers.get('Origin') === new URL(request.url).origin; }

export async function metaConsentResponse(request: Request, env: MetaMarketingEnv, optedOut = false, now = Date.now(), accountSubject?: string): Promise<Response> {
  try {
    if (request.method !== 'GET' && request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
    if (request.method === 'POST' && !sameOrigin(request)) return json({ error: 'Origin not allowed' }, 403);
    const id = consentCookie(request);
    const blocked = isMetaRequestBlocked(request, optedOut, accountSubject);
    const clearBlockedCookie = browserPrivacyBlock(request) || (optedOut && Boolean(accountSubject));
    if (request.method === 'GET') {
      return json(publicState(await readMetaConsent(request, env, optedOut, now, accountSubject)), 200, clearBlockedCookie ? cookieValue() : undefined);
    }
    const body = await boundedJson(request);
    if (!body || typeof body !== 'object' || !('marketing' in body) || typeof body.marketing !== 'boolean' || Object.keys(body).some(key => key !== 'marketing'))
      return json({ error: 'Invalid consent choice' }, 400);
    const available = Boolean(config(env));
    if (!body.marketing) {
      if (id && env.DB) await revoke(env.DB, id, seconds(now));
      return json({ marketing: false, available, blocked }, 200, cookieValue());
    }
    const current = await readMetaConsent(request, env, optedOut, now, accountSubject);
    if (blocked || !available) return json(publicState(current), 200, clearBlockedCookie ? cookieValue() : undefined);
    if (current.marketing) {
      if (accountSubject && !current.accountSubject) {
        // Only an explicit signed grant may bind an existing anonymous choice.
        const result = await primary(env.DB!).prepare(`UPDATE meta_marketing_consents SET account_subject = ?
          WHERE consent_id = ? AND account_subject IS NULL AND revoked_at IS NULL AND expires_at > ?`)
          .bind(accountSubject, current.consentId!, seconds(now)).run();
        if (!result.success || result.meta.changes !== 1) throw new Error('Marketing account binding not acknowledged');
      }
      return json(publicState(await readMetaConsent(request, env, optedOut, now, accountSubject)));
    }
    if (id && !accountSubject) {
      const owner = await primary(env.DB!).prepare('SELECT account_subject FROM meta_marketing_consents WHERE consent_id = ?')
        .bind(id).first<{ account_subject: string | null }>();
      if (owner?.account_subject) return json({ marketing: false, available, blocked: true });
    }
    const consentId = crypto.randomUUID();
    const result = await primary(env.DB!).prepare(`INSERT INTO meta_marketing_consents (consent_id, granted_at, expires_at, policy_version, account_subject)
      VALUES (?, ?, ?, 'agency-meta-v1', ?)`).bind(consentId, seconds(now), seconds(now) + META_CONSENT_MAX_AGE, accountSubject ?? null).run();
    if (!result.success) throw new Error('Marketing consent not acknowledged');
    return json({ marketing: true, available: true, blocked: false }, 200, cookieValue(consentId));
  } catch {
    // A failed withdrawal must stay visibly unresolved; do not claim success or delete its retry handle.
    return json({ marketing: false, available: false, blocked: isMetaRequestBlocked(request, optedOut, accountSubject), error: 'Privacy preference could not be saved. Please try again.' }, 503);
  }
}

export async function metaPageViewResponse(request: Request, env: MetaMarketingEnv, optedOut = false, send: typeof fetch = fetch, accountSubject?: string): Promise<Response> {
  try {
    if (!sameOrigin(request)) return json({ error: 'Origin not allowed' }, 403);
    const consent = await readMetaConsent(request, env, optedOut, undefined, accountSubject);
    if (!consent.marketing) return json({ forwarded: false }, 200);
    const body = await boundedJson(request);
    if (!body || typeof body !== 'object' || !('url' in body) || !('eventId' in body) || typeof body.url !== 'string' ||
      typeof body.eventId !== 'string' || !UUID.test(body.eventId) || Object.keys(body).some(key => key !== 'url' && key !== 'eventId')) return json({ error: 'Invalid event' }, 400);
    const url = sanitizeMetaPageUrl(new URL(body.url));
    if (!url || body.url !== url) return json({ error: 'Public canonical URL required' }, 400);
    const userAgent = request.headers.get('User-Agent')?.slice(0, 512);
    const ip = request.headers.get('CF-Connecting-IP');
    if (!userAgent || !ip) return json({ forwarded: false }, 200);
    // The body read can yield; recheck the durable choice immediately before the provider boundary.
    if (!(await readMetaConsent(request, env, optedOut, undefined, accountSubject)).marketing)
      return json({ forwarded: false }, 200);
    const outcome = await sendMetaEvent({ event_name: 'PageView', event_time: seconds(Date.now()), event_id: body.eventId,
      action_source: 'website', event_source_url: url, user_data: { client_user_agent: userAgent, client_ip_address: ip } }, config(env)!, send);
    await drainMetaLead(request, env, optedOut, send, undefined, accountSubject).catch(() => {});
    // A PageView has no queue or automatic retry; ambiguous acknowledgements remain unconfirmed.
    const forwarded = outcome.state === 'accepted';
    return json({ forwarded }, forwarded ? 200 : 502);
  } catch { return json({ forwarded: false }, 503); }
}

export async function prepareMetaLead(request: Request, env: MetaMarketingEnv, input: { requestId: string; email: string }, optedOut = false, now = Date.now(), accountSubject?: string): Promise<PreparedMetaLead | undefined> {
  const consent = await readMetaConsent(request, env, optedOut, now, accountSubject);
  if (!consent.marketing || !consent.consentId) return;
  // A signed inquiry cannot enter the anonymous retry lane before an explicit account-bound grant.
  if (accountSubject && !consent.accountSubject) return;
  // Detect a missing delivery migration before adding optional work to the inquiry transaction.
  await primary(env.DB!).prepare('SELECT event_id FROM meta_lead_deliveries LIMIT 1').first();
  const hash = async (value: string) => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))))
    .map(byte => byte.toString(16).padStart(2, '0')).join('');
  const eventId = `agency-contact-${await hash(input.requestId)}`;
  const payload: LeadPayload = { event_name: 'Lead', event_time: seconds(now), event_id: eventId, action_source: 'website',
    event_source_url: 'https://createsomething.agency/contact', user_data: { em: [await hash(input.email.trim().toLowerCase())],
      ...(request.headers.get('User-Agent') ? { client_user_agent: request.headers.get('User-Agent')!.slice(0, 512) } : {}),
      ...(request.headers.get('CF-Connecting-IP') ? { client_ip_address: request.headers.get('CF-Connecting-IP')! } : {}) } };
  return { consentId: consent.consentId, datasetId: config(env)!.datasetId, payload, preparedAt: seconds(now), ...(consent.accountSubject ? { accountSubject: consent.accountSubject } : {}) };
}

/** Commit this statement in the same D1 batch as the NEW source inquiry receipt. */
export function metaLeadInsertStatement(session: D1DatabaseSession, requestId: string, prepared: PreparedMetaLead): D1PreparedStatement {
  return session.prepare(`INSERT INTO meta_lead_deliveries
    (event_id, request_id, consent_id, dataset_id, payload_json, next_attempt_at, created_at, updated_at)
    SELECT ?, ?, ?, ?, ?, ?, ?, ? WHERE EXISTS (SELECT 1 FROM meta_marketing_consents
      WHERE consent_id = ? AND revoked_at IS NULL AND expires_at > CAST(strftime('%s', 'now') AS INTEGER)
        AND (account_subject IS NULL OR account_subject = ?))
      AND EXISTS (SELECT 1 FROM contact_request_receipts WHERE request_id = ?)`)
    .bind(prepared.payload.event_id, requestId, prepared.consentId, prepared.datasetId, JSON.stringify(prepared.payload),
      prepared.preparedAt, prepared.preparedAt, prepared.preparedAt, prepared.consentId, prepared.accountSubject ?? null, requestId);
}

export async function sendMetaLead(payload: LeadPayload, settings: MetaConfig, send: typeof fetch = fetch): Promise<MetaDeliveryOutcome> {
  return sendMetaEvent(payload, settings, send);
}

async function sendMetaEvent(payload: LeadPayload | PageViewPayload, settings: MetaConfig, send: typeof fetch): Promise<MetaDeliveryOutcome> {
  const operation = Effect.tryPromise({
    try: async signal => {
      const response = await send(`https://graph.facebook.com/${settings.version}/${settings.datasetId}/events`, {
        method: 'POST', signal: AbortSignal.any([signal, AbortSignal.timeout(8000)]),
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${settings.token}` },
        body: JSON.stringify({ data: [payload], ...(settings.testCode ? { test_event_code: settings.testCode } : {}) }) });
      if (response.status === 429) { await response.body?.cancel(); return { state: 'transient_failure' } as const; }
      if ([400, 401, 403, 404, 422].includes(response.status)) { await response.body?.cancel(); return { state: 'permanent_failure' } as const; }
      if (!response.ok) { await response.body?.cancel(); return { state: 'unknown' } as const; }
      const body = await boundedJson(response, 8192);
      if (body && typeof body === 'object' && 'events_received' in body && body.events_received === 1 &&
        'fbtrace_id' in body && typeof body.fbtrace_id === 'string' && body.fbtrace_id.trim().length > 0 && body.fbtrace_id.length <= 200)
        return { state: 'accepted', receipt: body.fbtrace_id } as const;
      return { state: 'unknown' } as const;
    }, catch: cause => new MetaProviderError({ kind: 'transport', cause })
  }).pipe(Effect.timeoutFail({ duration: '10 seconds', onTimeout: () => new MetaProviderError({ kind: 'timeout' }) }));
  const result = await Effect.runPromise(Effect.either(operation));
  return Either.isRight(result) ? result.right : { state: 'unknown' };
}

/** Invoke from an owning scheduled maintenance task as well as opportunistic request cleanup. */
export async function purgeExpiredMetaPayloads(db: D1Database, now = Date.now()): Promise<number> {
  const timestamp = seconds(now);
  const result = await primary(db).prepare(`UPDATE meta_lead_deliveries
    SET state = CASE WHEN state = 'accepted' THEN state ELSE 'cancelled' END, payload_json = NULL, updated_at = ?
    WHERE payload_json IS NOT NULL AND (created_at <= ? OR NOT EXISTS (
      SELECT 1 FROM meta_marketing_consents c WHERE c.consent_id = meta_lead_deliveries.consent_id
        AND c.revoked_at IS NULL AND c.expires_at > ?))`)
    .bind(timestamp, timestamp - 86400, timestamp).run();
  if (!result.success) throw new Error('Expired Meta payload cleanup not acknowledged');
  return result.meta.changes;
}

/** Retention maintenance is independent of the delivery feature flag. */
export async function maintainMetaRetention(db: D1Database, now = Date.now()): Promise<{ settled: number; payloadsPurged: number; receiptsDeleted: number; consentsDeleted: number }> {
  const timestamp = seconds(now); const session = primary(db);
  const settled = await session.prepare(`UPDATE meta_lead_deliveries SET state = 'unknown', payload_json = NULL, updated_at = ?
    WHERE state = 'sending' AND lease_until <= ?`).bind(timestamp, timestamp).run();
  if (!settled.success) throw new Error('Abandoned Meta delivery reconciliation not acknowledged');
  const payloadsPurged = await purgeExpiredMetaPayloads(db, now);
  const results = await session.batch([
    session.prepare('DELETE FROM meta_lead_deliveries WHERE created_at <= ?').bind(timestamp - 90 * 86400),
    session.prepare(`DELETE FROM meta_marketing_consents WHERE COALESCE(revoked_at, expires_at) <= ?
      AND NOT EXISTS (SELECT 1 FROM meta_lead_deliveries d WHERE d.consent_id = meta_marketing_consents.consent_id)`)
      .bind(timestamp - 90 * 86400)
  ]);
  if (results.some(result => !result.success)) throw new Error('Meta retention cleanup not acknowledged');
  return { settled: settled.meta.changes, payloadsPurged, receiptsDeleted: results[0].meta.changes, consentsDeleted: results[1].meta.changes };
}

export async function drainMetaLead(request: Request, env: MetaMarketingEnv, optedOut = false, send: typeof fetch = fetch, now = Date.now(), accountSubject?: string): Promise<MetaDeliveryOutcome | undefined> {
  if (env.DB && config(env)) await purgeExpiredMetaPayloads(env.DB, now);
  const consent = await readMetaConsent(request, env, optedOut, now, accountSubject);
  if (!consent.marketing || !consent.consentId) return;
  const session = primary(env.DB!); const timestamp = seconds(now); const settings = config(env)!;
  // Lost in-flight acknowledgements become unknown and require reconciliation, never takeover.
  await session.prepare(`UPDATE meta_lead_deliveries SET state = 'unknown', payload_json = NULL, updated_at = ?
    WHERE state = 'sending' AND lease_until <= ? AND consent_id = ?`).bind(timestamp, timestamp, consent.consentId).run();
  const row = await session.prepare(`UPDATE meta_lead_deliveries SET state = 'sending', attempts = attempts + 1,
    lease_until = ?, updated_at = ? WHERE event_id = (SELECT event_id FROM meta_lead_deliveries
      WHERE consent_id = ? AND dataset_id = ? AND state IN ('pending', 'transient_failure') AND attempts < 3 AND next_attempt_at <= ?
        AND created_at > ? AND payload_json IS NOT NULL ORDER BY created_at, event_id LIMIT 1)
    AND EXISTS (SELECT 1 FROM meta_marketing_consents WHERE consent_id = ? AND revoked_at IS NULL AND expires_at > ?
      AND (account_subject IS NULL OR account_subject = ?))
    RETURNING event_id, consent_id, dataset_id, payload_json, attempts`)
    .bind(timestamp + 30, timestamp, consent.consentId, settings.datasetId, timestamp, timestamp - 86400,
      consent.consentId, timestamp, accountSubject ?? null).first<LeadRow>();
  if (!row?.payload_json) return;
  // Re-read after claiming, immediately before the external boundary.
  if (!(await readMetaConsent(request, env, optedOut, now, accountSubject)).marketing) {
    await session.prepare("UPDATE meta_lead_deliveries SET state = 'cancelled', payload_json = NULL WHERE event_id = ?").bind(row.event_id).run();
    return;
  }
  let payload: LeadPayload;
  try { payload = JSON.parse(row.payload_json) as LeadPayload; }
  catch { payload = undefined!; }
  const outcome: MetaDeliveryOutcome = payload ? await sendMetaLead(payload, settings, send) : { state: 'permanent_failure' };
  const retainPayload = outcome.state === 'transient_failure' && row.attempts < 3;
  const result = await session.prepare(`UPDATE meta_lead_deliveries SET state = CASE WHEN state = 'cancelled' AND ? <> 'accepted' THEN state ELSE ? END,
    payload_json = CASE WHEN state <> 'cancelled' AND ? THEN payload_json ELSE NULL END,
    provider_receipt = ?, next_attempt_at = ?, lease_until = NULL, updated_at = ? WHERE event_id = ? AND state IN ('sending', 'cancelled')`)
    .bind(outcome.state, outcome.state, retainPayload ? 1 : 0, outcome.state === 'accepted' ? outcome.receipt : null,
      timestamp + 60 * row.attempts, timestamp, row.event_id).run();
  if (!result.success || result.meta.changes !== 1) throw new Error('Meta delivery receipt not acknowledged');
  return outcome;
}
