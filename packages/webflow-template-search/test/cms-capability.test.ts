import { describe, expect, it, vi } from 'vitest';
import { createTestEnv, callWorker } from './support/worker.js';
import { parseSearchParams } from '../src/query.js';
import { searchTemplates } from '../src/search.js';

async function seed(env: ReturnType<typeof createTestEnv>['env']) {
  for (const [id, cms] of [['known-yes', 1], ['known-no', 0], ['unknown', null]] as const) {
    await env.DB.prepare('INSERT INTO template_documents (id, template_slug, name, synced_at, has_cms) VALUES (?, ?, ?, ?, ?)').bind(id, id, id, '2026-09-21', cms).run();
  }
}

describe('CMS capability recovery', () => {
  it('keeps unknown values distinct from false through the search response', async () => {
    const { env, close } = createTestEnv();
    try {
      await seed(env);
      const result = await searchTemplates(env, parseSearchParams(new URL('https://test/search')));
      expect(Object.fromEntries(result.items.map(item => [item.id, item.has_cms]))).toEqual({ 'known-yes': true, 'known-no': false, unknown: null });
      for (const value of ['true', 'false']) {
        const filtered = await searchTemplates(env, parseSearchParams(new URL(`https://test/search?has_cms=${value}`)));
        expect(filtered.items.map(item => item.id)).toEqual([value === 'true' ? 'known-yes' : 'known-no']);
        expect(filtered.pagination.total_items).toBe(1);
      }
    } finally { close(); }
  });
  it('blocks activation before complete backfill, including a previously enabled filter', async () => {
    const { env, close } = createTestEnv();
    const request = () => new Request('https://test/api/templates/search?has_cms=false');
    try {
      await seed(env);
      const legacy = await callWorker(request(), env);
      expect(legacy.status).toBe(200);
      expect((await legacy.json() as any).pagination.total_items).toBe(3);
      env.CMS_FILTER_ENABLED = 'true';
      const unavailable = await callWorker(new Request('https://test/api/templates/search?has_cms=false', { headers: { Origin: 'https://webflow.com' } }), env);
      expect(unavailable.status).toBe(503);
      expect(unavailable.headers.get('Access-Control-Allow-Origin')).toBe('https://webflow.com');
      expect(unavailable.headers.get('Vary')).toContain('Origin');
      await env.DB.prepare('UPDATE template_documents SET has_cms = 0 WHERE has_cms IS NULL').run();
      const response = await callWorker(request(), env);
      expect(response.status).toBe(200);
      expect((await response.json() as any).pagination.total_items).toBe(2);
    } finally { close(); }
  });
});

it('separates cached true/false results and checks readiness before cache hits', async () => {
  const { env, close } = createTestEnv();
  const store = new Map<string, Response>();
  const cache = { match: vi.fn(async (r: Request) => store.get(r.url)?.clone()), put: vi.fn(async (r: Request, v: Response) => { store.set(r.url, v.clone()); }) };
  vi.stubGlobal('caches', { default: cache });
  try {
    await seed(env);
    await env.DB.prepare('UPDATE template_documents SET has_cms = 0 WHERE has_cms IS NULL').run();
    env.CMS_FILTER_ENABLED = 'true';
    for (const [value, count] of [['true', 1], ['false', 2], ['true', 1], ['false', 2]] as const) {
      const response = await callWorker(new Request(`https://test/api/templates/search?has_cms=${value}`), env);
      expect(response.status).toBe(200);
      expect((await response.json() as any).pagination.total_items).toBe(count);
    }
    expect(store.size).toBe(2);
    await env.DB.prepare("UPDATE template_documents SET has_cms = NULL WHERE id = 'unknown'").run();
    const calls = cache.match.mock.calls.length;
    expect((await callWorker(new Request('https://test/api/templates/search?has_cms=false'), env)).status).toBe(503);
    expect(cache.match.mock.calls.length).toBe(calls);
  } finally { vi.unstubAllGlobals(); close(); }
});
