// Response queue for the Marketplace Creators space.
//
//   webhook ─┐
//   sweep  ──┼─→ Cloudflare Queue ─→ syncThread ─→ D1 thread state + draft
//   send   ──┘                    └→ verifyReply ─→ moderation release
//
// Messages say "this thread changed". The consumer reads the live thread and
// derives the state, so a duplicate, late, or replayed message is harmless.

import { airtableConfig, fetchCreatorContext, type CreatorContext } from './airtable';
import {
  appAccessToken,
  bettermodeAuth,
  fetchPostStatus,
  fetchThread,
  findModerationItemId,
  listRecentThreads,
  memberAccessToken,
  releaseModerationItem,
  type BettermodePost,
} from './bettermode';
import { generateDraft, openaiConfig } from './openai';
import {
  annotateDraftResult,
  expireOpenDrafts,
  getSignalByPostId,
  getSignalsByPostIds,
  hasOpenDraft,
  listRecentApprovedDrafts,
  listStaleOpenPostIds,
  listUnverifiedSentDrafts,
  patchSignal,
  recordReconcileRun,
  upsertPendingDraft,
  upsertSignal,
  type BettermodeMeta,
} from './store';
import {
  isStaff,
  textFingerprint,
  threadState,
  type StaffConfig,
  type ThreadState,
} from './thread';

export type QueueMessage =
  | { kind: 'thread.sync'; postId: string; reason: string; regenerate?: boolean }
  | {
      kind: 'reply.verify';
      replyId: string;
      threadId: string;
      draftId: string;
      actorId: string;
      spaceId: string | null;
    };

export type SyncOutcome = 'skipped' | 'closed' | 'responded' | 'dismissed' | 'new' | 'queued';

// Keep at or below max_retries in wrangler.jsonc.
const MAX_ATTEMPTS = 5;
const RECONCILE_THREAD_LIMIT = 30;
const RECONCILE_STALE_LIMIT = 10;
const DAY_MS = 86_400_000;
// How long after Send a held reply may still be waiting for the verify step.
const SEND_SETTLE_MS = 5 * 60_000;
// The verify message retries for about 8 minutes. After this, a sent reply
// with no moderation outcome has lost its verify message.
const VERIFY_RECOVER_AFTER_MS = 15 * 60_000;

export async function enqueue(
  env: Env,
  message: QueueMessage,
  options?: { delaySeconds?: number },
): Promise<void> {
  await env.EVENTS.send(message, options);
}

export async function handleQueueBatch(
  batch: MessageBatch<QueueMessage>,
  env: Env,
): Promise<void> {
  for (const message of batch.messages) {
    try {
      if (message.body.kind === 'thread.sync') {
        const outcome = await syncThread(env, message.body.postId, message.body);
        console.log('thread synced', {
          postId: message.body.postId,
          reason: message.body.reason,
          outcome,
        });
      } else {
        await verifyReply(env, message.body);
      }
      message.ack();
    } catch (error) {
      const final = message.attempts >= MAX_ATTEMPTS;
      console.error('queue message failed', {
        kind: message.body.kind,
        messageId: message.id,
        attempt: message.attempts,
        final,
        error: errorMessage(error),
      });
      if (final) {
        // A thread.sync failure is already on the thread row (last_error).
        if (message.body.kind === 'reply.verify') {
          await annotateDraftResult(env.DB, message.body.draftId, {
            moderation: 'verify_failed',
            verify_error: errorMessage(error),
          }).catch((recordError) => {
            console.error('could not record verify failure', {
              draftId: message.body.kind === 'reply.verify' ? message.body.draftId : null,
              error: errorMessage(recordError),
            });
          });
        }
        message.ack();
      } else {
        message.retry({ delaySeconds: 30 * 2 ** (message.attempts - 1) });
      }
    }
  }
}

