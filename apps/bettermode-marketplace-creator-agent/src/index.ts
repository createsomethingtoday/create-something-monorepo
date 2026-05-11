// Bettermode app: drafts admin replies for posts in the Webflow Community
// Marketplace Creators space, then renders an admin-only dynamic block on
// each post so the admin can edit and send the draft as themselves.
//
// Endpoints:
//   GET  /                   status page
//   GET  /health             smoke check
//   POST /webhook            Bettermode events (TEST + post/reply lifecycle)
//   POST /webhook/interaction  dynamic block render + button callbacks

import {
  airtableConfig,
  fetchCreatorContext,
  type CreatorContext,
} from './airtable';
import {
  appAccessToken,
  bettermodeAuth,
  BettermodeError,
  createReply,
  fetchPostThread,
  memberAccessToken,
  type BettermodePost,
} from './bettermode';
import { difyAgentConfig, generateDraftViaDify } from './dify-agent';
import { generateDraft, openaiConfig } from './openai';
import { verifySignature } from './signature';
import {
  adminDraftSlate,
  interactionResponse,
  nonAdminSlate,
  type DraftBlockState,
} from './slate';
import {
  getLatestDraftByPostId,
  listRecentApprovedDrafts,
  markRejected,
  markSent,
  upsertPendingDraft,
  upsertSignal,
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
  'reply.updated',
]);

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
} satisfies ExportedHandler<Env>;

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

  if (pathname === '/webhook' && webhook.type && POST_EVENT_TYPES.has(webhook.type)) {
    const postId = webhook.data?.object?.id || webhook.entityId;
    const spaceId = webhook.data?.object?.spaceId;
    console.log('matched post event', { type: webhook.type, postId, spaceId });
    if (postId && shouldHandleSpace(spaceId, env)) {
      ctx.waitUntil(generateDraftForPost(postId, env).catch((err) => {
        console.error('draft generation failed', { postId, error: errorMessage(err) });
      }));
    } else {
      console.warn('event matched type but filtered out', {
        type: webhook.type,
        postId,
        spaceId,
        marketplace_space: env.BETTERMODE_MARKETPLACE_SPACE_ID,
      });
    }
  } else if (pathname === '/webhook' && webhook.type) {
    console.warn('unhandled webhook type', { type: webhook.type });
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
    );

    await markSent(env.DB, state.draft.id, draftText, reply.id ?? null);

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
  ctx.waitUntil(
    generateDraftForPost(postId, env, { regenerate: true }).catch((err) => {
      console.error('regenerate failed', { postId, error: errorMessage(err) });
    }),
  );
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
  if (state.draft) {
    await markRejected(env.DB, state.draft.id);
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

async function generateDraftForPost(
  postId: string,
  env: Env,
  opts: { regenerate?: boolean } = {},
): Promise<void> {
  const auth = bettermodeAuth(env);
  const networkId = env.BETTERMODE_DEFAULT_NETWORK_ID;
  if (!networkId) throw new Error('Missing BETTERMODE_DEFAULT_NETWORK_ID.');

  const token = await appAccessToken(networkId, auth);
  const post = await fetchPostThread(postId, token, auth);
  if (!post) {
    console.warn('post not found for draft', { postId });
    return;
  }

  if (!shouldHandleSpace(post.spaceId || post.space?.id, env)) {
    return;
  }

  const author = post.owner || post.createdBy;
  const email = author?.email || '';
  const isTopLevel = !post.parentId;

  // Prefer the Dify agent when configured: it owns the prompt, the policy
  // knowledge base, and the connected bettermode-creator MCP, so it can
  // ground answers in actual marketplace policy. Falls back to direct
  // OpenAI (no policy KB) only if DIFY_AGENT_API_KEY is unset.
  const difyConfig = difyAgentConfig(env);
  let draft: string | null = null;
  if (difyConfig) {
    try {
      const result = await generateDraftViaDify(
        {
          postId: post.id,
          isTopLevel,
          spaceId: post.spaceId || post.space?.id || null,
          authorMemberId: author?.id || null,
          authorEmail: email || null,
          authorName: author?.name || null,
          regenerate: opts.regenerate === true,
        },
        difyConfig,
      );
      draft = result.answer;
    } catch (err) {
      console.error('dify draft failed; falling back to direct OpenAI', {
        postId,
        error: errorMessage(err),
      });
    }
  }

  if (draft === null) {
    let creator: CreatorContext | null = null;
    const aConfig = airtableConfig(env);
    if (aConfig && email) {
      try {
        creator = await fetchCreatorContext(email, aConfig);
      } catch (err) {
        console.error('airtable lookup failed', { email, error: errorMessage(err) });
      }
    }

    const oConfig = openaiConfig(env);
    if (!oConfig) {
      console.warn('Neither Dify nor OpenAI configured; skipping draft', { postId });
      return;
    }

    const fewShot = await listRecentApprovedDrafts(env.DB, 5);
    draft = await generateDraft(
      {
        post,
        isTopLevel,
        creator,
        fewShotApprovedDrafts: fewShot,
        regenerate: opts.regenerate === true,
      },
      oConfig,
    );
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
      author_name: author?.name || null,
    },
  });

  await upsertPendingDraft(env.DB, { signalId, draftContent: draft });
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

function shouldHandleSpace(spaceId: string | null | undefined, env: Env): boolean {
  const required = env.BETTERMODE_MARKETPLACE_SPACE_ID?.trim();
  if (!required) {
    // Not yet configured: handle everything so the operator can capture a
    // real space ID from the first webhook payload via logs.
    return true;
  }
  return !!spaceId && spaceId === required;
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

function stripBettermodeContent(post: BettermodePost): string {
  const raw = post.shortContent || post.description || post.title || '';
  return raw.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}

function draftToHtml(text: string): string {
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
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
