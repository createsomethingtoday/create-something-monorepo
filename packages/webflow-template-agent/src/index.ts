import { runAgentTurn } from './agent.js';
import {
  rateLimitSession,
  reserveTurn,
  settleTurn,
  usageCostMicroUsd,
  type GuardDecision,
} from './abuse.js';
import {
  bearerToken,
  issueContext,
  issueSession,
  verifyContext,
  verifySession,
  verifyTurnstile,
  type IssuedSession,
  type SessionClaims,
  type TurnstileRequestContext,
  type TurnstileVerification,
} from './security.js';
import type { AgentSseEvent, ChatContext, ChatRequestBody, Env } from './types.js';
import type { AgentUsage } from './types.js';
import { recordAbuseEvent, type AbuseEvent } from './telemetry.js';

const MAX_REQUEST_BODY_BYTES = 64 * 1024;
const MAX_REQUEST_MESSAGES = 20;
const MAX_REQUEST_MESSAGE_CHARS = 4_000;
const MAX_REQUEST_TOTAL_CHARS = 40_000;

interface TemplateAgentWorkerDependencies {
  runAgentTurn: (
    env: Env,
    history: ChatRequestBody['messages'],
    emit: (event: AgentSseEvent) => void,
    context?: ChatContext,
  ) => Promise<AgentUsage | void>;
  issueSession: (env: Env) => Promise<IssuedSession>;
  issueContext: (env: Env, context: ChatContext) => Promise<string>;
  verifyContext: (env: Env, token: string) => Promise<Pick<ChatContext, 'known_templates'> | null>;
  verifySession: (env: Env, token: string) => Promise<SessionClaims | null>;
  verifyTurnstile: (
    env: Env,
    token: string,
    context: TurnstileRequestContext,
  ) => Promise<TurnstileVerification>;
  rateLimit: (env: Env, session: SessionClaims) => Promise<boolean>;
  reserveTurn: (env: Env, session: SessionClaims) => Promise<GuardDecision>;
  settleTurn: (env: Env, settlement: { leaseId: string; actualCostMicroUsd: number }) => Promise<void>;
  recordEvent: (env: Env, event: AbuseEvent) => void;
}

function corsHeaders(request: Request, env: Env): Record<string, string> {
  const origin = request.headers.get('Origin') ?? '';
  const allowed = (env.ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);

  const originAllowed = allowed.some((pattern) => {
    if (pattern === origin) return true;
    if (pattern.startsWith('*.')) {
      try {
        const host = new URL(origin).hostname;
        return host === pattern.slice(2) || host.endsWith(pattern.slice(1));
      } catch {
        return false;
      }
    }
    return false;
  });

  return {
    'Access-Control-Allow-Origin': originAllowed ? origin : 'https://webflow.com',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    Vary: 'Origin',
  };
}

function sseResponse(
  request: Request,
  env: Env,
  body: ChatRequestBody,
  ctx: ExecutionContext,
  runTurn: TemplateAgentWorkerDependencies['runAgentTurn'],
  leaseId: string,
  settle: TemplateAgentWorkerDependencies['settleTurn'],
  reservedMicroUsd: number,
  signContext: TemplateAgentWorkerDependencies['issueContext'],
  recordEvent: TemplateAgentWorkerDependencies['recordEvent'],
): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const emit = (event: AgentSseEvent) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      };

      let serverContext: ChatContext | null = null;
      let completed = false;
      const emitFromAgent = (event: AgentSseEvent) => {
        if (event.type === 'context' && !('context_token' in event.payload)) {
          serverContext = event.payload;
          return;
        }
        if (event.type === 'done') {
          completed = true;
          return;
        }
        emit(event);
      };

      ctx.waitUntil(
        runTurn(env, body.messages, emitFromAgent, body.context)
          .then(async (usage) => {
            if (serverContext) {
              emit({ type: 'context', payload: { context_token: await signContext(env, serverContext) } });
            }
            if (completed) emit({ type: 'done' });
            const actualCostMicroUsd = usage ? usageCostMicroUsd(env, usage) : 0;
            await settle(env, {
              leaseId,
              actualCostMicroUsd,
            });
            recordEvent(env, {
              type: 'turn_settled',
              actualCostMicroUsd,
              inputTokens: usage?.inputTokens ?? 0,
              outputTokens: usage?.outputTokens ?? 0,
              cacheInputTokens: (usage?.cacheCreationInputTokens ?? 0) + (usage?.cacheReadInputTokens ?? 0),
            });
          })
          .catch(async () => {
            emit({
              type: 'error',
              message: 'The assistant hit an unexpected error. Please try again.',
            });
            await settle(env, { leaseId, actualCostMicroUsd: reservedMicroUsd }).catch(() => undefined);
            recordEvent(env, { type: 'turn_failed', reason: 'model_or_stream_error', actualCostMicroUsd: reservedMicroUsd });
          })
          .finally(() => {
            try {
              controller.close();
            } catch {
              // Stream already closed by the client.
            }
          }),
      );
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-store',
      ...corsHeaders(request, env),
    },
  });
}