export async function syncThread(
  env: Env,
  postId: string,
  opts: { regenerate?: boolean } = {},
): Promise<SyncOutcome> {
  const auth = bettermodeAuth(env);
  const networkId = requireNetworkId(env);
  const token = await appAccessToken(networkId, auth);
  const root = await fetchThread(postId, token, auth);

  if (!root || (root.status && root.status !== 'PUBLISHED')) {
    // Removed or unpublished: close the item if this post was a queued thread.
    const existing = await getSignalByPostId(env.DB, root?.id || postId);
    if (!existing) return 'skipped';
    // Not an admin dismissal: the item reopens if the thread returns.
    await patchSignal(env.DB, existing.id, 'dismissed', {
      closed_reason: 'post_unavailable',
      synced_at: new Date().toISOString(),
      last_error: null,
    });
    await expireOpenDrafts(env.DB, existing.id);
    return 'closed';
  }

  const spaceId = root.spaceId || root.space?.id || null;
  if (!shouldHandleSpace(spaceId, env)) return 'skipped';

  const staff = staffConfig(env);
  const state = threadState(root, (member) => isStaff(member, staff));
  const existing = await getSignalByPostId(env.DB, root.id);
  const target = state.latestCreatorMessage;
  const targetHash = target ? textFingerprint(target.text) : null;
  const rootAuthor = root.owner || root.createdBy || null;

  const signal = {
    postId: root.id,
    postUrl: root.url,
    postContent: clip(state.messages.find((message) => message.isRoot)?.text || '', 4000),
    authorId: rootAuthor?.id ?? null,
    authorName: rootAuthor?.name ?? null,
  };
  const metadata: BettermodeMeta = {
    network_id: networkId,
    space_id: spaceId,
    parent_post_id: null,
    is_top_level: true,
    author_member_id: rootAuthor?.id ?? null,
    author_email: rootAuthor?.email ?? null,
    author_name: rootAuthor?.name ?? null,
    title: root.title ?? null,
    waiting_since: state.waitingSince,
    last_staff_reply_at: state.lastStaffReplyAt,
    latest_creator_post_id: target?.id ?? null,
    latest_creator_name: target?.author?.name ?? null,
    latest_creator_text_hash: targetHash,
    last_activity_at: root.lastActivityAt ?? null,
    message_count: state.messages.length,
    synced_at: new Date().toISOString(),
    closed_reason: null,
  };

  if (!state.needsResponse || !target) {
    const signalId = await upsertSignal(env.DB, {
      ...signal,
      status: 'responded',
      metadata: { ...metadata, last_error: null },
    });
    await expireOpenDrafts(env.DB, signalId);
    return 'responded';
  }

  // An admin dismissed this item (here, through the MCP, or in the agency
  // admin page). It stays closed until a creator writes after the dismissal.
  // A dismissal with no recorded time is stamped now.
  if (
    existing?.status === 'dismissed' &&
    existing.metadata.closed_reason !== 'post_unavailable' &&
    !opts.regenerate
  ) {
    const recorded = Date.parse(existing.metadata.dismissed_at || existing.reviewedAt || '');
    const dismissedMs = Number.isFinite(recorded) ? recorded : Date.now();
    if (Date.parse(target.createdAt) <= dismissedMs) {
      await upsertSignal(env.DB, {
        ...signal,
        status: 'dismissed',
        metadata: { ...metadata, dismissed_at: new Date(dismissedMs).toISOString() },
      });
      return 'dismissed';
    }
  }

  // Send just posted a reply that moderation may still hold. The verify step
  // releases it, so do not treat the thread as unanswered in the meantime.
  const sentAt = existing?.metadata.sent_reply_at;
  if (
    existing?.status === 'responded' &&
    sentAt &&
    Date.parse(target.createdAt) < Date.parse(sentAt) &&
    Date.now() - Date.parse(sentAt) < SEND_SETTLE_MS &&
    !opts.regenerate
  ) {
    return 'responded';
  }

  // The draft is current when it answers this message as it now reads. An
  // edit changes the fingerprint, so the draft is written again. A draft with
  // no fingerprint yet (saved before this field existed) gets one here.
  const draftedHash = existing?.metadata.drafted_for_text_hash ?? null;
  const draftIsCurrent =
    !!existing &&
    existing.metadata.drafted_for_post_id === target.id &&
    (draftedHash === null || draftedHash === targetHash) &&
    (await hasOpenDraft(env.DB, existing.id));
  if (draftIsCurrent && !opts.regenerate) {
    await upsertSignal(env.DB, {
      ...signal,
      status: 'queued',
      metadata: { ...metadata, drafted_for_text_hash: targetHash },
    });
    return 'queued';
  }

  // Write the item before the draft step. A draft failure then leaves a
  // visible queue item with the error instead of nothing.
  const signalId = await upsertSignal(env.DB, { ...signal, status: 'new', metadata });

  // An open draft that answers an older message or older text is closed now.
  // If the draft step below fails, the outdated reply is not left sendable.
  // A current draft stays until its replacement is ready (Regenerate).
  if (!draftIsCurrent) await expireOpenDrafts(env.DB, signalId);

  let draft: string | null;
  try {
    draft = await draftReply(env, root, state, opts.regenerate === true);
  } catch (error) {
    await patchSignal(env.DB, signalId, null, { last_error: `draft: ${errorMessage(error)}` });
    throw error;
  }
  if (draft === null) return 'new';

  // The model call takes seconds. If an admin dismissed the item or an agent
  // saved a draft in that time, keep their change and drop this draft.
  const current = await getSignalByPostId(env.DB, root.id);
  if (!current || current.status !== 'new') {
    return current?.status === 'queued' ? 'queued' : 'dismissed';
  }

  const draftId = await upsertPendingDraft(env.DB, { signalId, draftContent: draft });
  // An admin claimed the open draft for sending. Send sets the thread state.
  if (!draftId) return 'new';
  await patchSignal(env.DB, signalId, 'queued', {
    drafted_for_post_id: target.id,
    drafted_for_text_hash: targetHash,
    last_error: null,
  });
  return 'queued';
}

