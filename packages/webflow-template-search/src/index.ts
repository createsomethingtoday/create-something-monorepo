import { getClientScript } from './client-script.js';
import { healthCounts } from './db.js';
import { corsPreflight, jsonResponse, textResponse } from './http.js';
import { parseSearchParams } from './query.js';
import { searchTemplates } from './search.js';
import { suggestTemplates } from './suggest.js';
import { backfillCmsCategoryPage, repairParentTaxonomy, syncTemplateBySlug, syncTemplates } from './sync.js';
import { getTemplateTaxonomyMetadata } from './taxonomy.js';
import type { Env } from './types.js';

const INCREMENTAL_CRON = '*/5 * * * *';
const FULL_REBUILD_CRON = '17 3 * * *';
const SEARCH_CACHE_HEADERS = {
  'Cache-Control': 'public, max-age=60, s-maxage=300, stale-while-revalidate=300',
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
  return jsonResponse(request, env, await searchTemplates(env, params), 200, SEARCH_CACHE_HEADERS);
}

async function handleManualSync(request: Request, env: Env, mode: 'full' | 'incremental'): Promise<Response> {
  const authError = validateAdminToken(request, env);
  if (authError) return authError;
  return jsonResponse(request, env, await syncTemplates(env, mode));
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
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
        return handleSearch(request, env);
      }

      if (url.pathname === '/api/templates/suggest' && request.method === 'GET') {
        return jsonResponse(request, env, await suggestTemplates(env, url), 200, SEARCH_CACHE_HEADERS);
      }

      if (url.pathname === '/api/templates/taxonomy' && request.method === 'GET') {
        return jsonResponse(request, env, await getTemplateTaxonomyMetadata(env, url), 200, SEARCH_CACHE_HEADERS);
      }

      if ((url.pathname === '/api/templates/client.js' || url.pathname === '/client.js') && request.method === 'GET') {
        return textResponse(request, env, getClientScript(env.DEFAULT_CLIENT_MODE ?? 'shadow'), 'application/javascript; charset=utf-8');
      }

      if (url.pathname === '/api/templates/admin/rebuild' && request.method === 'POST') {
        return handleManualSync(request, env, 'full');
      }

      if (url.pathname === '/api/templates/admin/sync' && request.method === 'POST') {
        return handleManualSync(request, env, 'incremental');
      }

      if (url.pathname === '/api/templates/admin/sync-template' && request.method === 'POST') {
        const authError = validateAdminToken(request, env);
        if (authError) return authError;
        const templateSlug = url.searchParams.get('template_slug') ?? url.searchParams.get('slug') ?? '';
        return jsonResponse(request, env, await syncTemplateBySlug(env, templateSlug));
      }

      if (url.pathname === '/api/templates/admin/backfill-cms-categories' && request.method === 'POST') {
        const authError = validateAdminToken(request, env);
        if (authError) return authError;
        return jsonResponse(request, env, await backfillCmsCategoryPage(env, url.searchParams.get('offset')));
      }

      if (url.pathname === '/api/templates/admin/repair-taxonomy' && request.method === 'POST') {
        const authError = validateAdminToken(request, env);
        if (authError) return authError;
        return jsonResponse(request, env, await repairParentTaxonomy(env));
      }

      return jsonResponse(request, env, { error: 'Not found' }, 404);
    } catch (error) {
      return jsonResponse(
        request,
        env,
        { error: 'Request failed', details: error instanceof Error ? error.message : String(error) },
        500,
      );
    }
  },

  async scheduled(controller: ScheduledController, env: Env): Promise<void> {
    if (controller.cron === FULL_REBUILD_CRON) {
      // Full rebuilds exceed Worker CPU/runtime limits at current marketplace size.
      // Use the paginated admin backfill endpoint for full re-syncs; scheduled
      // maintenance stays incremental so production does not enter 1102 loops.
      await syncTemplates(env, 'incremental');
      return;
    }

    if (controller.cron === INCREMENTAL_CRON) {
      await syncTemplates(env, 'incremental');
      return;
    }

    await syncTemplates(env, 'incremental');
  },
};