async function readRequestJson(request: Request): Promise<{ value?: unknown; tooLarge: boolean }> {
  const contentLength = Number(request.headers.get('content-length') ?? '0');
  if (Number.isFinite(contentLength) && contentLength > MAX_REQUEST_BODY_BYTES) {
    return { tooLarge: true };
  }

  const bytes = await request.arrayBuffer();
  if (bytes.byteLength > MAX_REQUEST_BODY_BYTES) return { tooLarge: true };

  try {
    return { value: JSON.parse(new TextDecoder().decode(bytes)), tooLarge: false };
  } catch {
    return { tooLarge: false };
  }
}

function parseBody(raw: unknown): ChatRequestBody | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const messages = (raw as { messages?: unknown }).messages;
  if (!Array.isArray(messages) || messages.length === 0 || messages.length > MAX_REQUEST_MESSAGES) return null;

  const parsed: ChatRequestBody['messages'] = [];
  let totalChars = 0;
  for (const entry of messages) {
    const role = (entry as { role?: unknown }).role;
    const content = (entry as { content?: unknown }).content;
    if (
      (role !== 'user' && role !== 'assistant') ||
      typeof content !== 'string' ||
      content.length > MAX_REQUEST_MESSAGE_CHARS
    ) {
      return null;
    }
    totalChars += content.length;
    if (totalChars > MAX_REQUEST_TOTAL_CHARS) return null;
    parsed.push({ role, content });
  }
  const parsedContext = parseContext((raw as { context?: unknown }).context);
  return { messages: parsed, context: parsedContext.context, contextToken: parsedContext.contextToken };
}

// Client-owned display/page hints remain bounded but untrusted. Template facts
// are accepted only through the signed continuity token and merged later.
function parseContext(raw: unknown): { context?: ChatContext; contextToken?: string } {
  if (typeof raw !== 'object' || raw === null) return {};
  const rawToken = (raw as { context_token?: unknown }).context_token;
  const contextToken = typeof rawToken === 'string' && rawToken.length <= 64_000 ? rawToken : undefined;
  const rawSurface = (raw as { surface?: unknown }).surface;
  const surface: ChatContext['surface'] =
    rawSurface === 'compact' || rawSurface === 'immersive' ? rawSurface : undefined;
  const rawGrid = (raw as { has_page_grid?: unknown }).has_page_grid;
  const hasPageGrid = typeof rawGrid === 'boolean' ? rawGrid : undefined;
  const rawMisses = (raw as { highlight_misses?: unknown }).highlight_misses;
  const highlightMisses = (Array.isArray(rawMisses) ? rawMisses : [])
    .filter((value): value is string => typeof value === 'string' && /^[a-z0-9-]{1,200}$/.test(value))
    .slice(0, 12);

  const context =
    surface || hasPageGrid !== undefined || highlightMisses.length > 0
      ? { surface, has_page_grid: hasPageGrid, highlight_misses: highlightMisses }
      : undefined;
  return { context, contextToken };
}

