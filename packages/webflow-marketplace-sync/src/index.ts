import { logEvent, latestRunReport } from './db';
import { runFullScan, runSweep } from './reconcile';
import { upsertItem } from './sync';
import type { Env, WebflowWebhookPayload } from './types';
import { getItem, verifyAgainstSecrets } from './webflow';

const WEBHOOK_TRIGGER_TYPES = new Set(['collection_item_created', 'collection_item_changed', 'collection_item_published']);

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

function requireAdmin(request: Request, env: Env): Response | null {
  if (!env.ADMIN_TOKEN) return json({ error: 'ADMIN_TOKEN not configured' }, 503);
  const header = request.headers.get('authorization') ?? '';
  if (header !== `Bearer ${env.ADMIN_TOKEN}`) return json({ error: 'Unauthorized' }, 401);
  return null;
}

/**
 * Zero-trust webhook handling: the payload is only a trigger. We verify the
 * signature, then re-fetch the item from the Webflow API before writing anything,
 * so a spoofed or stale payload can never inject data into Airtable.
 */
async function handleWebhook(request: Request, env: Env): Promise<Response> {
  const rawBody = await request.text();
  const signature = request.headers.get('x-webflow-signature') ?? '';
  if (!(await verifyAgainstSecrets(env, rawBody, signature))) {
    return json({ error: 'Invalid signature' }, 401);
  }

  let webhook: WebflowWebhookPayload;
  try {
    webhook = JSON.parse(rawBody) as WebflowWebhookPayload;
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  const { triggerType, payload } = webhook;
  if (!WEBHOOK_TRIGGER_TYPES.has(triggerType)) return json({ status: 'ignored', triggerType });

  const collectionId = payload?.cid ?? payload?.collectionId;
  if (collectionId && collectionId !== env.WEBFLOW_TEMPLATES_COLLECTION_ID) {
    return json({ status: 'ignored', reason: 'not the Templates collection' });
  }

  const itemId = payload?.id;
  if (!itemId) return json({ error: 'Missing item id' }, 400);

  const item = await getItem(env, itemId);
  if (!item) {
    await logEvent(env, { triggerType, itemId, action: 'ignored', detail: 'item not found (deleted?)' });
    return json({ status: 'ignored', reason: 'item not found' });
  }

  try {
    const result = await upsertItem(env, item, triggerType);
    return json({ status: result.action, recordId: result.recordId, changedFields: result.changedFields });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await logEvent(env, { triggerType, itemId, action: 'error', detail: message });
    // 500 so Webflow retries the delivery.
    return json({ error: message }, 500);
  }
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/health') {
      return json({ ok: true, environment: env.ENVIRONMENT, writeMode: env.WRITE_MODE });
    }

    if (url.pathname === '/webhooks/webflow' && request.method === 'POST') {
      return handleWebhook(request, env);
    }

    if (url.pathname === '/api/report' && request.method === 'GET') {
      const denied = requireAdmin(request, env);
      if (denied) return denied;
      const kind = url.searchParams.get('kind') ?? undefined;
      return json(await latestRunReport(env, kind));
    }

    if (url.pathname === '/api/reconcile' && request.method === 'POST') {
      const denied = requireAdmin(request, env);
      if (denied) return denied;
      const kind = url.searchParams.get('kind') === 'full' ? 'full' : 'sweep';
      if (url.searchParams.get('async') === 'true') {
        ctx.waitUntil(kind === 'full' ? runFullScan(env) : runSweep(env));
        return json({ status: 'started', kind });
      }
      const result = kind === 'full' ? await runFullScan(env) : await runSweep(env);
      return json(result);
    }

    return json({ error: 'Not found' }, 404);
  },

  async scheduled(controller: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    if (controller.cron === '*/10 * * * *') {
      ctx.waitUntil(runSweep(env));
      return;
    }
    // Daily full drift scan.
    ctx.waitUntil(runFullScan(env));
  },
} satisfies ExportedHandler<Env>;
