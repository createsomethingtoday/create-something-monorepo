import {
  backfillCreatorFieldsByName,
  getPublicSearchCacheVersion,
  getActiveSyncJob,
  getLatestSyncJob,
  getSyncStateRecords,
  healthCounts,
  publicSyncJobRecord,
  publicSyncStateRecord,
  updateCreatorAvatarsFromWebflow,
  updateTemplateImagesFromWebflow,
} from './db.js';
import { corsPreflight, jsonResponse, textResponse, withCorsHeaders } from './http.js';
import { parseSearchParams } from './query.js';
import { searchTemplates } from './search.js';
import { handleTelemetry } from './telemetry.js';
import {
  SyncAlreadyRunningError,
  backfillCreatorMetadata,
  backfillTemplateImages,
  forceRefreshCreatorProfiles,
  pruneMissingTemplateImages,
  refreshCreatorProfiles,
  refreshImages,
  syncTemplateRecordsByIds,
  syncTemplates,
} from './sync.js';
import type { Env, SearchParams } from './types.js';
import { DESIGNERS_COLLECTION_ID, TEMPLATES_COLLECTION_ID, mapWebhookDesignerItem, mapWebhookTemplateItem, verifyWebflowSignature } from './webflow.js';
import type { WebflowWebhookPayload } from './webflow.js';

const SYNC_STATUS_STATE_KEYS = [
  'last_full_sync',
  'last_incremental_sync',
  'last_record_sync',
  'last_image_refresh',
  'last_creator_refresh',
  'last_creator_backfill',
  'last_image_backfill',
  'last_image_prune',
  'public_search_cache_version',
  'last_sync_error',
  'last_sync_skipped',
  'last_sync_warning',
];

const INCREMENTAL_SYNC_CRON = '*/5 * * * *';
const IMAGE_BACKFILL_MAINTENANCE_CRON = '17 * * * *';
const IMAGE_PRUNE_MAINTENANCE_CRON = '47 3 * * *';
const SCHEDULED_IMAGE_BACKFILL_LIMIT = 48;
const SCHEDULED_IMAGE_PRUNE_LIMIT = 24;

const PUBLIC_SEARCH_CACHE_HEADERS = {
  'Cache-Control': 'public, max-age=60, s-maxage=300, stale-while-revalidate=86400',
  'CDN-Cache-Control': 'public, max-age=300, stale-while-revalidate=86400',
};
const DEFAULT_PUBLIC_SEARCH_CACHE_VERSION = '2026-06-18-webflow-price-sync';
const PUBLIC_SEARCH_CACHE_PARAM_ORDER = [
  'view',
  'include',
  'scope',
  'category_group_slug',
  'child_category_slug',
  'creator_slug',
  'creator_record_id',
  'style_slug',
  'tag_slug',
  'free_only',
  'sort',
  'page',
  'page_size',
] as const;

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

function publicSearchResponse(request: Request, env: Env, body: string, cacheStatus: 'HIT' | 'MISS' | 'BYPASS'): Response {
  return new Response(body, {
    status: 200,
    headers: withCorsHeaders(request, env, {
      'Content-Type': 'application/json; charset=utf-8',
      'X-Template-Search-Cache': cacheStatus,
      ...PUBLIC_SEARCH_CACHE_HEADERS,
    }),
  });
}

function appendSearchCacheParam(url: URL, key: string, value: string | null): void {
  if (value) url.searchParams.set(key, value);
}

function appendSearchCacheList(url: URL, key: string, values: string[]): void {
  values.slice().sort().forEach((value) => url.searchParams.append(key, value));
}

function includeCacheValue(params: SearchParams): string {
  return [
    params.include.items ? 'items' : '',
    params.include.facets ? 'facets' : '',
    params.include.pills ? 'pills' : '',
  ]
    .filter(Boolean)
    .join(',');
}

