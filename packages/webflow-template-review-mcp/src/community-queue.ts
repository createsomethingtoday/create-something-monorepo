// Marketplace Creators community response queue.
//
// The queue lives in another system: the Bettermode creator agent keeps one
// item for each community thread where a creator is waiting for staff. These
// tools let a signed-in reviewer read that queue, and let a community-queue
// admin edit a draft, dismiss an item, or send a reply.
//
// The Worker reaches the queue through a private service binding (the creator
// MCP's `QueueApi` entrypoint). That entrypoint does no access check, so every
// rule about who may do what is enforced here.

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { ReviewerProfile } from './reviewer-directory.js';

type WriteResult = { ok: true; queue_id?: string } | { ok: false; reason: string };
type SendResult = { ok: true; reply_id: string | null } | { ok: false; error: string };

export interface CommunityQueueItem {
  post_id: string;
  url: string | null;
  title: string | null;
  status: string;
  waiting_since: string | null;
  hours_waiting: number | null;
  started_by: string | null;
  waiting_on: string | null;
  message_count: number | null;
  excerpt: string;
  draft: { id: string; text: string; reasoning: string | null; created_at: string | null } | null;
  last_error: string | null;
  synced_at: string | null;
}

export interface CommunityQueueHealth {
  generated_at: string;
  sweep: {
    last_run_at: string | null;
    status: string | null;
    error: string | null;
    checked: number | null;
    missed: number | null;
    stale: number | null;
    reverified: number | null;
    minutes_since: number | null;
    healthy: boolean;
  };
  webhook: {
    last_event_at: string | null;
    last_event: string | null;
    events_recorded: number;
    hours_since: number | null;
  };
  counts: { open: number; new: number; queued: number; responded: number; dismissed: number };
  drafts: { pending: number; sending: number };
  oldest_wait_hours: number | null;
  sends: { last_7_days: number; not_published: number };
  errors: Array<{ post_id: string; title: string | null; url: string | null; error: string }>;
}

/** The creator MCP's `QueueApi` entrypoint, as this Worker calls it. */
export interface CommunityQueueBinding {
  listQueue(input?: { limit?: number }): Promise<{ count: number; items: CommunityQueueItem[] }>;
  getThread(input: { postId: string }): Promise<Record<string, unknown>>;
  health(): Promise<CommunityQueueHealth>;
  history(input?: { limit?: number }): Promise<{ count: number; items: Array<Record<string, unknown>> }>;
  saveDraft(input: { postId: string; draft: string; note?: string | null }): Promise<WriteResult>;
  dismiss(input: { postId: string; reason: string }): Promise<WriteResult>;
  sendDraft(input: { postId: string; draft: string; requestedBy?: string | null }): Promise<SendResult>;
}

export interface CommunityQueueConfig {
  /** Returns null when the binding is absent; the tools then fail closed. */
  getBinding?: () => CommunityQueueBinding | null;
}

/** Tools that change the queue or post in the community. */
export const COMMUNITY_QUEUE_WRITE_TOOL_NAMES = [
  'template_review_community_save_draft',
  'template_review_community_dismiss',
  'template_review_community_send',
] as const;

class CommunityQueueError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

function jsonContent(value: unknown, isError = false) {
  return {
    content: [{ type: 'text' as const, text: JSON.stringify(value, null, 2) }],
    ...(isError ? { isError: true } : {}),
  };
}

function asError(error: unknown) {
  if (error instanceof CommunityQueueError) {
    return jsonContent({ ok: false, error: { code: error.code, message: error.message, status: error.status } }, true);
  }
  const message = error instanceof Error ? error.message : String(error);
  return jsonContent({ ok: false, error: { code: 'COMMUNITY_QUEUE_UNAVAILABLE', message, status: 502 } }, true);
}

function requireBinding(config: CommunityQueueConfig): CommunityQueueBinding {
  const binding = config.getBinding?.() ?? null;
  if (!binding) {
    throw new CommunityQueueError(
      'COMMUNITY_QUEUE_NOT_CONFIGURED',
      'The community response queue is not connected on this deployment (COMMUNITY_QUEUE binding missing).',
      503,
    );
  }
  return binding;
}

