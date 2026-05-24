import {
  backfillCreatorFieldsByName,
  getActiveSyncJob,
  getLatestSyncJob,
  getSyncStateRecords,
  healthCounts,
  publicSyncJobRecord,
  publicSyncStateRecord,
  updateCreatorAvatarsFromWebflow,
  updateTemplateImagesFromWebflow,
} from './db.js';
import { corsPreflight, jsonResponse, textResponse } from './http.js';
import { parseSearchParams } from './query.js';
import { searchTemplates } from './search.js';
import {
  SyncAlreadyRunningError,
  backfillTemplateImages,
  pruneMissingTemplateImages,
  refreshCreatorProfiles,
  refreshImages,
  syncTemplates,
} from './sync.js';
import type { Env } from './types.js';
import { DESIGNERS_COLLECTION_ID, TEMPLATES_COLLECTION_ID, mapWebhookDesignerItem, mapWebhookTemplateItem, verifyWebflowSignature } from './webflow.js';
import type { WebflowWebhookPayload } from './webflow.js';

const SYNC_STATUS_STATE_KEYS = [
  'last_full_sync',
  'last_incremental_sync',
  'last_image_refresh',
  'last_creator_refresh',
  'last_image_backfill',
  'last_image_prune',
  'last_sync_error',
  'last_sync_skipped',
];

const INCREMENTAL_SYNC_CRON = '*/5 * * * *';
const IMAGE_REFRESH_CRON = '0 */2 * * *';
const IMAGE_BACKFILL_MAINTENANCE_CRON = '17 * * * *';
const IMAGE_PRUNE_MAINTENANCE_CRON = '47 3 * * *';
const SCHEDULED_IMAGE_BACKFILL_LIMIT = 96;
const SCHEDULED_IMAGE_PRUNE_LIMIT = 24;

const PUBLIC_SEARCH_CACHE_HEADERS = {
  'Cache-Control': 'public, max-age=60, s-maxage=300, stale-while-revalidate=86400',
  'CDN-Cache-Control': 'public, max-age=300, stale-while-revalidate=86400',
};

function parseBearerToken(request: Request): string | null {
  const auth = request.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  return auth.slice(7).trim();
}

function validateAdminToken(request: Request, env: Env): Response | null {
  if (!env.SYNC_ADMIN_TOKEN) {
    return jsonResponse(request, env, { error: 'Sync admin token is not configured.' }, 503);
  }

  const bearer = parseBearerToken(request);
  const apiKey = request.headers.get('X-API-Key')?.trim() ?? null;
  if (bearer === env.SYNC_ADMIN_TOKEN || apiKey === env.SYNC_ADMIN_TOKEN) {
    return null;
  }

  return jsonResponse(request, env, { error: 'Unauthorized' }, 401);
}

async function handleSearch(request: Request, env: Env): Promise<Response> {
  const defaultPageSize = Number(env.DEFAULT_PAGE_SIZE ?? '24') || 24;
  const params = parseSearchParams(new URL(request.url), defaultPageSize);
  return jsonResponse(request, env, await searchTemplates(env, params), 200, PUBLIC_SEARCH_CACHE_HEADERS);
}

async function handleManualSync(
  request: Request,
  env: Env,
  ctx: ExecutionContext,
  mode: 'full' | 'incremental',
): Promise<Response> {
  const authError = validateAdminToken(request, env);
  if (authError) return authError;

  if (mode === 'full') {
    const activeJob = await getActiveSyncJob(env.DB);
    if (activeJob) throw new SyncAlreadyRunningError(activeJob);

    // Full rebuild takes 5–15 min — run in background so HTTP request doesn't time out.
    ctx.waitUntil(syncTemplates(env, mode));
    return jsonResponse(request, env, { status: 'rebuild_started', message: 'Full rebuild started in background.' });
  }

  return jsonResponse(request, env, await syncTemplates(env, mode));
}

const WEBHOOK_TRIGGER_TYPES = new Set(['collection_item_created', 'collection_item_changed', 'collection_item_published']);

