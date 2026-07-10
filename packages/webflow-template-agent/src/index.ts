import { runAgentTurn } from './agent.js';
import type { AgentSseEvent, ChatContext, ChatRequestBody, Env, TemplateSearchItem } from './types.js';

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
    'Access-Control-Allow-Headers': 'Content-Type',
    Vary: 'Origin',
  };
}

function sseResponse(request: Request, env: Env, body: ChatRequestBody, ctx: ExecutionContext): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const emit = (event: AgentSseEvent) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      };

      ctx.waitUntil(
        runAgentTurn(env, body.messages, emit, body.context)
          .catch((error) => {
            emit({
              type: 'error',
              message: error instanceof Error ? error.message : 'The assistant hit an unexpected error.',
            });
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

function parseBody(raw: unknown): ChatRequestBody | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const messages = (raw as { messages?: unknown }).messages;
  if (!Array.isArray(messages) || messages.length === 0 || messages.length > 60) return null;

  const parsed: ChatRequestBody['messages'] = [];
  for (const entry of messages) {
    const role = (entry as { role?: unknown }).role;
    const content = (entry as { content?: unknown }).content;
    if ((role !== 'user' && role !== 'assistant') || typeof content !== 'string') return null;
    parsed.push({ role, content });
  }
  return { messages: parsed, context: parseContext((raw as { context?: unknown }).context) };
}

// Continuity blob echoed back from a previous turn's `context` event. Shape is
// validated loosely (it only affects this client's own rendering); a malformed
// blob degrades to "no context" instead of failing the request.
function parseContext(raw: unknown): ChatContext | undefined {
  if (typeof raw !== 'object' || raw === null) return undefined;
  const knownTemplates = (raw as { known_templates?: unknown }).known_templates;
  const rawSurface = (raw as { surface?: unknown }).surface;
  const surface = rawSurface === 'compact' || rawSurface === 'immersive' ? rawSurface : undefined;
  const rawGrid = (raw as { has_page_grid?: unknown }).has_page_grid;
  const hasPageGrid = typeof rawGrid === 'boolean' ? rawGrid : undefined;

  const items = (Array.isArray(knownTemplates) ? knownTemplates : [])
    .filter(
      (entry): entry is TemplateSearchItem =>
        typeof entry === 'object' &&
        entry !== null &&
        typeof (entry as { template_slug?: unknown }).template_slug === 'string' &&
        typeof (entry as { name?: unknown }).name === 'string',
    )
    .slice(0, 40);

  if (items.length === 0 && !surface && hasPageGrid === undefined) return undefined;
  return { known_templates: items, surface, has_page_grid: hasPageGrid };
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(request, env) });
    }

    if (url.pathname === '/' || url.pathname === '/health') {
      return Response.json(
        { service: 'webflow-template-agent', ok: Boolean(env.ANTHROPIC_API_KEY) },
        { headers: corsHeaders(request, env) },
      );
    }

    if (url.pathname === '/api/templates/agent/chat' && request.method === 'POST') {
      if (!env.ANTHROPIC_API_KEY) {
        return Response.json({ error: 'Agent is not configured.' }, { status: 503, headers: corsHeaders(request, env) });
      }

      let body: ChatRequestBody | null = null;
      try {
        body = parseBody(await request.json());
      } catch {
        body = null;
      }
      if (!body) {
        return Response.json(
          { error: 'Body must be { messages: [{ role: "user" | "assistant", content: string }, ...] }.' },
          { status: 400, headers: corsHeaders(request, env) },
        );
      }

      return sseResponse(request, env, body, ctx);
    }

    return Response.json({ error: 'Not found' }, { status: 404, headers: corsHeaders(request, env) });
  },
} satisfies ExportedHandler<Env>;
