import { afterEach, describe, expect, it, vi } from 'vitest';
import { upsertTemplateDocuments } from '../src/db.js';
import {
  classMinhash,
  computeDemoSignals,
  estimateClassSimilarity,
  extractClassNames,
  fetchDemoSignals,
  fnv1a32,
} from '../src/demo-signals.js';
import { parseSearchParams } from '../src/query.js';
import type { TemplateDocumentInput } from '../src/types.js';
import { searchTemplates } from '../src/search.js';
import { callScheduled, callWorker, createTestEnv } from './support/worker.js';

const DEMO_HTML = `<!DOCTYPE html><html data-wf-site="abc" class="wf-loading"><head>
<link href="https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.css" rel="stylesheet">
<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/@finsweet/attributes-cmsfilter@1/cmsfilter.js"></script>
</head><body class="body">
<div class="w-container hero hero--dark" data-w-id="abc-123"><p class='w-richtext hero-copy'>We use three.js and gsap here.</p></div>
<script>new Swiper('.slider'); gsap.registerPlugin(ScrollTrigger);</script>
</body></html>`;

describe('demo signal extraction', () => {
  it('hashes with the documented FNV-1a 32-bit function', () => {
    expect(fnv1a32('')).toBe(0x811c9dc5);
    expect(fnv1a32('a')).toBe(0xe40c292c);
  });

  it('keeps custom classes and drops Webflow runtime classes', () => {
    expect([...extractClassNames(DEMO_HTML)].sort()).toEqual(['body', 'hero', 'hero--dark', 'hero-copy']);
  });

  it('detects frameworks from script and link tags only', () => {
    const signals = computeDemoSignals(DEMO_HTML, '2026-10-14T00:00:00.000Z');
    expect(signals.frameworks).toEqual(['gsap', 'scrolltrigger', 'swiper', 'finsweet']);
    expect(signals.has_interactions).toBe(true);
    expect(signals.class_count).toBe(4);
    expect(signals.class_minhash).toHaveLength(32);
    expect(signals.version).toBe(1);
  });

  it('produces deterministic signatures whose overlap tracks set similarity', () => {
    const base = Array.from({ length: 200 }, (_, index) => `block-${index}`);
    const same = classMinhash(base);
    expect(classMinhash([...base].reverse())).toEqual(same);
    expect(estimateClassSimilarity(same, classMinhash(base))).toBe(1);
    const half = classMinhash([...base.slice(0, 100), ...Array.from({ length: 100 }, (_, index) => `other-${index}`)]);
    const similarity = estimateClassSimilarity(same, half);
    expect(similarity).toBeGreaterThan(0.15);
    expect(similarity).toBeLessThan(0.55);
    expect(estimateClassSimilarity(same, classMinhash(['unrelated']))).toBeLessThan(0.2);
    expect(classMinhash([])).toEqual([]);
  });

  it('rejects oversized bodies before buffering them', async () => {
    const chunk = new TextEncoder().encode('<div class="x"></div>'.repeat(50));
    const stream = (chunks: number) =>
      new ReadableStream<Uint8Array>({
        start(controller) {
          for (let index = 0; index < chunks; index += 1) controller.enqueue(chunk);
          controller.close();
        },
      });
    const html = { headers: { 'content-type': 'text/html' } };
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.endsWith('/declared')) return new Response(stream(1), { headers: { ...html.headers, 'content-length': '5000000' } });
        if (url.endsWith('/streamed')) return new Response(stream(10), html);
        return new Response(stream(1), html);
      }),
    );
    try {
      const maxBytes = chunk.byteLength * 3;
      expect(await fetchDemoSignals('https://demo.webflow.io/declared', 'now', { maxBytes })).toMatchObject({ ok: false, reason: 'too_large' });
      expect(await fetchDemoSignals('https://demo.webflow.io/streamed', 'now', { maxBytes })).toMatchObject({ ok: false, reason: 'too_large' });
      const small = await fetchDemoSignals('https://demo.webflow.io/small', 'now', { maxBytes });
      expect(small.ok && small.signals.class_count).toBe(1);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

function documentInput(overrides: Partial<TemplateDocumentInput>): TemplateDocumentInput {
  return {
    id: 'rec1',
    templateSlug: 'one-website-template',
    name: 'One',
    listingUrl: 'https://webflow.com/templates/html/one-website-template',
    previewUrl: null,
    websiteUrl: 'https://one.webflow.io',
    mrpId: null,
    creatorName: null,
    creatorRecordId: null,
    creatorSlug: null,
    creatorProfileUrl: null,
    creatorAvatarUrl: null,
    creatorAvatarAlt: null,
    thumbnailImageUrl: null,
    thumbnailImageSecondaryUrl: null,
    carouselImageUrls: [],
    descriptionShort: '',
    descriptionLongHtml: '',
    descriptionLongText: '',
    categoryGroups: [],
    categoryGroupSlugs: [],
    childCategories: [],
    childCategorySlugs: [],
    categoryMemberships: [],
    styles: [],
    styleSlugs: [],
    tags: [],
    tagSlugs: [],
    templateType: null,
    hasCms: null,
    isFree: false,
    isFeatured: false,
    isLandingPage: false,
    reviewerPickReason: null,
    popularityScore: null,
    uniqueViewers: null,
    cumulativePurchases: null,
    price: null,
    publishedDate: null,
    marketplaceStatus: null,
    sourceLastModifiedTime: null,
    syncedAt: '2026-10-01T00:00:00.000Z',
    listingConfirmed: null,
    ...overrides,
  };
}

describe('demo signals across template syncs', () => {
  it('keeps signals while website_url is unchanged and clears them when it changes', async () => {
    const { env, close } = createTestEnv();
    try {
      await upsertTemplateDocuments(env.DB, [documentInput({})]);
      await env.DB.prepare(
        "UPDATE template_documents SET demo_signals_json = ?, demo_signals_synced_at = ?, demo_signals_attempted_at = ? WHERE id = 'rec1'",
      )
        .bind(JSON.stringify(computeDemoSignals(DEMO_HTML, '2026-10-14T00:00:00.000Z')), '2026-10-14T00:00:00.000Z', '2026-10-14T00:00:00.000Z')
        .run();
      const read = () =>
        env.DB.prepare('SELECT demo_signals_json, demo_signals_synced_at, demo_signals_attempted_at FROM template_documents WHERE id = ?')
          .bind('rec1')
          .first<{ demo_signals_json: string | null; demo_signals_synced_at: string | null; demo_signals_attempted_at: string | null }>();

      await upsertTemplateDocuments(env.DB, [documentInput({ name: 'One (renamed)' })]);
      const kept = await read();
      expect(kept?.demo_signals_synced_at).toBe('2026-10-14T00:00:00.000Z');
      expect(JSON.parse(kept?.demo_signals_json ?? 'null')?.class_count).toBe(4);

      await upsertTemplateDocuments(env.DB, [documentInput({ websiteUrl: 'https://one-v2.webflow.io' })]);
      expect(await read()).toEqual({ demo_signals_json: null, demo_signals_synced_at: null, demo_signals_attempted_at: null });
    } finally {
      close();
    }
  });
});

describe('demo signal refresh job', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  async function seed(env: ReturnType<typeof createTestEnv>['env']) {
    const rows: Array<[string, string | null]> = [
      ['live-demo', 'https://live-demo.webflow.io'],
      ['missing-demo', 'https://missing-demo.webflow.io'],
      ['no-preview', null],
    ];
    for (const [id, previewUrl] of rows) {
      await env.DB.prepare('INSERT INTO template_documents (id, template_slug, name, website_url, synced_at) VALUES (?, ?, ?, ?, ?)')
        .bind(id, id, id, previewUrl, '2026-10-01')
        .run();
    }
  }

  function stubDemoFetch() {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const headers = new Headers(init?.headers);
      expect(headers.get('User-Agent')).toContain('WebflowTemplateSearch');
      if (url.startsWith('https://live-demo')) return new Response(DEMO_HTML, { headers: { 'content-type': 'text/html' } });
      return new Response('not here', { status: 404 });
    });
    vi.stubGlobal('fetch', fetchMock);
    return fetchMock;
  }

  it('stores signals for reachable demos, records attempts for failures, and exposes them on view=full only', async () => {
    const { env, close } = createTestEnv();
    try {
      await seed(env);
      const fetchMock = stubDemoFetch();
      const response = await callWorker(
        new Request('https://test/api/templates/admin/refresh-demo-signals', { method: 'POST', headers: { Authorization: 'Bearer sync-token' } }),
        env,
      );
      expect(response.status).toBe(200);
      const summary = (await response.json()) as any;
      expect(summary.mode).toBe('demo_signals');
      expect(summary.scanned_records).toBe(2);
      expect(summary.updated_records).toBe(1);
      expect(summary.failed_records).toBe(1);
      expect(summary.failures).toEqual([{ template_slug: 'missing-demo', status: 404, reason: 'http_error' }]);
      expect(summary.demo_signal_stats).toEqual({ eligible_records: 2, records_with_signals: 1, attempted_records: 2 });
      expect(fetchMock).toHaveBeenCalledTimes(2);

      const full = await searchTemplates(env, parseSearchParams(new URL('https://test/search?view=full')));
      const byId = Object.fromEntries(full.items.map((item) => [item.id, item.demo_signals]));
      expect(byId['live-demo']?.frameworks).toEqual(['gsap', 'scrolltrigger', 'swiper', 'finsweet']);
      expect(byId['live-demo']?.class_minhash).toHaveLength(32);
      expect(byId['missing-demo']).toBeNull();
      expect(byId['no-preview']).toBeNull();

      const grid = await searchTemplates(env, parseSearchParams(new URL('https://test/search?view=grid')));
      expect(grid.items.every((item) => !('demo_signals' in item))).toBe(true);

      // A second run within the retry window touches nothing.
      fetchMock.mockClear();
      const again = (await (
        await callWorker(
          new Request('https://test/api/templates/admin/refresh-demo-signals', { method: 'POST', headers: { Authorization: 'Bearer sync-token' } }),
          env,
        )
      ).json()) as any;
      expect(again.scanned_records).toBe(0);
      expect(fetchMock).not.toHaveBeenCalled();

      // Explicit slugs bypass the retry gate.
      const forced = (await (
        await callWorker(
          new Request('https://test/api/templates/admin/refresh-demo-signals?slug=missing-demo', { method: 'POST', headers: { Authorization: 'Bearer sync-token' } }),
          env,
        )
      ).json()) as any;
      expect(forced.scanned_records).toBe(1);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    } finally {
      close();
    }
  });

  it('accepts explicit slug lists longer than one D1 statement can bind', async () => {
    const { env, close } = createTestEnv();
    try {
      const slugs = Array.from({ length: 150 }, (_, index) => `live-demo-${index}`);
      await env.DB.batch(
        slugs.map((slug) =>
          env.DB.prepare('INSERT INTO template_documents (id, template_slug, name, website_url, synced_at) VALUES (?, ?, ?, ?, ?)').bind(
            slug,
            slug,
            slug,
            `https://live-demo.webflow.io/${slug}`,
            '2026-10-01',
          ),
        ),
      );
      stubDemoFetch();
      const response = await callWorker(
        new Request(`https://test/api/templates/admin/refresh-demo-signals?limit=600&slugs=${slugs.join(',')}`, {
          method: 'POST',
          headers: { Authorization: 'Bearer sync-token' },
        }),
        env,
      );
      expect(response.status).toBe(200);
      const summary = (await response.json()) as any;
      expect(summary.scanned_records).toBe(150);
      expect(summary.updated_records).toBe(150);
    } finally {
      close();
    }
  });

  it('runs from the hourly maintenance cron', async () => {
    const { env, close } = createTestEnv();
    try {
      await seed(env);
      stubDemoFetch();
      await callScheduled('7 * * * *', env);
      const state = await env.DB.prepare("SELECT value_json FROM sync_state WHERE key = 'last_demo_signal_refresh'").first<{ value_json: string }>();
      expect(JSON.parse(state?.value_json ?? '{}').updated_records).toBe(1);
      const row = await env.DB.prepare("SELECT demo_signals_json FROM template_documents WHERE id = 'live-demo'").first<{ demo_signals_json: string }>();
      expect(JSON.parse(row?.demo_signals_json ?? 'null')?.class_count).toBe(4);
    } finally {
      close();
    }
  });

  it('rejects unauthenticated refresh requests', async () => {
    const { env, close } = createTestEnv();
    try {
      const response = await callWorker(new Request('https://test/api/templates/admin/refresh-demo-signals', { method: 'POST' }), env);
      expect(response.status).toBe(401);
    } finally {
      close();
    }
  });
});
