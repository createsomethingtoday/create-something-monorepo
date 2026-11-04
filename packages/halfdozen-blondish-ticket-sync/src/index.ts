import {
  fullReconcile,
  preflight,
  syncFromWebhook,
  syncHalfDozenStatusToSource,
  syncSourceTicketsToHalfDozen,
} from './sync.js';
import type { Env, NotionWebhookPayload } from './types.js';

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, content-type, x-notion-signature',
  'Access-Control-Max-Age': '86400',
};
const WEBHOOK_VERIFICATION_TOKENS_KEY = 'notion_webhook_verification_tokens';
const MAX_STORED_WEBHOOK_TOKENS = 10;

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS_HEADERS });

    const url = new URL(request.url);
    if (url.pathname === '/' || url.pathname === '/health') {
      const storedWebhookTokenCount = await readStoredWebhookVerificationTokens(env).then((tokens) => tokens.length);
      return json({
        ok: true,
        worker: 'halfdozen-blondish-ticket-sync',
        mode: 'standalone-worker',
        realtime: true,
        endpoints: {
          webhook: '/webhooks/notion',
          preflight: '/preflight',
          source_to_hd: '/sync/source-to-hd',
          hd_status_to_source: '/sync/hd-status-to-source',
          full_reconcile: '/sync/full',
        },
        config: {
          blondish_source_data_source_configured: Boolean(env.BLONDISH_SUPPORT_TICKETS_DATA_SOURCE_ID?.trim()),
          halfdozen_target_data_source_configured: Boolean(env.HALFDOZEN_TICKETS_DATA_SOURCE_ID?.trim() || env.HALFDOZEN_TICKETS_DATABASE_ID?.trim()),
          webhook_signature_configured: Boolean(env.NOTION_WEBHOOK_VERIFICATION_TOKEN?.trim()),
          webhook_state_configured: Boolean(env.WEBHOOK_STATE),
          webhook_verification_tokens_stored: storedWebhookTokenCount,
          forward_sync_on_schedule: env.FORWARD_SYNC_ON_SCHEDULE === 'true',
        },
        secrets: {
          sync_api_key_configured: Boolean(env.SYNC_API_KEY?.trim()),
          blondish_token_configured: Boolean(env.BLONDISH_NOTION_API_KEY?.trim()),
          halfdozen_token_configured: Boolean(env.HALFDOZEN_NOTION_API_KEY?.trim()),
        },
      });
    }

    if (url.pathname === '/webhooks/notion' && request.method === 'POST') {
      const bodyText = await request.text();
      const payload = parseJson<NotionWebhookPayload>(bodyText);
      if (payload.verification_token) {
        const stored = await storeWebhookVerificationToken(env, payload.verification_token);
        console.log('Notion webhook verification token received', JSON.stringify({ stored }));
        return json({ ok: true, received_verification_token: true, stored_for_signature_validation: stored });
      }

      const signatureError = await validateNotionWebhookSignature(request, env, bodyText);
      if (signatureError) return signatureError;

      const promise = syncFromWebhook(env, payload)
        .then((result) => console.log('webhook sync result', JSON.stringify(result)))
        .catch((error) => console.error('webhook sync failed', error instanceof Error ? error.message : String(error)));
      ctx.waitUntil(promise);
      return json({ ok: true, accepted: true });
    }

    const authError = requireApiKey(request, env);
    if (authError) return authError;

    if (url.pathname === '/preflight') {
      return json(await preflight(env));
    }

    if (url.pathname === '/sync/source-to-hd' && request.method === 'POST') {
      const body = await readJsonBody(request);
      return json(await syncSourceTicketsToHalfDozen(env, {
        sourcePageIds: readStringArray(body, 'source_page_ids', 'source_page_id', 'page_id'),
      }));
    }

    if (url.pathname === '/sync/hd-status-to-source' && request.method === 'POST') {
      const body = await readJsonBody(request);
      return json(await syncHalfDozenStatusToSource(env, {
        targetPageIds: readStringArray(body, 'target_page_ids', 'target_page_id', 'page_id'),
      }));
    }

    if (url.pathname === '/sync/full' && request.method === 'POST') {
      return json(await fullReconcile(env));
    }

    return json({ ok: false, error: 'Not found' }, 404);
  },

  async scheduled(_event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(
      fullReconcile(env, 'scheduled')
        .then((result) => console.log('scheduled reconcile result', JSON.stringify(result)))
        .catch((error) => console.error('scheduled reconcile failed', error instanceof Error ? error.message : String(error))),
    );
  },
};

