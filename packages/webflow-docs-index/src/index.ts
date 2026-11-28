import { WorkerEntrypoint } from 'cloudflare:workers';

import { createDeps, type Env } from './bindings.js';
import { discoverPages, indexStatus, processBatch, sha256Hex } from './ingest.js';
import { MAX_QUERY_CHARS, searchDocs } from './search.js';
import type { SearchInput, SearchResult } from './types.js';

const DISCOVER_CRON = '7 9 * * *';
const CRON_BATCH_PAGES = 50;
const MAX_ADMIN_BATCH_PAGES = 60;
/** Leaves room under the wall-time limit of one invocation. */
const BATCH_BUDGET_MS = 20_000;

function json(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
}

async function isAuthorized(request: Request, env: Env): Promise<boolean> {
  const token = /^Bearer (.+)$/.exec(request.headers.get('Authorization') ?? '')?.[1];
  if (!token || !env.DOCS_INDEX_ADMIN_TOKEN) return false;
  // Compare digests so the comparison time does not depend on the token.
  const [given, expected] = await Promise.all([sha256Hex(token), sha256Hex(env.DOCS_INDEX_ADMIN_TOKEN)]);
  let difference = 0;
  for (let index = 0; index < expected.length; index += 1) difference |= given.charCodeAt(index) ^ expected.charCodeAt(index);
  return difference === 0;
}

/**
 * Index of developers.webflow.com. Other Workers call `search` through a
 * service binding; the HTTP routes are for operation and evaluation.
 */
export default class WebflowDocsIndex extends WorkerEntrypoint<Env> {
  /** Exact docs passages for a question. Read-only. */
  async search(input: SearchInput): Promise<SearchResult> {
    return searchDocs(createDeps(this.env), input);
  }

  async fetch(request: Request): Promise<Response> {
    const { pathname } = new URL(request.url);
    const deps = createDeps(this.env);

    if (request.method === 'GET' && pathname === '/health') return json({ ok: true, ...(await indexStatus(deps)) });

    const isProtected = pathname === '/search' || pathname.startsWith('/admin/');
    if (!isProtected || request.method !== 'POST') return json({ ok: false, error: 'not_found' }, 404);
    if (!this.env.DOCS_INDEX_ADMIN_TOKEN) return json({ ok: false, error: 'misconfigured' }, 503);
    if (!(await isAuthorized(request, this.env))) return json({ ok: false, error: 'unauthorized' }, 401);

    const body = ((await request.json().catch(() => ({}))) ?? {}) as Record<string, unknown>;
    if (pathname === '/search') {
      if (typeof body.query !== 'string' || !body.query.trim() || body.query.length > MAX_QUERY_CHARS) {
        return json({ ok: false, error: 'invalid_query' }, 400);
      }
      const result = await searchDocs(deps, {
        query: body.query,
        topK: typeof body.topK === 'number' ? body.topK : undefined,
        includeBeta: body.includeBeta === true,
      });
      return json({ ok: true, ...result });
    }
    if (pathname === '/admin/discover') return json({ ok: true, ...(await discoverPages(deps)) });
    if (pathname === '/admin/ingest') {
      const requested = typeof body.limit === 'number' ? Math.trunc(body.limit) : CRON_BATCH_PAGES;
      const limit = Math.min(Math.max(requested, 1), MAX_ADMIN_BATCH_PAGES);
      return json({ ok: true, ...(await processBatch(deps, { limit, deadline: Date.now() + BATCH_BUDGET_MS })) });
    }
    return json({ ok: false, error: 'not_found' }, 404);
  }

  async scheduled(controller: ScheduledController): Promise<void> {
    const deps = createDeps(this.env);
    if (controller.cron === DISCOVER_CRON) {
      console.log('docs index: discover', JSON.stringify(await discoverPages(deps)));
      return;
    }
    const result = await processBatch(deps, { limit: CRON_BATCH_PAGES, deadline: Date.now() + BATCH_BUDGET_MS });
    console.log('docs index: batch', JSON.stringify(result));
  }
}
