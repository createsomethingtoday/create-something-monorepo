// Bettermode app: drafts admin replies for posts in the Webflow Community
// Marketplace Creators space, then renders an admin-only dynamic block on
// each post so the admin can edit and send the draft as themselves.
//
// Endpoints:
//   GET  /                   status page
//   GET  /health             smoke check
//   POST /webhook            Bettermode events (TEST + SUBSCRIPTION content events)
//   POST /webhook/interaction  dynamic block render + button callbacks
//
// Post and reply events go to a Cloudflare Queue. The consumer and the
// scheduled sweep live in ./queue.

import { WorkerEntrypoint } from 'cloudflare:workers';

import { BettermodeError } from './bettermode';
import { isThreadEvent, webhookEventName, webhookPostId } from './events';
import {
  adminUserIds,
  enqueue,
  handleQueueBatch,
  reconcile,
  shouldHandleSpace,
  type QueueMessage,
} from './queue';
import { sendApprovedDraft } from './send';
import { verifySignature } from './signature';
import {
  adminDraftSlate,
  interactionResponse,
  nonAdminSlate,
  type DraftBlockState,
} from './slate';
import {
  expireOpenDrafts,
  getLatestDraftByPostId,
  markRejected,
  patchSignal,
  recordWebhookEvent,
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
    // Content events (type SUBSCRIPTION) name the event here.
    name?: string | null;
    noun?: string | null;
    verb?: string | null;
    object?: { id?: string; type?: string; spaceId?: string } | null;
    target?: { id?: string; type?: string; spaceId?: string; postId?: string } | null;
  };
};

// Private API for the dashboard. A named entrypoint has no public URL: only
// a Worker in this account with a service binding to it can call it. The
// caller (the creator MCP, behind the Template Review connector) checks who
// the person is before it calls.
export class QueueAdmin extends WorkerEntrypoint<Env> {
  async sendDraft(input: {
    postId: string;
    draftText: string;
    requestedBy?: string | null;
  }): Promise<{ ok: true; reply_id: string | null } | { ok: false; error: string }> {
    try {
      const actorId = adminUserIds(this.env)[0];
      if (!actorId) throw new Error('No Bettermode admin is configured on the Worker.');
      const { replyId } = await sendApprovedDraft(this.env, {
        postId: String(input?.postId || ''),
        draftText: String(input?.draftText || ''),
        actorId,
        requestedBy: input?.requestedBy ?? null,
      });
      return { ok: true, reply_id: replyId };
    } catch (error) {
      return { ok: false, error: errorMessage(error) };
    }
  }
}

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
            environment: env.ENVIRONMENT || 'development',
          },
          request,
          env,
        );
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
          message: error instanceof Error ? error.message : 'Unknown error',
        },
        request,
        env,
        { status },
      );
    }
  },

  async queue(batch: MessageBatch<QueueMessage>, env: Env): Promise<void> {
    await handleQueueBatch(batch, env);
  },

  async scheduled(_controller: ScheduledController, env: Env): Promise<void> {
    await reconcile(env);
  },
} satisfies ExportedHandler<Env, QueueMessage>;

async function handleWebhook(
  request: Request,
  env: Env,
  ctx: ExecutionContext,
  pathname: string,
): Promise<Response> {
  const rawBody = await request.text();

  if (env.IGNORE_SIGNATURE !== 'true') {
    const valid = await verifySignature(request, rawBody, env.BETTERMODE_SIGNING_SECRET);
    if (!valid) {
      return jsonResponse({ error: 'Invalid signature' }, request, env, { status: 403 });
    }
  }

  const webhook = parseJson<WebhookPayload>(rawBody);

  // One structured line per webhook, with the event but no payload contents.
  // `name` is what the thread filter reads.
  const eventName = webhookEventName(webhook);
  console.log('webhook received', {
    pathname,
    type: webhook.type,
    name: eventName,
    noun: webhook.data?.noun,
    verb: webhook.data?.verb,
    entityId: webhook.entityId,
    context: webhook.context,
    objectId: webhook.data?.object?.id,
    spaceId: webhook.data?.object?.spaceId,
    targetId: webhook.data?.target?.id,
  });

  if (webhook.type === 'TEST') {
    return jsonResponse(
      {
        type: 'TEST',
        status: 'SUCCEEDED',
        data: { challenge: webhook.data?.challenge },
      },
      request,
      env,
    );
  }

  if (pathname === '/webhook/interaction') {
    return jsonResponse(await handleInteraction(webhook, env, ctx), request, env);
  }

  if (pathname === '/webhook' && isThreadEvent(webhook, env.BETTERMODE_MARKETPLACE_SPACE_ID)) {
    const postId = webhookPostId(webhook);
    const spaceId = webhook.data?.object?.spaceId || webhook.data?.target?.spaceId;
    console.log('matched post event', { type: webhook.type, name: eventName, postId, spaceId });
    // The consumer checks the space against the live thread, so an event
    // without a spaceId passes. Only a known foreign space is dropped here.
    if (postId && (!spaceId || shouldHandleSpace(spaceId, env))) {
      // Awaited so a failed enqueue returns a non-2xx, not a false success.
      await enqueue(env, { kind: 'thread.sync', postId, reason: eventName || 'webhook' });
      // Heartbeat for the dashboard. It must not fail or slow the webhook.
      ctx.waitUntil(
        recordWebhookEvent(env.DB, eventName || 'unnamed').catch((error) => {
          console.error('could not record webhook event', { error: errorMessage(error) });
        }),
      );
    } else {
      console.warn('event matched type but filtered out', {
        type: webhook.type,
        name: eventName,
        postId,
        spaceId,
        marketplace_space: env.BETTERMODE_MARKETPLACE_SPACE_ID,
      });
    }
  } else if (pathname === '/webhook' && webhook.type) {
    console.warn('unhandled webhook event', { type: webhook.type, name: eventName });
  }

  // Federated search and unknown types: ack with success.
  return jsonResponse(
    { type: webhook.type || 'WEBHOOK', status: 'SUCCEEDED' },
    request,
    env,
  );
}