export function createTemplateAgentWorker(
  dependencies: TemplateAgentWorkerDependencies = {
    runAgentTurn,
    issueContext,
    issueSession,
    verifyContext,
    verifySession,
    verifyTurnstile,
    rateLimit: rateLimitSession,
    reserveTurn,
    settleTurn,
    recordEvent: recordAbuseEvent,
  },
): ExportedHandler<Env> {
  return {
    async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // The browser-facing Webflow Cloud proxy is the only public entrypoint.
    // Keep the workers.dev hostname routable for that cross-account proxy,
    // but make every direct production request indistinguishable from a
    // missing endpoint unless it carries the server-only credential.
    if (
      env.ENVIRONMENT === 'production' &&
      (!env.AGENT_PROXY_SECRET || request.headers.get('x-template-agent-proxy') !== env.AGENT_PROXY_SECRET)
    ) {
      return Response.json({ error: 'Not found' }, { status: 404 });
    }

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(request, env) });
    }

    if (url.pathname === '/' || url.pathname === '/health') {
      return Response.json(
        { service: 'webflow-template-agent', ok: Boolean(env.ANTHROPIC_API_KEY) },
        { headers: corsHeaders(request, env) },
      );
    }

    if (url.pathname === '/api/templates/agent/session' && request.method === 'POST') {
      const rawBody = await readRequestJson(request);
      if (rawBody.tooLarge) {
        dependencies.recordEvent(env, { type: 'request_rejected', reason: 'body_too_large' });
        return Response.json(
          { error: 'Request body is too large.' },
          { status: 413, headers: corsHeaders(request, env) },
        );
      }
      const turnstileToken =
        typeof rawBody.value === 'object' &&
        rawBody.value !== null &&
        typeof (rawBody.value as { turnstile_token?: unknown }).turnstile_token === 'string'
          ? (rawBody.value as { turnstile_token: string }).turnstile_token
          : '';
      if (!turnstileToken || turnstileToken.length > 2_048) {
        dependencies.recordEvent(env, { type: 'session_rejected', reason: 'turnstile_missing' });
        return Response.json({ error: 'Bot verification is required.' }, { status: 400, headers: corsHeaders(request, env) });
      }

      const verification = await dependencies.verifyTurnstile(env, turnstileToken, {
        origin: request.headers.get('origin') ?? '',
        remoteIp:
          request.headers.get('x-template-agent-client-ip') ??
          request.headers.get('cf-connecting-ip') ??
          undefined,
      });
      if (!verification.success) {
        dependencies.recordEvent(env, { type: 'session_rejected', reason: 'turnstile_failed' });
        return Response.json(
          { error: verification.reason ?? 'Bot verification failed.' },
          { status: verification.reason?.includes('not configured') ? 503 : 403, headers: corsHeaders(request, env) },
        );
      }

      try {
        const session = await dependencies.issueSession(env);
        dependencies.recordEvent(env, { type: 'session_minted' });
        return Response.json(
          { session_token: session.token, expires_in: session.expiresIn },
          { status: 201, headers: corsHeaders(request, env) },
        );
      } catch {
        dependencies.recordEvent(env, { type: 'session_rejected', reason: 'session_service_unavailable' });
        return Response.json(
          { error: 'Session service is not configured.' },
          { status: 503, headers: corsHeaders(request, env) },
        );
      }
    }

    if (url.pathname === '/api/templates/agent/chat' && request.method === 'POST') {
      if (!env.ANTHROPIC_API_KEY) {
        return Response.json({ error: 'Agent is not configured.' }, { status: 503, headers: corsHeaders(request, env) });
      }

      const token = bearerToken(request);
      const session = token ? await dependencies.verifySession(env, token) : null;
      if (!session) {
        dependencies.recordEvent(env, { type: 'request_rejected', reason: 'invalid_session' });
        return Response.json(
          { error: 'A valid Template Finder session is required.' },
          { status: 401, headers: corsHeaders(request, env) },
        );
      }

      const rawBody = await readRequestJson(request);
      if (rawBody.tooLarge) {
        dependencies.recordEvent(env, { type: 'request_rejected', reason: 'body_too_large' });
        return Response.json(
          { error: 'Request body is too large.' },
          { status: 413, headers: corsHeaders(request, env) },
        );
      }
      const body = parseBody(rawBody.value);
      if (!body) {
        dependencies.recordEvent(env, { type: 'request_rejected', reason: 'invalid_body' });
        return Response.json(
          { error: 'Body must be { messages: [{ role: "user" | "assistant", content: string }, ...] }.' },
          { status: 400, headers: corsHeaders(request, env) },
        );
      }

      if (body.contextToken) {
        const trustedContext = await dependencies.verifyContext(env, body.contextToken);
        if (!trustedContext) {
          dependencies.recordEvent(env, { type: 'request_rejected', reason: 'invalid_context' });
          return Response.json(
            { error: 'Template Finder continuity is invalid or expired.' },
            { status: 400, headers: corsHeaders(request, env) },
          );
        }
        body.context = { ...body.context, known_templates: trustedContext.known_templates ?? [] };
      }

      if (!(await dependencies.rateLimit(env, session))) {
        dependencies.recordEvent(env, { type: 'turn_denied', reason: 'rate_limit' });
        return Response.json(
          { error: 'Too many requests. Please wait before trying again.' },
          { status: 429, headers: { ...corsHeaders(request, env), 'Retry-After': '60' } },
        );
      }

      const reservation = await dependencies.reserveTurn(env, session);
      if (!reservation.allowed) {
        dependencies.recordEvent(env, { type: 'turn_denied', reason: reservation.reason });
        const error =
          reservation.reason === 'daily_budget'
            ? 'The Template Finder has reached its daily usage limit.'
            : reservation.reason === 'guard_unavailable'
              ? 'The Template Finder safety service is unavailable.'
              : 'The Template Finder is busy. Please try again shortly.';
        return Response.json(
          { error },
          { status: reservation.status, headers: { ...corsHeaders(request, env), 'Retry-After': '60' } },
        );
      }

      dependencies.recordEvent(env, { type: 'turn_allowed' });

      return sseResponse(
        request,
        env,
        body,
        ctx,
        dependencies.runAgentTurn,
        reservation.leaseId,
        dependencies.settleTurn,
        reservation.reservedMicroUsd ?? 2_000_000,
        dependencies.issueContext,
        dependencies.recordEvent,
      );
    }

    return Response.json({ error: 'Not found' }, { status: 404, headers: corsHeaders(request, env) });
    },
  } satisfies ExportedHandler<Env>;
}

export default createTemplateAgentWorker();

export { TemplateAgentAbuseGuard } from './abuse.js';