function buildPublicSearchCacheRequest(requestUrl: URL, params: SearchParams, cacheVersion: string): Request | null {
  if (params.page !== 1 || params.q) return null;

  const cacheUrl = new URL(requestUrl.pathname, requestUrl.origin);
  cacheUrl.searchParams.set('cache_version', cacheVersion);
  for (const key of PUBLIC_SEARCH_CACHE_PARAM_ORDER) {
    switch (key) {
      case 'view':
        cacheUrl.searchParams.set(key, params.view);
        break;
      case 'include':
        cacheUrl.searchParams.set(key, includeCacheValue(params));
        break;
      case 'scope':
        cacheUrl.searchParams.set(key, params.scope);
        break;
      case 'category_group_slug':
        appendSearchCacheParam(cacheUrl, key, params.categoryGroupSlug);
        break;
      case 'child_category_slug':
        appendSearchCacheParam(cacheUrl, key, params.childCategorySlug);
        break;
      case 'creator_slug':
        appendSearchCacheParam(cacheUrl, key, params.creatorSlug);
        break;
      case 'creator_record_id':
        appendSearchCacheParam(cacheUrl, key, params.creatorRecordId);
        break;
      case 'style_slug':
        appendSearchCacheParam(cacheUrl, key, params.styleSlug);
        break;
      case 'tag_slug':
        appendSearchCacheParam(cacheUrl, key, params.tagSlug);
        break;
      case 'free_only':
        if (params.freeOnly) cacheUrl.searchParams.set(key, 'true');
        break;
      case 'sort':
        cacheUrl.searchParams.set(key, params.sort);
        break;
      case 'page':
        cacheUrl.searchParams.set(key, '1');
        break;
      case 'page_size':
        cacheUrl.searchParams.set(key, String(params.pageSize));
        break;
    }
  }

  appendSearchCacheList(cacheUrl, 'styles', params.styles);
  appendSearchCacheList(cacheUrl, 'tags', params.tags);
  appendSearchCacheList(cacheUrl, 'types', params.types);
  return new Request(cacheUrl.toString(), { method: 'GET' });
}

function getDefaultCache(): Cache | null {
  return typeof caches === 'undefined' ? null : caches.default;
}

async function handleSearch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  const defaultPageSize = Number(env.DEFAULT_PAGE_SIZE ?? '24') || 24;
  const url = new URL(request.url);
  const params = parseSearchParams(url, defaultPageSize);
  const cacheVersion = await getPublicSearchCacheVersion(env.DB, DEFAULT_PUBLIC_SEARCH_CACHE_VERSION);
  const cacheRequest = buildPublicSearchCacheRequest(url, params, cacheVersion);
  const cache = cacheRequest ? getDefaultCache() : null;

  if (cache && cacheRequest) {
    const cached = await cache.match(cacheRequest);
    if (cached) return publicSearchResponse(request, env, await cached.text(), 'HIT');
  }

  const body = JSON.stringify(await searchTemplates(env, params));
  if (cache && cacheRequest) {
    ctx.waitUntil(
      cache
        .put(
          cacheRequest,
          new Response(body, {
            headers: {
              'Content-Type': 'application/json; charset=utf-8',
              ...PUBLIC_SEARCH_CACHE_HEADERS,
            },
          }),
        )
        .catch(() => undefined),
    );
  }

  return publicSearchResponse(request, env, body, cache ? 'MISS' : 'BYPASS');
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

async function handleImageRefresh(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  const authError = validateAdminToken(request, env);
  if (authError) return authError;

  const url = new URL(request.url);
  if (url.searchParams.get('background') === 'true') {
    ctx.waitUntil(
      refreshImages(env).catch((error) => {
        console.error('Background image refresh failed.', error);
      }),
    );
    return jsonResponse(request, env, { status: 'image_refresh_started', message: 'Image refresh started in background.' });
  }

  return jsonResponse(request, env, await refreshImages(env));
}

async function parseRecordIds(request: Request): Promise<string[]> {
  const url = new URL(request.url);
  const ids = [
    ...url.searchParams.getAll('id'),
    ...(url.searchParams.get('ids') ?? '')
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean),
  ];

  if ((request.headers.get('content-type') ?? '').includes('application/json')) {
    const body = (await request.json()) as { ids?: unknown; record_ids?: unknown };
    const bodyIds = Array.isArray(body.ids) ? body.ids : Array.isArray(body.record_ids) ? body.record_ids : [];
    ids.push(...bodyIds.filter((id): id is string => typeof id === 'string'));
  }

  return Array.from(new Set(ids.map((id) => id.trim()).filter(Boolean)));
}

