// Bettermode app: drafts admin replies for posts in the Webflow Community
// Marketplace Creators space, then renders an admin-only dynamic block on
// each post so the admin can edit and publish the drafted reply.
//
// Endpoints:
//   GET  /                   status page
//   GET  /health             smoke check
//   POST /webhook            Bettermode events (TEST + post/reply lifecycle)
//   POST /webhook/interaction  dynamic block render + button callbacks

import {
  appAccessToken,
  bettermodeAuth,
  BettermodeError,
  createReply,
  fetchPostThread,
  listRecentPostsBySpace,
  memberAccessToken,
  type BettermodePost
} from './bettermode';
import { difyAgentConfig, generateDraftViaDify } from './dify-agent';
import { verifySignature } from './signature';
import { adminDraftSlate, interactionResponse, nonAdminSlate, type DraftBlockState } from './slate';
import {
  backfillPendingQueueWorkItems,
  getQueueStatusByPostId,
  getLatestDraftByPostId,
  markCommunityWorkItemSent,
  markCommunityWorkItemSkipped,
  markRejected,
  markSent,
  recordCommunityEvent,
  upsertPendingDraft,
  upsertSignal,
  upsertCommunityWorkItem,
  type QueueStatus
} from './store';

type WebhookPayload = {
  networkId?: string;
  context?: string;
  entityId?: string;
  type?: string;
  data?: {
    actorId?: string;
    appId?: string;
    interactionId?: string;
    dynamicBlockKey?: string | null;
    shortcutKey?: string | null;
    callbackId?: string | null;
    preview?: boolean;
    inputs?: Record<string, unknown> | null;
    challenge?: string;
    object?: { id?: string; type?: string; spaceId?: string } | null;
    target?: { id?: string; type?: string; spaceId?: string } | null;
  };
};

const POST_EVENT_TYPES = new Set([
  'post.published',
  'post.created',
  'post.updated',
  'reply.published',
  'reply.created',
  'reply.updated'
]);
const DEFAULT_REPLY_POST_TYPE_ID = 'xrkGxJPY9j4QOCB';
const DEFAULT_SWEEP_LIMIT = 50;
const DEFAULT_SWEEP_DRAFT_LIMIT = 5;

type DraftOutcome =
  | 'draft_ready'
  | 'escalated'
  | 'existing'
  | 'externally_resolved'
  | 'ignored'
  | 'skipped';

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    try {
      if (request.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: corsHeaders(request, env) });
      }

      const url = new URL(request.url);

      if (request.method === 'GET' && url.pathname === '/') {
        return htmlResponse(renderIndexPage(url.origin), request, env);
      }

      if (request.method === 'GET' && url.pathname === '/health') {
        return jsonResponse(
          {
            ok: true,
            service: 'bettermode-marketplace-creator-agent',
            environment: env.ENVIRONMENT || 'development'
          },
          request,
          env
        );
      }

      if (
        request.method === 'POST' &&
        (url.pathname === '/webhook/notification' || url.pathname === '/webhook/notifications')
      ) {
        return await handleNotificationWebhook(request, env);
      }

      if (request.method === 'POST' && url.pathname.startsWith('/webhook')) {
        return await handleWebhook(request, env, ctx, url.pathname);
      }

      return jsonResponse({ error: 'Not found' }, request, env, { status: 404 });
    } catch (error) {
      const status = error instanceof BettermodeError ? error.status : 500;
      return jsonResponse(
        {
          error: status >= 500 ? 'Internal server error' : 'Bad request',
          message: error instanceof Error ? error.message : 'Unknown error'
        },
        request,
        env,
        { status }
      );
    }
  },

  async scheduled(_controller: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(runCommunitySweep(env));
  }
} satisfies ExportedHandler<Env>;