async function handleInteraction(
  webhook: WebhookPayload,
  env: Env,
  ctx: ExecutionContext,
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
          slate: nonAdminSlate(),
        },
      ]);
    }
    const postId = resolvePostId(webhook);
    const state = await loadDraftState(postId, env);
    return interactionResponse(webhook, [
      {
        id: webhook.data?.interactionId || 'creator-agent-block',
        type: 'SHOW',
        slate: adminDraftSlate(state),
      },
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
          description: 'Only admins can act on drafted replies.',
        },
      },
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

async function handleSend(
  webhook: WebhookPayload,
  env: Env,
): Promise<Record<string, unknown>> {
  try {
    const postId = stringInput(webhook, 'postId') || resolvePostId(webhook) || '';
    await sendApprovedDraft(env, {
      postId,
      draftText: stringInput(webhook, 'draft'),
      actorId: webhook.data?.actorId || '',
    });

    const refreshed = await loadDraftState(postId, env);
    refreshed.notice = { kind: 'success', title: 'Reply sent.' };
    return interactionResponse(webhook, [
      {
        id: 'send-toast',
        type: 'OPEN_TOAST',
        props: { status: 'SUCCESS', title: 'Reply sent', description: '' },
      },
      {
        id: webhook.data?.interactionId || 'creator-agent-block',
        type: 'SHOW',
        slate: adminDraftSlate(refreshed),
      },
    ]);
  } catch (error) {
    return interactionResponse(webhook, [
      {
        id: 'send-error',
        type: 'OPEN_TOAST',
        props: {
          status: 'ERROR',
          title: 'Could not send reply',
          description: errorMessage(error),
        },
      },
    ]);
  }
}

async function handleRegenerate(
  webhook: WebhookPayload,
  env: Env,
  ctx: ExecutionContext,
): Promise<Record<string, unknown>> {
  const postId = stringInput(webhook, 'postId') || resolvePostId(webhook);
  if (!postId) {
    return interactionResponse(webhook, [
      {
        id: 'regen-error',
        type: 'OPEN_TOAST',
        props: { status: 'ERROR', title: 'Missing post ID' },
      },
    ]);
  }
  await enqueue(env, { kind: 'thread.sync', postId, reason: 'regenerate', regenerate: true });
  const state = await loadDraftState(postId, env);
  state.notice = { kind: 'info', title: 'Regenerating draft...' };
  return interactionResponse(webhook, [
    {
      id: webhook.data?.interactionId || 'creator-agent-block',
      type: 'SHOW',
      slate: adminDraftSlate(state),
    },
  ]);
}

async function handleDismiss(
  webhook: WebhookPayload,
  env: Env,
): Promise<Record<string, unknown>> {
  const postId = stringInput(webhook, 'postId') || resolvePostId(webhook);
  if (!postId) {
    return interactionResponse(webhook, []);
  }
  const state = await loadDraftState(postId, env);
  // Close the queue item only when an open draft was rejected. A creator
  // message after this time reopens it.
  if (state.draft && (await markRejected(env.DB, state.draft.id))) {
    await patchSignal(env.DB, state.signal.id, 'dismissed', {
      dismissed_at: new Date().toISOString(),
      closed_reason: null,
    });
  }
  const refreshed = await loadDraftState(postId, env);
  refreshed.notice = { kind: 'info', title: 'Draft dismissed.' };
  return interactionResponse(webhook, [
    {
      id: webhook.data?.interactionId || 'creator-agent-block',
      type: 'SHOW',
      slate: adminDraftSlate(refreshed),
    },
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
      draft: null,
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
      draft: null,
    };
  }

  return {
    postId,
    draftText: found.draft.approved_content || found.draft.draft_content,
    draftStatus: found.draft.status,
    excerpt: clip(found.signal.content, 240),
    signal: { id: found.signal.id, metadata: found.signal.metadata },
    draft: { id: found.draft.id },
  };
}

function isAdminUser(actorId: string | undefined, env: Env): boolean {
  // An empty allowlist fails closed.
  return !!actorId && adminUserIds(env).includes(actorId);
}

function resolvePostId(webhook: WebhookPayload): string | undefined {
  return (
    webhook.data?.target?.id ||
    webhook.data?.object?.id ||
    webhook.entityId ||
    undefined
  );
}

function stringInput(webhook: WebhookPayload, key: string): string {
  const value = webhook.data?.inputs?.[key];
  return typeof value === 'string' ? value : '';
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
  init: ResponseInit = {},
): Response {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      ...corsHeaders(request, env),
      ...init.headers,
    },
  });
}

function htmlResponse(html: string, request: Request, env: Env): Response {
  return new Response(html, {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      ...corsHeaders(request, env),
    },
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
    'access-control-max-age': '86400',
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
