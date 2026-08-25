/**
 * Exception transparency loop — Airtable Webhooks delivery leg.
 *
 * The native Airtable automations are the loud, zero-dependency layer (they
 * post unthreaded channel messages instantly). This module is the enrichment
 * layer: an Airtable Webhooks API subscription pings the worker on ⚖️/⏸️
 * field changes from ANY edit surface (Airtable UI, interface, MCP, API) and
 * the worker adds everything native actions structurally cannot do:
 *
 *  - one Slack thread per Asset Version in #app-review-exceptions, with the
 *    root TS written back to 🔔Exception Slack TS;
 *  - a threaded decision reply into the version's submission thread
 *    (🔔Slack TS / 🔔Slack Channel), per partner-led ask 8/7/2026;
 *  - ⚖️Requested By / ⚖️Decision By stamping from the webhook payload's
 *    acting user (UI edits only — API-sourced payloads attribute the PAT
 *    owner, so they are never stamped);
 *  - auto-proposal of approved exceptions into the reviewer-exceptions base.
 *
 * Loop safety: the subscriptions watch ONLY ⚖️Exception Status, ⏸️Hold
 * Reason (versions) and ⚖️Status (items). This module's own writes touch
 * 🔔Exception Slack TS and the actor stamps — unwatched fields — so worker
 * writes never generate payloads.
 *
 * Runbook: docs/exception-transparency-loop.md
 */

import {
  AirtableClient,
  type FetchFn,
  type VersionExceptionWebhookContext,
} from './airtable.js';
import { FIELD_IDS, TABLE_IDS } from './schema.js';
import { SlackClient } from './slack.js';

// --- State -------------------------------------------------------------------

export interface RegisteredWebhook {
  id: string;
  tableId: string;
  macSecretBase64: string;
  cursor: number;
}

export interface WebhookLegState {
  webhooks: RegisteredWebhook[];
  notificationUrl: string;
  registeredAt: string;
}

export interface WebhookLegStateStore {
  get(): Promise<WebhookLegState | null>;
  put(state: WebhookLegState): Promise<void>;
  delete(): Promise<void>;
  /**
   * Single-flight guard. Airtable pings once per change — a burst of item
   * writes lands as near-simultaneous pings, each of which used to run its own
   * payload sweep from the same cursor and double-post every thread reply.
   * Only the lock holder processes; losers mark a pending sweep instead.
   */
  acquireLock(token: string, ttlMs: number): Promise<boolean>;
  releaseLock(token: string): Promise<void>;
  markPending(): Promise<void>;
  /** Returns true (and clears the marker) if a sweep was requested. */
  consumePending(): Promise<boolean>;
}

const STATE_KEY = 'exception-webhook-leg:v1';
const LOCK_KEY = 'exception-webhook-leg:lock';
const PENDING_KEY = 'exception-webhook-leg:pending';
const STATE_TABLE = 'app_review_webhook_state';

/** Structural subset of D1Database so src/ stays free of workers-types. */
export interface D1Like {
  prepare(query: string): {
    bind(...values: unknown[]): {
      first<T = Record<string, unknown>>(): Promise<T | null>;
      run(): Promise<unknown>;
    };
    run(): Promise<unknown>;
  };
}

/**
 * Webhook-leg state (webhook ids, MAC secrets, payload cursors) persisted in
 * the worker's existing D1 binding — one tiny namespaced table, created
 * lazily, so the leg needs no new infrastructure.
 */