async function handleNotificationWebhook(request: Request, env: Env): Promise<Response> {
  const rawBody = await request.text();

  if (env.IGNORE_SIGNATURE !== 'true') {
    const valid = await verifySignature(request, rawBody, env.BETTERMODE_SIGNING_SECRET);
    if (!valid) {
      return jsonResponse({ error: 'Invalid signature' }, request, env, { status: 403 });
    }
  }

  const payload = parseJson<Record<string, unknown>>(rawBody);
  const postId = extractPostId(payload);
  const actor = extractActor(payload);
  const eventType = stringValue(payload.type) || stringValue(payload.eventType) || 'notification';
  const spaceId = extractSpaceId(payload);

  await recordCommunityEvent(env.DB, {
    eventType,
    eventSource: 'notification_webhook',
    dedupeKey: dedupeKey('notification', eventType, postId, stringValue(payload.id)),
    sourceId: postId,
    sourceUrl: extractSourceUrl(payload),
    spaceId,
    actorId: actor.id,
    actorName: actor.name,
    actorEmail: actor.email,
    payload,
    metadata: { observed_only: true },
  });

  if (postId) {
    await upsertCommunityWorkItem(env.DB, {
      postId,
      sourceUrl: extractSourceUrl(payload),
      title: stringValue(payload.title) || stringValue((payload.data as Record<string, unknown> | undefined)?.title),
      lane: 'notification',
      status: 'new',
      priority: 5,
      urgency: 'medium',
      nextAction: 'Inspect BetterMode thread and decide whether a draft, escalation, or no-op is needed.',
      dueAt: dueAtForUrgency('medium'),
      authorId: actor.id,
      authorName: actor.name,
      authorEmail: actor.email,
      metadata: { source: 'notification_webhook', event_type: eventType },
    });
  }

  return jsonResponse(
    {
      type: eventType,
      status: 'SUCCEEDED',
      observed_only: true,
      source_id: postId ?? null,
    },
    request,
    env,
  );
}

async function handleWebhook(
  request: Request,
  env: Env,
  ctx: ExecutionContext,
  pathname: string
): Promise<Response> {
  const rawBody = await request.text();

  if (env.IGNORE_SIGNATURE !== 'true') {
    const valid = await verifySignature(request, rawBody, env.BETTERMODE_SIGNING_SECRET);
    if (!valid) {
      return jsonResponse({ error: 'Invalid signature' }, request, env, { status: 403 });
    }
  }

  const webhook = parseJson<WebhookPayload>(rawBody);

  // Diagnostic logging — surfaces the exact event type Bettermode sends so we
  // can verify our POST_EVENT_TYPES filter matches reality. Cheap and safe:
  // single structured line per inbound webhook, no payload contents.
  console.log('webhook received', {
    pathname,
    type: webhook.type,
    entityId: webhook.entityId,
    context: webhook.context,
    objectId: webhook.data?.object?.id,
    spaceId: webhook.data?.object?.spaceId,
    targetId: webhook.data?.target?.id
  });

  if (webhook.type === 'TEST') {
    return jsonResponse(
      {
        type: 'TEST',
        status: 'SUCCEEDED',
        data: { challenge: webhook.data?.challenge }
      },
      request,
      env
    );
  }

  const webhookPostId = webhook.data?.object?.id || webhook.entityId;
  ctx.waitUntil(
    recordCommunityEvent(env.DB, {
      eventType: webhook.type || 'webhook',
      eventSource: 'content_webhook',
      dedupeKey: dedupeKey('content', webhook.type || 'webhook', webhookPostId, webhook.data?.interactionId),
      sourceId: webhookPostId ?? null,
      spaceId: webhook.data?.object?.spaceId ?? webhook.data?.target?.spaceId ?? null,
      actorId: webhook.data?.actorId ?? null,
      payload: webhook,
      metadata: { pathname },
    }).catch((err) => {
      console.error('community event record failed', { error: errorMessage(err) });
    }),
  );

  if (pathname === '/webhook/interaction') {
    return jsonResponse(await handleInteraction(webhook, env, ctx), request, env);
  }

  if (pathname === '/webhook' && webhook.type && POST_EVENT_TYPES.has(webhook.type)) {
    const postId = webhookPostId;
    const spaceId = webhook.data?.object?.spaceId;
    console.log('matched post event', { type: webhook.type, postId, spaceId });
    if (postId && shouldHandleSpace(spaceId, env)) {
      ctx.waitUntil(
        generateDraftForPost(postId, env).catch((err) => {
          console.error('draft generation failed', { postId, error: errorMessage(err) });
        })
      );
    } else {
      console.warn('event matched type but filtered out', {
        type: webhook.type,
        postId,
        spaceId,
        marketplace_space: env.BETTERMODE_MARKETPLACE_SPACE_ID
      });
    }
  } else if (pathname === '/webhook' && webhook.type) {
    console.warn('unhandled webhook type', { type: webhook.type });
  }

  // Federated search and unknown types: ack with success.
  return jsonResponse({ type: webhook.type || 'WEBHOOK', status: 'SUCCEEDED' }, request, env);
}