async function handleWebflowWebhook(request: Request, env: Env): Promise<Response> {
  const rawBody = await request.text();

  if (env.WEBFLOW_WEBHOOK_SECRET) {
    const signature = request.headers.get('x-webflow-signature') ?? '';
    // WEBFLOW_WEBHOOK_SECRET may be comma-separated when multiple webhook subscriptions
    // are registered (Webflow generates a unique secret per subscription/trigger type).
    const secrets = env.WEBFLOW_WEBHOOK_SECRET.split(',').map((s) => s.trim()).filter(Boolean);
    let valid = false;
    for (const secret of secrets) {
      if (await verifyWebflowSignature(secret, rawBody, signature)) {
        valid = true;
        break;
      }
    }
    if (!valid) return jsonResponse(request, env, { error: 'Invalid signature' }, 401);
  }

  let webhook: WebflowWebhookPayload;
  try {
    webhook = JSON.parse(rawBody) as WebflowWebhookPayload;
  } catch {
    return jsonResponse(request, env, { error: 'Invalid JSON body' }, 400);
  }

  const { triggerType, payload } = webhook;

  if (!WEBHOOK_TRIGGER_TYPES.has(triggerType)) {
    return jsonResponse(request, env, { status: 'ignored', triggerType });
  }

  const syncedAt = new Date().toISOString();

  if (payload.cid === TEMPLATES_COLLECTION_ID) {
    const record = mapWebhookTemplateItem(webhook);
    if (!record) return jsonResponse(request, env, { status: 'ignored', reason: 'no template identity or item not live' });
    await updateTemplateImagesFromWebflow(env.DB, [record], syncedAt);
    return jsonResponse(request, env, { status: 'updated', collection: 'templates', id: record.id ?? record.templateSlug ?? record.name });
  }

  if (payload.cid === DESIGNERS_COLLECTION_ID) {
    const record = mapWebhookDesignerItem(webhook);
    if (!record) return jsonResponse(request, env, { status: 'ignored', reason: 'no designer identity or item not live' });
    const updated = await updateCreatorAvatarsFromWebflow(env.DB, [record], syncedAt);
    const backfilled = await backfillCreatorFieldsByName(env.DB, syncedAt);
    return jsonResponse(request, env, { status: 'updated', collection: 'designers', id: record.syncRecordId, updated, backfilled });
  }

  return jsonResponse(request, env, { status: 'ignored', reason: 'unknown collection' });
}

async function handleImageBackfill(request: Request, env: Env): Promise<Response> {
  const authError = validateAdminToken(request, env);
  if (authError) return authError;

  const url = new URL(request.url);
  const limitParam = url.searchParams.get('limit');
  const limit = limitParam === null ? undefined : Number(limitParam);
  const templateSlugs = [
    ...url.searchParams.getAll('slug'),
    ...(url.searchParams.get('slugs') ?? '')
      .split(',')
      .map((slug) => slug.trim())
      .filter(Boolean),
  ];
  return jsonResponse(
    request,
    env,
    await backfillTemplateImages(env, { limit: limit === undefined || Number.isFinite(limit) ? limit : undefined, templateSlugs }),
  );
}

async function handleImagePrune(request: Request, env: Env): Promise<Response> {
  const authError = validateAdminToken(request, env);
  if (authError) return authError;

  const url = new URL(request.url);
  const limitParam = url.searchParams.get('limit');
  const limit = limitParam === null ? undefined : Number(limitParam);
  const templateSlugs = [
    ...url.searchParams.getAll('slug'),
    ...(url.searchParams.get('slugs') ?? '')
      .split(',')
      .map((slug) => slug.trim())
      .filter(Boolean),
  ];
  return jsonResponse(
    request,
    env,
    await pruneMissingTemplateImages(env, { limit: limit === undefined || Number.isFinite(limit) ? limit : undefined, templateSlugs }),
  );
}

async function handleSyncStatus(request: Request, env: Env): Promise<Response> {
  const authError = validateAdminToken(request, env);
  if (authError) return authError;

  const [activeJob, latestJob, stateRecords, counts] = await Promise.all([
    getActiveSyncJob(env.DB),
    getLatestSyncJob(env.DB),
    getSyncStateRecords(env.DB, SYNC_STATUS_STATE_KEYS),
    healthCounts(env.DB),
  ]);
  const syncState = Object.fromEntries(stateRecords.map((record) => [record.key, publicSyncStateRecord(record)]));

  return jsonResponse(request, env, {
    status: 'ok',
    active_job: publicSyncJobRecord(activeJob),
    latest_job: publicSyncJobRecord(latestJob),
    sync_state: syncState,
    counts,
  });
}

function scheduledMode(cron: string): string {
  if (cron === IMAGE_REFRESH_CRON) return 'image_refresh';
  if (cron === IMAGE_BACKFILL_MAINTENANCE_CRON) return 'image_backfill';
  if (cron === IMAGE_PRUNE_MAINTENANCE_CRON) return 'image_prune';
  return 'incremental';
}