async function handleRecordSync(request: Request, env: Env): Promise<Response> {
  const authError = validateAdminToken(request, env);
  if (authError) return authError;

  const ids = await parseRecordIds(request);
  if (ids.length === 0) return jsonResponse(request, env, { error: 'At least one Airtable record ID is required.' }, 400);
  if (ids.length > 50) return jsonResponse(request, env, { error: 'Record sync is limited to 50 records per request.' }, 400);
  const invalidId = ids.find((id) => !/^rec[A-Za-z0-9]+$/.test(id));
  if (invalidId) return jsonResponse(request, env, { error: `Invalid Airtable record ID: ${invalidId}` }, 400);

  return jsonResponse(request, env, await syncTemplateRecordsByIds(env, ids));
}

function parseCreatorNames(url: URL): string[] {
  return Array.from(
    new Set(
      [
        ...url.searchParams.getAll('name'),
        ...(url.searchParams.get('names') ?? '')
          .split(',')
          .map((name) => name.trim())
          .filter(Boolean),
      ]
        .map((name) => name.trim())
        .filter(Boolean),
    ),
  );
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

async function handleImageBackfill(request: Request, env: Env, ctx?: ExecutionContext): Promise<Response> {
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
  const options = { limit: limit === undefined || Number.isFinite(limit) ? limit : undefined, templateSlugs };
  if (url.searchParams.get('async') === 'true' && ctx) {
    ctx.waitUntil(
      backfillTemplateImages(env, options).catch((error) => {
        console.error('Background image backfill failed.', error);
      }),
    );
    return jsonResponse(request, env, { status: 'image_backfill_started', message: 'Image backfill started in background.' });
  }

  return jsonResponse(request, env, await backfillTemplateImages(env, options));
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
  if (cron === IMAGE_BACKFILL_MAINTENANCE_CRON) return 'image_backfill';
  if (cron === IMAGE_PRUNE_MAINTENANCE_CRON) return 'image_prune';
  return 'incremental';
}

async function runScheduledJob(cron: string, env: Env): Promise<void> {
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
        return await handleSearch(request, env, ctx);
      }

      if (url.pathname === '/api/templates/telemetry' && request.method === 'POST') {
        // First-party fallback for the marketplace code components when
        // webflow.com's page-level analytics SDKs are down (see telemetry.ts).
        return await handleTelemetry(request, env, ctx);
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

      if (url.pathname === '/api/templates/admin/sync-records' && request.method === 'POST') {
        return await handleRecordSync(request, env);
      }

      if (url.pathname === '/api/templates/admin/sync-status' && request.method === 'GET') {
        return await handleSyncStatus(request, env);
      }

      if (url.pathname === '/api/templates/admin/refresh-images' && request.method === 'POST') {
        return await handleImageRefresh(request, env, ctx);
      }

      if (url.pathname === '/api/templates/admin/backfill-creators' && request.method === 'POST') {
        const authError = validateAdminToken(request, env);
        if (authError) return authError;
        return jsonResponse(request, env, await backfillCreatorMetadata(env, parseCreatorNames(url)));
      }

      if (url.pathname === '/api/templates/admin/refresh-creators' && request.method === 'POST') {
        const authError = validateAdminToken(request, env);
        if (authError) return authError;
        return jsonResponse(
          request,
          env,
          url.searchParams.get('force') === 'true'
            ? await forceRefreshCreatorProfiles(env, parseCreatorNames(url))
            : await refreshCreatorProfiles(env),
        );
      }

      if (url.pathname === '/api/templates/webhooks/webflow' && request.method === 'POST') {
        return await handleWebflowWebhook(request, env);
      }

      if (url.pathname === '/api/templates/admin/backfill-images' && request.method === 'POST') {
        return await handleImageBackfill(request, env, ctx);
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