async function handleInteraction(
  webhook: WebhookPayload,
  env: Env,
  ctx: ExecutionContext
): Promise<Record<string, unknown>> {
  const callbackId = webhook.data?.callbackId;
  const actorId = webhook.data?.actorId;
  const isAdmin = isAdminUser(actorId, env);

  // Dynamic block render (no callback) → show draft if admin, hint otherwise.
  if (!callbackId) {
    if (!isAdmin) {
      return interactionResponse(webhook, [
        {
          id: webhook.data?.interactionId || 'creator-agent-block',
          type: 'SHOW',
          slate: nonAdminSlate()
        }
      ]);
    }
    const postId = resolvePostId(webhook);
    const state = await loadDraftState(postId, env);
    return interactionResponse(webhook, [
      {
        id: webhook.data?.interactionId || 'creator-agent-block',
        type: 'SHOW',
        slate: adminDraftSlate(state)
      }
    ]);
  }

  if (!isAdmin) {
    return interactionResponse(webhook, [
      {
        id: 'forbidden-toast',
        type: 'OPEN_TOAST',
        props: {
          status: 'ERROR',
          title: 'Not authorized',
          description: 'Only admins can act on drafted replies.'
        }
      }
    ]);
  }

  if (callbackId === 'send-draft') {
    return await handleSend(webhook, env);
  }
  if (callbackId === 'regen-draft') {
    return await handleRegenerate(webhook, env, ctx);
  }
  if (callbackId === 'dismiss-draft') {
    return await handleDismiss(webhook, env);
  }

  return interactionResponse(webhook, []);
}

async function handleSend(webhook: WebhookPayload, env: Env): Promise<Record<string, unknown>> {
  try {
    const postId = stringInput(webhook, 'postId') || resolvePostId(webhook);
    const draftText = stringInput(webhook, 'draft');
    if (!postId) throw new Error('Missing post ID.');
    if (!draftText) throw new Error('Drafted reply is empty.');

    const state = await loadDraftState(postId, env);
    if (!state.draft) {
      throw new Error('No drafted reply found for this post.');
    }

    const auth = bettermodeAuth(env);
    const networkId = state.signal.metadata?.network_id || env.BETTERMODE_DEFAULT_NETWORK_ID;
    if (!networkId) throw new Error('Missing Bettermode network ID.');
    if (!webhook.data?.actorId) throw new Error('Missing admin actor ID.');

    const memberToken = await memberAccessToken(networkId, webhook.data.actorId, auth);
    const reply = await createReply(
      postId,
      state.signal.metadata?.space_id ?? null,
      draftToHtml(draftText),
      memberToken,
      auth,
      replyPostTypeId(env)
    );

    await markSent(env.DB, state.draft.id, draftText, reply.id ?? null);
    await markCommunityWorkItemSent(env.DB, postId, state.draft.id);

    const refreshed = await loadDraftState(postId, env);
    refreshed.notice = { kind: 'success', title: 'Reply sent.' };
    return interactionResponse(webhook, [
      {
        id: 'send-toast',
        type: 'OPEN_TOAST',
        props: { status: 'SUCCESS', title: 'Reply sent', description: '' }
      },
      {
        id: webhook.data?.interactionId || 'creator-agent-block',
        type: 'SHOW',
        slate: adminDraftSlate(refreshed)
      }
    ]);
  } catch (error) {
    return interactionResponse(webhook, [
      {
        id: 'send-error',
        type: 'OPEN_TOAST',
        props: {
          status: 'ERROR',
          title: 'Could not send reply',
          description: errorMessage(error)
        }
      }
    ]);
  }
}

async function handleRegenerate(
  webhook: WebhookPayload,
  env: Env,
  ctx: ExecutionContext
): Promise<Record<string, unknown>> {
  const postId = stringInput(webhook, 'postId') || resolvePostId(webhook);
  if (!postId) {
    return interactionResponse(webhook, [
      {
        id: 'regen-error',
        type: 'OPEN_TOAST',
        props: { status: 'ERROR', title: 'Missing post ID' }
      }
    ]);
  }
  ctx.waitUntil(
    generateDraftForPost(postId, env, { regenerate: true }).catch((err) => {
      console.error('regenerate failed', { postId, error: errorMessage(err) });
    })
  );
  const state = await loadDraftState(postId, env);
  state.notice = { kind: 'info', title: 'Regenerating draft...' };
  return interactionResponse(webhook, [
    {
      id: webhook.data?.interactionId || 'creator-agent-block',
      type: 'SHOW',
      slate: adminDraftSlate(state)
    }
  ]);
}

async function handleDismiss(webhook: WebhookPayload, env: Env): Promise<Record<string, unknown>> {
  const postId = stringInput(webhook, 'postId') || resolvePostId(webhook);
  if (!postId) {
    return interactionResponse(webhook, []);
  }
  const state = await loadDraftState(postId, env);
  if (state.draft) {
    await markRejected(env.DB, state.draft.id);
    await markCommunityWorkItemSkipped(env.DB, postId, 'Draft dismissed by admin.');
  }
  const refreshed = await loadDraftState(postId, env);
  refreshed.notice = { kind: 'info', title: 'Draft dismissed.' };
  return interactionResponse(webhook, [
    {
      id: webhook.data?.interactionId || 'creator-agent-block',
      type: 'SHOW',
      slate: adminDraftSlate(refreshed)
    }
  ]);
}

