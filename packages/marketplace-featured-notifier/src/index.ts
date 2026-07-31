/**
 * Marketplace featured-pick notifier.
 *
 * Finds templates selected as a featured pick for an UPCOMING month and notifies
 * the creator via the Knock workflow `marketplace-template-featured` (in-app bell
 * + Postmark email), then stamps the period so the same period never re-sends.
 *
 * Runs entirely outside Airtable: no automation, no Run script node. Airtable is
 * read/written over REST, which keeps the Knock secret out of the base (where it
 * would be visible to every editor) and avoids the Airtable API's inability to
 * create or read script nodes.
 *
 * DRY_RUN=true (the default) resolves candidates and reports what it WOULD send
 * without calling Knock and without writing to Airtable.
 */

const AIRTABLE_API_BASE = 'https://api.airtable.com/v0';
const KNOCK_API_BASE = 'https://api.knock.app/v1';
const WORKFLOW_KEY = 'marketplace-template-featured';

const DEFAULT_BASE_ID = 'appMoIgXMTTTNIc3p';
const DEFAULT_ASSETS_TABLE_ID = 'tblRwzpWoLgE9MrUm';

/** 👛Assets field IDs. Hardcoded on purpose: the Airtable token has no
 *  `schema.bases:read` scope, so field names cannot be resolved at runtime. */
const F = {
  name: 'fldUzJBor3Gnkykjc', // Name
  listingUrlUtm: 'fldfodjuCUF7xlfke', // 🔗Listing URL + UTM (populated; the raw 🔗Listing URL is empty on 11k+ assets)
  reviewerPick: 'fldTgII7p9ZSSK5uW', // ⭐Reviewer pick (featured templates)
  pickReason: 'fld3w4yqQPzqah0LE', // ⭐Reviewer Pick Reason — creator-safe curatorial "why"
  isFeatured: 'fldtkCY5ZQxiEzJcv', // ℹ️Is Featured?
  featuredPeriod: 'fldeDgWr09HIqDFcX', // 📅Is Featured Period (formula, 1st of month)
  notifiedForPeriod: 'fld9qASBS2pcnXadA', // 🔔Featured Notified For Period (our stamp)
  timesFeatured: 'fld2XFywmXYpSY1Le', // How many times the creator has been featured
  creatorEmail: 'fldHhxmfSNMp117SP', // 🎨📧 Creator Email (rollup)
  creatorEmailOverride: 'fldjCdCvHOy7dVwss', // 👀🎨📧 Creator Email (Override)
  wfUserId: 'fld2jvWS6WF5rvVXr', // 🎨🔑Creator WF User ID (lookup) — Knock recipient id
  assetType: 'fldEZRiUdsa0ALH8L', // ⚙️🆎Asset Type Record ID (rollup)
  suppress: 'fld4SzMQuL9nHWo4R', // 👀🔔Suppress Notifications? (Override)
  suppressViaVersion: 'fldURhvIilBGrTwZX', // ⚙️Suppress Notifications via Version?
} as const;

/** 🆎Asset Types record id for Template. Without this filter the "featured
 *  template" copy would reach App developers. */
const TEMPLATE_ASSET_TYPE_ID = 'recA2YsPEHSuAHOLD';

/** Suppression choice that opts a creator out of this notification. The choice
 *  may not exist yet (the multi-selects only offer slack/zendesk), in which case
 *  this simply never matches. */
const SUPPRESS_CHOICE = 'publish email';

interface Env {
  AIRTABLE_API_KEY?: string;
  KNOCK_API_KEY?: string;
  ADMIN_TOKEN?: string;
  AIRTABLE_BASE_ID?: string;
  AIRTABLE_ASSETS_TABLE_ID?: string;
  AIRTABLE_REQUEST_DELAY_MS?: string;
  DRY_RUN?: string;
}

interface AirtableRecord {
  id: string;
  fields: Record<string, unknown>;
}

interface AirtableResponse {
  records: AirtableRecord[];
  offset?: string;
}