function requireAdmin(getReviewer: () => ReviewerProfile | null): ReviewerProfile {
  const reviewer = getReviewer();
  if (!reviewer?.communityQueueAdmin) {
    throw new CommunityQueueError(
      'COMMUNITY_QUEUE_ADMIN_REQUIRED',
      'Only a community-queue admin may change the queue or reply in the Marketplace Creators space. Read tools stay open to reviewers.',
      403,
    );
  }
  return reviewer;
}

/** One flat row for each open item, so a table or dashboard can show it as it comes. */
export function flattenQueueItem(item: CommunityQueueItem) {
  return {
    post_id: item.post_id,
    url: item.url,
    title: item.title,
    status: item.status,
    waiting_since: item.waiting_since,
    hours_waiting: item.hours_waiting,
    started_by: item.started_by,
    waiting_on: item.waiting_on,
    message_count: item.message_count,
    excerpt: item.excerpt,
    has_draft: item.draft ? 1 : 0,
    draft_text: item.draft?.text ?? null,
    draft_note: item.draft?.reasoning ?? null,
    draft_at: item.draft?.created_at ?? null,
    last_error: item.last_error,
    synced_at: item.synced_at,
  };
}

/** Health as one flat row. `viewer_can_write` tells a page whether to offer actions. */
export function flattenHealth(health: CommunityQueueHealth, viewerCanWrite: boolean) {
  return {
    generated_at: health.generated_at,
    sweep_last_run_at: health.sweep.last_run_at,
    sweep_status: health.sweep.status,
    sweep_error: health.sweep.error,
    sweep_minutes_since: health.sweep.minutes_since,
    sweep_healthy: health.sweep.healthy ? 1 : 0,
    sweep_checked: health.sweep.checked,
    sweep_missed: health.sweep.missed,
    sweep_stale: health.sweep.stale,
    sweep_reverified: health.sweep.reverified,
    webhook_last_event_at: health.webhook.last_event_at,
    webhook_last_event: health.webhook.last_event,
    webhook_hours_since: health.webhook.hours_since,
    webhook_events_recorded: health.webhook.events_recorded,
    open: health.counts.open,
    open_without_draft: health.counts.new,
    open_with_draft: health.counts.queued,
    responded: health.counts.responded,
    dismissed: health.counts.dismissed,
    drafts_pending: health.drafts.pending,
    sends_in_progress: health.drafts.sending,
    oldest_wait_hours: health.oldest_wait_hours,
    sends_last_7_days: health.sends.last_7_days,
    sends_not_published: health.sends.not_published,
    error_count: health.errors.length,
    viewer_can_write: viewerCanWrite ? 1 : 0,
  };
}