type LoadedState = DraftBlockState & {
  signal: {
    id: string;
    metadata: { network_id?: string; space_id?: string | null };
  };
  draft: { id: string } | null;
};

async function loadDraftState(postId: string | undefined, env: Env): Promise<LoadedState> {
  if (!postId) {
    return {
      postId: '',
      draftText: '',
      draftStatus: 'none',
      excerpt: undefined,
      signal: { id: '', metadata: {} },
      draft: null
    };
  }

  const found = await getLatestDraftByPostId(env.DB, postId);
  if (!found) {
    return {
      postId,
      draftText: '',
      draftStatus: 'none',
      excerpt: undefined,
      signal: { id: '', metadata: {} },
      draft: null
    };
  }

  return {
    postId,
    draftText: found.draft.approved_content || found.draft.draft_content,
    draftStatus: found.draft.status,
    excerpt: clip(found.signal.content, 240),
    signal: { id: found.signal.id, metadata: found.signal.metadata },
    draft: { id: found.draft.id }
  };
}

async function generateDraftForPost(
  postId: string,
  env: Env,
  opts: { regenerate?: boolean } = {}
): Promise<DraftOutcome> {
  const auth = bettermodeAuth(env);
  const networkId = env.BETTERMODE_DEFAULT_NETWORK_ID;
  if (!networkId) throw new Error('Missing BETTERMODE_DEFAULT_NETWORK_ID.');

  const token = await appAccessToken(networkId, auth);
  const post = await fetchPostThread(postId, token, auth);
  if (!post) {
    console.warn('post not found for draft', { postId });
    return 'ignored';
  }

  if (!shouldHandleSpace(post.spaceId || post.space?.id, env)) {
    return 'ignored';
  }

  const author = post.owner || post.createdBy;
  const email = author?.email || '';
  const isTopLevel = !post.parentId;
  const isAppAuthored = isAppAuthor(author);
  const isStaffAuthored = isStaffAuthorEmail(email, env);
  const queueBefore = await getQueueStatusByPostId(env.DB, post.id);

  // Skip drafting when the author is internal Webflow staff (e.g. team
  // announcements like "Interactions with GSAP training"). The agent's
  // job is to draft admin replies to creator questions, not to reply
  // to its own team's announcements.
  if (isStaffAuthored || isAppAuthored) {
    await syncCommunityWorkItemForPost(env, post, {
      queue: queueBefore,
      status: 'skipped',
      nextAction: isAppAuthored
        ? 'No action needed: post was authored by the Marketplace Creator Agent.'
        : 'No action needed: staff-authored post is outside creator-reply drafting scope.',
    });
    console.log('skipping draft for staff author', {
      postId,
      authorEmail: email,
      authorId: author?.id,
      reason: isAppAuthored ? 'app-authored post' : 'matches staff domain allowlist'
    });
    return 'skipped';
  }

  const internalReply = findInternalReply(post, env);
  if (internalReply) {
    await syncCommunityWorkItemForPost(env, post, {
      queue: queueBefore,
      status: 'externally_resolved',
      nextAction:
        internalReply.reason === 'app_reply'
          ? 'No action needed: the Marketplace Creator Agent has already replied in this thread.'
          : 'No action needed: Webflow staff has already replied in this thread.',
    });
    console.log('skipping draft for already answered thread', {
      postId,
      replyId: internalReply.replyId,
      reason: internalReply.reason,
    });
    return 'externally_resolved';
  }

  const signalId = await upsertSignal(env.DB, {
    postId: post.id,
    postUrl: post.url,
    postContent: stripBettermodeContent(post),
    metadata: {
      network_id: networkId,
      space_id: post.spaceId || post.space?.id || null,
      parent_post_id: post.parentId || null,
      is_top_level: isTopLevel,
      author_member_id: author?.id || null,
      author_email: email || null,
      author_name: author?.name || null
    }
  });

  await syncCommunityWorkItemForPost(env, post, { queue: queueBefore, signalId });

  if (queueBefore.queue_id && opts.regenerate !== true) {
    console.log('skipping draft because queue row already exists', {
      postId,
      queueId: queueBefore.queue_id,
      status: queueBefore.status
    });
    return 'existing';
  }

  const difyConfig = difyAgentConfig(env);
  if (!difyConfig) {
    await syncCommunityWorkItemForPost(env, post, {
      queue: queueBefore,
      signalId,
      status: 'escalated',
      nextAction: 'Dify is not configured; inspect manually and restore drafting credentials.',
      escalationReason: 'missing_dify_config',
    });
    console.error('Dify agent is not configured; skipping policy-grounded draft', { postId });
    return 'escalated';
  }

  let draft: string;
  try {
    const result = await generateDraftViaDify(
      {
        postId: post.id,
        isTopLevel,
        spaceId: post.spaceId || post.space?.id || null,
        authorMemberId: author?.id || null,
        authorEmail: email || null,
        authorName: author?.name || null,
        regenerate: opts.regenerate === true
      },
      difyConfig
    );
    draft = result.answer;
  } catch (err) {
    await syncCommunityWorkItemForPost(env, post, {
      queue: queueBefore,
      signalId,
      status: 'escalated',
      nextAction: 'Dify draft generation failed; inspect manually and retry once Dify is healthy.',
      escalationReason: errorMessage(err),
    });
    console.error('Dify draft failed; skipping draft without policy grounding', {
      postId,
      error: errorMessage(err)
    });
    return 'escalated';
  }

  const queueId = await upsertPendingDraft(env.DB, { signalId, draftContent: draft });
  await syncCommunityWorkItemForPost(env, post, {
    queue: { ...queueBefore, signal_id: signalId, queue_id: queueId, status: 'pending', created_at: null, sent_at: null },
    signalId,
    status: 'draft_ready',
    nextAction: 'Review the drafted BetterMode reply in the admin block, then send, regenerate, or dismiss.',
    lastDraftedAt: new Date().toISOString(),
  });
  return 'draft_ready';
}

