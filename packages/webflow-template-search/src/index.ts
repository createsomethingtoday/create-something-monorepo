import { getClientScript } from './client-script.js';
import { healthCounts } from './db.js';
import { corsPreflight, jsonResponse, textResponse } from './http.js';
import { parseSearchParams } from './query.js';
import { searchTemplates } from './search.js';
import { syncTemplates } from './sync.js';
import type { Env } from './types.js';

const INCREMENTAL_CRON = '*/5 * * * *';
const FULL_REBUILD_CRON = '17 3 * * *';

interface RequestExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
}

function formatTimingDuration(value: number): string {
  return Math.max(0, Math.round(value * 10) / 10).toFixed(1);
}

function buildServerTimingHeader(timing: {
  totalMs: number;
  countMs: number;
  dbMs: number;
  rerankMs: number;
  assetRefreshMs: number;
  creatorRefreshMs: number;
  buildMs: number;
}): string {
  return [
    `total;dur=${formatTimingDuration(timing.totalMs)}`,
    `count;dur=${formatTimingDuration(timing.countMs)}`,
    `db;dur=${formatTimingDuration(timing.dbMs)}`,
    `rerank;dur=${formatTimingDuration(timing.rerankMs)}`,
    `assets;dur=${formatTimingDuration(timing.assetRefreshMs)}`,
    `creators;dur=${formatTimingDuration(timing.creatorRefreshMs)}`,
    `build;dur=${formatTimingDuration(timing.buildMs)}`,
  ].join(', ');
}

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

async function handleSearch(request: Request, env: Env, ctx?: RequestExecutionContext): Promise<Response> {
  const defaultPageSize = Number(env.DEFAULT_PAGE_SIZE ?? '24') || 24;
  const params = parseSearchParams(new URL(request.url), defaultPageSize);
  const result = await searchTemplates(env, params, ctx);
  const response = jsonResponse(request, env, result.payload);
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  response.headers.set('Server-Timing', buildServerTimingHeader(result.timing));
  return response;
}

async function handleManualSync(request: Request, env: Env, mode: 'full' | 'incremental'): Promise<Response> {
  const authError = validateAdminToken(request, env);
  if (authError) return authError;
  return jsonResponse(request, env, await syncTemplates(env, mode));
}

export default {
  async fetch(request: Request, env: Env, ctx?: RequestExecutionContext): Promise<Response> {
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
        return handleSearch(request, env, ctx);
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
      await syncTemplates(env, 'full');
      return;
    }

    if (controller.cron === INCREMENTAL_CRON) {
      await syncTemplates(env, 'incremental');
      return;
    }

    await syncTemplates(env, 'incremental');
  },
};