async function draftReply(
  env: Env,
  root: BettermodePost,
  state: ThreadState,
  regenerate: boolean,
): Promise<string | null> {
  const oConfig = openaiConfig(env);
  if (!oConfig) {
    console.warn('OpenAI is not configured; item queued without a draft', { postId: root.id });
    return null;
  }

  let creator: CreatorContext | null = null;
  const email = state.latestCreatorMessage?.author?.email || '';
  const aConfig = airtableConfig(env);
  if (aConfig && email) {
    try {
      creator = await fetchCreatorContext(email, aConfig);
    } catch (error) {
      // Creator context improves the draft but is not required for one.
      console.error('airtable lookup failed', { postId: root.id, error: errorMessage(error) });
    }
  }

  const fewShot = await listRecentApprovedDrafts(env.DB, 5);
  return generateDraft(
    { root, thread: state, creator, fewShotApprovedDrafts: fewShot, regenerate },
    oConfig,
  );
}

// Runs after Send. Akismet holds most API replies, so a reply the admin
// approved can sit in moderation where creators cannot see it. Release that
// one reply, then re-sync the thread.
async function verifyReply(
  env: Env,
  body: Extract<QueueMessage, { kind: 'reply.verify' }>,
): Promise<void> {
  const auth = bettermodeAuth(env);
  const token = await memberAccessToken(requireNetworkId(env), body.actorId, auth);

  let status = await fetchPostStatus(body.replyId, token, auth);
  let moderation = 'published';

  if (status === null) {
    // Unknown, not "removed": the token may not see a held post. Retry.
    throw new Error(`Reply ${body.replyId} was not found.`);
  }
  if (status === 'DELETED') {
    moderation = 'removed';
  } else if (status !== 'PUBLISHED') {
    const itemId = body.spaceId
      ? await findModerationItemId(body.spaceId, body.replyId, token, auth)
      : null;
    if (itemId) {
      await releaseModerationItem(itemId, token, auth);
      status = await fetchPostStatus(body.replyId, token, auth);
      moderation = 'released';
    }
    if (status !== 'PUBLISHED') {
      await annotateDraftResult(env.DB, body.draftId, { moderation: 'held', reply_status: status });
      throw new Error(`Reply ${body.replyId} is ${status} and could not be released.`);
    }
  }

  await annotateDraftResult(env.DB, body.draftId, { moderation, reply_status: status });
  console.log('reply verified', { replyId: body.replyId, moderation, status });
  // The outcome is recorded. A sync failure here must not retry the verify
  // and overwrite it; the next event or sweep syncs the thread.
  await syncThread(env, body.threadId).catch((error) => {
    console.error('sync after verify failed', {
      threadId: body.threadId,
      error: errorMessage(error),
    });
  });
}