interface Candidate {
  recordId: string;
  templateName: string;
  featuredPeriod: string;
  featuredMonth: string;
  pickReason: string;
  listingUrl: string;
  email: string;
  wfUserId: string;
  timesFeatured: number | null;
}

interface Skipped {
  recordId: string;
  templateName: string;
  reason: string;
}

interface RunResult {
  dryRun: boolean;
  scanned: number;
  eligible: number;
  notified: number;
  skipped: Skipped[];
  failed: { recordId: string; templateName: string; error: string }[];
  candidates: Candidate[];
}

function first(value: unknown): string {
  if (Array.isArray(value)) return value.length ? String(value[0]) : '';
  if (value === null || value === undefined) return '';
  return String(value);
}

function choiceNames(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((v) =>
    (typeof v === 'object' && v !== null && 'name' in v ? String((v as { name: unknown }).name) : String(v)).toLowerCase()
  );
}

/** "2026-09-01" -> "September 2026". Parsed as UTC so a Worker in any timezone
 *  never lands on the previous month. */
function formatMonth(period: string): string {
  const d = new Date(`${period.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return period;
  return `${d.toLocaleString('en-US', { month: 'long', timeZone: 'UTC' })} ${d.getUTCFullYear()}`;
}

/**
 * Selection filter. Periods are always the 1st of a month, so
 * IS_AFTER(period, TODAY()) means "next month or later" — which deliberately
 * excludes the current month's picks and every historical feature. Without that
 * gate this would notify ~620 creators about features going back to 2025.
 */
function buildFormula(): string {
  // Deliberately NOT gated on ⭐Reviewer pick: measured 2026-07-31, that checkbox
  // is unset on 13 of the 25 currently-featured templates even though all 25 have
  // a Pick Reason. Requiring it would silently skip ~half of every batch.
  // ℹ️Is Featured? is the batch state; the Pick Reason is the content.
  return [
    'AND(',
    `{${F.isFeatured}},`,
    `{${F.assetType}}="${TEMPLATE_ASSET_TYPE_ID}",`,
    `NOT({${F.pickReason}}=BLANK()),`,
    `IS_AFTER({${F.featuredPeriod}},TODAY()),`,
    `OR(`,
    `{${F.notifiedForPeriod}}=BLANK(),`,
    `NOT(IS_SAME({${F.notifiedForPeriod}},{${F.featuredPeriod}},'month'))`,
    `)`,
    ')',
  ].join('');
}

async function fetchCandidateRecords(env: Env, apiKey: string): Promise<AirtableRecord[]> {
  const baseId = env.AIRTABLE_BASE_ID || DEFAULT_BASE_ID;
  const tableId = env.AIRTABLE_ASSETS_TABLE_ID || DEFAULT_ASSETS_TABLE_ID;
  const delay = Number(env.AIRTABLE_REQUEST_DELAY_MS || '250');

  const out: AirtableRecord[] = [];
  let offset: string | undefined;

  for (let page = 0; page < 50; page += 1) {
    const params = new URLSearchParams();
    params.set('filterByFormula', buildFormula());
    params.set('pageSize', '100');
    // Without this, Airtable keys the response by field NAME and every field-ID
    // lookup silently returns undefined — producing blank notifications.
    params.set('returnFieldsByFieldId', 'true');
    for (const id of Object.values(F)) params.append('fields[]', id);
    if (offset) params.set('offset', offset);

    const res = await fetch(`${AIRTABLE_API_BASE}/${baseId}/${tableId}?${params.toString()}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok) {
      throw new Error(`Airtable list failed: ${res.status} ${await res.text()}`);
    }
    const body = (await res.json()) as AirtableResponse;
    out.push(...body.records);
    offset = body.offset;
    if (!offset) break;
    if (delay > 0) await new Promise((r) => setTimeout(r, delay));
  }

  return out;
}

/** Strip the query string. The stored URL carries utm_source=youtube, which
 *  would mis-attribute clicks coming from an email. */
function cleanListingUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  const q = trimmed.indexOf('?');
  return q === -1 ? trimmed : trimmed.slice(0, q);
}

function evaluate(record: AirtableRecord): { candidate?: Candidate; skipped?: Skipped } {
  const f = record.fields;
  const templateName = first(f[F.name]).trim() || '(unnamed)';
  const skip = (reason: string) => ({ skipped: { recordId: record.id, templateName, reason } });

  const featuredPeriod = first(f[F.featuredPeriod]).slice(0, 10);
  if (!featuredPeriod) return skip('no 📅Is Featured Period');

  const suppression = [...choiceNames(f[F.suppress]), ...choiceNames(f[F.suppressViaVersion])];
  if (suppression.includes(SUPPRESS_CHOICE)) return skip('suppressed via 👀🔔Suppress Notifications?');

  const pickReason = first(f[F.pickReason]).trim();
  if (!pickReason) return skip('no ⭐Reviewer Pick Reason');

  const listingUrl = cleanListingUrl(first(f[F.listingUrlUtm]));
  if (!listingUrl) return skip('no listing URL');

  const email = (first(f[F.creatorEmailOverride]) || first(f[F.creatorEmail])).trim();
  if (!email) return skip('no creator email');

  // Required, not optional: without the real Webflow user _id the in-app bell
  // silently never arrives, the email greeting falls back to "Hi there," and
  // Knock production gains a junk duplicate user. Better to skip and retry once
  // 🎨🔑Creator WF User ID is backfilled.
  const wfUserId = first(f[F.wfUserId]).trim();
  if (!wfUserId) return skip('no 🎨🔑Creator WF User ID (needs backfill)');

  const timesRaw = first(f[F.timesFeatured]);
  const times = timesRaw ? Number(timesRaw) : NaN;

  return {
    candidate: {
      recordId: record.id,
      templateName,
      featuredPeriod,
      featuredMonth: formatMonth(featuredPeriod),
      pickReason,
      listingUrl,
      email,
      wfUserId,
      timesFeatured: Number.isFinite(times) ? times : null,
    },
  };
}

async function triggerKnock(knockKey: string, c: Candidate): Promise<void> {
  const res = await fetch(`${KNOCK_API_BASE}/workflows/${WORKFLOW_KEY}/trigger`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${knockKey}`,
      'Content-Type': 'application/json',
      // Knock-side dedupe, keyed to (record, period). Belt to the Airtable stamp's
      // braces: if the stamp fails after a successful send, the retry hits the same
      // idempotency key and Knock declines to send twice. The monorepo's own
      // notifications system (packages/systems/notifications) passes an
      // idempotencyKey for the same reason.
      'Idempotency-Key': `featured:${c.recordId}:${c.featuredPeriod}`,
    },
    body: JSON.stringify({
      recipients: [{ id: c.wfUserId, email: c.email }],
      data: {
        template_name: c.templateName,
        featured_month: c.featuredMonth,
        pick_reason: c.pickReason,
        listing_url: c.listingUrl,
        ...(c.timesFeatured !== null ? { times_featured: c.timesFeatured } : {}),
      },
    }),
  });
  if (!res.ok) {
    throw new Error(`Knock ${res.status}: ${await res.text()}`);
  }
}

async function stampNotified(env: Env, apiKey: string, c: Candidate): Promise<void> {
  const baseId = env.AIRTABLE_BASE_ID || DEFAULT_BASE_ID;
  const tableId = env.AIRTABLE_ASSETS_TABLE_ID || DEFAULT_ASSETS_TABLE_ID;
  const res = await fetch(`${AIRTABLE_API_BASE}/${baseId}/${tableId}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      records: [{ id: c.recordId, fields: { [F.notifiedForPeriod]: c.featuredPeriod } }],
    }),
  });
  if (!res.ok) {
    throw new Error(`Airtable stamp failed: ${res.status} ${await res.text()}`);
  }
}