function requireApiKey(request: Request, env: Env): Response | null {
  const configured = env.SYNC_API_KEY?.trim();
  if (!configured) return json({ ok: false, error: 'SYNC_API_KEY is not configured' }, 503);
  const supplied = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim();
  if (supplied !== configured) return json({ ok: false, error: 'Unauthorized' }, 401);
  return null;
}

async function validateNotionWebhookSignature(request: Request, env: Env, bodyText: string): Promise<Response | null> {
  const tokens = await readWebhookVerificationTokens(env);
  if (tokens.length === 0) {
    return json({ ok: false, error: 'No webhook verification token is configured or stored' }, 503);
  }
  const header = request.headers.get('x-notion-signature') ?? request.headers.get('X-Notion-Signature') ?? '';
  if (!header) return json({ ok: false, error: 'Missing X-Notion-Signature' }, 401);
  for (const token of tokens) {
    const expected = await hmacSha256(token, bodyText);
    if (timingSafeEqual(`sha256=${expected}`, header)) return null;
  }
  return json({ ok: false, error: 'Invalid X-Notion-Signature' }, 401);
}

async function readWebhookVerificationTokens(env: Env): Promise<string[]> {
  return [
    ...(env.NOTION_WEBHOOK_VERIFICATION_TOKEN?.trim() ? [env.NOTION_WEBHOOK_VERIFICATION_TOKEN.trim()] : []),
    ...await readStoredWebhookVerificationTokens(env),
  ].filter((token, index, tokens) => token && tokens.indexOf(token) === index);
}

async function readStoredWebhookVerificationTokens(env: Env): Promise<string[]> {
  if (!env.WEBHOOK_STATE) return [];
  const stored = await env.WEBHOOK_STATE.get(WEBHOOK_VERIFICATION_TOKENS_KEY, 'json');
  return Array.isArray(stored) ? stored.filter((value): value is string => typeof value === 'string' && value.trim().length > 0) : [];
}

async function storeWebhookVerificationToken(env: Env, token: string): Promise<boolean> {
  if (!env.WEBHOOK_STATE) return false;
  const tokens = [token.trim(), ...await readStoredWebhookVerificationTokens(env)]
    .filter((value, index, values) => value && values.indexOf(value) === index)
    .slice(0, MAX_STORED_WEBHOOK_TOKENS);
  await env.WEBHOOK_STATE.put(WEBHOOK_VERIFICATION_TOKENS_KEY, JSON.stringify(tokens));
  return true;
}

async function hmacSha256(secret: string, value: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(value));
  return Array.from(new Uint8Array(signature)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function timingSafeEqual(a: string, b: string): boolean {
  const left = new TextEncoder().encode(a);
  const right = new TextEncoder().encode(b);
  if (left.length !== right.length) return false;
  let diff = 0;
  for (let index = 0; index < left.length; index += 1) diff |= left[index] ^ right[index];
  return diff === 0;
}

async function readJsonBody(request: Request): Promise<Record<string, unknown>> {
  try {
    return parseJson<Record<string, unknown>>(await request.text());
  } catch {
    return {};
  }
}

function parseJson<T>(text: string): T {
  if (!text.trim()) return {} as T;
  const parsed = JSON.parse(text) as unknown;
  return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as T : {} as T;
}

function readStringArray(body: Record<string, unknown>, pluralKey: string, ...singleKeys: string[]): string[] | undefined {
  const plural = body[pluralKey];
  if (Array.isArray(plural)) return plural.filter((value): value is string => typeof value === 'string' && value.trim().length > 0);
  for (const key of singleKeys) {
    const value = body[key];
    if (typeof value === 'string' && value.trim()) return [value.trim()];
  }
  return undefined;
}

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload, null, 2), {
    status,
    headers: {
      'content-type': 'application/json',
      ...CORS_HEADERS,
    },
  });
}
