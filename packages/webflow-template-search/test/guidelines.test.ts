import { afterEach, describe, expect, it, vi } from 'vitest';

import { GUIDELINES_COLLECTION_ID, buildGuidelinesDocument } from '../src/guidelines.js';
import { callWorker, createTestEnv } from './support/worker.js';

const SCHEMA = {
  id: GUIDELINES_COLLECTION_ID,
  fields: [
    {
      slug: 'section',
      type: 'Option',
      validations: { options: [{ id: 'sec-start', name: 'Start Here' }, { id: 'sec-req', name: 'Required Pages' }] },
    },
    {
      slug: 'kind',
      type: 'Option',
      validations: {
        options: [
          { id: 'k-h2', name: 'Heading 2' },
          { id: 'k-p', name: 'Paragraph' },
          { id: 'k-li', name: 'Bullet' },
        ],
      },
    },
    { slug: 'requirement-level', type: 'Option', validations: { options: [{ id: 'lvl-req', name: 'Required' }] } },
  ],
};

function item(fieldData: Record<string, unknown>, extra: Record<string, unknown> = {}) {
  return { id: String(fieldData.slug), isArchived: false, isDraft: false, fieldData, ...extra };
}

const ITEMS = [
  item({ slug: 'required-pages-02', section: 'sec-req', 'section-order': 2, order: 20, kind: 'k-li', content: '<ul><li>Licenses &amp; Changelog need <strong>noindex</strong></li></ul>', 'requirement-level': 'lvl-req', 'validator-checks': 'utility-page-indexable, seo.home-title-format' }),
  item({ slug: 'start-here-01', section: 'sec-start', 'section-order': 1, order: 10, kind: 'k-h2', content: '<h2>Start Here 👋</h2>' }),
  item({ slug: 'required-pages-01', section: 'sec-req', 'section-order': 2, order: 10, kind: 'k-h2', content: '<h2>Required Pages</h2>' }),
  item({ slug: 'start-here-02', section: 'sec-start', 'section-order': 1, order: 20, kind: 'k-p', content: '<p>Welcome.</p>' }),
  item({ slug: 'draft-rule', section: 'sec-start', 'section-order': 1, order: 30, kind: 'k-p', content: '<p>Draft</p>' }, { isDraft: true }),
];

function mockWebflow(items = ITEMS, status = 200) {
  const calls: string[] = [];
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    calls.push(url);
    if (status !== 200) return new Response('{"message":"nope"}', { status });
    if (url.endsWith(`/collections/${GUIDELINES_COLLECTION_ID}`)) return Response.json(SCHEMA);
    if (url.includes(`/collections/${GUIDELINES_COLLECTION_ID}/items`)) {
      return Response.json({ items, pagination: { limit: 100, offset: 0, total: items.length } });
    }
    return new Response('unexpected', { status: 500 });
  }));
  return calls;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('buildGuidelinesDocument', () => {
  it('orders sections and blocks, resolves option names, and adds plain text for agents', () => {
    const doc = buildGuidelinesDocument(SCHEMA as any, ITEMS.filter((i) => !i.isDraft) as any, 'live');

    expect(doc.sections.map((s) => [s.name, s.order, s.id])).toEqual([
      ['Start Here', 1, 'start-here'],
      ['Required Pages', 2, 'required-pages'],
    ]);
    expect(doc.sections[1].blocks.map((b) => b.id)).toEqual(['required-pages-01', 'required-pages-02']);

    const rule = doc.sections[1].blocks[1];
    expect(rule).toMatchObject({
      kind: 'bullet',
      requirementLevel: 'Required',
      validatorChecks: ['utility-page-indexable', 'seo.home-title-format'],
      text: 'Licenses & Changelog need noindex',
    });
    expect(doc.sections[0].blocks[0]).toMatchObject({ kind: 'heading-2', text: 'Start Here 👋', requirementLevel: null, validatorChecks: [] });
    expect(doc.blockCount).toBe(4);
    expect(doc.version).toMatch(/^[0-9a-f]{16}$/);
  });

  it('gives the same version for the same content and a new one when content changes', () => {
    const live = ITEMS.filter((i) => !i.isDraft) as any;
    const a = buildGuidelinesDocument(SCHEMA as any, live, 'live');
    const b = buildGuidelinesDocument(SCHEMA as any, [...live].reverse(), 'live');
    const changed = buildGuidelinesDocument(
      SCHEMA as any,
      live.map((i: any) => (i.id === 'start-here-02' ? { ...i, fieldData: { ...i.fieldData, content: '<p>Hi.</p>' } } : i)),
      'live',
    );
    expect(b.version).toBe(a.version);
    expect(changed.version).not.toBe(a.version);
  });
});

describe('GET /api/templates/guidelines', () => {
  it('serves live guidelines publicly with cache headers and skips drafts', async () => {
    const { env, close } = createTestEnv();
    env.WEBFLOW_API_TOKEN = 'wf-token';
    const calls = mockWebflow();
    try {
      const response = await callWorker(new Request('https://worker.test/api/templates/guidelines'), env);
      expect(response.status).toBe(200);
      expect(response.headers.get('Cache-Control')).toContain('public');
      const body = (await response.json()) as any;
      expect(body.source).toBe('live');
      expect(body.blockCount).toBe(4);
      expect(JSON.stringify(body)).not.toContain('draft-rule');
      expect(calls.some((u) => u.includes('/items/live'))).toBe(true);
    } finally {
      close();
    }
  });

  it('filters to one section', async () => {
    const { env, close } = createTestEnv();
    env.WEBFLOW_API_TOKEN = 'wf-token';
    mockWebflow();
    try {
      const response = await callWorker(new Request('https://worker.test/api/templates/guidelines?section=required-pages'), env);
      const body = (await response.json()) as any;
      expect(body.sections.map((s: any) => s.id)).toEqual(['required-pages']);
    } finally {
      close();
    }
  });

  it('requires the admin token for the staged preview and never caches it', async () => {
    const { env, close } = createTestEnv();
    env.WEBFLOW_API_TOKEN = 'wf-token';
    const calls = mockWebflow();
    try {
      const denied = await callWorker(new Request('https://worker.test/api/templates/guidelines?source=staged'), env);
      expect(denied.status).toBe(401);

      const allowed = await callWorker(
        new Request('https://worker.test/api/templates/guidelines?source=staged', { headers: { Authorization: 'Bearer sync-token' } }),
        env,
      );
      expect(allowed.status).toBe(200);
      expect(allowed.headers.get('Cache-Control')).toBe('no-store');
      expect(((await allowed.json()) as any).source).toBe('staged');
      expect(calls.some((u) => /\/items\?/.test(u))).toBe(true);
    } finally {
      close();
    }
  });

  it('returns 503 when Webflow cannot serve the collection', async () => {
    const { env, close } = createTestEnv();
    env.WEBFLOW_API_TOKEN = 'wf-token';
    mockWebflow(ITEMS, 404);
    try {
      const response = await callWorker(new Request('https://worker.test/api/templates/guidelines'), env);
      expect(response.status).toBe(503);
      expect(((await response.json()) as any).error).toBe('guidelines_unavailable');
    } finally {
      close();
    }
  });
});