async function run(env: Env, forceDryRun?: boolean): Promise<RunResult> {
  const apiKey = env.AIRTABLE_API_KEY;
  if (!apiKey) throw new Error('AIRTABLE_API_KEY is not configured');

  // Dry run unless explicitly disabled — and always dry when no Knock key exists,
  // so a half-configured deploy cannot email creators.
  const dryRun = forceDryRun ?? (env.DRY_RUN !== 'false' || !env.KNOCK_API_KEY);

  const records = await fetchCandidateRecords(env, apiKey);
  const result: RunResult = {
    dryRun,
    scanned: records.length,
    eligible: 0,
    notified: 0,
    skipped: [],
    failed: [],
    candidates: [],
  };

  for (const record of records) {
    const { candidate, skipped } = evaluate(record);
    if (skipped || !candidate) {
      if (skipped) result.skipped.push(skipped);
      continue;
    }

    result.eligible += 1;
    result.candidates.push(candidate);
    if (dryRun) continue;

    try {
      // Notify first, stamp second. If the stamp fails the next run re-sends,
      // which is a visible duplicate; if we stamped first a Knock failure would
      // silently suppress the notification forever.
      await triggerKnock(env.KNOCK_API_KEY as string, candidate);
      await stampNotified(env, apiKey, candidate);
      result.notified += 1;
    } catch (error) {
      result.failed.push({
        recordId: candidate.recordId,
        templateName: candidate.templateName,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return result;
}

/** Candidate payloads include creator email addresses, so the endpoint is not public. */
function authorized(request: Request, env: Env): boolean {
  if (!env.ADMIN_TOKEN) return false;
  const header = request.headers.get('authorization') || '';
  const bearer = header.toLowerCase().startsWith('bearer ') ? header.slice(7).trim() : '';
  return bearer === env.ADMIN_TOKEN;
}

export default {
  async scheduled(_event: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(
      run(env)
        .then((r) => {
          console.log(
            JSON.stringify({
              event: 'featured_notifier_run',
              dryRun: r.dryRun,
              scanned: r.scanned,
              eligible: r.eligible,
              notified: r.notified,
              skipped: r.skipped.length,
              failed: r.failed.length,
            })
          );
          for (const s of r.skipped) {
            console.log(JSON.stringify({ event: 'featured_notifier_skip', ...s }));
          }
          for (const f of r.failed) {
            console.error(JSON.stringify({ event: 'featured_notifier_fail', ...f }));
          }
        })
        .catch((error) => {
          console.error(
            JSON.stringify({
              event: 'featured_notifier_error',
              error: error instanceof Error ? error.message : String(error),
            })
          );
        })
    );
  },

  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/health') {
      return Response.json({
        ok: true,
        workflow: WORKFLOW_KEY,
        hasAirtableKey: Boolean(env.AIRTABLE_API_KEY),
        hasKnockKey: Boolean(env.KNOCK_API_KEY),
        armed: env.DRY_RUN === 'false' && Boolean(env.KNOCK_API_KEY),
      });
    }

    // GET /preview — resolve candidates without sending anything, ever.
    if (url.pathname === '/preview') {
      if (!authorized(request, env)) {
        return Response.json({ error: 'unauthorized' }, { status: 401 });
      }
      try {
        return Response.json(await run(env, true));
      } catch (error) {
        return Response.json(
          { error: error instanceof Error ? error.message : String(error) },
          { status: 500 }
        );
      }
    }

    // POST /run — honours DRY_RUN; only sends when explicitly armed.
    if (url.pathname === '/run' && request.method === 'POST') {
      if (!authorized(request, env)) {
        return Response.json({ error: 'unauthorized' }, { status: 401 });
      }
      try {
        return Response.json(await run(env));
      } catch (error) {
        return Response.json(
          { error: error instanceof Error ? error.message : String(error) },
          { status: 500 }
        );
      }
    }

    return Response.json({ error: 'not found' }, { status: 404 });
  },
};
