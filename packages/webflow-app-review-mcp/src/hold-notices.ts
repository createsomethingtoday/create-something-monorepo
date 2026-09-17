/**
 * Developer-facing hold notices for the exception loop (Gap 2, 9/16/2026).
 *
 * The intake hold used to be silent to the developer: the reviewer got a DM,
 * the channel got a post, the developer's Zendesk thread got nothing. Flowout
 * sat 29 days on "no action required." This module owns the two developer
 * touches the hold now makes:
 *
 *  - the notice, sent by the webhook leg when ⏸️Hold Reason becomes
 *    "Pending Exception Decision" on a version with a linked ticket
 *    (see exception-webhook.ts handleVersionHold);
 *  - the reminder, sent by the worker cron every HOLD_REMINDER_INTERVAL_DAYS
 *    while the version is still held — and ONLY for holds whose notice was
 *    recorded here. Legacy holds (before this shipped) never get an
 *    auto-reminder on top of whatever the reviewer wrote by hand.
 *
 * Both messages are creator-facing: plain language, greeting and sign-off,
 * no internal vocabulary (exception, Airtable, blocker, ⚖️). They render
 * through the same escape-first markdown path as review emails.
 */

import type { AirtableClient } from './airtable.js';
import type { SlackClient } from './slack.js';
import { renderCreatorFacingHtml, type ZendeskClient } from './zendesk.js';

export const HOLD_REMINDER_INTERVAL_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;

export interface HoldNoticeRecord {
  /** Null while the notice is pending a ticket (see pendingSince). */
  ticketId: string | null;
  /** ISO datetime the developer notice went out; null while pending. */
  noticeAt: string | null;
  reminders: number;
  lastReminderAt?: string;
  /**
   * Set when the hold fired before the Zap wrote the Zendesk ticket ID onto the
   * version (Awesome Popups v6, 9/17/2026: version 06:12:06Z, ticket 06:12:25Z).
   * The sweep completes the notice once the ticket exists, then clears this.
   */
  pendingSince?: string;
  /** Set by the sweep when the version left the hold; closed records are never touched again. */
  closedAt?: string;
}

export interface HoldNoticeStore {
  get(versionId: string): Promise<HoldNoticeRecord | null>;
  put(versionId: string, record: HoldNoticeRecord): Promise<void>;
  list(): Promise<Array<{ versionId: string } & HoldNoticeRecord>>;
}

const KEY_PREFIX = 'hold-notice:';
const STATE_TABLE = 'app_review_webhook_state';

/** Structural subset of D1Database so src/ stays free of workers-types. */
export interface HoldNoticeD1Like {
  prepare(query: string): {
    bind(...values: unknown[]): {
      first<T = Record<string, unknown>>(): Promise<T | null>;
      run(): Promise<unknown>;
    };
    all<T = Record<string, unknown>>(): Promise<{ results: T[] }>;
    run(): Promise<unknown>;
  };
}