export function createD1WebhookStateStore(db: D1Like): WebhookLegStateStore {
  let ensured = false;
  const ensureTable = async () => {
    if (ensured) return;
    await db
      .prepare(
        `CREATE TABLE IF NOT EXISTS ${STATE_TABLE} (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TEXT NOT NULL)`,
      )
      .run();
    ensured = true;
  };

  return {
    async get() {
      await ensureTable();
      const row = await db
        .prepare(`SELECT value FROM ${STATE_TABLE} WHERE key = ?`)
        .bind(STATE_KEY)
        .first<{ value: string }>();
      if (!row?.value) return null;
      try {
        return JSON.parse(row.value) as WebhookLegState;
      } catch {
        return null;
      }
    },
    async put(state) {
      await ensureTable();
      await db
        .prepare(
          `INSERT INTO ${STATE_TABLE} (key, value, updated_at) VALUES (?, ?, ?)
           ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
        )
        .bind(STATE_KEY, JSON.stringify(state), new Date().toISOString())
        .run();
    },
    async delete() {
      await ensureTable();
      await db.prepare(`DELETE FROM ${STATE_TABLE} WHERE key = ?`).bind(STATE_KEY).run();
    },
    // Lock value is `${expiresAtIso}|${token}` — ISO strings compare
    // lexicographically, so `value < nowIso` is exactly "lease expired".
    async acquireLock(token, ttlMs) {
      await ensureTable();
      const now = new Date();
      const nowIso = now.toISOString();
      await db
        .prepare(`DELETE FROM ${STATE_TABLE} WHERE key = ? AND value < ?`)
        .bind(LOCK_KEY, nowIso)
        .run();
      const value = `${new Date(now.getTime() + ttlMs).toISOString()}|${token}`;
      await db
        .prepare(
          `INSERT INTO ${STATE_TABLE} (key, value, updated_at) VALUES (?, ?, ?)
           ON CONFLICT(key) DO NOTHING`,
        )
        .bind(LOCK_KEY, value, nowIso)
        .run();
      const row = await db
        .prepare(`SELECT value FROM ${STATE_TABLE} WHERE key = ?`)
        .bind(LOCK_KEY)
        .first<{ value: string }>();
      return row?.value?.endsWith(`|${token}`) ?? false;
    },
    async releaseLock(token) {
      await ensureTable();
      const row = await db
        .prepare(`SELECT value FROM ${STATE_TABLE} WHERE key = ?`)
        .bind(LOCK_KEY)
        .first<{ value: string }>();
      if (row?.value?.endsWith(`|${token}`)) {
        await db.prepare(`DELETE FROM ${STATE_TABLE} WHERE key = ?`).bind(LOCK_KEY).run();
      }
    },
    async markPending() {
      await ensureTable();
      const nowIso = new Date().toISOString();
      await db
        .prepare(
          `INSERT INTO ${STATE_TABLE} (key, value, updated_at) VALUES (?, ?, ?)
           ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
        )
        .bind(PENDING_KEY, nowIso, nowIso)
        .run();
    },
    async consumePending() {
      await ensureTable();
      const row = await db
        .prepare(`SELECT value FROM ${STATE_TABLE} WHERE key = ?`)
        .bind(PENDING_KEY)
        .first<{ value: string }>();
      if (!row) return false;
      await db.prepare(`DELETE FROM ${STATE_TABLE} WHERE key = ?`).bind(PENDING_KEY).run();
      return true;
    },
  };
}

// --- MAC verification ----------------------------------------------------------

/**
 * Verify Airtable's `X-Airtable-Content-MAC` header: HMAC-SHA256 of the raw
 * request body keyed with the webhook's macSecretBase64 (decoded), hex-encoded
 * and prefixed with `hmac-sha256=`.
 */
export async function verifyAirtableContentMac(
  macSecretBase64: string,
  rawBody: string,
  macHeader: string | null,
): Promise<boolean> {
  if (!macHeader) return false;
  const prefix = 'hmac-sha256=';
  const provided = macHeader.startsWith(prefix) ? macHeader.slice(prefix.length) : macHeader;

  let secretBytes: Uint8Array<ArrayBuffer>;
  try {
    const binary = atob(macSecretBase64);
    secretBytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) secretBytes[i] = binary.charCodeAt(i);
  } catch {
    return false;
  }

  const key = await crypto.subtle.importKey(
    'raw',
    secretBytes,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(rawBody));
  const expected = [...new Uint8Array(signature)].map((b) => b.toString(16).padStart(2, '0')).join('');

  if (expected.length !== provided.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i += 1) {
    diff |= expected.charCodeAt(i) ^ provided.charCodeAt(i);
  }
  return diff === 0;
}