export function registerCommunityQueueTools(
  server: Pick<McpServer, 'tool'>,
  getReviewer: () => ReviewerProfile | null,
  config: CommunityQueueConfig = {},
): void {
  server.tool(
    'template_review_community_queue',
    'Marketplace Creators community response queue: threads in the Bettermode Marketplace Creators space where a creator spoke last, longest wait first. One flat row for each thread: post_id, url, title, status (new = no current draft, queued = draft ready), waiting_since, hours_waiting, who is waiting, the reply draft (draft_text) and any error. Read-only.',
    { limit: z.number().int().min(1).max(100).optional() },
    async ({ limit }) => {
      try {
        const result = await requireBinding(config).listQueue({ limit: limit ?? 50 });
        return jsonContent({ ok: true, count: result.count, data: result.items.map(flattenQueueItem) });
      } catch (error) {
        return asError(error);
      }
    },
  );

  server.tool(
    'template_review_community_thread',
    'Read one Marketplace Creators community thread by post ID: title, link, and each published message with its author name, time, and whether staff wrote it, oldest first. Use it before a draft is written or changed. Read-only.',
    { post_id: z.string().min(1) },
    async ({ post_id }) => {
      try {
        const thread = await requireBinding(config).getThread({ postId: post_id });
        return jsonContent({ ok: true, data: thread });
      } catch (error) {
        return asError(error);
      }
    },
  );

  server.tool(
    'template_review_community_health',
    'Health of the Marketplace Creators response queue as one flat row: when the 30-minute sweep last ran and what it found, when the last Bettermode webhook arrived, item counts by state, open drafts, the longest wait, replies sent in the last 7 days and how many are not published. `errors` lists open items with a sync error. `viewer_can_write` is 1 when the signed-in reviewer may edit, dismiss and send. Read-only.',
    {},
    async () => {
      try {
        const health = await requireBinding(config).health();
        const canWrite = Boolean(getReviewer()?.communityQueueAdmin);
        return jsonContent({ ok: true, data: [flattenHealth(health, canWrite)], errors: health.errors });
      } catch (error) {
        return asError(error);
      }
    },
  );

  server.tool(
    'template_review_community_history',
    'Closed items of the Marketplace Creators response queue, newest first. outcome: sent (a reply went out through the queue), answered (staff replied in Bettermode), dismissed (closed with a reason, in detail), removed (post unavailable). Read-only.',
    { limit: z.number().int().min(1).max(100).optional() },
    async ({ limit }) => {
      try {
        const result = await requireBinding(config).history({ limit: limit ?? 30 });
        return jsonContent({ ok: true, count: result.count, data: result.items });
      } catch (error) {
        return asError(error);
      }
    },
  );

  server.tool(
    'template_review_community_save_draft',
    'Save a reply draft for an open community queue item. It replaces the current draft. INTERNAL: nothing is posted in the community. Community-queue admins only. Plain text, with a blank line between paragraphs; a URL becomes a link when the reply is sent.',
    {
      post_id: z.string().min(1),
      draft: z.string().min(1).max(6000),
      note: z.string().max(2000).optional(),
    },
    async ({ post_id, draft, note }) => {
      try {
        requireAdmin(getReviewer);
        const result = await requireBinding(config).saveDraft({ postId: post_id, draft, note: note ?? null });
        if (!result.ok) throw new CommunityQueueError('COMMUNITY_QUEUE_WRITE_REFUSED', result.reason, 409);
        return jsonContent({ ok: true, data: { post_id, saved: true } });
      } catch (error) {
        return asError(error);
      }
    },
  );

  server.tool(
    'template_review_community_dismiss',
    'Close an open community queue item that needs no staff reply, with a one-sentence reason. INTERNAL: no creator sees a dismissal, and a new creator message reopens the item. Community-queue admins only.',
    {
      post_id: z.string().min(1),
      reason: z.string().min(1).max(500),
    },
    async ({ post_id, reason }) => {
      try {
        requireAdmin(getReviewer);
        const result = await requireBinding(config).dismiss({ postId: post_id, reason });
        if (!result.ok) throw new CommunityQueueError('COMMUNITY_QUEUE_WRITE_REFUSED', result.reason, 409);
        return jsonContent({ ok: true, data: { post_id, dismissed: true } });
      } catch (error) {
        return asError(error);
      }
    },
  );

  server.tool(
    'template_review_community_send',
    'CREATOR-FACING: post a reply in a Marketplace Creators community thread. The text in `draft` is posted as written, under the community app identity, and every member of the space can read it. Use it only when the admin asks to send this exact text, and pass confirm_public_reply=true to record that. Community-queue admins only. The item must be open and have a draft.',
    {
      post_id: z.string().min(1),
      draft: z.string().min(1).max(6000),
      confirm_public_reply: z.boolean(),
    },
    async ({ post_id, draft, confirm_public_reply }) => {
      try {
        const reviewer = requireAdmin(getReviewer);
        if (confirm_public_reply !== true) {
          throw new CommunityQueueError(
            'PUBLIC_REPLY_CONFIRMATION_REQUIRED',
            'This posts a public reply in the Marketplace Creators space. Confirm the exact text with the admin, then send again with confirm_public_reply=true.',
            400,
          );
        }
        const result = await requireBinding(config).sendDraft({
          postId: post_id,
          draft,
          requestedBy: reviewer.email ?? reviewer.accountId,
        });
        if (!result.ok) throw new CommunityQueueError('COMMUNITY_QUEUE_SEND_FAILED', result.error, 409);
        return jsonContent({ ok: true, data: { post_id, sent: true, reply_id: result.reply_id } });
      } catch (error) {
        return asError(error);
      }
    },
  );
}