async function runScheduledJob(cron: string, env: Env): Promise<void> {
  if (cron === IMAGE_REFRESH_CRON) {
    await refreshImages(env);
    return;
  }

  if (cron === IMAGE_BACKFILL_MAINTENANCE_CRON) {
    await backfillTemplateImages(env, { limit: SCHEDULED_IMAGE_BACKFILL_LIMIT });
    return;
  }

  if (cron === IMAGE_PRUNE_MAINTENANCE_CRON) {
    await pruneMissingTemplateImages(env, { limit: SCHEDULED_IMAGE_PRUNE_LIMIT });
    return;
  }

  await syncTemplates(env, 'incremental');
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    try {
      if (request.method === 'OPTIONS') return corsPreflight(request, env);

      if ((url.pathname === '/' || url.pathname === '/health') && request.method === 'GET') {
        return jsonResponse(request, env, {
          status: 'ok',
          service: 'webflow-template-search',
          timestamp: new Date().toISOString(),
          counts: await healthCounts(env.DB),
        });
      }

      if (url.pathname === '/api/templates/search' && request.method === 'GET') {
        return await handleSearch(request, env);
      }

      if ((url.pathname === '/api/templates/client.js' || url.pathname === '/client.js') && request.method === 'GET') {
        // Deprecated: TemplateGrid code component now handles search/filter.
        return textResponse(request, env, '/* webflow-template-search client-script deprecated */', 'application/javascript; charset=utf-8');
      }

      if (url.pathname === '/api/templates/admin/rebuild' && request.method === 'POST') {
        return await handleManualSync(request, env, ctx, 'full');
      }

      if (url.pathname === '/api/templates/admin/sync' && request.method === 'POST') {
        return await handleManualSync(request, env, ctx, 'incremental');
      }

      if (url.pathname === '/api/templates/admin/sync-status' && request.method === 'GET') {
        return await handleSyncStatus(request, env);
      }

      if (url.pathname === '/api/templates/admin/refresh-images' && request.method === 'POST') {
        const authError = validateAdminToken(request, env);
        if (authError) return authError;
        return jsonResponse(request, env, await refreshImages(env));
      }

      if (url.pathname === '/api/templates/admin/refresh-creators' && request.method === 'POST') {
        const authError = validateAdminToken(request, env);
        if (authError) return authError;
        return jsonResponse(request, env, await refreshCreatorProfiles(env));
      }

      if (url.pathname === '/api/templates/webhooks/webflow' && request.method === 'POST') {
        return await handleWebflowWebhook(request, env);
      }

      if (url.pathname === '/api/templates/admin/backfill-images' && request.method === 'POST') {
        return await handleImageBackfill(request, env);
      }

      if (url.pathname === '/api/templates/admin/prune-missing-images' && request.method === 'POST') {
        return await handleImagePrune(request, env);
      }

      return jsonResponse(request, env, { error: 'Not found' }, 404);
    } catch (error) {
      if (error instanceof SyncAlreadyRunningError) {
        return jsonResponse(request, env, { error: error.message, active_job: error.activeJob }, 409);
      }

      return jsonResponse(
        request,
        env,
        { error: 'Request failed', details: error instanceof Error ? error.message : String(error) },
        500,
      );
    }
  },

  async scheduled(controller: ScheduledController, env: Env): Promise<void> {
    // */5 cron: incremental sync — picks up Airtable records modified since last cursor.
    // 0 */2 cron: image URL refresh — re-fetches thumbnail/carousel URLs.
    // 17 * cron: bounded stale thumbnail backfill using stable Webflow image sources.
    // 47 3 cron: conservative stale-row prune for missing-image rows whose Webflow listing is 404.
    const mode = scheduledMode(controller.cron);
    try {
      await runScheduledJob(controller.cron, env);
    } catch (err) {
      if (err instanceof SyncAlreadyRunningError) {
        const skippedRecord = {
          cron: controller.cron,
          mode,
          skipped_at: new Date().toISOString(),
          reason: err.message,
          active_job: err.activeJob,
        };
        try {
          await env.DB.prepare(
            'INSERT INTO sync_state (key, value_json, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json, updated_at = excluded.updated_at',
          )
            .bind('last_sync_skipped', JSON.stringify(skippedRecord), skippedRecord.skipped_at)
            .run();
        } catch {
          // Best-effort — don't throw if DB write fails
        }
        return;
      }

      // Record the error so it's visible in sync_state rather than silently swallowed.
      const errorRecord = {
        cron: controller.cron,
        mode,
        failed_at: new Date().toISOString(),
        error: err instanceof Error ? err.message : String(err),
      };
      try {
        await env.DB.prepare(
          'INSERT INTO sync_state (key, value_json, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json, updated_at = excluded.updated_at',
        )
          .bind('last_sync_error', JSON.stringify(errorRecord), errorRecord.failed_at)
          .run();
      } catch {
        // Best-effort — don't throw if DB write fails
      }
    }
  },
};