// --- Airtable Webhooks API (api.airtable.com/v0/bases/{baseId}/webhooks) -----

export interface WebhookApiConfig {
  fetchFn: FetchFn;
  apiKey: string;
  baseId: string;
}

async function webhookApiRequest<T>(
  cfg: WebhookApiConfig,
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const response = await cfg.fetchFn(`https://api.airtable.com/v0/bases/${cfg.baseId}/webhooks${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${cfg.apiKey}`,
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Airtable webhook API ${method} ${path || '/'} failed (${response.status}): ${detail.slice(0, 500)}`);
  }
  return (await response.json()) as T;
}

const WEBHOOK_SPECS: ReadonlyArray<{ tableId: string; watchDataInFieldIds: string[] }> = [
  {
    tableId: TABLE_IDS.assetVersions,
    watchDataInFieldIds: [FIELD_IDS.versions.exceptionStatus, FIELD_IDS.versions.holdReason],
  },
  {
    tableId: TABLE_IDS.exceptions,
    watchDataInFieldIds: [FIELD_IDS.exceptions.status],
  },
];

export async function registerExceptionWebhooks(
  cfg: WebhookApiConfig,
  notificationUrl: string,
): Promise<WebhookLegState> {
  const webhooks: RegisteredWebhook[] = [];
  try {
    for (const spec of WEBHOOK_SPECS) {
      const created = await webhookApiRequest<{ id: string; macSecretBase64: string }>(cfg, 'POST', '', {
        notificationUrl,
        specification: {
          options: {
            filters: {
              dataTypes: ['tableData'],
              recordChangeScope: spec.tableId,
              watchDataInFieldIds: spec.watchDataInFieldIds,
            },
          },
        },
      });
      webhooks.push({
        id: created.id,
        tableId: spec.tableId,
        macSecretBase64: created.macSecretBase64,
        cursor: 1,
      });
    }
  } catch (error) {
    for (const webhook of [...webhooks].reverse()) {
      try {
        await webhookApiRequest(cfg, 'DELETE', `/${webhook.id}`);
      } catch {
        // Preserve the registration failure; a later forced registration can
        // still clean up any subscription Airtable refused to delete here.
      }
    }
    throw error;
  }
  return {
    webhooks,
    notificationUrl,
    registeredAt: new Date().toISOString(),
  };
}

export async function deleteExceptionWebhooks(cfg: WebhookApiConfig, state: WebhookLegState): Promise<void> {
  for (const webhook of state.webhooks) {
    try {
      await webhookApiRequest(cfg, 'DELETE', `/${webhook.id}`);
    } catch {
      // Already gone (expired/deleted) — nothing to clean up.
    }
  }
}

export async function refreshExceptionWebhooks(
  cfg: WebhookApiConfig,
  state: WebhookLegState,
): Promise<{ refreshed: number; errors: string[] }> {
  let refreshed = 0;
  const errors: string[] = [];
  for (const webhook of state.webhooks) {
    try {
      await webhookApiRequest(cfg, 'POST', `/${webhook.id}/refresh`);
      refreshed += 1;
    } catch (error) {
      errors.push(`refresh ${webhook.id}: ${String(error)}`);
    }
  }
  return { refreshed, errors };
}

export async function listBaseWebhooks(cfg: WebhookApiConfig): Promise<unknown> {
  return webhookApiRequest(cfg, 'GET', '');
}

// --- Payload processing --------------------------------------------------------

interface WebhookPayloadUser {
  id?: string;
  email?: string;
  name?: string;
}

interface WebhookRecordChange {
  current?: { cellValuesByFieldId?: Record<string, unknown> };
  previous?: { cellValuesByFieldId?: Record<string, unknown> };
}

export interface AirtableWebhookPayload {
  timestamp?: string;
  actionMetadata?: {
    source?: string;
    sourceMetadata?: { user?: WebhookPayloadUser };
  };
  changedTablesById?: Record<
    string,
    {
      changedRecordsById?: Record<string, WebhookRecordChange>;
    }
  >;
}

interface PayloadListResponse {
  payloads: AirtableWebhookPayload[];
  cursor: number;
  mightHaveMore: boolean;
}

export interface ExceptionWebhookProcessorDeps {
  airtable: AirtableClient;
  slack: SlackClient;
  store: WebhookLegStateStore;
  webhookApi: WebhookApiConfig;
  exceptionChannelId: string;
  /** View-scoped record URL base ending in `/` (decision fields visible). */
  versionViewUrlBase: string;
  /** Reviewer-exceptions knowledge base for auto-proposal; omit to skip. */
  kb?: { apiKey: string; baseId: string; tableId: string } | null;
  logger?: (message: string) => void;
}

export interface ProcessResult {
  processedPayloads: number;
  actions: string[];
  errors: string[];
}

function selectName(value: unknown): string | null {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object' && typeof (value as { name?: unknown }).name === 'string') {
    return (value as { name: string }).name;
  }
  return null;
}

function clip(text: string, max = 3000): string {
  return text.length > max ? `${text.slice(0, max)}\n…(truncated — full text on the record)` : text;
}

/** Only trust acting-user identity for direct UI edits. API-sourced payloads
 * attribute the PAT owner and automation-sourced payloads have no user. */
function actingUser(payload: AirtableWebhookPayload): WebhookPayloadUser | null {
  if (payload.actionMetadata?.source !== 'client') return null;
  return payload.actionMetadata.sourceMetadata?.user ?? null;
}

const PROCESS_LOCK_TTL_MS = 120_000;
const MAX_PENDING_ROUNDS = 5;

export async function processExceptionWebhookPayloads(
  deps: ExceptionWebhookProcessorDeps,
): Promise<ProcessResult> {
  const log = deps.logger ?? (() => {});
  const result: ProcessResult = { processedPayloads: 0, actions: [], errors: [] };

  const token = crypto.randomUUID();
  if (!(await deps.store.acquireLock(token, PROCESS_LOCK_TTL_MS))) {
    // Another ping's sweep is mid-flight and will re-run for us (pending
    // marker); this invocation's payloads stay queued at the cursor.
    await deps.store.markPending();
    result.actions.push('lock-busy: pending sweep marked');
    return result;
  }

  try {
    let rounds = 0;
    do {
      await runProcessingPass(deps, result);
      rounds += 1;
    } while (rounds < MAX_PENDING_ROUNDS && (await deps.store.consumePending()));
  } finally {
    await deps.store.releaseLock(token);
  }

  if (result.actions.length > 0) log(`exception-webhook actions: ${result.actions.join('; ')}`);
  if (result.errors.length > 0) log(`exception-webhook errors: ${result.errors.join('; ')}`);
  return result;
}

async function runProcessingPass(
  deps: ExceptionWebhookProcessorDeps,
  result: ProcessResult,
): Promise<void> {
  const state = await deps.store.get();
  if (!state) {
    result.errors.push('No webhook state — register first (POST /webhooks/airtable/register).');
    return;
  }

  for (const webhook of state.webhooks) {
    let cursor = webhook.cursor;
    let mightHaveMore = true;

    while (mightHaveMore) {
      let page: PayloadListResponse;
      try {
        page = await webhookApiRequest<PayloadListResponse>(
          deps.webhookApi,
          'GET',
          `/${webhook.id}/payloads?cursor=${cursor}&limit=50`,
        );
      } catch (error) {
        result.errors.push(`payloads ${webhook.id}: ${String(error)}`);
        break;
      }

      let pageFailed = false;
      for (const payload of page.payloads) {
        result.processedPayloads += 1;
        try {
          await handlePayload(deps, webhook.tableId, payload, result);
        } catch (error) {
          result.errors.push(`payload (${webhook.tableId}): ${String(error)}`);
          pageFailed = true;
          break;
        }
      }

      if (pageFailed) break;

      mightHaveMore = page.mightHaveMore;
      cursor = page.cursor;
      webhook.cursor = cursor;
      await deps.store.put(state);
      if (page.payloads.length === 0 && !mightHaveMore) break;
    }
  }
}

async function handlePayload(
  deps: ExceptionWebhookProcessorDeps,
  tableId: string,
  payload: AirtableWebhookPayload,
  result: ProcessResult,
): Promise<void> {
  const table = payload.changedTablesById?.[tableId];
  if (!table?.changedRecordsById) return;
  const user = actingUser(payload);

  for (const [recordId, change] of Object.entries(table.changedRecordsById)) {
    const cells = change.current?.cellValuesByFieldId ?? {};

    if (tableId === TABLE_IDS.assetVersions) {
      if (FIELD_IDS.versions.exceptionStatus in cells) {
        const status = selectName(cells[FIELD_IDS.versions.exceptionStatus]);
        await handleVersionExceptionStatus(deps, recordId, status, user, result);
      }
      if (FIELD_IDS.versions.holdReason in cells) {
        const holdReason = selectName(cells[FIELD_IDS.versions.holdReason]);
        await handleVersionHold(deps, recordId, holdReason, user, result);
      }
    } else if (tableId === TABLE_IDS.exceptions) {
      if (FIELD_IDS.exceptions.status in cells) {
        const status = selectName(cells[FIELD_IDS.exceptions.status]);
        await handleExceptionItemStatus(deps, recordId, status, user, result);
      }
    }
  }
}

function versionHeader(ctx: VersionExceptionWebhookContext): string {
  return `\`${ctx.name ?? ctx.id}\`${ctx.creatorName ? ` by ${ctx.creatorName}` : ''}`;
}

function versionLink(deps: ExceptionWebhookProcessorDeps, versionId: string): string {
  return `<${deps.versionViewUrlBase}${versionId}|Open Asset Version>`;
}

/** Post the thread root if the version has none yet; returns the thread TS. */
async function ensureThreadRoot(
  deps: ExceptionWebhookProcessorDeps,
  ctx: VersionExceptionWebhookContext,
  rootText: string | null,
  result: ProcessResult,
): Promise<string> {
  if (ctx.exceptionSlackTs) return ctx.exceptionSlackTs;
  const text =
    rootText ??
    [
      `:scales: *Exception thread* — ${versionHeader(ctx)}`,
      `Decisions live on the Asset Version: ${versionLink(deps, ctx.id)}`,
    ].join('\n');
  const posted = await deps.slack.postMessage({ channel: deps.exceptionChannelId, text });
  await deps.airtable.writeVersionExceptionSlackTs(ctx.id, posted.ts);
  ctx.exceptionSlackTs = posted.ts;
  result.actions.push(`thread-root ${ctx.id}`);
  return posted.ts;
}

async function replyInThread(
  deps: ExceptionWebhookProcessorDeps,
  threadTs: string,
  text: string,
): Promise<void> {
  await deps.slack.postMessage({ channel: deps.exceptionChannelId, text, threadTs });
}

async function handleVersionExceptionStatus(
  deps: ExceptionWebhookProcessorDeps,
  versionId: string,
  status: string | null,
  user: WebhookPayloadUser | null,
  result: ProcessResult,
): Promise<void> {
  if (!status) return; // status cleared — nothing to narrate
  const ctx = await deps.airtable.getVersionExceptionWebhookContext(versionId);
  if (!ctx) {
    result.errors.push(`version ${versionId} not found`);
    return;
  }
  const header = versionHeader(ctx);
  const link = versionLink(deps, versionId);

  if (status === '🆕Requested') {
    const rootText = [
      `:scales: *Exception Requested* — ${header}`,
      ctx.exceptionType ? `*Type:* ${ctx.exceptionType}` : null,
      user?.name ? `*Raised by:* ${user.name}` : null,
      ctx.exceptionRationale ? `\n*Rationale:*\n${clip(ctx.exceptionRationale)}` : null,
      `\n:thread: Discuss here. Approve/deny via ⚖️Exception Status: ${link}`,
    ]
      .filter(Boolean)
      .join('\n');

    if (ctx.exceptionSlackTs) {
      await replyInThread(deps, ctx.exceptionSlackTs, `:scales: Exception *re-requested* — ${header}${ctx.exceptionRationale ? `\n*Rationale:*\n${clip(ctx.exceptionRationale)}` : ''}`);
    } else {
      const ts = await ensureThreadRoot(deps, ctx, rootText, result);
      if (ctx.reviewFeedback?.trim()) {
        await replyInThread(deps, ts, `:memo: *Latest review feedback* (from 📝Review Feedback):\n${clip(ctx.reviewFeedback.trim(), 3500)}`);
      }
    }
    result.actions.push(`requested ${versionId}`);

    if (user?.email && !ctx.exceptionRequestedBy) {
      await deps.airtable.stampVersionExceptionActor(versionId, 'requested', user.email);
      result.actions.push(`stamp-requested-by ${versionId}`);
    }
    return;
  }

  if (status === '👀Under Review') {
    const ts = await ensureThreadRoot(deps, ctx, null, result);
    await replyInThread(deps, ts, `:eyes: Exception now *under review*${user?.name ? ` (${user.name})` : ''}.`);
    result.actions.push(`under-review ${versionId}`);
    return;
  }

  if (status === '✅Approved' || status === '❌Denied') {
    const approved = status === '✅Approved';
    let promotionNote = '';

    if (approved && deps.kb) {
      try {
        const proposal = await deps.airtable.proposeReviewerExceptionGuidance({
          apiKey: deps.kb.apiKey,
          baseId: deps.kb.baseId,
          tableId: deps.kb.tableId,
          title: `App exception: ${ctx.name ?? versionId}${ctx.exceptionType ? ` — ${ctx.exceptionType}` : ''}`,
          guidance: ctx.exceptionDecisionNotes || ctx.exceptionRationale || '',
          sourceRecordId: versionId,
          sourceUrl: `${deps.versionViewUrlBase}${versionId}`,
        });
        promotionNote = `\n\n:books: Proposed as reviewer-exception guidance (\`${proposal.id}\`) — needs curation before it becomes Active.`;
      } catch (error) {
        promotionNote = '\n\n:warning: Auto-proposal to the reviewer-exceptions base failed — propose manually.';
        result.errors.push(`kb-proposal ${versionId}: ${String(error)}`);
      }
    }

    const decisionText =
      [
        `${approved ? ':white_check_mark: *Exception APPROVED*' : ':x: *Exception DENIED*'} — ${header}`,
        user?.name ? `*Decision by:* ${user.name}` : null,
        ctx.exceptionDecisionNotes ? `\n*Decision notes:*\n${clip(ctx.exceptionDecisionNotes)}` : null,
        approved
          ? '\n_This approves the exception only — the version still requires full review (including a testing round) before ✅Approval._'
          : null,
      ]
        .filter(Boolean)
        .join('\n') + promotionNote;

    const ts = await ensureThreadRoot(deps, ctx, null, result);
    await replyInThread(deps, ts, decisionText);
    result.actions.push(`${approved ? 'approved' : 'denied'} ${versionId}`);

    if (ctx.submissionSlackTs && ctx.submissionSlackChannel) {
      const submissionText = [
        `:scales: *Exception decision* for this submission: ${approved ? '✅ APPROVED' : '❌ DENIED'}${ctx.exceptionType ? ` — ${ctx.exceptionType}` : ''}`,
        ctx.exceptionDecisionNotes ? clip(ctx.exceptionDecisionNotes, 2000) : null,
        approved
          ? '_The exemption covers the listed item(s) only — the version still requires full review before approval._'
          : null,
        link,
      ]
        .filter(Boolean)
        .join('\n');
      try {
        await deps.slack.postMessage({
          channel: ctx.submissionSlackChannel,
          text: submissionText,
          threadTs: ctx.submissionSlackTs,
        });
        result.actions.push(`submission-thread ${versionId}`);
      } catch (error) {
        result.errors.push(`submission-thread ${versionId}: ${String(error)}`);
      }
    }

    if (user?.email && !ctx.exceptionDecisionBy) {
      await deps.airtable.stampVersionExceptionActor(versionId, 'decision', user.email);
      result.actions.push(`stamp-decision-by ${versionId}`);
    }
    return;
  }

  if (status === '🔙Withdrawn') {
    if (ctx.exceptionSlackTs) {
      await replyInThread(
        deps,
        ctx.exceptionSlackTs,
        `:leftwards_arrow_with_hook: Exception request *withdrawn*${user?.name ? ` (${user.name})` : ''}.`,
      );
      result.actions.push(`withdrawn ${versionId}`);
    }
  }
}

async function handleVersionHold(
  deps: ExceptionWebhookProcessorDeps,
  versionId: string,
  holdReason: string | null,
  user: WebhookPayloadUser | null,
  result: ProcessResult,
): Promise<void> {
  if (!holdReason) return;
  const ctx = await deps.airtable.getVersionExceptionWebhookContext(versionId);
  if (!ctx) return;
  // The native hold automation already posts the loud channel message. Only
  // add to the thread when one exists — the thread roots on the exception.
  if (!ctx.exceptionSlackTs) return;
  const text = [
    `:double_vertical_bar: Hold reason set: *${holdReason}*${user?.name ? ` (by ${user.name})` : ''}`,
    ctx.holdNotes ? `\n*Notes:*\n${clip(ctx.holdNotes, 2000)}` : null,
  ]
    .filter(Boolean)
    .join('\n');
  await replyInThread(deps, ctx.exceptionSlackTs, text);
  result.actions.push(`hold ${versionId}`);
}

async function handleExceptionItemStatus(
  deps: ExceptionWebhookProcessorDeps,
  itemId: string,
  status: string | null,
  user: WebhookPayloadUser | null,
  result: ProcessResult,
): Promise<void> {
  if (!status) return;
  const item = await deps.airtable.getExceptionItemWebhookContext(itemId);
  if (!item) {
    result.errors.push(`exception item ${itemId} not found`);
    return;
  }

  if (user?.email) {
    if (status === '🆕Requested' && !item.requestedBy) {
      await deps.airtable.stampExceptionItemActor(itemId, 'requested', user.email);
      result.actions.push(`stamp-item-requested-by ${itemId}`);
    } else if ((status === '✅Approved' || status === '❌Denied') && !item.decisionBy) {
      await deps.airtable.stampExceptionItemActor(itemId, 'decision', user.email);
      result.actions.push(`stamp-item-decision-by ${itemId}`);
    }
  }

  if (!item.versionId) return;
  const ctx = await deps.airtable.getVersionExceptionWebhookContext(item.versionId);
  if (!ctx) return;

  const itemLabel = item.item ? `“${item.item}”` : `\`${itemId}\``;
  let text: string | null = null;
  if (status === '🆕Requested') {
    text = [
      `:scales: Exception item requested — ${itemLabel}`,
      item.type ? `*Type:* ${item.type}` : null,
      user?.name ? `*Raised by:* ${user.name}` : null,
      item.rationale ? `\n*Rationale:*\n${clip(item.rationale, 2000)}` : null,
    ]
      .filter(Boolean)
      .join('\n');
  } else if (status === '👀Under Review') {
    text = `:eyes: Exception item under review — ${itemLabel}${user?.name ? ` (${user.name})` : ''}`;
  } else if (status === '✅Approved' || status === '❌Denied') {
    const approved = status === '✅Approved';
    text = [
      `${approved ? ':white_check_mark: Exception item *APPROVED*' : ':x: Exception item *DENIED*'} — ${itemLabel}`,
      user?.name ? `*Decision by:* ${user.name}` : null,
      item.decisionNotes ? `\n*Decision notes:*\n${clip(item.decisionNotes, 2000)}` : null,
      approved ? '\n_This approves this item only — other items and the full review still gate approval._' : null,
    ]
      .filter(Boolean)
      .join('\n');
  } else if (status === '🔙Withdrawn') {
    text = `:leftwards_arrow_with_hook: Exception item *withdrawn* — ${itemLabel}${user?.name ? ` (${user.name})` : ''}`;
  }

  if (!text) return;
  const ts = await ensureThreadRoot(deps, ctx, null, result);
  await replyInThread(deps, ts, text);
  result.actions.push(`item ${status} ${itemId}`);
}