async function runCommunitySweep(env: Env): Promise<void> {
  if (env.COMMUNITY_SWEEP_ENABLED === 'false') {
    return;
  }

  const auth = bettermodeAuth(env);
  const networkId = env.BETTERMODE_DEFAULT_NETWORK_ID;
  const spaceId = env.BETTERMODE_MARKETPLACE_SPACE_ID;
  if (!networkId || !spaceId) {
    throw new Error('Missing Bettermode network or marketplace space ID.');
  }

  const limit = parseInteger(env.COMMUNITY_SWEEP_LIMIT, DEFAULT_SWEEP_LIMIT, 1, 100);
  const draftLimit = parseInteger(env.COMMUNITY_SWEEP_DRAFT_LIMIT, DEFAULT_SWEEP_DRAFT_LIMIT, 0, 20);
  const token = await appAccessToken(networkId, auth);
  const { nodes, totalCount } = await listRecentPostsBySpace(spaceId, limit, token, auth);
  const backfilled = await backfillPendingQueueWorkItems(env.DB, 25);
  let inspected = 0;
  let drafted = 0;
  let draftAttempts = 0;
  let deferred = 0;
  let existing = 0;
  let skipped = 0;
  let escalated = 0;
  let externallyResolved = 0;

  await recordCommunityEvent(env.DB, {
    eventType: 'community.sweep.started',
    eventSource: 'scheduled_sweep',
    dedupeKey: dedupeKey('sweep', 'community.sweep.started', String(Date.now()), null),
    spaceId,
    metadata: { limit, draft_limit: draftLimit, bettermode_total_count: totalCount },
  });

  for (const post of nodes) {
    inspected += 1;
    const author = post.owner || post.createdBy;
    if (isStaffAuthorEmail(author?.email, env) || isAppAuthor(author)) {
      skipped += 1;
      continue;
    }

    const queue = await getQueueStatusByPostId(env.DB, post.id);
    await syncCommunityWorkItemForPost(env, post, { queue });
    if (queue.queue_id) {
      existing += 1;
      continue;
    }
    if (draftAttempts >= draftLimit) {
      deferred += 1;
      continue;
    }

    draftAttempts += 1;
    const outcome = await generateDraftForPost(post.id, env);
    if (outcome === 'draft_ready') {
      drafted += 1;
    } else if (outcome === 'escalated') {
      escalated += 1;
    } else if (outcome === 'externally_resolved') {
      externallyResolved += 1;
    } else if (outcome === 'skipped') {
      skipped += 1;
    } else if (outcome === 'existing') {
      existing += 1;
    }
  }

  await recordCommunityEvent(env.DB, {
    eventType: 'community.sweep.completed',
    eventSource: 'scheduled_sweep',
    dedupeKey: dedupeKey('sweep', 'community.sweep.completed', String(Date.now()), null),
    spaceId,
    status: 'completed',
    metadata: {
      inspected,
      drafted,
      draft_attempts: draftAttempts,
      draft_limit: draftLimit,
      deferred,
      existing,
      backfilled,
      skipped,
      externally_resolved: externallyResolved,
      escalated,
      limit,
      bettermode_total_count: totalCount,
    },
  });

  console.log('community sweep completed', {
    inspected,
    drafted,
    draftAttempts,
    draftLimit,
    deferred,
    existing,
    backfilled,
    skipped,
    externallyResolved,
    escalated,
    totalCount,
  });
}

