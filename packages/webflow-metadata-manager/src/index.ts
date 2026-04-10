import { corsPreflight, htmlResponse, jsonResponse, textResponse } from './http.js';
import { renderApp } from './html.js';
import { loadOverrides } from './overrides.js';
import { renderMetadataOverrideScript } from './script.js';
import type { Env } from './types.js';

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const overrides = loadOverrides(env);

    try {
      if (request.method === 'OPTIONS') {
        return corsPreflight(request, env);
      }

      if (request.method === 'GET' && url.pathname === '/') {
        return htmlResponse(request, env, renderApp(url.origin, overrides));
      }

      if (request.method === 'GET' && url.pathname === '/metadata-overrides.js') {
        return textResponse(
          request,
          env,
          renderMetadataOverrideScript(overrides),
          'application/javascript; charset=utf-8',
          200,
          'public, max-age=300, stale-while-revalidate=600',
        );
      }

      if (request.method === 'GET' && url.pathname === '/metadata-overrides.json') {
        return jsonResponse(request, env, {
          ok: true,
          count: overrides.length,
          overrides,
        });
      }

      if (request.method === 'GET' && url.pathname === '/health') {
        return jsonResponse(request, env, {
          ok: true,
          service: 'webflow-metadata-manager',
          timestamp: new Date().toISOString(),
          overridesCount: overrides.length,
          routes: ['GET /', 'GET /health', 'GET /metadata-overrides.js', 'GET /metadata-overrides.json'],
        });
      }

      if (request.method === 'GET' && url.pathname === '/favicon.ico') {
        return new Response(null, { status: 204 });
      }

      return jsonResponse(request, env, { error: 'Not found' }, 404);
    } catch (error) {
      return jsonResponse(
        request,
        env,
        { error: error instanceof Error ? error.message : String(error) },
        500,
      );
    }
  },
};