// Backstop for webhooks that never arrive. Enqueues recently active threads
// whose stored state is behind, plus open items nothing has refreshed in a day.
export async function reconcile(env: Env): Promise<void> {
  const startedAt = new Date().toISOString();
  try {
    const spaceId = env.BETTERMODE_MARKETPLACE_SPACE_ID?.trim();
    if (!spaceId) throw new Error('BETTERMODE_MARKETPLACE_SPACE_ID is required for the sweep.');

    const auth = bettermodeAuth(env);
    const token = await appAccessToken(requireNetworkId(env), auth);
    const lookbackDays = Number(env.BETTERMODE_RECONCILE_LOOKBACK_DAYS) || 30;
    const cutoff = new Date(Date.now() - lookbackDays * DAY_MS).toISOString();

    const recent = (await listRecentThreads(spaceId, RECONCILE_THREAD_LIMIT, token, auth)).filter(
      (thread) => !!thread.lastActivityAt && thread.lastActivityAt >= cutoff,
    );
    const known = await getSignalsByPostIds(
      env.DB,
      recent.map((thread) => thread.id),
    );
    const missed = recent
      .filter((thread) => known.get(thread.id)?.metadata.last_activity_at !== thread.lastActivityAt)
      .map((thread) => thread.id);
    const stale = await listStaleOpenPostIds(
      env.DB,
      new Date(Date.now() - DAY_MS).toISOString(),
      RECONCILE_STALE_LIMIT,
    );

    const postIds = [...new Set([...missed, ...stale])];
    if (postIds.length > 0) {
      await env.EVENTS.sendBatch(
        postIds.map((postId) => ({
          body: { kind: 'thread.sync', postId, reason: 'reconcile' } satisfies QueueMessage,
        })),
      );
    }

    // A sent reply with no moderation outcome lost its verify message (the
    // publish failed after Send). Verify it again so a held reply is released.
    const fallbackActor = adminUserIds(env)[0] ?? null;
    const unverified = (
      await listUnverifiedSentDrafts(
        env.DB,
        new Date(Date.now() - DAY_MS).toISOString(),
        new Date(Date.now() - VERIFY_RECOVER_AFTER_MS).toISOString(),
        RECONCILE_STALE_LIMIT,
      )
    ).filter((reply) => reply.sentBy || fallbackActor);
    if (unverified.length > 0) {
      await env.EVENTS.sendBatch(
        unverified.map((reply) => ({
          body: {
            kind: 'reply.verify',
            replyId: reply.replyId,
            threadId: reply.threadId,
            draftId: reply.draftId,
            actorId: (reply.sentBy || fallbackActor) as string,
            spaceId: reply.spaceId ?? spaceId,
          } satisfies QueueMessage,
        })),
      );
    }

    await recordReconcileRun(env.DB, {
      startedAt,
      status: 'completed',
      missed: missed.length,
      metadata: {
        checked: recent.length,
        missed,
        stale: stale.length,
        reverified: unverified.length,
      },
    });
    console.log('reconcile complete', {
      checked: recent.length,
      missed: missed.length,
      stale: stale.length,
      reverified: unverified.length,
    });
  } catch (error) {
    await recordReconcileRun(env.DB, {
      startedAt,
      status: 'failed',
      missed: 0,
      error: errorMessage(error),
    });
    throw error;
  }
}

export function shouldHandleSpace(spaceId: string | null | undefined, env: Env): boolean {
  const required = env.BETTERMODE_MARKETPLACE_SPACE_ID?.trim();
  if (!required) {
    // Not yet configured: handle everything so the operator can capture a
    // real space ID from the first webhook payload via logs.
    return true;
  }
  return !!spaceId && spaceId === required;
}

// Staff email domains come from BETTERMODE_STAFF_AUTHOR_DOMAINS (default
// `webflow.com`). Admin IDs come from BETTERMODE_ADMIN_USER_IDS.
function staffConfig(env: Env): StaffConfig {
  const configured = env.BETTERMODE_STAFF_AUTHOR_DOMAINS;
  return {
    adminIds: adminUserIds(env),
    domains: (configured && configured.trim() ? configured : 'webflow.com')
      .split(',')
      .map((domain) => domain.trim().toLowerCase())
      .filter(Boolean),
  };
}

export function adminUserIds(env: Env): string[] {
  return (env.BETTERMODE_ADMIN_USER_IDS || '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean);
}

function requireNetworkId(env: Env): string {
  const networkId = env.BETTERMODE_DEFAULT_NETWORK_ID;
  if (!networkId) throw new Error('Missing BETTERMODE_DEFAULT_NETWORK_ID.');
  return networkId;
}

function clip(value: string, max: number): string {
  return value.length <= max ? value : `${value.slice(0, max - 1)}…`;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown error';
}