type WorkItemSyncOptions = {
  queue?: QueueStatus;
  signalId?: string | null;
  status?: string;
  nextAction?: string | null;
  lastDraftedAt?: string | null;
  escalationReason?: string | null;
};

async function syncCommunityWorkItemForPost(
  env: Env,
  post: BettermodePost,
  opts: WorkItemSyncOptions = {},
): Promise<void> {
  const queue = opts.queue ?? (await getQueueStatusByPostId(env.DB, post.id));
  const classification = classifyPost(post);
  const status = opts.status ?? statusFromQueue(queue);
  const author = post.owner || post.createdBy;

  await upsertCommunityWorkItem(env.DB, {
    postId: post.id,
    sourceUrl: post.url ?? null,
    title: post.title ?? null,
    lane: classification.lane,
    status,
    priority: classification.priority,
    urgency: classification.urgency,
    nextAction: opts.nextAction ?? nextActionForStatus(status, classification.lane),
    dueAt: dueAtForUrgency(classification.urgency),
    authorId: author?.id ?? null,
    authorName: author?.name ?? null,
    authorEmail: author?.email ?? null,
    signalId: opts.signalId ?? queue.signal_id,
    queueId: queue.queue_id,
    draftStatus: queue.status,
    lastActivityAt: post.lastActivityAt ?? post.updatedAt ?? post.publishedAt ?? post.createdAt ?? null,
    lastDraftedAt: opts.lastDraftedAt ?? (queue.queue_id ? queue.created_at : null),
    lastSentAt: queue.sent_at,
    escalationReason: opts.escalationReason ?? classification.escalationReason,
    metadata: {
      is_top_level: !post.parentId,
      parent_post_id: post.parentId ?? null,
      space_id: post.spaceId || post.space?.id || null,
      replies_count: post.repliesCount ?? null,
      total_replies_count: post.totalRepliesCount ?? null,
      classification_reason: classification.reason,
    },
  });
}

function classifyPost(post: BettermodePost): {
  lane: string;
  priority: number;
  urgency: string;
  reason: string;
  escalationReason: string | null;
} {
  const text = `${post.title ?? ''} ${stripBettermodeContent(post)}`.toLowerCase();
  if (matches(text, ['copyright', 'copied', 'plagiar', 'ip issue', 'originality'])) {
    return {
      lane: 'ip_review',
      priority: 9,
      urgency: 'high',
      reason: 'possible copied design or intellectual property issue',
      escalationReason: 'private_marketplace_review_required',
    };
  }
  if (matches(text, ['validator', 'validation', 'gsap', 'lottie', 'ix2', 'custom script'])) {
    return { lane: 'validation_bug', priority: 8, urgency: 'high', reason: 'validator or submission blocker', escalationReason: null };
  }
  if (matches(text, ['page not found', 'not showing', 'missing', 'category', 'marketplace update', 'published yet'])) {
    return { lane: 'listing_bug', priority: 8, urgency: 'high', reason: 'marketplace listing or indexing issue', escalationReason: null };
  }
  if (matches(text, ['refund', 'stripe'])) {
    return { lane: 'policy_refund', priority: 7, urgency: 'medium', reason: 'refund or policy question', escalationReason: null };
  }
  if (matches(text, ['reject', 'rejection', 'review ticket', 'ticket #'])) {
    return { lane: 'review_followup', priority: 7, urgency: 'medium', reason: 'template review follow-up', escalationReason: null };
  }
  if (matches(text, ['profile', 'account mapping', 'dashboard'])) {
    return { lane: 'creator_account', priority: 5, urgency: 'medium', reason: 'creator profile or account question', escalationReason: null };
  }
  if (matches(text, ['affiliate', 'redemption', 'workspace limit', 'feature request', 'should allow', 'propose'])) {
    return { lane: 'product_feedback', priority: 4, urgency: 'low', reason: 'creator product feedback', escalationReason: null };
  }
  if (matches(text, ['customization', 'recommend', 'services', 'introduce'])) {
    return { lane: 'creator_to_creator', priority: 3, urgency: 'low', reason: 'creator-to-creator services discussion', escalationReason: null };
  }
  return { lane: 'support_question', priority: 6, urgency: 'medium', reason: 'general creator support question', escalationReason: null };
}