/** Hold-notice records share the webhook leg's tiny D1 key/value table. */
export function createD1HoldNoticeStore(db: HoldNoticeD1Like): HoldNoticeStore {
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
    async get(versionId) {
      await ensureTable();
      const row = await db
        .prepare(`SELECT value FROM ${STATE_TABLE} WHERE key = ?`)
        .bind(`${KEY_PREFIX}${versionId}`)
        .first<{ value: string }>();
      return row ? (JSON.parse(row.value) as HoldNoticeRecord) : null;
    },
    async put(versionId, record) {
      await ensureTable();
      await db
        .prepare(
          `INSERT INTO ${STATE_TABLE} (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
        )
        .bind(`${KEY_PREFIX}${versionId}`, JSON.stringify(record), new Date().toISOString())
        .run();
    },
    async list() {
      await ensureTable();
      const { results } = await db
        .prepare(`SELECT key, value FROM ${STATE_TABLE} WHERE key LIKE '${KEY_PREFIX}%'`)
        .all<{ key: string; value: string }>();
      return results.map((row) => ({
        versionId: row.key.slice(KEY_PREFIX.length),
        ...(JSON.parse(row.value) as HoldNoticeRecord),
      }));
    },
  };
}

// --- Developer-facing copy -----------------------------------------------------

export interface HoldNoticeCopyInput {
  appName: string;
  versionNumber: number | null;
  creatorName: string | null;
}

function greeting(creatorName: string | null): string {
  return `Hi ${creatorName?.trim() || 'there'},`;
}

function versionLabel(input: HoldNoticeCopyInput): string {
  return input.versionNumber !== null && input.versionNumber !== undefined
    ? `${input.appName} v${input.versionNumber}`
    : input.appName;
}

export function renderHoldNoticeMarkdown(input: HoldNoticeCopyInput): string {
  return [
    greeting(input.creatorName),
    '',
    `We received ${versionLabel(input)} and it is in our review queue. Before we can start the testing round, our team needs to make an internal policy decision on findings carried over from your previous version. That decision is on our side, and there is nothing you need to do right now.`,
    '',
    'If this version already fixed some of the items from your last review, reply here and tell us which ones. We will verify those first so they stop counting against your submission while the rest is decided.',
    '',
    'We will write back on this thread as soon as the decision lands.',
    '',
    'The Webflow Marketplace Team',
  ].join('\n');
}

export function renderHoldReminderMarkdown(input: HoldNoticeCopyInput & { daysOnHold: number }): string {
  return [
    greeting(input.creatorName),
    '',
    `A quick update on ${versionLabel(input)}: it has been on hold for ${input.daysOnHold} days while our team finishes an internal policy decision. That is longer than we aim for, and we are sorry for the wait. There is still nothing you need to do right now.`,
    '',
    'If you have fixed any items from your last review in the meantime, reply here and tell us which ones so we can verify them ahead of the decision.',
    '',
    'The Webflow Marketplace Team',
  ].join('\n');
}

// --- Reminder sweep (worker cron) ---------------------------------------------

export interface HoldReminderDeps {
  zendesk: ZendeskClient;
  slack: SlackClient;
  airtable: AirtableClient;
  store: HoldNoticeStore;
  exceptionChannelId: string;
  /** View-scoped record URL base ending in `/`. */
  versionViewUrlBase: string;
  now?: () => Date;
  logger?: (message: string) => void;
}

export interface HoldReminderResult {
  /** Pending notices completed this pass (ticket appeared after the hold). */
  noticed: string[];
  reminded: string[];
  closed: string[];
  skipped: string[];
  errors: string[];
}

function daysBetween(fromIso: string, to: Date): number {
  return Math.floor((to.getTime() - new Date(fromIso).getTime()) / DAY_MS);
}

/**
 * Walk recorded hold notices. A version that left the hold is closed out
 * silently; a version still held past the interval (since the notice or the
 * last reminder) gets one public ticket reminder plus a channel nudge so the
 * decision-makers see the clock too.
 */
export async function sendPendingHoldReminders(deps: HoldReminderDeps): Promise<HoldReminderResult> {
  const now = (deps.now ?? (() => new Date()))();
  const log = deps.logger ?? (() => {});
  const result: HoldReminderResult = { noticed: [], reminded: [], closed: [], skipped: [], errors: [] };

  const records = await deps.store.list();
  for (const record of records) {
    if (record.closedAt) continue;
    const { versionId, ...notice } = record;
    try {
      const version = await deps.airtable.getVersionById(versionId);
      const stillHeld =
        version !== null &&
        version.reviewStatus === '⏸️On Hold' &&
        version.holdReason === 'Pending Exception Decision';
      if (!stillHeld) {
        await deps.store.put(versionId, { ...notice, closedAt: now.toISOString() });
        result.closed.push(versionId);
        continue;
      }

      const asset = version.assetId ? await deps.airtable.getAssetById(version.assetId) : null;
      const appName = asset?.appName ?? version.versionId;
      const versionLabelText = `${appName}${version.versionNumber !== undefined ? ` v${version.versionNumber}` : ''}`;
      const copy = { appName, versionNumber: version.versionNumber ?? null, creatorName: null };
      const link = `<${deps.versionViewUrlBase}${versionId}|Open Asset Version>`;

      // Pending: the hold fired before the ticket existed. Complete the notice now.
      if (notice.noticeAt === null) {
        const ticketId = version.zendeskTicketId ?? notice.ticketId;
        if (!ticketId) {
          result.skipped.push(versionId);
          continue;
        }
        await deps.zendesk.addTicketComment(ticketId, {
          htmlBody: renderCreatorFacingHtml(renderHoldNoticeMarkdown(copy)),
          isPublic: true,
        });
        const { pendingSince: _pendingSince, ...rest } = notice;
        await deps.store.put(versionId, { ...rest, ticketId, noticeAt: now.toISOString(), reminders: 0 });
        await deps.slack.postMessage({
          channel: deps.exceptionChannelId,
          text: [
            `:mailbox_with_mail: Developer hold notice sent — \`${versionLabelText}\` on Zendesk ticket ${ticketId}.`,
            `The ticket ID landed on the version after the hold fired, so the notice went out on the sweep${notice.pendingSince ? ` (${Math.round((now.getTime() - new Date(notice.pendingSince).getTime()) / 60000)} min late)` : ''}.`,
            link,
          ].join('\n'),
        });
        result.noticed.push(versionId);
        continue;
      }

      const sinceIso = notice.lastReminderAt ?? notice.noticeAt;
      if (daysBetween(sinceIso, now) < HOLD_REMINDER_INTERVAL_DAYS) {
        result.skipped.push(versionId);
        continue;
      }

      const daysOnHold = daysBetween(notice.noticeAt, now);
      const ticketId = version.zendeskTicketId ?? notice.ticketId;
      if (!ticketId) {
        result.skipped.push(versionId);
        continue;
      }

      await deps.zendesk.addTicketComment(ticketId, {
        htmlBody: renderCreatorFacingHtml(renderHoldReminderMarkdown({ ...copy, daysOnHold })),
        isPublic: true,
      });
      const nth = notice.reminders + 1;
      await deps.slack.postMessage({
        channel: deps.exceptionChannelId,
        text: [
          `:hourglass_flowing_sand: *Still on hold ${daysOnHold} days* — \`${versionLabelText}\``,
          `Developer reminded on Zendesk ticket ${ticketId} (reminder ${nth}). The hold clears when every ⚖️ row on this app is decided or resolved in resubmission.`,
          link,
        ].join('\n'),
      });
      await deps.store.put(versionId, { ...notice, reminders: nth, lastReminderAt: now.toISOString() });
      result.reminded.push(versionId);
    } catch (error) {
      result.errors.push(`${versionId}: ${String(error)}`);
    }
  }

  if (result.noticed.length > 0 || result.reminded.length > 0 || result.errors.length > 0) {
    log(`hold-reminders noticed=${result.noticed.join(',') || '-'} reminded=${result.reminded.join(',') || '-'} closed=${result.closed.join(',') || '-'} errors=${result.errors.join('; ') || '-'}`);
  }
  return result;
}