function statusFromQueue(queue: QueueStatus): string {
  if (queue.status === 'sent') return 'sent';
  if (queue.status === 'pending' || queue.status === 'approved') return 'draft_ready';
  if (queue.status === 'rejected' || queue.status === 'expired') return 'skipped';
  return 'new';
}

function nextActionForStatus(status: string, lane: string): string {
  if (status === 'draft_ready') return 'Review drafted reply in BetterMode admin block; send, regenerate, or dismiss.';
  if (status === 'sent') return 'No action needed unless the creator replies again.';
  if (status === 'externally_resolved') return 'No action needed unless the creator replies again.';
  if (status === 'escalated') return 'Inspect manually and resolve the escalation before drafting.';
  if (status === 'skipped') return 'No drafting action needed.';
  if (lane === 'ip_review') return 'Route privately to Marketplace review; do not litigate the claim publicly.';
  if (lane === 'product_feedback') return 'Acknowledge and route product feedback if a public response is appropriate.';
  return 'Generate or review a grounded BetterMode reply draft.';
}

function dueAtForUrgency(urgency: string): string {
  const hours = urgency === 'high' ? 4 : urgency === 'medium' ? 24 : 72;
  return new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
}

function matches(value: string, needles: string[]): boolean {
  return needles.some((needle) => value.includes(needle));
}

function isAdminUser(actorId: string | undefined, env: Env): boolean {
  if (!actorId) return false;
  const allow = (env.BETTERMODE_ADMIN_USER_IDS || '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean);
  if (allow.length === 0) {
    // No allowlist configured → fail closed.
    return false;
  }
  return allow.includes(actorId);
}

function isAppAuthor(author: { id?: string | null } | null | undefined): boolean {
  return !!author?.id && author.id.startsWith('APP::');
}

function findInternalReply(
  post: BettermodePost,
  env: Env,
): { replyId: string; reason: 'app_reply' | 'staff_reply' } | null {
  for (const reply of post.replies?.nodes ?? []) {
    const author = reply.owner || reply.createdBy;
    if (isAppAuthor(author)) {
      return { replyId: reply.id, reason: 'app_reply' };
    }
    if (isStaffAuthorEmail(author?.email, env)) {
      return { replyId: reply.id, reason: 'staff_reply' };
    }
  }
  return null;
}

function replyPostTypeId(env: Env): string {
  return env.BETTERMODE_REPLY_POST_TYPE_ID?.trim() || DEFAULT_REPLY_POST_TYPE_ID;
}

function shouldHandleSpace(spaceId: string | null | undefined, env: Env): boolean {
  const required = env.BETTERMODE_MARKETPLACE_SPACE_ID?.trim();
  if (!required) {
    // Not yet configured: handle everything so the operator can capture a
    // real space ID from the first webhook payload via logs.
    return true;
  }
  return !!spaceId && spaceId === required;
}

// Returns true when the post author's email matches a configured staff
// domain (comma-separated in BETTERMODE_STAFF_AUTHOR_DOMAINS, defaulting
// to `webflow.com`). Staff-authored posts are typically announcements
// from the Marketplace team itself, not creator questions the agent
// should draft replies to.
function isStaffAuthorEmail(email: string | undefined | null, env: Env): boolean {
  if (!email) return false;
  const lower = email.trim().toLowerCase();
  if (!lower.includes('@')) return false;
  const configured = env.BETTERMODE_STAFF_AUTHOR_DOMAINS;
  const domains = (configured && configured.trim() ? configured : 'webflow.com')
    .split(',')
    .map((d) => d.trim().toLowerCase())
    .filter(Boolean);
  return domains.some((d) => lower.endsWith(`@${d}`));
}

function resolvePostId(webhook: WebhookPayload): string | undefined {
  return webhook.data?.target?.id || webhook.data?.object?.id || webhook.entityId || undefined;
}

function stringInput(webhook: WebhookPayload, key: string): string {
  const value = webhook.data?.inputs?.[key];
  return typeof value === 'string' ? value : '';
}

function extractPostId(payload: Record<string, unknown>): string | null {
  return (
    stringAt(payload, ['postId']) ||
    stringAt(payload, ['entityId']) ||
    stringAt(payload, ['data', 'postId']) ||
    stringAt(payload, ['data', 'entityId']) ||
    stringAt(payload, ['data', 'object', 'id']) ||
    stringAt(payload, ['data', 'target', 'id']) ||
    stringAt(payload, ['object', 'id']) ||
    stringAt(payload, ['target', 'id']) ||
    stringAt(payload, ['notification', 'postId']) ||
    stringAt(payload, ['notification', 'entityId'])
  );
}

function extractSpaceId(payload: Record<string, unknown>): string | null {
  return (
    stringAt(payload, ['spaceId']) ||
    stringAt(payload, ['data', 'spaceId']) ||
    stringAt(payload, ['data', 'object', 'spaceId']) ||
    stringAt(payload, ['data', 'target', 'spaceId']) ||
    stringAt(payload, ['object', 'spaceId']) ||
    stringAt(payload, ['target', 'spaceId'])
  );
}

function extractSourceUrl(payload: Record<string, unknown>): string | null {
  return (
    stringAt(payload, ['url']) ||
    stringAt(payload, ['sourceUrl']) ||
    stringAt(payload, ['data', 'url']) ||
    stringAt(payload, ['data', 'object', 'url']) ||
    stringAt(payload, ['object', 'url']) ||
    stringAt(payload, ['notification', 'url'])
  );
}

function extractActor(payload: Record<string, unknown>): {
  id: string | null;
  name: string | null;
  email: string | null;
} {
  return {
    id:
      stringAt(payload, ['actorId']) ||
      stringAt(payload, ['data', 'actorId']) ||
      stringAt(payload, ['actor', 'id']) ||
      stringAt(payload, ['data', 'actor', 'id']),
    name: stringAt(payload, ['actor', 'name']) || stringAt(payload, ['data', 'actor', 'name']),
    email: stringAt(payload, ['actor', 'email']) || stringAt(payload, ['data', 'actor', 'email']),
  };
}

function stringAt(value: unknown, path: string[]): string | null {
  let cursor: unknown = value;
  for (const key of path) {
    if (!cursor || typeof cursor !== 'object') return null;
    cursor = (cursor as Record<string, unknown>)[key];
  }
  return stringValue(cursor);
}

function stringValue(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed || null;
}

function dedupeKey(
  source: string,
  eventType: string,
  sourceId: string | null | undefined,
  extra: string | null | undefined,
): string | null {
  const parts = ['bettermode', source, eventType, sourceId, extra]
    .map((part) => part?.trim())
    .filter(Boolean);
  return parts.length >= 4 ? parts.join(':') : null;
}

function parseInteger(
  value: string | undefined,
  fallback: number,
  min: number,
  max: number,
): number {
  const parsed = value ? Number.parseInt(value, 10) : fallback;
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, parsed));
}

function stripBettermodeContent(post: BettermodePost): string {
  const raw = post.shortContent || post.description || post.title || '';
  return raw
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function draftToHtml(text: string): string {
  const escaped = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return escaped
    .split(/\n{2,}/)
    .map((para) => `<p>${para.replace(/\n/g, '<br>')}</p>`)
    .join('');
}

function clip(value: string, max: number): string {
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1)}…`;
}

function parseJson<T>(value: string): T {
  try {
    return JSON.parse(value) as T;
  } catch {
    throw new BettermodeError('Invalid JSON body.', 400);
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown error';
}

function jsonResponse(
  data: unknown,
  request: Request,
  env: Env,
  init: ResponseInit = {}
): Response {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      ...corsHeaders(request, env),
      ...init.headers
    }
  });
}

function htmlResponse(html: string, request: Request, env: Env): Response {
  return new Response(html, {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      ...corsHeaders(request, env)
    }
  });
}

function corsHeaders(request: Request, env: Env): HeadersInit {
  const origin = request.headers.get('origin');
  const allowed = (env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
  const allowOrigin =
    origin && (allowed.includes('*') || allowed.includes(origin))
      ? allowed.includes('*')
        ? '*'
        : origin
      : undefined;
  return {
    ...(allowOrigin ? { 'access-control-allow-origin': allowOrigin } : {}),
    'access-control-allow-methods': 'GET,POST,OPTIONS',
    'access-control-allow-headers': 'authorization,content-type',
    'access-control-max-age': '86400'
  };
}

function renderIndexPage(origin: string): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Bettermode Marketplace Creator Agent</title>
    <style>
      body { margin: 0; font-family: ui-sans-serif, system-ui, sans-serif; background: #f6f7f8; color: #171717; }
      main { max-width: 720px; margin: 64px auto; padding: 0 24px; }
      code { background: #e9ecef; border-radius: 4px; padding: 2px 5px; }
      .panel { background: #fff; border: 1px solid #ddd; border-radius: 8px; padding: 24px; }
    </style>
  </head>
  <body>
    <main>
      <div class="panel">
        <h1>Bettermode Marketplace Creator Agent</h1>
        <p>Worker is running.</p>
        <ul>
          <li>Webhook: <code>${origin}/webhook</code></li>
          <li>Interaction: <code>${origin}/webhook/interaction</code></li>
          <li>Health: <code>${origin}/health</code></li>
        </ul>
      </div>
    </main>
  </body>
</html>`;
}
