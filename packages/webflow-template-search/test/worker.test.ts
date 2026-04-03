import { afterEach, describe, expect, it, vi } from 'vitest';

import { installAirtableFetchMock } from './support/airtable.js';
import { callWorker, createTestEnv } from './support/worker.js';

const LOOKUPS = {
  styles: [
    { id: 'style-dark', fields: { Name: 'Dark', '🥞CMS Slug': 'dark-websites' } },
    { id: 'style-modern', fields: { Name: 'Modern', '🥞CMS Slug': 'modern' } },
  ],
  childCategories: [
    {
      id: 'child-ai',
      fields: {
        Category: 'AI',
        'Display name': 'AI',
        'Parent Category Name': 'Technology',
        '🪣Category Groups': 'technology-websites',
        'Related Keywords': 'automation, agent',
      },
    },
    {
      id: 'child-saas',
      fields: {
        Category: 'Software & SaaS',
        'Display name': 'Software & SaaS',
        'Parent Category Name': 'Technology',
        '🪣Category Groups': 'technology-websites',
        'Related Keywords': 'saas, software',
      },
    },
  ],
  tags: [{ id: 'tag-automation', fields: { Name: 'Automation', '🥞CMS Slug': 'automation' } }],
};

const PUBLISHED_ASSETS = [
  {
    id: 'recAgentflow',
    fields: {
      Name: 'Agentflow',
      '⚙️🆎Type (Text)': 'Template🏗️',
      '🚀Marketplace Status': '3️⃣Published🚀',
      'ℹ️Description (Short)': 'Build AI products faster',
      'ℹ️Description (Long).html': '<p>Workflow automation for AI teams and agent builders.</p>',
      '🪣Category Group(s) Display Name': ['Technology'],
      '🪣Category Group(s) CMS Slug': ['technology'],
      '🔍Algolia Child Category (🏗️ only)': ['child-ai'],
      'ℹ️👘Styles': ['style-modern'],
      'ℹ️🏷️Tags (Multi)': ['tag-automation'],
      '🥞Template Type (🏗️ only)': 'Multi Layout',
      'Is free?': 0,
      '🥞Is Currently Featured? (🏗️ only)': 1,
      'ℹ️Is Featured? (🖥️, 🏗️only)': 0,
      '🖌️Popularity Score': 87.4,
      '📋 Unique Viewers': 2400,
      '📋 Cumulative Purchases': 21,
      '📋 Cumulative Revenue': 1890,
      '🥞💲Template Price Filter (🏗️ only)': 169,
      '🚀📅Published Date': '2026-03-01',
      '🥞CMS Slug (formula)': 'agentflow-website-template',
      '🎨Creator Name': 'BRIX Templates',
      '🖼️Thumbnail Image': [{ url: 'https://example.com/agentflow.png' }],
      '🔗Listing URL': 'https://webflow.com/templates/html/agentflow-website-template',
      '🔗Preview Site URL': 'https://agentflow.example.com',
      '🔗Website URL': 'https://webflow.com/templates/html/agentflow-website-template',
      '📅LMT': '2026-03-16T05:13:07.000Z',
    },
  },
  {
    id: 'recSetrex',
    fields: {
      Name: 'Setrex',
      '⚙️🆎Type (Text)': 'Template🏗️',
      '🚀Marketplace Status': '3️⃣Published🚀',
      'ℹ️Description (Short)': 'Turn your big idea into a stunning website',
      'ℹ️Description (Long).html': '<p>Dark technology template for AI and fintech companies.</p>',
      '🪣Category Group(s) Display Name': ['Technology'],
      '🪣Category Group(s) CMS Slug': ['technology'],
      '🔍Algolia Child Category (🏗️ only)': ['child-ai'],
      'ℹ️👘Styles': ['style-dark'],
      'ℹ️🏷️Tags (Multi)': [],
      '🥞Template Type (🏗️ only)': 'Multi Page',
      'Is free?': 0,
      '🥞Is Currently Featured? (🏗️ only)': 0,
      'ℹ️Is Featured? (🖥️, 🏗️only)': 0,
      '🖌️Popularity Score': 92.3,
      '📋 Unique Viewers': 1900,
      '📋 Cumulative Purchases': 18,
      '📋 Cumulative Revenue': 2040,
      '🥞💲Template Price Filter (🏗️ only)': 79,
      '🚀📅Published Date': '2026-02-15',
      '🥞CMS Slug (formula)': 'setrex-website-template',
      '🎨Creator Name': 'Arini Studio',
      '🖼️Thumbnail Image': [{ url: 'https://example.com/setrex.png' }],
      '🔗Listing URL': 'https://webflow.com/templates/html/setrex-website-template',
      '🔗Preview Site URL': 'https://setrex.example.com',
      '🔗Website URL': 'https://webflow.com/templates/html/setrex-website-template',
      '📅LMT': '2026-03-16T05:10:00.000Z',
    },
  },
  {
    id: 'recCatalis',
    fields: {
      Name: 'Catalis',
      '⚙️🆎Type (Text)': 'Template🏗️',
      '🚀Marketplace Status': '3️⃣Published🚀',
      'ℹ️Description (Short)': 'Analytics for SaaS startups',
      'ℹ️Description (Long).html': '<p>Landing page for software teams with clean charts.</p>',
      '🪣Category Group(s) Display Name': ['Technology'],
      '🪣Category Group(s) CMS Slug': ['technology'],
      '🔍Algolia Child Category (🏗️ only)': ['child-saas'],
      'ℹ️👘Styles': ['style-modern'],
      'ℹ️🏷️Tags (Multi)': [],
      '🥞Template Type (🏗️ only)': 'One Page',
      'Is free?': 1,
      '🥞Is Currently Featured? (🏗️ only)': 0,
      'ℹ️Is Featured? (🖥️, 🏗️only)': 0,
      '🖌️Popularity Score': 65.1,
      '📋 Unique Viewers': 1200,
      '📋 Cumulative Purchases': 9,
      '📋 Cumulative Revenue': 0,
      '🥞💲Template Price Filter (🏗️ only)': 0,
      '🚀📅Published Date': '2026-03-10',
      '🥞CMS Slug (formula)': 'catalis-website-template',
      '🎨Creator Name': 'Temlis',
      '🖼️Thumbnail Image': [{ url: 'https://example.com/catalis.png' }],
      '🔗Listing URL': 'https://webflow.com/templates/html/catalis-website-template',
      '🔗Preview Site URL': 'https://catalis.example.com',
      '🔗Website URL': 'https://webflow.com/templates/html/catalis-website-template',
      '📅LMT': '2026-03-16T05:14:00.000Z',
    },
  },
];

afterEach(() => {
  vi.restoreAllMocks();
});

describe('webflow-template-search worker', () => {
  it('requires auth for manual rebuild', async () => {
    const { env, close } = createTestEnv();
    try {
      const response = await callWorker(new Request('https://templates.test/api/templates/admin/rebuild', { method: 'POST' }), env);
      expect(response.status).toBe(401);
    } finally {
      close();
    }
  });

  it('rebuilds the index and serves filtered search results', async () => {
    const fetchMock = installAirtableFetchMock({
      publishedAssets: PUBLISHED_ASSETS,
      styles: LOOKUPS.styles,
      childCategories: LOOKUPS.childCategories,
      tags: LOOKUPS.tags,
    });
    const { env, close } = createTestEnv();

    try {
      const rebuild = await callWorker(
        new Request('https://templates.test/api/templates/admin/rebuild', {
          method: 'POST',
          headers: { Authorization: 'Bearer sync-token' },
        }),
        env,
      );
      expect(rebuild.status).toBe(200);

      const categorySearch = await callWorker(
        new Request('https://templates.test/api/templates/search?category_group_slug=technology-websites&child_category_slug=ai-websites'),
        env,
      );
      const categoryPayload = (await categorySearch.json()) as {
        items: Array<{ name: string; cumulative_revenue: number }>;
        available_facets: { styles: Array<{ slug: string }>; types: Array<{ value: string }> };
        subcategory_pills: Array<{ slug: string; active: boolean }>;
      };

      expect(categoryPayload.items.map((item) => item.name)).toEqual(['Setrex', 'Agentflow']);
      expect(categoryPayload.items[0]?.cumulative_revenue).toBe(2040);
      expect(categoryPayload.available_facets.styles.map((item) => item.slug)).toEqual(['dark-websites', 'modern']);
      expect(categoryPayload.available_facets.types.map((item) => item.value)).toEqual(['Multi Layout', 'Multi Page']);
      expect(categoryPayload.subcategory_pills.map((pill) => pill.slug)).toEqual(['ai-websites', 'software-and-saas-websites']);
      expect(categoryPayload.subcategory_pills.find((pill) => pill.slug === 'ai-websites')?.active).toBe(true);

      const search = await callWorker(new Request('https://templates.test/api/templates/search?q=workflow'), env);
      const searchPayload = (await search.json()) as { items: Array<{ name: string; cumulative_revenue: number }> };
      expect(searchPayload.items.map((item) => item.name)).toEqual(['Agentflow']);
      expect(searchPayload.items[0]?.cumulative_revenue).toBe(1890);
    } finally {
      fetchMock.mockRestore();
      close();
    }
  });

  it('chunks full rebuilds across multiple invocations', async () => {
    const publishedAssets = Array.from({ length: 250 }, (_, index) => ({
      id: `recChunk${index + 1}`,
      fields: {
        Name: `Chunk Template ${index + 1}`,
        '⚙️🆎Type (Text)': 'Template🏗️',
        '🚀Marketplace Status': '3️⃣Published🚀',
        'ℹ️Description (Short)': 'Chunked rebuild test template',
        'ℹ️Description (Long).html': '<p>Chunked rebuild test template</p>',
        '🪣Category Group(s) Display Name': ['Technology'],
        '🪣Category Group(s) CMS Slug': ['technology'],
        '🔍Algolia Child Category (🏗️ only)': ['child-ai'],
        '🥞Template Type (🏗️ only)': 'Multi Page',
        '🥞CMS Slug (formula)': `chunk-template-${index + 1}`,
        '📅LMT': `2026-02-${String((index % 28) + 1).padStart(2, '0')}T00:00:00.000Z`,
      },
    }));
    const fetchMock = installAirtableFetchMock({
      publishedAssets,
      styles: LOOKUPS.styles,
      childCategories: LOOKUPS.childCategories,
      tags: LOOKUPS.tags,
    });
    const { env, close } = createTestEnv({ FULL_SYNC_PAGE_LIMIT: '1' });

    try {
      const firstRebuild = await callWorker(
        new Request('https://templates.test/api/templates/admin/rebuild', {
          method: 'POST',
          headers: { Authorization: 'Bearer sync-token' },
        }),
        env,
      );
      const firstPayload = (await firstRebuild.json()) as { complete?: boolean; indexed_records: number; next_offset?: string | null };
      expect(firstPayload.complete).toBe(false);
      expect(firstPayload.indexed_records).toBe(100);
      expect(firstPayload.next_offset).toBeTruthy();

      const firstCount = await env.DB.prepare('SELECT COUNT(*) AS total FROM template_documents').first<{ total: number }>();
      expect(Number(firstCount?.total ?? 0)).toBe(100);

      const secondRebuild = await callWorker(
        new Request('https://templates.test/api/templates/admin/rebuild', {
          method: 'POST',
          headers: { Authorization: 'Bearer sync-token' },
        }),
        env,
      );
      const secondPayload = (await secondRebuild.json()) as { complete?: boolean; indexed_records: number };
      expect(secondPayload.complete).toBe(false);
      expect(secondPayload.indexed_records).toBe(200);

      const thirdRebuild = await callWorker(
        new Request('https://templates.test/api/templates/admin/rebuild', {
          method: 'POST',
          headers: { Authorization: 'Bearer sync-token' },
        }),
        env,
      );
      const thirdPayload = (await thirdRebuild.json()) as { complete?: boolean; indexed_records: number; next_offset?: string | null };
      expect(thirdPayload.complete).toBe(true);
      expect(thirdPayload.indexed_records).toBe(250);
      expect(thirdPayload.next_offset).toBeNull();

      const finalCount = await env.DB.prepare('SELECT COUNT(*) AS total FROM template_documents').first<{ total: number }>();
      expect(Number(finalCount?.total ?? 0)).toBe(250);

      const progressRow = await env.DB
        .prepare('SELECT value_json FROM sync_state WHERE key = ?')
        .bind('airtable_full_sync_progress')
        .first<{ value_json: string }>();
      expect(progressRow).toBeNull();
    } finally {
      fetchMock.mockRestore();
      close();
    }
  });

  it('reuses cached lookup tables across sync invocations', async () => {
    const fetchMock = installAirtableFetchMock({
      publishedAssets: PUBLISHED_ASSETS,
      incrementalAssets: [],
      styles: LOOKUPS.styles,
      childCategories: LOOKUPS.childCategories,
      tags: LOOKUPS.tags,
    });
    const { env, close } = createTestEnv({
      LOOKUP_CACHE_TTL_SECONDS: '3600',
    });

    try {
      const rebuild = await callWorker(
        new Request('https://templates.test/api/templates/admin/rebuild', {
          method: 'POST',
          headers: { Authorization: 'Bearer sync-token' },
        }),
        env,
      );
      expect(rebuild.status).toBe(200);

      const lookupRequestCountAfterRebuild = fetchMock.mock.calls.filter(([input]) => {
        const url = new URL(typeof input === 'string' ? input : input.url);
        const tableId = decodeURIComponent(url.pathname.split('/').pop() ?? '');
        return ['tblG7E9LbQj0sBX0o', 'tblWJXy3M6R8SeoFi', 'tblb4969G7O75gVWV'].includes(tableId);
      }).length;

      expect(lookupRequestCountAfterRebuild).toBe(3);

      const sync = await callWorker(
        new Request('https://templates.test/api/templates/admin/sync', {
          method: 'POST',
          headers: { Authorization: 'Bearer sync-token' },
        }),
        env,
      );
      expect(sync.status).toBe(200);

      const lookupRequestCountAfterSync = fetchMock.mock.calls.filter(([input]) => {
        const url = new URL(typeof input === 'string' ? input : input.url);
        const tableId = decodeURIComponent(url.pathname.split('/').pop() ?? '');
        return ['tblG7E9LbQj0sBX0o', 'tblWJXy3M6R8SeoFi', 'tblb4969G7O75gVWV'].includes(tableId);
      }).length;

      expect(lookupRequestCountAfterSync).toBe(lookupRequestCountAfterRebuild);
    } finally {
      fetchMock.mockRestore();
      close();
    }
  });

  it('bounds a full rebuild to the snapshot taken at sync start', async () => {
    const fetchMock = installAirtableFetchMock({
      publishedAssets: [
        {
          id: 'recCurrent',
          fields: {
            Name: 'Current Template',
            '⚙️🆎Type (Text)': 'Template🏗️',
            '🚀Marketplace Status': '3️⃣Published🚀',
            'ℹ️Description (Short)': 'A current template',
            'ℹ️Description (Long).html': '<p>Available now.</p>',
            '🪣Category Group(s) Display Name': ['Technology'],
            '🪣Category Group(s) CMS Slug': ['technology'],
            '🔍Algolia Child Category (🏗️ only)': ['child-ai'],
            '🥞Template Type (🏗️ only)': 'Multi Page',
            '📋 Unique Viewers': 25,
            '📋 Cumulative Purchases': 1,
            '📋 Cumulative Revenue': 49,
            '🥞CMS Slug (formula)': 'current-template',
            '📅LMT': '2026-03-16T05:10:00.000Z',
          },
        },
        {
          id: 'recFuture',
          fields: {
            Name: 'Future Template',
            '⚙️🆎Type (Text)': 'Template🏗️',
            '🚀Marketplace Status': '3️⃣Published🚀',
            'ℹ️Description (Short)': 'A template updated after the snapshot',
            'ℹ️Description (Long).html': '<p>Should wait for incremental sync.</p>',
            '🪣Category Group(s) Display Name': ['Technology'],
            '🪣Category Group(s) CMS Slug': ['technology'],
            '🔍Algolia Child Category (🏗️ only)': ['child-ai'],
            '🥞Template Type (🏗️ only)': 'Multi Page',
            '📋 Unique Viewers': 40,
            '📋 Cumulative Purchases': 2,
            '📋 Cumulative Revenue': 98,
            '🥞CMS Slug (formula)': 'future-template',
            '📅LMT': '2099-03-16T05:10:00.000Z',
          },
        },
      ],
      styles: LOOKUPS.styles,
      childCategories: LOOKUPS.childCategories,
      tags: LOOKUPS.tags,
    });
    const { env, close } = createTestEnv();

    try {
      const rebuild = await callWorker(
        new Request('https://templates.test/api/templates/admin/rebuild', {
          method: 'POST',
          headers: { Authorization: 'Bearer sync-token' },
        }),
        env,
      );
      expect(rebuild.status).toBe(200);

      const payload = (await rebuild.json()) as { complete?: boolean; indexed_records: number };
      expect(payload.complete).toBe(true);
      expect(payload.indexed_records).toBe(1);

      const names = await env.DB.prepare('SELECT name FROM template_documents ORDER BY name ASC').all<{ name: string }>();
      expect(names.results.map((row) => row.name)).toEqual(['Current Template']);
    } finally {
      fetchMock.mockRestore();
      close();
    }
  });

  it('supports revenue-weighted reranking for query results', async () => {
    const fetchMock = installAirtableFetchMock({
      publishedAssets: PUBLISHED_ASSETS,
      styles: LOOKUPS.styles,
      childCategories: LOOKUPS.childCategories,
      tags: LOOKUPS.tags,
    });
    const { env, close } = createTestEnv({
      SEARCH_RANKING_CONFIG_JSON: JSON.stringify({
        signalWeights: {
          text: 0,
          popularity: 0,
          views: 0,
          purchases: 0,
          revenue: 5,
        },
      }),
    });

    try {
      const rebuild = await callWorker(
        new Request('https://templates.test/api/templates/admin/rebuild', {
          method: 'POST',
          headers: { Authorization: 'Bearer sync-token' },
        }),
        env,
      );
      expect(rebuild.status).toBe(200);

      const response = await callWorker(
        new Request('https://templates.test/api/templates/search?q=ai&types=Multi%20Layout,Multi%20Page'),
        env,
      );
      const payload = (await response.json()) as { items: Array<{ name: string; cumulative_revenue: number }> };

      expect(payload.items.map((item) => item.name)).toEqual(['Setrex', 'Agentflow']);
      expect(payload.items[0]?.cumulative_revenue).toBe(2040);
    } finally {
      fetchMock.mockRestore();
      close();
    }
  });

  it('supports conversion-rate-weighted reranking for query results', async () => {
    const fetchMock = installAirtableFetchMock({
      publishedAssets: PUBLISHED_ASSETS,
      styles: LOOKUPS.styles,
      childCategories: LOOKUPS.childCategories,
      tags: LOOKUPS.tags,
    });
    const { env, close } = createTestEnv({
      SEARCH_RANKING_CONFIG_JSON: JSON.stringify({
        signalWeights: {
          text: 0,
          popularity: 0,
          views: 0,
          purchases: 0,
          conversionRate: 5,
          revenue: 0,
        },
      }),
    });

    try {
      const rebuild = await callWorker(
        new Request('https://templates.test/api/templates/admin/rebuild', {
          method: 'POST',
          headers: { Authorization: 'Bearer sync-token' },
        }),
        env,
      );
      expect(rebuild.status).toBe(200);

      const response = await callWorker(
        new Request('https://templates.test/api/templates/search?q=ai&types=Multi%20Layout,Multi%20Page'),
        env,
      );
      const payload = (await response.json()) as { items: Array<{ name: string }> };

      expect(payload.items.map((item) => item.name)).toEqual(['Setrex', 'Agentflow']);
    } finally {
      fetchMock.mockRestore();
      close();
    }
  });

  it('discounts raw purchase volume with viewer-aware smoothing', async () => {
    const fetchMock = installAirtableFetchMock({
      publishedAssets: [
        {
          id: 'recTrafficHeavy',
          fields: {
            Name: 'Traffic Heavy',
            '⚙️🆎Type (Text)': 'Template🏗️',
            '🚀Marketplace Status': '3️⃣Published🚀',
            'ℹ️Description (Short)': 'Large traffic, weaker monetization',
            'ℹ️Description (Long).html': '<p>AI workflow template.</p>',
            '🪣Category Group(s) Display Name': ['Technology'],
            '🪣Category Group(s) CMS Slug': ['technology'],
            '🔍Algolia Child Category (🏗️ only)': ['child-ai'],
            '🥞Template Type (🏗️ only)': 'Multi Page',
            '📋 Unique Viewers': 10000,
            '📋 Cumulative Purchases': 30,
            '📋 Cumulative Revenue': 1500,
            '🥞CMS Slug (formula)': 'traffic-heavy',
            '📅LMT': '2026-03-16T05:10:00.000Z',
          },
        },
        {
          id: 'recSteadySeller',
          fields: {
            Name: 'Steady Seller',
            '⚙️🆎Type (Text)': 'Template🏗️',
            '🚀Marketplace Status': '3️⃣Published🚀',
            'ℹ️Description (Short)': 'Lower traffic, stronger monetization',
            'ℹ️Description (Long).html': '<p>AI workflow template.</p>',
            '🪣Category Group(s) Display Name': ['Technology'],
            '🪣Category Group(s) CMS Slug': ['technology'],
            '🔍Algolia Child Category (🏗️ only)': ['child-ai'],
            '🥞Template Type (🏗️ only)': 'Multi Page',
            '📋 Unique Viewers': 500,
            '📋 Cumulative Purchases': 20,
            '📋 Cumulative Revenue': 1000,
            '🥞CMS Slug (formula)': 'steady-seller',
            '📅LMT': '2026-03-16T05:11:00.000Z',
          },
        },
      ],
      styles: LOOKUPS.styles,
      childCategories: LOOKUPS.childCategories,
      tags: LOOKUPS.tags,
    });
    const { env, close } = createTestEnv({
      SEARCH_RANKING_CONFIG_JSON: JSON.stringify({
        signalWeights: {
          text: 0,
          popularity: 0,
          views: 0,
          purchases: 5,
          conversionRate: 0,
          revenue: 0,
          exactTitle: 0,
          categoryMatch: 0,
        },
      }),
    });

    try {
      const rebuild = await callWorker(
        new Request('https://templates.test/api/templates/admin/rebuild', {
          method: 'POST',
          headers: { Authorization: 'Bearer sync-token' },
        }),
        env,
      );
      expect(rebuild.status).toBe(200);

      const response = await callWorker(new Request('https://templates.test/api/templates/search?q=workflow'), env);
      const payload = (await response.json()) as { items: Array<{ name: string }> };

      expect(payload.items.map((item) => item.name)).toEqual(['Steady Seller', 'Traffic Heavy']);
    } finally {
      fetchMock.mockRestore();
      close();
    }
  });

  it('caps indexed long-description text to limit keyword gaming', async () => {
    const fetchMock = installAirtableFetchMock({
      publishedAssets: [
        {
          id: 'recSpamflow',
          fields: {
            Name: 'Spamflow',
            '⚙️🆎Type (Text)': 'Template🏗️',
            '🚀Marketplace Status': '3️⃣Published🚀',
            'ℹ️Description (Short)': 'A concise summary',
            'ℹ️Description (Long).html': `<p>${'automation '.repeat(100)}</p>`,
            '🪣Category Group(s) Display Name': ['Technology'],
            '🪣Category Group(s) CMS Slug': ['technology'],
            '🔍Algolia Child Category (🏗️ only)': ['child-ai'],
            '🥞Template Type (🏗️ only)': 'Multi Page',
            '🖌️Popularity Score': 12,
            '📋 Unique Viewers': 50,
            '📋 Cumulative Purchases': 1,
            '📋 Cumulative Revenue': 49,
            '🥞CMS Slug (formula)': 'spamflow-website-template',
            '📅LMT': '2026-03-16T05:10:00.000Z',
          },
        },
      ],
      styles: LOOKUPS.styles,
      childCategories: LOOKUPS.childCategories,
      tags: LOOKUPS.tags,
    });
    const { env, close } = createTestEnv({
      SEARCH_RANKING_CONFIG_JSON: JSON.stringify({
        controls: {
          longDescriptionMaxChars: 80,
        },
      }),
    });

    try {
      const rebuild = await callWorker(
        new Request('https://templates.test/api/templates/admin/rebuild', {
          method: 'POST',
          headers: { Authorization: 'Bearer sync-token' },
        }),
        env,
      );
      expect(rebuild.status).toBe(200);

      const row = await env.DB
        .prepare('SELECT description_long_text FROM template_documents WHERE id = ?')
        .bind('recSpamflow')
        .first<{ description_long_text: string }>();

      expect(row?.description_long_text.length).toBeLessThanOrEqual(80);
      expect(row?.description_long_text).not.toContain('<p>');
    } finally {
      fetchMock.mockRestore();
      close();
    }
  });

  it('leans on taxonomy and names before description-only craft matches', async () => {
    const fetchMock = installAirtableFetchMock({
      publishedAssets: [
        {
          id: 'recCrafthive',
          fields: {
            Name: 'Crafthive',
            '⚙️🆎Type (Text)': 'Template🏗️',
            '🚀Marketplace Status': '3️⃣Published🚀',
            'ℹ️Description (Short)': 'A marketplace for handmade makers',
            'ℹ️Description (Long).html': '<p>A template for creative shops.</p>',
            '🪣Category Group(s) Display Name': ['Retail & E-Commerce'],
            '🪣Category Group(s) CMS Slug': ['retail-and-e-commerce-websites'],
            '🔍Algolia Child Category (🏗️ only)': ['child-crafts'],
            '🥞Template Type (🏗️ only)': 'Multi Page',
            '📋 Unique Viewers': 90,
            '📋 Cumulative Purchases': 2,
            '📋 Cumulative Revenue': 158,
            '🥞CMS Slug (formula)': 'crafthive-template',
            '📅LMT': '2026-03-16T05:10:00.000Z',
          },
        },
        {
          id: 'recPompeo',
          fields: {
            Name: 'Pompeo',
            '⚙️🆎Type (Text)': 'Template🏗️',
            '🚀Marketplace Status': '3️⃣Published🚀',
            'ℹ️Description (Short)': 'Pottery & Ceramics ecommerce template',
            'ℹ️Description (Long).html': '<p>Ideal for pottery classes and arts and crafts stores.</p>',
            '🪣Category Group(s) Display Name': ['Retail & E-Commerce'],
            '🪣Category Group(s) CMS Slug': ['retail-and-e-commerce-websites'],
            '🔍Algolia Child Category (🏗️ only)': ['child-crafts'],
            '🥞Template Type (🏗️ only)': 'Multi Page',
            '📋 Unique Viewers': 500,
            '📋 Cumulative Purchases': 9,
            '📋 Cumulative Revenue': 441,
            '🥞CMS Slug (formula)': 'pompeo-template',
            '📅LMT': '2026-03-16T05:11:00.000Z',
          },
        },
        {
          id: 'recLineDark',
          fields: {
            Name: 'Line Dark',
            '⚙️🆎Type (Text)': 'Template🏗️',
            '🚀Marketplace Status': '3️⃣Published🚀',
            'ℹ️Description (Short)': 'A stylish agency template crafted to feel premium',
            'ℹ️Description (Long).html': '<p>A modern agency template crafted to revolutionize classic web design.</p>',
            '🪣Category Group(s) Display Name': ['Portfolio & Agency'],
            '🪣Category Group(s) CMS Slug': ['portfolio-and-agency-websites'],
            '🔍Algolia Child Category (🏗️ only)': ['child-ai'],
            '🥞Template Type (🏗️ only)': 'Multi Page',
            '📋 Unique Viewers': 4000,
            '📋 Cumulative Purchases': 30,
            '📋 Cumulative Revenue': 1470,
            '🥞CMS Slug (formula)': 'line-dark-template',
            '📅LMT': '2026-03-16T05:12:00.000Z',
          },
        },
      ],
      styles: LOOKUPS.styles,
      childCategories: [
        ...LOOKUPS.childCategories,
        {
          id: 'child-crafts',
          fields: {
            Category: 'Arts & Crafts Store',
            'Display name': 'Arts & Crafts Store',
            'Parent Category Name': 'Retail & E-Commerce',
            '🪣Category Groups': 'retail-and-e-commerce-websites',
            'Related Keywords': 'craft, handmade',
          },
        },
      ],
      tags: LOOKUPS.tags,
    });
    const { env, close } = createTestEnv();

    try {
      const rebuild = await callWorker(
        new Request('https://templates.test/api/templates/admin/rebuild', {
          method: 'POST',
          headers: { Authorization: 'Bearer sync-token' },
        }),
        env,
      );
      expect(rebuild.status).toBe(200);

      const response = await callWorker(new Request('https://templates.test/api/templates/search?q=craft'), env);
      const payload = (await response.json()) as { items: Array<{ name: string }> };

      expect(payload.items.map((item) => item.name)).toEqual(['Crafthive', 'Pompeo', 'Line Dark']);
    } finally {
      fetchMock.mockRestore();
      close();
    }
  });

  it('keeps category signals strong for discovery-style queries', async () => {
    const fetchMock = installAirtableFetchMock({
      publishedAssets: [
        {
          id: 'recCraftName',
          fields: {
            Name: 'CraftMaster',
            '⚙️🆎Type (Text)': 'Template🏗️',
            '🚀Marketplace Status': '3️⃣Published🚀',
            'ℹ️Description (Short)': 'A master template for crafting websites',
            'ℹ️Description (Long).html': '<p>Build craft stores easily.</p>',
            '🪣Category Group(s) Display Name': ['Portfolio & Agency'],
            '🪣Category Group(s) CMS Slug': ['portfolio-and-agency-websites'],
            '🔍Algolia Child Category (🏗️ only)': ['child-ai'],
            '🥞Template Type (🏗️ only)': 'Multi Page',
            '📋 Unique Viewers': 3000,
            '📋 Cumulative Purchases': 25,
            '📋 Cumulative Revenue': 1225,
            '🥞CMS Slug (formula)': 'craftmaster-template',
            '📅LMT': '2026-03-16T05:10:00.000Z',
          },
        },
        {
          id: 'recCraftCategory',
          fields: {
            Name: 'Handmade Haven',
            '⚙️🆎Type (Text)': 'Template🏗️',
            '🚀Marketplace Status': '3️⃣Published🚀',
            'ℹ️Description (Short)': 'Template for artisan craft stores',
            'ℹ️Description (Long).html': '<p>Sell handmade crafts online.</p>',
            '🪣Category Group(s) Display Name': ['Retail & E-Commerce'],
            '🪣Category Group(s) CMS Slug': ['retail-and-e-commerce-websites'],
            '🔍Algolia Child Category (🏗️ only)': ['child-crafts'],
            '🥞Template Type (🏗️ only)': 'Multi Page',
            '📋 Unique Viewers': 200,
            '📋 Cumulative Purchases': 4,
            '📋 Cumulative Revenue': 196,
            '🥞CMS Slug (formula)': 'handmade-haven-template',
            '📅LMT': '2026-03-16T05:11:00.000Z',
          },
        },
      ],
      styles: LOOKUPS.styles,
      childCategories: [
        ...LOOKUPS.childCategories,
        {
          id: 'child-crafts',
          fields: {
            Category: 'Arts & Crafts Store',
            'Display name': 'Arts & Crafts Store',
            'Parent Category Name': 'Retail & E-Commerce',
            '🪣Category Groups': 'retail-and-e-commerce-websites',
            'Related Keywords': 'craft, handmade',
          },
        },
      ],
      tags: LOOKUPS.tags,
    });
    const { env, close } = createTestEnv({
      SEARCH_RANKING_CONFIG_JSON: JSON.stringify({
        signalWeights: {
          text: 0,
          popularity: 0,
          views: 0,
          purchases: 0,
          conversionRate: 0,
          revenue: 0,
          exactTitle: 0,
          categoryMatch: 5,
        },
      }),
    });

    try {
      const rebuild = await callWorker(
        new Request('https://templates.test/api/templates/admin/rebuild', {
          method: 'POST',
          headers: { Authorization: 'Bearer sync-token' },
        }),
        env,
      );
      expect(rebuild.status).toBe(200);

      const response = await callWorker(new Request('https://templates.test/api/templates/search?q=arts%20craft%20store'), env);
      const payload = (await response.json()) as { items: Array<{ name: string }> };

      // Discovery-style queries should still let taxonomy beat a title-only match.
      expect(payload.items[0]?.name).toBe('Handmade Haven');
    } finally {
      fetchMock.mockRestore();
      close();
    }
  });

  it('treats short one-word queries as more title-sensitive than taxonomy-only matches', async () => {
    const fetchMock = installAirtableFetchMock({
      publishedAssets: [
        {
          id: 'recCraftName',
          fields: {
            Name: 'CraftMaster',
            '⚙️🆎Type (Text)': 'Template🏗️',
            '🚀Marketplace Status': '3️⃣Published🚀',
            'ℹ️Description (Short)': 'A master template for crafting websites',
            'ℹ️Description (Long).html': '<p>Build craft stores easily.</p>',
            '🪣Category Group(s) Display Name': ['Portfolio & Agency'],
            '🪣Category Group(s) CMS Slug': ['portfolio-and-agency-websites'],
            '🔍Algolia Child Category (🏗️ only)': ['child-ai'],
            '🥞Template Type (🏗️ only)': 'Multi Page',
            '📋 Unique Viewers': 3000,
            '📋 Cumulative Purchases': 25,
            '📋 Cumulative Revenue': 1225,
            '🥞CMS Slug (formula)': 'craftmaster-template',
            '📅LMT': '2026-03-16T05:10:00.000Z',
          },
        },
        {
          id: 'recCraftCategory',
          fields: {
            Name: 'Handmade Haven',
            '⚙️🆎Type (Text)': 'Template🏗️',
            '🚀Marketplace Status': '3️⃣Published🚀',
            'ℹ️Description (Short)': 'Template for artisan craft stores',
            'ℹ️Description (Long).html': '<p>Sell handmade crafts online.</p>',
            '🪣Category Group(s) Display Name': ['Retail & E-Commerce'],
            '🪣Category Group(s) CMS Slug': ['retail-and-e-commerce-websites'],
            '🔍Algolia Child Category (🏗️ only)': ['child-crafts'],
            '🥞Template Type (🏗️ only)': 'Multi Page',
            '📋 Unique Viewers': 200,
            '📋 Cumulative Purchases': 4,
            '📋 Cumulative Revenue': 196,
            '🥞CMS Slug (formula)': 'handmade-haven-template',
            '📅LMT': '2026-03-16T05:11:00.000Z',
          },
        },
      ],
      styles: LOOKUPS.styles,
      childCategories: [
        ...LOOKUPS.childCategories,
        {
          id: 'child-crafts',
          fields: {
            Category: 'Arts & Crafts Store',
            'Display name': 'Arts & Crafts Store',
            'Parent Category Name': 'Retail & E-Commerce',
            '🪣Category Groups': 'retail-and-e-commerce-websites',
            'Related Keywords': 'craft, handmade',
          },
        },
      ],
      tags: LOOKUPS.tags,
    });
    const { env, close } = createTestEnv({
      SEARCH_RANKING_CONFIG_JSON: JSON.stringify({
        signalWeights: {
          text: 0,
          popularity: 0,
          views: 0,
          purchases: 0,
          conversionRate: 0,
          revenue: 0,
          exactTitle: 2,
          categoryMatch: 5,
        },
        controls: {
          shortQueryCategoryWeightMultiplier: 0.1,
        },
      }),
    });

    try {
      const rebuild = await callWorker(
        new Request('https://templates.test/api/templates/admin/rebuild', {
          method: 'POST',
          headers: { Authorization: 'Bearer sync-token' },
        }),
        env,
      );
      expect(rebuild.status).toBe(200);

      const response = await callWorker(new Request('https://templates.test/api/templates/search?q=craft'), env);
      const payload = (await response.json()) as { items: Array<{ name: string }> };

      expect(payload.items[0]?.name).toBe('CraftMaster');
    } finally {
      fetchMock.mockRestore();
      close();
    }
  });

  it('expands plural queries to singular title matches', async () => {
    const fetchMock = installAirtableFetchMock({
      publishedAssets: [
        {
          id: 'recAgencyAtlas',
          fields: {
            Name: 'Agency Atlas',
            '⚙️🆎Type (Text)': 'Template🏗️',
            '🚀Marketplace Status': '3️⃣Published🚀',
            'ℹ️Description (Short)': 'Modern portfolio template for service firms',
            'ℹ️Description (Long).html': '<p>Designed for consultancies and service studios.</p>',
            '🪣Category Group(s) Display Name': ['Portfolio & Agency'],
            '🪣Category Group(s) CMS Slug': ['portfolio-and-agency-websites'],
            '🔍Algolia Child Category (🏗️ only)': ['child-ai'],
            '🥞Template Type (🏗️ only)': 'Multi Page',
            '📋 Unique Viewers': 900,
            '📋 Cumulative Purchases': 7,
            '📋 Cumulative Revenue': 343,
            '🥞CMS Slug (formula)': 'agency-atlas-template',
            '📅LMT': '2026-03-16T05:10:00.000Z',
          },
        },
        {
          id: 'recStudioGrid',
          fields: {
            Name: 'Studio Grid',
            '⚙️🆎Type (Text)': 'Template🏗️',
            '🚀Marketplace Status': '3️⃣Published🚀',
            'ℹ️Description (Short)': 'Modern portfolio template',
            'ℹ️Description (Long).html': '<p>Designed for product studios.</p>',
            '🪣Category Group(s) Display Name': ['Technology'],
            '🪣Category Group(s) CMS Slug': ['technology-websites'],
            '🔍Algolia Child Category (🏗️ only)': ['child-ai'],
            '🥞Template Type (🏗️ only)': 'Multi Page',
            '📋 Unique Viewers': 1200,
            '📋 Cumulative Purchases': 5,
            '📋 Cumulative Revenue': 245,
            '🥞CMS Slug (formula)': 'studio-grid-template',
            '📅LMT': '2026-03-16T05:11:00.000Z',
          },
        },
      ],
      styles: LOOKUPS.styles,
      childCategories: LOOKUPS.childCategories,
      tags: LOOKUPS.tags,
    });
    const { env, close } = createTestEnv();

    try {
      const rebuild = await callWorker(
        new Request('https://templates.test/api/templates/admin/rebuild', {
          method: 'POST',
          headers: { Authorization: 'Bearer sync-token' },
        }),
        env,
      );
      expect(rebuild.status).toBe(200);

      const response = await callWorker(new Request('https://templates.test/api/templates/search?q=agencies'), env);
      const payload = (await response.json()) as { items: Array<{ name: string }> };

      expect(payload.items.map((item) => item.name)).toEqual(['Agency Atlas']);
    } finally {
      fetchMock.mockRestore();
      close();
    }
  });

  it('counts multi-word title token coverage even when the title order differs', async () => {
    const fetchMock = installAirtableFetchMock({
      publishedAssets: [
        {
          id: 'recAgencyPortfolio',
          fields: {
            Name: 'Agency Portfolio',
            '⚙️🆎Type (Text)': 'Template🏗️',
            '🚀Marketplace Status': '3️⃣Published🚀',
            'ℹ️Description (Short)': 'Clean studio template',
            'ℹ️Description (Long).html': '<p>Minimal studio template.</p>',
            '🪣Category Group(s) Display Name': ['Technology'],
            '🪣Category Group(s) CMS Slug': ['technology-websites'],
            '🔍Algolia Child Category (🏗️ only)': ['child-ai'],
            '🥞Template Type (🏗️ only)': 'Multi Page',
            '📋 Unique Viewers': 10,
            '📋 Cumulative Purchases': 0,
            '📋 Cumulative Revenue': 0,
            '🥞CMS Slug (formula)': 'agency-portfolio-template',
            '📅LMT': '2026-03-16T05:10:00.000Z',
          },
        },
        {
          id: 'recLexicalPhrase',
          fields: {
            Name: 'Studio Grid',
            '⚙️🆎Type (Text)': 'Template🏗️',
            '🚀Marketplace Status': '3️⃣Published🚀',
            'ℹ️Description (Short)': 'Portfolio agency launch kit',
            'ℹ️Description (Long).html': '<p>Build a portfolio agency website.</p>',
            '🪣Category Group(s) Display Name': ['Technology'],
            '🪣Category Group(s) CMS Slug': ['technology-websites'],
            '🔍Algolia Child Category (🏗️ only)': ['child-ai'],
            '🥞Template Type (🏗️ only)': 'Multi Page',
            '📋 Unique Viewers': 5000,
            '📋 Cumulative Purchases': 50,
            '📋 Cumulative Revenue': 2450,
            '🥞CMS Slug (formula)': 'studio-grid-template',
            '📅LMT': '2026-03-16T05:11:00.000Z',
          },
        },
      ],
      styles: LOOKUPS.styles,
      childCategories: LOOKUPS.childCategories,
      tags: LOOKUPS.tags,
    });
    const { env, close } = createTestEnv({
      SEARCH_RANKING_CONFIG_JSON: JSON.stringify({
        signalWeights: {
          text: 0,
          popularity: 0,
          views: 0,
          purchases: 0,
          conversionRate: 0,
          revenue: 0,
          freshness: 0,
          creatorTrackRecord: 0,
          creatorDiversity: 0,
          exactTitle: 0,
          categoryMatch: 0,
          querySaturation: 0,
        },
      }),
    });

    try {
      const rebuild = await callWorker(
        new Request('https://templates.test/api/templates/admin/rebuild', {
          method: 'POST',
          headers: { Authorization: 'Bearer sync-token' },
        }),
        env,
      );
      expect(rebuild.status).toBe(200);

      const response = await callWorker(new Request('https://templates.test/api/templates/search?q=portfolio%20agency'), env);
      const payload = (await response.json()) as { items: Array<{ name: string }> };

      expect(payload.items.map((item) => item.name)).toEqual(['Agency Portfolio', 'Studio Grid']);
    } finally {
      fetchMock.mockRestore();
      close();
    }
  });

  it('ignores low-information wrapper words for multi-word title queries', async () => {
    const fetchMock = installAirtableFetchMock({
      publishedAssets: [
        {
          id: 'recAgencyPortfolio',
          fields: {
            Name: 'Agency Portfolio',
            '⚙️🆎Type (Text)': 'Template🏗️',
            '🚀Marketplace Status': '3️⃣Published🚀',
            'ℹ️Description (Short)': 'Clean studio site',
            'ℹ️Description (Long).html': '<p>Minimal studio site.</p>',
            '🪣Category Group(s) Display Name': ['Technology'],
            '🪣Category Group(s) CMS Slug': ['technology-websites'],
            '🔍Algolia Child Category (🏗️ only)': ['child-ai'],
            '🥞Template Type (🏗️ only)': 'Multi Page',
            '📋 Unique Viewers': 10,
            '📋 Cumulative Purchases': 0,
            '📋 Cumulative Revenue': 0,
            '🥞CMS Slug (formula)': 'agency-portfolio-template',
            '📅LMT': '2026-03-16T05:12:00.000Z',
          },
        },
        {
          id: 'recBestBefore',
          fields: {
            Name: 'BestBefore',
            '⚙️🆎Type (Text)': 'Template🏗️',
            '🚀Marketplace Status': '3️⃣Published🚀',
            'ℹ️Description (Short)': 'Best template for makers',
            'ℹ️Description (Long).html': '<p>Best website template for makers.</p>',
            '🪣Category Group(s) Display Name': ['Technology'],
            '🪣Category Group(s) CMS Slug': ['technology-websites'],
            '🔍Algolia Child Category (🏗️ only)': ['child-ai'],
            '🥞Template Type (🏗️ only)': 'Multi Page',
            '📋 Unique Viewers': 5000,
            '📋 Cumulative Purchases': 50,
            '📋 Cumulative Revenue': 2450,
            '🥞CMS Slug (formula)': 'best-before-template',
            '📅LMT': '2026-03-16T05:13:00.000Z',
          },
        },
      ],
      styles: LOOKUPS.styles,
      childCategories: LOOKUPS.childCategories,
      tags: LOOKUPS.tags,
    });
    const { env, close } = createTestEnv();

    try {
      const rebuild = await callWorker(
        new Request('https://templates.test/api/templates/admin/rebuild', {
          method: 'POST',
          headers: { Authorization: 'Bearer sync-token' },
        }),
        env,
      );
      expect(rebuild.status).toBe(200);

      const response = await callWorker(new Request('https://templates.test/api/templates/search?q=best%20portfolio%20agency%20template'), env);
      const payload = (await response.json()) as { items: Array<{ name: string }> };

      expect(payload.items.map((item) => item.name)).toEqual(['Agency Portfolio']);
    } finally {
      fetchMock.mockRestore();
      close();
    }
  });

  it('relaxes sparse long title queries by dropping one token from the FTS candidate gate', async () => {
    const fetchMock = installAirtableFetchMock({
      publishedAssets: [
        {
          id: 'recAgencyPortfolioRelaxed',
          fields: {
            Name: 'Agency Portfolio',
            '⚙️🆎Type (Text)': 'Template🏗️',
            '🚀Marketplace Status': '3️⃣Published🚀',
            'ℹ️Description (Short)': 'Clean studio site',
            'ℹ️Description (Long).html': '<p>Minimal studio site.</p>',
            '🪣Category Group(s) Display Name': ['Portfolio & Agency'],
            '🪣Category Group(s) CMS Slug': ['portfolio-and-agency-websites'],
            '🔍Algolia Child Category (🏗️ only)': ['child-ai'],
            '🥞Template Type (🏗️ only)': 'Multi Page',
            '📋 Unique Viewers': 10,
            '📋 Cumulative Purchases': 0,
            '📋 Cumulative Revenue': 0,
            '🥞CMS Slug (formula)': 'agency-portfolio-relaxed-template',
            '📅LMT': '2026-03-16T05:16:00.000Z',
          },
        },
      ],
      styles: LOOKUPS.styles,
      childCategories: LOOKUPS.childCategories,
      tags: LOOKUPS.tags,
    });
    const { env, close } = createTestEnv();

    try {
      const rebuild = await callWorker(
        new Request('https://templates.test/api/templates/admin/rebuild', {
          method: 'POST',
          headers: { Authorization: 'Bearer sync-token' },
        }),
        env,
      );
      expect(rebuild.status).toBe(200);

      const response = await callWorker(
        new Request('https://templates.test/api/templates/search?q=portfolio%20agency%20consultants'),
        env,
      );
      const payload = (await response.json()) as {
        items: Array<{ name: string }>;
        pagination: { total_items: number };
        available_facets: { types: Array<{ value: string; count: number }> };
      };

      expect(payload.items.map((item) => item.name)).toEqual(['Agency Portfolio']);
      expect(payload.pagination.total_items).toBe(1);
      expect(payload.available_facets.types).toEqual([{ value: 'Multi Page', count: 1 }]);
    } finally {
      fetchMock.mockRestore();
      close();
    }
  });

  it('matches curated child-category keywords even when listing copy lacks the query', async () => {
    const fetchMock = installAirtableFetchMock({
      publishedAssets: [
        {
          id: 'recPotteryCategory',
          fields: {
            Name: 'Pottery Market',
            '⚙️🆎Type (Text)': 'Template🏗️',
            '🚀Marketplace Status': '3️⃣Published🚀',
            'ℹ️Description (Short)': 'Pottery & ceramics ecommerce template',
            'ℹ️Description (Long).html': '<p>Ideal for ceramic studios and pottery shops.</p>',
            '🪣Category Group(s) Display Name': ['Retail & E-Commerce'],
            '🪣Category Group(s) CMS Slug': ['retail-and-e-commerce-websites'],
            '🔍Algolia Child Category (🏗️ only)': ['child-crafts'],
            '🥞Template Type (🏗️ only)': 'Multi Page',
            '📋 Unique Viewers': 500,
            '📋 Cumulative Purchases': 9,
            '📋 Cumulative Revenue': 441,
            '🥞CMS Slug (formula)': 'pottery-market-template',
            '📅LMT': '2026-03-16T05:11:00.000Z',
          },
        },
        {
          id: 'recStudioIrrelevant',
          fields: {
            Name: 'Studio Grid',
            '⚙️🆎Type (Text)': 'Template🏗️',
            '🚀Marketplace Status': '3️⃣Published🚀',
            'ℹ️Description (Short)': 'Modern portfolio website',
            'ℹ️Description (Long).html': '<p>Ideal for design studios.</p>',
            '🪣Category Group(s) Display Name': ['Portfolio & Agency'],
            '🪣Category Group(s) CMS Slug': ['portfolio-and-agency-websites'],
            '🔍Algolia Child Category (🏗️ only)': ['child-ai'],
            '🥞Template Type (🏗️ only)': 'Multi Page',
            '📋 Unique Viewers': 1200,
            '📋 Cumulative Purchases': 5,
            '📋 Cumulative Revenue': 245,
            '🥞CMS Slug (formula)': 'studio-grid-template',
            '📅LMT': '2026-03-16T05:12:00.000Z',
          },
        },
      ],
      styles: LOOKUPS.styles,
      childCategories: [
        ...LOOKUPS.childCategories,
        {
          id: 'child-crafts',
          fields: {
            Category: 'Arts & Crafts Store',
            'Display name': 'Arts & Crafts Store',
            'Parent Category Name': 'Retail & E-Commerce',
            '🪣Category Groups': 'retail-and-e-commerce-websites',
            'Related Keywords': 'craft, handmade',
          },
        },
      ],
      tags: LOOKUPS.tags,
    });
    const { env, close } = createTestEnv();

    try {
      const rebuild = await callWorker(
        new Request('https://templates.test/api/templates/admin/rebuild', {
          method: 'POST',
          headers: { Authorization: 'Bearer sync-token' },
        }),
        env,
      );
      expect(rebuild.status).toBe(200);

      const response = await callWorker(new Request('https://templates.test/api/templates/search?q=handmade'), env);
      const payload = (await response.json()) as { items: Array<{ name: string }> };

      expect(payload.items.map((item) => item.name)).toEqual(['Pottery Market']);
    } finally {
      fetchMock.mockRestore();
      close();
    }
  });

  it('ignores low-information wrapper words for discovery-style taxonomy queries', async () => {
    const fetchMock = installAirtableFetchMock({
      publishedAssets: [
        {
          id: 'recTaxonomyWinner',
          fields: {
            Name: 'Pottery Market',
            '⚙️🆎Type (Text)': 'Template🏗️',
            '🚀Marketplace Status': '3️⃣Published🚀',
            'ℹ️Description (Short)': 'Pottery & ceramics ecommerce site',
            'ℹ️Description (Long).html': '<p>Sell ceramics online.</p>',
            '🪣Category Group(s) Display Name': ['Retail & E-Commerce'],
            '🪣Category Group(s) CMS Slug': ['retail-and-e-commerce-websites'],
            '🔍Algolia Child Category (🏗️ only)': ['child-crafts'],
            '🥞Template Type (🏗️ only)': 'Multi Page',
            '📋 Unique Viewers': 10,
            '📋 Cumulative Purchases': 0,
            '📋 Cumulative Revenue': 0,
            '🥞CMS Slug (formula)': 'pottery-market-template',
            '📅LMT': '2026-03-16T05:14:00.000Z',
          },
        },
        {
          id: 'recStoreWave',
          fields: {
            Name: 'Storewave',
            '⚙️🆎Type (Text)': 'Template🏗️',
            '🚀Marketplace Status': '3️⃣Published🚀',
            'ℹ️Description (Short)': 'Top ecommerce template',
            'ℹ️Description (Long).html': '<p>Top store template for modern brands.</p>',
            '🪣Category Group(s) Display Name': ['Technology'],
            '🪣Category Group(s) CMS Slug': ['technology-websites'],
            '🔍Algolia Child Category (🏗️ only)': ['child-ai'],
            '🥞Template Type (🏗️ only)': 'Multi Page',
            '📋 Unique Viewers': 5000,
            '📋 Cumulative Purchases': 50,
            '📋 Cumulative Revenue': 2450,
            '🥞CMS Slug (formula)': 'storewave-template',
            '📅LMT': '2026-03-16T05:15:00.000Z',
          },
        },
      ],
      styles: LOOKUPS.styles,
      childCategories: [
        ...LOOKUPS.childCategories,
        {
          id: 'child-crafts',
          fields: {
            Category: 'Arts & Crafts Store',
            'Display name': 'Arts & Crafts Store',
            'Parent Category Name': 'Retail & E-Commerce',
            '🪣Category Groups': 'retail-and-e-commerce-websites',
            'Related Keywords': 'craft, handmade',
          },
        },
      ],
      tags: LOOKUPS.tags,
    });
    const { env, close } = createTestEnv();

    try {
      const rebuild = await callWorker(
        new Request('https://templates.test/api/templates/admin/rebuild', {
          method: 'POST',
          headers: { Authorization: 'Bearer sync-token' },
        }),
        env,
      );
      expect(rebuild.status).toBe(200);

      const response = await callWorker(new Request('https://templates.test/api/templates/search?q=top%20craft%20store%20template'), env);
      const payload = (await response.json()) as { items: Array<{ name: string }> };

      expect(payload.items.map((item) => item.name)).toEqual(['Pottery Market']);
    } finally {
      fetchMock.mockRestore();
      close();
    }
  });

  it('relaxes sparse long taxonomy queries by dropping one token from the FTS candidate gate', async () => {
    const fetchMock = installAirtableFetchMock({
      publishedAssets: [
        {
          id: 'recTaxonomyRelaxed',
          fields: {
            Name: 'Pottery Market',
            '⚙️🆎Type (Text)': 'Template🏗️',
            '🚀Marketplace Status': '3️⃣Published🚀',
            'ℹ️Description (Short)': 'Sell handmade goods online',
            'ℹ️Description (Long).html': '<p>Pottery storefront for independent makers.</p>',
            '🪣Category Group(s) Display Name': ['Retail & E-Commerce'],
            '🪣Category Group(s) CMS Slug': ['retail-and-e-commerce-websites'],
            '🔍Algolia Child Category (🏗️ only)': ['child-crafts'],
            '🥞Template Type (🏗️ only)': 'Multi Page',
            '📋 Unique Viewers': 10,
            '📋 Cumulative Purchases': 0,
            '📋 Cumulative Revenue': 0,
            '🥞CMS Slug (formula)': 'pottery-market-relaxed-template',
            '📅LMT': '2026-03-16T05:17:00.000Z',
          },
        },
      ],
      styles: LOOKUPS.styles,
      childCategories: [
        ...LOOKUPS.childCategories,
        {
          id: 'child-crafts',
          fields: {
            Category: 'Arts & Crafts Store',
            'Display name': 'Arts & Crafts Store',
            'Parent Category Name': 'Retail & E-Commerce',
            '🪣Category Groups': 'retail-and-e-commerce-websites',
            'Related Keywords': 'craft, handmade',
          },
        },
      ],
      tags: LOOKUPS.tags,
    });
    const { env, close } = createTestEnv();

    try {
      const rebuild = await callWorker(
        new Request('https://templates.test/api/templates/admin/rebuild', {
          method: 'POST',
          headers: { Authorization: 'Bearer sync-token' },
        }),
        env,
      );
      expect(rebuild.status).toBe(200);

      const response = await callWorker(
        new Request('https://templates.test/api/templates/search?q=online%20arts%20craft%20shop'),
        env,
      );
      const payload = (await response.json()) as {
        items: Array<{ name: string }>;
        pagination: { total_items: number };
        available_facets: { types: Array<{ value: string; count: number }> };
      };

      expect(payload.items.map((item) => item.name)).toEqual(['Pottery Market']);
      expect(payload.pagination.total_items).toBe(1);
      expect(payload.available_facets.types).toEqual([{ value: 'Multi Page', count: 1 }]);
    } finally {
      fetchMock.mockRestore();
      close();
    }
  });

  it('counts separated taxonomy tokens for discovery-style category matches', async () => {
    const fetchMock = installAirtableFetchMock({
      publishedAssets: [
        {
          id: 'recTaxonomyWinner',
          fields: {
            Name: 'Pottery Market',
            '⚙️🆎Type (Text)': 'Template🏗️',
            '🚀Marketplace Status': '3️⃣Published🚀',
            'ℹ️Description (Short)': 'Pottery & ceramics ecommerce template',
            'ℹ️Description (Long).html': '<p>Sell ceramics online.</p>',
            '🪣Category Group(s) Display Name': ['Retail & E-Commerce'],
            '🪣Category Group(s) CMS Slug': ['retail-and-e-commerce-websites'],
            '🔍Algolia Child Category (🏗️ only)': ['child-crafts'],
            '🥞Template Type (🏗️ only)': 'Multi Page',
            '📋 Unique Viewers': 10,
            '📋 Cumulative Purchases': 0,
            '📋 Cumulative Revenue': 0,
            '🥞CMS Slug (formula)': 'pottery-market-template',
            '📅LMT': '2026-03-16T05:12:00.000Z',
          },
        },
        {
          id: 'recLexicalWinner',
          fields: {
            Name: 'Studio Grid',
            '⚙️🆎Type (Text)': 'Template🏗️',
            '🚀Marketplace Status': '3️⃣Published🚀',
            'ℹ️Description (Short)': 'Arts craft store launch kit',
            'ℹ️Description (Long).html': '<p>Build an arts craft store website quickly.</p>',
            '🪣Category Group(s) Display Name': ['Technology'],
            '🪣Category Group(s) CMS Slug': ['technology-websites'],
            '🔍Algolia Child Category (🏗️ only)': ['child-ai'],
            '🥞Template Type (🏗️ only)': 'Multi Page',
            '📋 Unique Viewers': 5000,
            '📋 Cumulative Purchases': 50,
            '📋 Cumulative Revenue': 2450,
            '🥞CMS Slug (formula)': 'studio-grid-template',
            '📅LMT': '2026-03-16T05:13:00.000Z',
          },
        },
      ],
      styles: LOOKUPS.styles,
      childCategories: [
        ...LOOKUPS.childCategories,
        {
          id: 'child-crafts',
          fields: {
            Category: 'Arts & Crafts Store',
            'Display name': 'Arts & Crafts Store',
            'Parent Category Name': 'Retail & E-Commerce',
            '🪣Category Groups': 'retail-and-e-commerce-websites',
            'Related Keywords': 'craft, handmade',
          },
        },
      ],
      tags: LOOKUPS.tags,
    });
    const { env, close } = createTestEnv({
      SEARCH_RANKING_CONFIG_JSON: JSON.stringify({
        signalWeights: {
          text: 0,
          popularity: 0,
          views: 0,
          purchases: 0,
          conversionRate: 0,
          revenue: 0,
          freshness: 0,
          creatorTrackRecord: 0,
          creatorDiversity: 0,
          exactTitle: 0,
          categoryMatch: 5,
          querySaturation: 0,
        },
      }),
    });

    try {
      const rebuild = await callWorker(
        new Request('https://templates.test/api/templates/admin/rebuild', {
          method: 'POST',
          headers: { Authorization: 'Bearer sync-token' },
        }),
        env,
      );
      expect(rebuild.status).toBe(200);

      const response = await callWorker(new Request('https://templates.test/api/templates/search?q=arts%20craft%20store'), env);
      const payload = (await response.json()) as { items: Array<{ name: string }> };

      expect(payload.items.map((item) => item.name)).toEqual(['Pottery Market', 'Studio Grid']);
    } finally {
      fetchMock.mockRestore();
      close();
    }
  });

  it('rewards distinct structured token coverage on longer discovery queries', async () => {
    const fetchMock = installAirtableFetchMock({
      publishedAssets: [
        {
          id: 'recPotteryCoverage',
          fields: {
            Name: 'Pottery Market',
            '⚙️🆎Type (Text)': 'Template🏗️',
            '🚀Marketplace Status': '3️⃣Published🚀',
            'ℹ️Description (Short)': 'Pottery storefront for independent makers',
            'ℹ️Description (Long).html': '<p>Launch a pottery and ceramics shop.</p>',
            '🪣Category Group(s) Display Name': ['Retail & E-Commerce'],
            '🪣Category Group(s) CMS Slug': ['retail-and-e-commerce-websites'],
            '🔍Algolia Child Category (🏗️ only)': ['child-crafts'],
            '🥞Template Type (🏗️ only)': 'Multi Page',
            '📋 Unique Viewers': 150,
            '📋 Cumulative Purchases': 3,
            '📋 Cumulative Revenue': 147,
            '🥞CMS Slug (formula)': 'pottery-market-coverage-template',
            '📅LMT': '2026-03-16T05:18:00.000Z',
          },
        },
        {
          id: 'recHandcraftsCoverage',
          fields: {
            Name: 'Handcrafts',
            '⚙️🆎Type (Text)': 'Template🏗️',
            '🚀Marketplace Status': '3️⃣Published🚀',
            'ℹ️Description (Short)': 'Popular craft storefront template',
            'ℹ️Description (Long).html': '<p>Popular craft storefront template.</p>',
            '🪣Category Group(s) Display Name': ['Retail & E-Commerce'],
            '🪣Category Group(s) CMS Slug': ['retail-and-e-commerce-websites'],
            '🔍Algolia Child Category (🏗️ only)': ['child-crafts'],
            '🥞Template Type (🏗️ only)': 'Multi Page',
            '📋 Unique Viewers': 2400,
            '📋 Cumulative Purchases': 40,
            '📋 Cumulative Revenue': 1960,
            '🥞CMS Slug (formula)': 'handcrafts-coverage-template',
            '📅LMT': '2026-03-16T05:19:00.000Z',
          },
        },
      ],
      styles: LOOKUPS.styles,
      childCategories: [
        ...LOOKUPS.childCategories,
        {
          id: 'child-crafts',
          fields: {
            Category: 'Arts & Crafts Store',
            'Display name': 'Arts & Crafts Store',
            'Parent Category Name': 'Retail & E-Commerce',
            '🪣Category Groups': 'retail-and-e-commerce-websites',
            'Related Keywords': 'craft, handmade',
          },
        },
      ],
      tags: LOOKUPS.tags,
    });
    const { env, close } = createTestEnv({
      SEARCH_RANKING_CONFIG_JSON: JSON.stringify({
        signalWeights: {
          text: 0,
          popularity: 0,
          views: 0,
          purchases: 1,
          conversionRate: 0,
          revenue: 0,
          freshness: 0,
          creatorTrackRecord: 0,
          creatorDiversity: 0,
          exactTitle: 0,
          categoryMatch: 0,
          intentCoverage: 5,
          querySaturation: 0,
        },
      }),
    });

    try {
      const rebuild = await callWorker(
        new Request('https://templates.test/api/templates/admin/rebuild', {
          method: 'POST',
          headers: { Authorization: 'Bearer sync-token' },
        }),
        env,
      );
      expect(rebuild.status).toBe(200);

      const response = await callWorker(
        new Request('https://templates.test/api/templates/search?q=arts%20craft%20store%20pottery'),
        env,
      );
      const payload = (await response.json()) as { items: Array<{ name: string }> };

      expect(payload.items.map((item) => item.name)).toEqual(['Pottery Market', 'Handcrafts']);
    } finally {
      fetchMock.mockRestore();
      close();
    }
  });

  it('expands plural queries to singular curated taxonomy keywords', async () => {
    const fetchMock = installAirtableFetchMock({
      publishedAssets: [
        {
          id: 'recPotteryCategory',
          fields: {
            Name: 'Pottery Market',
            '⚙️🆎Type (Text)': 'Template🏗️',
            '🚀Marketplace Status': '3️⃣Published🚀',
            'ℹ️Description (Short)': 'Pottery & ceramics ecommerce template',
            'ℹ️Description (Long).html': '<p>Ideal for ceramic studios and pottery shops.</p>',
            '🪣Category Group(s) Display Name': ['Retail & E-Commerce'],
            '🪣Category Group(s) CMS Slug': ['retail-and-e-commerce-websites'],
            '🔍Algolia Child Category (🏗️ only)': ['child-crafts'],
            '🥞Template Type (🏗️ only)': 'Multi Page',
            '📋 Unique Viewers': 500,
            '📋 Cumulative Purchases': 9,
            '📋 Cumulative Revenue': 441,
            '🥞CMS Slug (formula)': 'pottery-market-template',
            '📅LMT': '2026-03-16T05:12:00.000Z',
          },
        },
        {
          id: 'recStudioIrrelevant',
          fields: {
            Name: 'Studio Grid',
            '⚙️🆎Type (Text)': 'Template🏗️',
            '🚀Marketplace Status': '3️⃣Published🚀',
            'ℹ️Description (Short)': 'Modern portfolio website',
            'ℹ️Description (Long).html': '<p>Ideal for design studios.</p>',
            '🪣Category Group(s) Display Name': ['Portfolio & Agency'],
            '🪣Category Group(s) CMS Slug': ['portfolio-and-agency-websites'],
            '🔍Algolia Child Category (🏗️ only)': ['child-ai'],
            '🥞Template Type (🏗️ only)': 'Multi Page',
            '📋 Unique Viewers': 1200,
            '📋 Cumulative Purchases': 5,
            '📋 Cumulative Revenue': 245,
            '🥞CMS Slug (formula)': 'studio-grid-template',
            '📅LMT': '2026-03-16T05:13:00.000Z',
          },
        },
      ],
      styles: LOOKUPS.styles,
      childCategories: [
        ...LOOKUPS.childCategories,
        {
          id: 'child-crafts',
          fields: {
            Category: 'Arts & Crafts Store',
            'Display name': 'Arts & Crafts Store',
            'Parent Category Name': 'Retail & E-Commerce',
            '🪣Category Groups': 'retail-and-e-commerce-websites',
            'Related Keywords': 'craft, handmade',
          },
        },
      ],
      tags: LOOKUPS.tags,
    });
    const { env, close } = createTestEnv();

    try {
      const rebuild = await callWorker(
        new Request('https://templates.test/api/templates/admin/rebuild', {
          method: 'POST',
          headers: { Authorization: 'Bearer sync-token' },
        }),
        env,
      );
      expect(rebuild.status).toBe(200);

      const response = await callWorker(new Request('https://templates.test/api/templates/search?q=crafts'), env);
      const payload = (await response.json()) as { items: Array<{ name: string }> };

      expect(payload.items.map((item) => item.name)).toEqual(['Pottery Market']);
    } finally {
      fetchMock.mockRestore();
      close();
    }
  });

  it('treats curated taxonomy keywords as category evidence in ranking', async () => {
    const fetchMock = installAirtableFetchMock({
      publishedAssets: [
        {
          id: 'recLexicalHandmade',
          fields: {
            Name: 'Artisan Hero',
            '⚙️🆎Type (Text)': 'Template🏗️',
            '🚀Marketplace Status': '3️⃣Published🚀',
            'ℹ️Description (Short)': 'Handmade storefront landing page',
            'ℹ️Description (Long).html': '<p>Launch a handmade business quickly.</p>',
            '🪣Category Group(s) Display Name': ['Portfolio & Agency'],
            '🪣Category Group(s) CMS Slug': ['portfolio-and-agency-websites'],
            '🔍Algolia Child Category (🏗️ only)': ['child-ai'],
            '🥞Template Type (🏗️ only)': 'Multi Page',
            '📋 Unique Viewers': 300,
            '📋 Cumulative Purchases': 0,
            '📋 Cumulative Revenue': 0,
            '🥞CMS Slug (formula)': 'artisan-hero-template',
            '📅LMT': '2026-03-16T05:12:00.000Z',
          },
        },
        {
          id: 'recCategoryHandmade',
          fields: {
            Name: 'Pottery Market',
            '⚙️🆎Type (Text)': 'Template🏗️',
            '🚀Marketplace Status': '3️⃣Published🚀',
            'ℹ️Description (Short)': 'Pottery & ceramics ecommerce template',
            'ℹ️Description (Long).html': '<p>Ideal for ceramic studios and pottery shops.</p>',
            '🪣Category Group(s) Display Name': ['Retail & E-Commerce'],
            '🪣Category Group(s) CMS Slug': ['retail-and-e-commerce-websites'],
            '🔍Algolia Child Category (🏗️ only)': ['child-crafts'],
            '🥞Template Type (🏗️ only)': 'Multi Page',
            '📋 Unique Viewers': 300,
            '📋 Cumulative Purchases': 0,
            '📋 Cumulative Revenue': 0,
            '🥞CMS Slug (formula)': 'pottery-market-template',
            '📅LMT': '2026-03-16T05:13:00.000Z',
          },
        },
      ],
      styles: LOOKUPS.styles,
      childCategories: [
        ...LOOKUPS.childCategories,
        {
          id: 'child-crafts',
          fields: {
            Category: 'Arts & Crafts Store',
            'Display name': 'Arts & Crafts Store',
            'Parent Category Name': 'Retail & E-Commerce',
            '🪣Category Groups': 'retail-and-e-commerce-websites',
            'Related Keywords': 'craft, handmade',
          },
        },
      ],
      tags: LOOKUPS.tags,
    });
    const { env, close } = createTestEnv({
      SEARCH_RANKING_CONFIG_JSON: JSON.stringify({
        signalWeights: {
          text: 0,
          popularity: 0,
          views: 0,
          purchases: 0,
          conversionRate: 0,
          revenue: 0,
          freshness: 0,
          creatorTrackRecord: 0,
          creatorDiversity: 0,
          exactTitle: 0,
          categoryMatch: 5,
          querySaturation: 0,
        },
      }),
    });

    try {
      const rebuild = await callWorker(
        new Request('https://templates.test/api/templates/admin/rebuild', {
          method: 'POST',
          headers: { Authorization: 'Bearer sync-token' },
        }),
        env,
      );
      expect(rebuild.status).toBe(200);

      const response = await callWorker(new Request('https://templates.test/api/templates/search?q=handmade'), env);
      const payload = (await response.json()) as { items: Array<{ name: string }> };

      expect(payload.items.map((item) => item.name)).toEqual(['Pottery Market', 'Artisan Hero']);
    } finally {
      fetchMock.mockRestore();
      close();
    }
  });

  it('uses business signals to order tied short-query title matches', async () => {
    const fetchMock = installAirtableFetchMock({
      publishedAssets: [
        {
          id: 'recAFirstLowBusiness',
          fields: {
            Name: 'Craft Start',
            '⚙️🆎Type (Text)': 'Template🏗️',
            '🚀Marketplace Status': '3️⃣Published🚀',
            'ℹ️Description (Short)': 'A starting point for craft websites',
            'ℹ️Description (Long).html': '<p>Build a craft business site.</p>',
            '🪣Category Group(s) Display Name': ['Portfolio & Agency'],
            '🪣Category Group(s) CMS Slug': ['portfolio-and-agency-websites'],
            '🔍Algolia Child Category (🏗️ only)': ['child-ai'],
            '🥞Template Type (🏗️ only)': 'Multi Page',
            '📋 Unique Viewers': 5000,
            '📋 Cumulative Purchases': 1,
            '📋 Cumulative Revenue': 49,
            '🥞CMS Slug (formula)': 'craft-start-template',
            '📅LMT': '2026-03-16T05:10:00.000Z',
          },
        },
        {
          id: 'recZLastHighBusiness',
          fields: {
            Name: 'Craft Scale',
            '⚙️🆎Type (Text)': 'Template🏗️',
            '🚀Marketplace Status': '3️⃣Published🚀',
            'ℹ️Description (Short)': 'A stronger seller for craft sites',
            'ℹ️Description (Long).html': '<p>Build a craft business site.</p>',
            '🪣Category Group(s) Display Name': ['Portfolio & Agency'],
            '🪣Category Group(s) CMS Slug': ['portfolio-and-agency-websites'],
            '🔍Algolia Child Category (🏗️ only)': ['child-ai'],
            '🥞Template Type (🏗️ only)': 'Multi Page',
            '📋 Unique Viewers': 400,
            '📋 Cumulative Purchases': 10,
            '📋 Cumulative Revenue': 490,
            '🥞CMS Slug (formula)': 'craft-scale-template',
            '📅LMT': '2026-03-16T05:11:00.000Z',
          },
        },
      ],
      styles: LOOKUPS.styles,
      childCategories: LOOKUPS.childCategories,
      tags: LOOKUPS.tags,
    });
    const { env, close } = createTestEnv({
      SEARCH_RANKING_CONFIG_JSON: JSON.stringify({
        signalWeights: {
          text: 0,
          popularity: 0,
          views: 0,
          purchases: 2,
          conversionRate: 0,
          revenue: 1,
          exactTitle: 8,
          categoryMatch: 0,
        },
      }),
    });

    try {
      const rebuild = await callWorker(
        new Request('https://templates.test/api/templates/admin/rebuild', {
          method: 'POST',
          headers: { Authorization: 'Bearer sync-token' },
        }),
        env,
      );
      expect(rebuild.status).toBe(200);

      const response = await callWorker(new Request('https://templates.test/api/templates/search?q=craft'), env);
      const payload = (await response.json()) as { items: Array<{ name: string }> };

      expect(payload.items.map((item) => item.name)).toEqual(['Craft Scale', 'Craft Start']);
    } finally {
      fetchMock.mockRestore();
      close();
    }
  });

  it('damps lexical reranking for short title queries so business can lead', async () => {
    const fetchMock = installAirtableFetchMock({
      publishedAssets: [
        {
          id: 'recLexicalFavorite',
          fields: {
            Name: 'Craft',
            '⚙️🆎Type (Text)': 'Template🏗️',
            '🚀Marketplace Status': '3️⃣Published🚀',
            'ℹ️Description (Short)': 'craft craft craft craft',
            'ℹ️Description (Long).html': '<p>craft craft craft craft</p>',
            '🪣Category Group(s) Display Name': ['Portfolio & Agency'],
            '🪣Category Group(s) CMS Slug': ['portfolio-and-agency-websites'],
            '🔍Algolia Child Category (🏗️ only)': ['child-ai'],
            '🥞Template Type (🏗️ only)': 'Multi Page',
            '📋 Unique Viewers': 5000,
            '📋 Cumulative Purchases': 1,
            '📋 Cumulative Revenue': 49,
            '🥞CMS Slug (formula)': 'craft-template',
            '📅LMT': '2026-03-16T05:12:00.000Z',
          },
        },
        {
          id: 'recBusinessFavorite',
          fields: {
            Name: 'Craft Seller',
            '⚙️🆎Type (Text)': 'Template🏗️',
            '🚀Marketplace Status': '3️⃣Published🚀',
            'ℹ️Description (Short)': 'Strong craft storefront',
            'ℹ️Description (Long).html': '<p>Build a strong craft storefront.</p>',
            '🪣Category Group(s) Display Name': ['Portfolio & Agency'],
            '🪣Category Group(s) CMS Slug': ['portfolio-and-agency-websites'],
            '🔍Algolia Child Category (🏗️ only)': ['child-ai'],
            '🥞Template Type (🏗️ only)': 'Multi Page',
            '📋 Unique Viewers': 400,
            '📋 Cumulative Purchases': 12,
            '📋 Cumulative Revenue': 588,
            '🥞CMS Slug (formula)': 'craft-seller-template',
            '📅LMT': '2026-03-16T05:13:00.000Z',
          },
        },
      ],
      styles: LOOKUPS.styles,
      childCategories: LOOKUPS.childCategories,
      tags: LOOKUPS.tags,
    });
    const { env, close } = createTestEnv({
      SEARCH_RANKING_CONFIG_JSON: JSON.stringify({
        signalWeights: {
          text: 100,
          popularity: 0,
          views: 0,
          purchases: 2,
          conversionRate: 0,
          revenue: 1,
          exactTitle: 0,
          categoryMatch: 0,
        },
        controls: {
          shortQueryTextWeightMultiplier: 0,
        },
      }),
    });

    try {
      const rebuild = await callWorker(
        new Request('https://templates.test/api/templates/admin/rebuild', {
          method: 'POST',
          headers: { Authorization: 'Bearer sync-token' },
        }),
        env,
      );
      expect(rebuild.status).toBe(200);

      const response = await callWorker(new Request('https://templates.test/api/templates/search?q=craft'), env);
      const payload = (await response.json()) as { items: Array<{ name: string }> };

      expect(payload.items.map((item) => item.name)).toEqual(['Craft Seller', 'Craft']);
    } finally {
      fetchMock.mockRestore();
      close();
    }
  });

  it('demotes description-stuffed matches with the query saturation signal', async () => {
    const fetchMock = installAirtableFetchMock({
      publishedAssets: [
        {
          id: 'recCraftClean',
          fields: {
            Name: 'Craft Clean',
            '⚙️🆎Type (Text)': 'Template🏗️',
            '🚀Marketplace Status': '3️⃣Published🚀',
            'ℹ️Description (Short)': 'Artisan storefront template',
            'ℹ️Description (Long).html': '<p>Sell handmade products online.</p>',
            '🪣Category Group(s) Display Name': ['Retail & E-Commerce'],
            '🪣Category Group(s) CMS Slug': ['retail-and-e-commerce-websites'],
            '🔍Algolia Child Category (🏗️ only)': ['child-crafts'],
            '🥞Template Type (🏗️ only)': 'Multi Page',
            '📋 Unique Viewers': 200,
            '📋 Cumulative Purchases': 0,
            '📋 Cumulative Revenue': 0,
            '🥞CMS Slug (formula)': 'craft-clean-template',
            '📅LMT': '2026-03-16T05:14:00.000Z',
          },
        },
        {
          id: 'recCraftStuffed',
          fields: {
            Name: 'Craft Stuffed',
            '⚙️🆎Type (Text)': 'Template🏗️',
            '🚀Marketplace Status': '3️⃣Published🚀',
            'ℹ️Description (Short)': 'craft craft craft craft craft craft',
            'ℹ️Description (Long).html': '<p>craft craft craft craft craft craft</p>',
            '🪣Category Group(s) Display Name': ['Retail & E-Commerce'],
            '🪣Category Group(s) CMS Slug': ['retail-and-e-commerce-websites'],
            '🔍Algolia Child Category (🏗️ only)': ['child-crafts'],
            '🥞Template Type (🏗️ only)': 'Multi Page',
            '📋 Unique Viewers': 200,
            '📋 Cumulative Purchases': 0,
            '📋 Cumulative Revenue': 0,
            '🥞CMS Slug (formula)': 'craft-stuffed-template',
            '📅LMT': '2026-03-16T05:15:00.000Z',
          },
        },
      ],
      styles: LOOKUPS.styles,
      childCategories: [
        ...LOOKUPS.childCategories,
        {
          id: 'child-crafts',
          fields: {
            Category: 'Arts & Crafts Store',
            'Display name': 'Arts & Crafts Store',
            'Parent Category Name': 'Retail & E-Commerce',
            '🪣Category Groups': 'retail-and-e-commerce-websites',
            'Related Keywords': 'craft, handmade',
          },
        },
      ],
      tags: LOOKUPS.tags,
    });
    const { env, close } = createTestEnv({
      SEARCH_RANKING_CONFIG_JSON: JSON.stringify({
        signalWeights: {
          text: 0,
          popularity: 0,
          views: 0,
          purchases: 0,
          conversionRate: 0,
          revenue: 0,
          exactTitle: 0,
          categoryMatch: 0,
          querySaturation: 5,
        },
        controls: {
          querySaturationThreshold: 2,
        },
      }),
    });

    try {
      const rebuild = await callWorker(
        new Request('https://templates.test/api/templates/admin/rebuild', {
          method: 'POST',
          headers: { Authorization: 'Bearer sync-token' },
        }),
        env,
      );
      expect(rebuild.status).toBe(200);

      const response = await callWorker(new Request('https://templates.test/api/templates/search?q=craft'), env);
      const payload = (await response.json()) as { items: Array<{ name: string }> };

      expect(payload.items.map((item) => item.name)).toEqual(['Craft Clean', 'Craft Stuffed']);
    } finally {
      fetchMock.mockRestore();
      close();
    }
  });

  it('gives recent templates a bounded lift in popular ranking', async () => {
    const fetchMock = installAirtableFetchMock({
      publishedAssets: [
        {
          id: 'recFreshStudio',
          fields: {
            Name: 'Studio Fresh',
            '⚙️🆎Type (Text)': 'Template🏗️',
            '🚀Marketplace Status': '3️⃣Published🚀',
            'ℹ️Description (Short)': 'Modern studio website',
            'ℹ️Description (Long).html': '<p>Modern studio website.</p>',
            '🪣Category Group(s) Display Name': ['Portfolio & Agency'],
            '🪣Category Group(s) CMS Slug': ['portfolio-and-agency-websites'],
            '🔍Algolia Child Category (🏗️ only)': ['child-ai'],
            '🥞Template Type (🏗️ only)': 'Multi Page',
            '📋 Unique Viewers': 300,
            '📋 Cumulative Purchases': 2,
            '📋 Cumulative Revenue': 98,
            '🚀📅Published Date': '2026-03-10',
            '🥞CMS Slug (formula)': 'studio-fresh-template',
            '📅LMT': '2026-03-16T05:16:00.000Z',
          },
        },
        {
          id: 'recOldStudio',
          fields: {
            Name: 'Studio Archive',
            '⚙️🆎Type (Text)': 'Template🏗️',
            '🚀Marketplace Status': '3️⃣Published🚀',
            'ℹ️Description (Short)': 'Modern studio website',
            'ℹ️Description (Long).html': '<p>Modern studio website.</p>',
            '🪣Category Group(s) Display Name': ['Portfolio & Agency'],
            '🪣Category Group(s) CMS Slug': ['portfolio-and-agency-websites'],
            '🔍Algolia Child Category (🏗️ only)': ['child-ai'],
            '🥞Template Type (🏗️ only)': 'Multi Page',
            '📋 Unique Viewers': 300,
            '📋 Cumulative Purchases': 2,
            '📋 Cumulative Revenue': 98,
            '🚀📅Published Date': '2024-01-10',
            '🥞CMS Slug (formula)': 'studio-archive-template',
            '📅LMT': '2026-03-16T05:17:00.000Z',
          },
        },
      ],
      styles: LOOKUPS.styles,
      childCategories: LOOKUPS.childCategories,
      tags: LOOKUPS.tags,
    });
    const { env, close } = createTestEnv({
      SEARCH_RANKING_CONFIG_JSON: JSON.stringify({
        signalWeights: {
          text: 0,
          popularity: 0,
          views: 0,
          purchases: 0,
          conversionRate: 0,
          revenue: 0,
          freshness: 5,
          exactTitle: 0,
          categoryMatch: 0,
          querySaturation: 0,
        },
      }),
    });

    try {
      const rebuild = await callWorker(
        new Request('https://templates.test/api/templates/admin/rebuild', {
          method: 'POST',
          headers: { Authorization: 'Bearer sync-token' },
        }),
        env,
      );
      expect(rebuild.status).toBe(200);

      const response = await callWorker(new Request('https://templates.test/api/templates/search?q=studio'), env);
      const payload = (await response.json()) as { items: Array<{ name: string }> };

      expect(payload.items.map((item) => item.name)).toEqual(['Studio Fresh', 'Studio Archive']);
    } finally {
      fetchMock.mockRestore();
      close();
    }
  });

  it('keeps stronger incumbents ahead when freshness is only a small lift', async () => {
    const fetchMock = installAirtableFetchMock({
      publishedAssets: [
        {
          id: 'recFreshWeakCraft',
          fields: {
            Name: 'Craft Newcomer',
            '⚙️🆎Type (Text)': 'Template🏗️',
            '🚀Marketplace Status': '3️⃣Published🚀',
            'ℹ️Description (Short)': 'New craft website template',
            'ℹ️Description (Long).html': '<p>New craft website template.</p>',
            '🪣Category Group(s) Display Name': ['Retail & E-Commerce'],
            '🪣Category Group(s) CMS Slug': ['retail-and-e-commerce-websites'],
            '🔍Algolia Child Category (🏗️ only)': ['child-crafts'],
            '🥞Template Type (🏗️ only)': 'Multi Page',
            '📋 Unique Viewers': 200,
            '📋 Cumulative Purchases': 1,
            '📋 Cumulative Revenue': 49,
            '🚀📅Published Date': '2026-03-10',
            '🥞CMS Slug (formula)': 'craft-newcomer-template',
            '📅LMT': '2026-03-16T05:18:00.000Z',
          },
        },
        {
          id: 'recOldStrongCraft',
          fields: {
            Name: 'Craft Veteran',
            '⚙️🆎Type (Text)': 'Template🏗️',
            '🚀Marketplace Status': '3️⃣Published🚀',
            'ℹ️Description (Short)': 'Established craft website template',
            'ℹ️Description (Long).html': '<p>Established craft website template.</p>',
            '🪣Category Group(s) Display Name': ['Retail & E-Commerce'],
            '🪣Category Group(s) CMS Slug': ['retail-and-e-commerce-websites'],
            '🔍Algolia Child Category (🏗️ only)': ['child-crafts'],
            '🥞Template Type (🏗️ only)': 'Multi Page',
            '📋 Unique Viewers': 2000,
            '📋 Cumulative Purchases': 40,
            '📋 Cumulative Revenue': 1960,
            '🚀📅Published Date': '2024-01-10',
            '🥞CMS Slug (formula)': 'craft-veteran-template',
            '📅LMT': '2026-03-16T05:19:00.000Z',
          },
        },
      ],
      styles: LOOKUPS.styles,
      childCategories: [
        ...LOOKUPS.childCategories,
        {
          id: 'child-crafts',
          fields: {
            Category: 'Arts & Crafts Store',
            'Display name': 'Arts & Crafts Store',
            'Parent Category Name': 'Retail & E-Commerce',
            '🪣Category Groups': 'retail-and-e-commerce-websites',
            'Related Keywords': 'craft, handmade',
          },
        },
      ],
      tags: LOOKUPS.tags,
    });
    const { env, close } = createTestEnv({
      SEARCH_RANKING_CONFIG_JSON: JSON.stringify({
        signalWeights: {
          text: 0,
          popularity: 0,
          views: 0,
          purchases: 3,
          conversionRate: 0,
          revenue: 2,
          freshness: 0.35,
          exactTitle: 0,
          categoryMatch: 0,
          querySaturation: 0,
        },
      }),
    });

    try {
      const rebuild = await callWorker(
        new Request('https://templates.test/api/templates/admin/rebuild', {
          method: 'POST',
          headers: { Authorization: 'Bearer sync-token' },
        }),
        env,
      );
      expect(rebuild.status).toBe(200);

      const response = await callWorker(new Request('https://templates.test/api/templates/search?q=craft'), env);
      const payload = (await response.json()) as { items: Array<{ name: string }> };

      expect(payload.items.map((item) => item.name)).toEqual(['Craft Veteran', 'Craft Newcomer']);
    } finally {
      fetchMock.mockRestore();
      close();
    }
  });

  it('surfaces another creator before a near-duplicate second result', async () => {
    const fetchMock = installAirtableFetchMock({
      publishedAssets: [
        {
          id: 'recAlphaPrime',
          fields: {
            Name: 'Craft Alpha Prime',
            '⚙️🆎Type (Text)': 'Template🏗️',
            '🚀Marketplace Status': '3️⃣Published🚀',
            'ℹ️Description (Short)': 'Craft storefront template',
            'ℹ️Description (Long).html': '<p>Craft storefront template.</p>',
            '🪣Category Group(s) Display Name': ['Retail & E-Commerce'],
            '🪣Category Group(s) CMS Slug': ['retail-and-e-commerce-websites'],
            '🔍Algolia Child Category (🏗️ only)': ['child-crafts'],
            '🥞Template Type (🏗️ only)': 'Multi Page',
            '🎨Creator Name': 'Creator Alpha',
            '📋 Unique Viewers': 2200,
            '📋 Cumulative Purchases': 60,
            '📋 Cumulative Revenue': 2940,
            '🥞CMS Slug (formula)': 'craft-alpha-prime-template',
            '📅LMT': '2026-03-16T05:20:00.000Z',
          },
        },
        {
          id: 'recAlphaAlt',
          fields: {
            Name: 'Craft Alpha Alt',
            '⚙️🆎Type (Text)': 'Template🏗️',
            '🚀Marketplace Status': '3️⃣Published🚀',
            'ℹ️Description (Short)': 'Craft storefront template',
            'ℹ️Description (Long).html': '<p>Craft storefront template.</p>',
            '🪣Category Group(s) Display Name': ['Retail & E-Commerce'],
            '🪣Category Group(s) CMS Slug': ['retail-and-e-commerce-websites'],
            '🔍Algolia Child Category (🏗️ only)': ['child-crafts'],
            '🥞Template Type (🏗️ only)': 'Multi Page',
            '🎨Creator Name': 'Creator Alpha',
            '📋 Unique Viewers': 2100,
            '📋 Cumulative Purchases': 35,
            '📋 Cumulative Revenue': 1715,
            '🥞CMS Slug (formula)': 'craft-alpha-alt-template',
            '📅LMT': '2026-03-16T05:21:00.000Z',
          },
        },
        {
          id: 'recBeta',
          fields: {
            Name: 'Craft Beta',
            '⚙️🆎Type (Text)': 'Template🏗️',
            '🚀Marketplace Status': '3️⃣Published🚀',
            'ℹ️Description (Short)': 'Craft storefront template',
            'ℹ️Description (Long).html': '<p>Craft storefront template.</p>',
            '🪣Category Group(s) Display Name': ['Retail & E-Commerce'],
            '🪣Category Group(s) CMS Slug': ['retail-and-e-commerce-websites'],
            '🔍Algolia Child Category (🏗️ only)': ['child-crafts'],
            '🥞Template Type (🏗️ only)': 'Multi Page',
            '🎨Creator Name': 'Creator Beta',
            '📋 Unique Viewers': 1800,
            '📋 Cumulative Purchases': 36,
            '📋 Cumulative Revenue': 1617,
            '🥞CMS Slug (formula)': 'craft-beta-template',
            '📅LMT': '2026-03-16T05:22:00.000Z',
          },
        },
      ],
      styles: LOOKUPS.styles,
      childCategories: [
        ...LOOKUPS.childCategories,
        {
          id: 'child-crafts',
          fields: {
            Category: 'Arts & Crafts Store',
            'Display name': 'Arts & Crafts Store',
            'Parent Category Name': 'Retail & E-Commerce',
            '🪣Category Groups': 'retail-and-e-commerce-websites',
            'Related Keywords': 'craft, handmade',
          },
        },
      ],
      tags: LOOKUPS.tags,
    });
    const { env, close } = createTestEnv({
      SEARCH_RANKING_CONFIG_JSON: JSON.stringify({
        signalWeights: {
          text: 0,
          popularity: 0,
          views: 0,
          purchases: 2,
          conversionRate: 0,
          revenue: 1,
          freshness: 0,
          creatorDiversity: 2,
          exactTitle: 0,
          categoryMatch: 0,
          querySaturation: 0,
        },
      }),
    });

    try {
      const rebuild = await callWorker(
        new Request('https://templates.test/api/templates/admin/rebuild', {
          method: 'POST',
          headers: { Authorization: 'Bearer sync-token' },
        }),
        env,
      );
      expect(rebuild.status).toBe(200);

      const response = await callWorker(new Request('https://templates.test/api/templates/search?q=craft'), env);
      const payload = (await response.json()) as { items: Array<{ name: string }> };

      expect(payload.items.map((item) => item.name)).toEqual([
        'Craft Alpha Prime',
        'Craft Beta',
        'Craft Alpha Alt',
      ]);
    } finally {
      fetchMock.mockRestore();
      close();
    }
  });

  it('does not hard-cap creators when a second template is clearly stronger', async () => {
    const fetchMock = installAirtableFetchMock({
      publishedAssets: [
        {
          id: 'recAlphaPrimeStrong',
          fields: {
            Name: 'Craft Alpha Prime',
            '⚙️🆎Type (Text)': 'Template🏗️',
            '🚀Marketplace Status': '3️⃣Published🚀',
            'ℹ️Description (Short)': 'Craft storefront template',
            'ℹ️Description (Long).html': '<p>Craft storefront template.</p>',
            '🪣Category Group(s) Display Name': ['Retail & E-Commerce'],
            '🪣Category Group(s) CMS Slug': ['retail-and-e-commerce-websites'],
            '🔍Algolia Child Category (🏗️ only)': ['child-crafts'],
            '🥞Template Type (🏗️ only)': 'Multi Page',
            '🎨Creator Name': 'Creator Alpha',
            '📋 Unique Viewers': 2600,
            '📋 Cumulative Purchases': 55,
            '📋 Cumulative Revenue': 2695,
            '🥞CMS Slug (formula)': 'craft-alpha-prime-strong-template',
            '📅LMT': '2026-03-16T05:23:00.000Z',
          },
        },
        {
          id: 'recAlphaSecondStrong',
          fields: {
            Name: 'Craft Alpha Studio',
            '⚙️🆎Type (Text)': 'Template🏗️',
            '🚀Marketplace Status': '3️⃣Published🚀',
            'ℹ️Description (Short)': 'Craft storefront template',
            'ℹ️Description (Long).html': '<p>Craft storefront template.</p>',
            '🪣Category Group(s) Display Name': ['Retail & E-Commerce'],
            '🪣Category Group(s) CMS Slug': ['retail-and-e-commerce-websites'],
            '🔍Algolia Child Category (🏗️ only)': ['child-crafts'],
            '🥞Template Type (🏗️ only)': 'Multi Page',
            '🎨Creator Name': 'Creator Alpha',
            '📋 Unique Viewers': 2400,
            '📋 Cumulative Purchases': 45,
            '📋 Cumulative Revenue': 2205,
            '🥞CMS Slug (formula)': 'craft-alpha-studio-template',
            '📅LMT': '2026-03-16T05:24:00.000Z',
          },
        },
        {
          id: 'recBetaWeak',
          fields: {
            Name: 'Craft Beta',
            '⚙️🆎Type (Text)': 'Template🏗️',
            '🚀Marketplace Status': '3️⃣Published🚀',
            'ℹ️Description (Short)': 'Craft storefront template',
            'ℹ️Description (Long).html': '<p>Craft storefront template.</p>',
            '🪣Category Group(s) Display Name': ['Retail & E-Commerce'],
            '🪣Category Group(s) CMS Slug': ['retail-and-e-commerce-websites'],
            '🔍Algolia Child Category (🏗️ only)': ['child-crafts'],
            '🥞Template Type (🏗️ only)': 'Multi Page',
            '🎨Creator Name': 'Creator Beta',
            '📋 Unique Viewers': 400,
            '📋 Cumulative Purchases': 4,
            '📋 Cumulative Revenue': 196,
            '🥞CMS Slug (formula)': 'craft-beta-weak-template',
            '📅LMT': '2026-03-16T05:25:00.000Z',
          },
        },
      ],
      styles: LOOKUPS.styles,
      childCategories: [
        ...LOOKUPS.childCategories,
        {
          id: 'child-crafts',
          fields: {
            Category: 'Arts & Crafts Store',
            'Display name': 'Arts & Crafts Store',
            'Parent Category Name': 'Retail & E-Commerce',
            '🪣Category Groups': 'retail-and-e-commerce-websites',
            'Related Keywords': 'craft, handmade',
          },
        },
      ],
      tags: LOOKUPS.tags,
    });
    const { env, close } = createTestEnv({
      SEARCH_RANKING_CONFIG_JSON: JSON.stringify({
        signalWeights: {
          text: 0,
          popularity: 0,
          views: 0,
          purchases: 2,
          conversionRate: 0,
          revenue: 1,
          freshness: 0,
          creatorDiversity: 2,
          exactTitle: 0,
          categoryMatch: 0,
          querySaturation: 0,
        },
      }),
    });

    try {
      const rebuild = await callWorker(
        new Request('https://templates.test/api/templates/admin/rebuild', {
          method: 'POST',
          headers: { Authorization: 'Bearer sync-token' },
        }),
        env,
      );
      expect(rebuild.status).toBe(200);

      const response = await callWorker(new Request('https://templates.test/api/templates/search?q=craft'), env);
      const payload = (await response.json()) as { items: Array<{ name: string }> };

      expect(payload.items.map((item) => item.name)).toEqual([
        'Craft Alpha Prime',
        'Craft Alpha Studio',
        'Craft Beta',
      ]);
    } finally {
      fetchMock.mockRestore();
      close();
    }
  });

  it('keeps diversified pagination stable across the first two pages', async () => {
    const fetchMock = installAirtableFetchMock({
      publishedAssets: [
        {
          id: 'recAlphaPrimePage',
          fields: {
            Name: 'Craft Alpha Prime',
            '⚙️🆎Type (Text)': 'Template🏗️',
            '🚀Marketplace Status': '3️⃣Published🚀',
            'ℹ️Description (Short)': 'Craft storefront template',
            'ℹ️Description (Long).html': '<p>Craft storefront template.</p>',
            '🪣Category Group(s) Display Name': ['Retail & E-Commerce'],
            '🪣Category Group(s) CMS Slug': ['retail-and-e-commerce-websites'],
            '🔍Algolia Child Category (🏗️ only)': ['child-crafts'],
            '🥞Template Type (🏗️ only)': 'Multi Page',
            '🎨Creator Name': 'Creator Alpha',
            '📋 Unique Viewers': 2400,
            '📋 Cumulative Purchases': 60,
            '📋 Cumulative Revenue': 2940,
            '🥞CMS Slug (formula)': 'craft-alpha-prime-page-template',
            '📅LMT': '2026-03-16T05:26:00.000Z',
          },
        },
        {
          id: 'recAlphaAltPage',
          fields: {
            Name: 'Craft Alpha Alt',
            '⚙️🆎Type (Text)': 'Template🏗️',
            '🚀Marketplace Status': '3️⃣Published🚀',
            'ℹ️Description (Short)': 'Craft storefront template',
            'ℹ️Description (Long).html': '<p>Craft storefront template.</p>',
            '🪣Category Group(s) Display Name': ['Retail & E-Commerce'],
            '🪣Category Group(s) CMS Slug': ['retail-and-e-commerce-websites'],
            '🔍Algolia Child Category (🏗️ only)': ['child-crafts'],
            '🥞Template Type (🏗️ only)': 'Multi Page',
            '🎨Creator Name': 'Creator Alpha',
            '📋 Unique Viewers': 2100,
            '📋 Cumulative Purchases': 35,
            '📋 Cumulative Revenue': 1715,
            '🥞CMS Slug (formula)': 'craft-alpha-alt-page-template',
            '📅LMT': '2026-03-16T05:27:00.000Z',
          },
        },
        {
          id: 'recBetaPage',
          fields: {
            Name: 'Craft Beta',
            '⚙️🆎Type (Text)': 'Template🏗️',
            '🚀Marketplace Status': '3️⃣Published🚀',
            'ℹ️Description (Short)': 'Craft storefront template',
            'ℹ️Description (Long).html': '<p>Craft storefront template.</p>',
            '🪣Category Group(s) Display Name': ['Retail & E-Commerce'],
            '🪣Category Group(s) CMS Slug': ['retail-and-e-commerce-websites'],
            '🔍Algolia Child Category (🏗️ only)': ['child-crafts'],
            '🥞Template Type (🏗️ only)': 'Multi Page',
            '🎨Creator Name': 'Creator Beta',
            '📋 Unique Viewers': 1800,
            '📋 Cumulative Purchases': 36,
            '📋 Cumulative Revenue': 1764,
            '🥞CMS Slug (formula)': 'craft-beta-page-template',
            '📅LMT': '2026-03-16T05:28:00.000Z',
          },
        },
        {
          id: 'recGammaPage',
          fields: {
            Name: 'Craft Gamma',
            '⚙️🆎Type (Text)': 'Template🏗️',
            '🚀Marketplace Status': '3️⃣Published🚀',
            'ℹ️Description (Short)': 'Craft storefront template',
            'ℹ️Description (Long).html': '<p>Craft storefront template.</p>',
            '🪣Category Group(s) Display Name': ['Retail & E-Commerce'],
            '🪣Category Group(s) CMS Slug': ['retail-and-e-commerce-websites'],
            '🔍Algolia Child Category (🏗️ only)': ['child-crafts'],
            '🥞Template Type (🏗️ only)': 'Multi Page',
            '🎨Creator Name': 'Creator Gamma',
            '📋 Unique Viewers': 1500,
            '📋 Cumulative Purchases': 20,
            '📋 Cumulative Revenue': 980,
            '🥞CMS Slug (formula)': 'craft-gamma-page-template',
            '📅LMT': '2026-03-16T05:29:00.000Z',
          },
        },
      ],
      styles: LOOKUPS.styles,
      childCategories: [
        ...LOOKUPS.childCategories,
        {
          id: 'child-crafts',
          fields: {
            Category: 'Arts & Crafts Store',
            'Display name': 'Arts & Crafts Store',
            'Parent Category Name': 'Retail & E-Commerce',
            '🪣Category Groups': 'retail-and-e-commerce-websites',
            'Related Keywords': 'craft, handmade',
          },
        },
      ],
      tags: LOOKUPS.tags,
    });
    const { env, close } = createTestEnv({
      SEARCH_RANKING_CONFIG_JSON: JSON.stringify({
        signalWeights: {
          text: 0,
          popularity: 0,
          views: 0,
          purchases: 2,
          conversionRate: 0,
          revenue: 1,
          freshness: 0,
          creatorDiversity: 2,
          exactTitle: 0,
          categoryMatch: 0,
          querySaturation: 0,
        },
        controls: {
          creatorDiversityRerankWindowSize: 4,
          creatorDiversityRerankMaxPages: 2,
          creatorDiversityRerankPenalty: 0.25,
        },
      }),
    });

    try {
      const rebuild = await callWorker(
        new Request('https://templates.test/api/templates/admin/rebuild', {
          method: 'POST',
          headers: { Authorization: 'Bearer sync-token' },
        }),
        env,
      );
      expect(rebuild.status).toBe(200);

      const pageOneResponse = await callWorker(
        new Request('https://templates.test/api/templates/search?q=craft&page_size=2&page=1'),
        env,
      );
      const pageOnePayload = (await pageOneResponse.json()) as { items: Array<{ name: string }> };

      const pageTwoResponse = await callWorker(
        new Request('https://templates.test/api/templates/search?q=craft&page_size=2&page=2'),
        env,
      );
      const pageTwoPayload = (await pageTwoResponse.json()) as { items: Array<{ name: string }> };

      expect(pageOnePayload.items.map((item) => item.name)).toEqual(['Craft Alpha Prime', 'Craft Beta']);
      expect(pageTwoPayload.items.map((item) => item.name)).toEqual(['Craft Alpha Alt', 'Craft Gamma']);
    } finally {
      fetchMock.mockRestore();
      close();
    }
  });

  it('gives cold-start templates from proven creators a bounded track-record lift', async () => {
    const fetchMock = installAirtableFetchMock({
      publishedAssets: [
        {
          id: 'recAlphaLegacyStudio',
          fields: {
            Name: 'Alpha Legacy',
            '⚙️🆎Type (Text)': 'Template🏗️',
            '🚀Marketplace Status': '3️⃣Published🚀',
            'ℹ️Description (Short)': 'Established portfolio template',
            'ℹ️Description (Long).html': '<p>Established portfolio template.</p>',
            '🪣Category Group(s) Display Name': ['Portfolio & Agency'],
            '🪣Category Group(s) CMS Slug': ['portfolio-and-agency-websites'],
            '🔍Algolia Child Category (🏗️ only)': ['child-ai'],
            '🥞Template Type (🏗️ only)': 'Multi Page',
            '🎨Creator Name': 'Creator Alpha',
            '📋 Unique Viewers': 2600,
            '📋 Cumulative Purchases': 70,
            '📋 Cumulative Revenue': 3430,
            '🥞CMS Slug (formula)': 'alpha-legacy-studio-template',
            '📅LMT': '2026-03-16T05:30:00.000Z',
          },
        },
        {
          id: 'recAlphaNewStudio',
          fields: {
            Name: 'Studio Alpha New',
            '⚙️🆎Type (Text)': 'Template🏗️',
            '🚀Marketplace Status': '3️⃣Published🚀',
            'ℹ️Description (Short)': 'New studio template',
            'ℹ️Description (Long).html': '<p>New studio template.</p>',
            '🪣Category Group(s) Display Name': ['Portfolio & Agency'],
            '🪣Category Group(s) CMS Slug': ['portfolio-and-agency-websites'],
            '🔍Algolia Child Category (🏗️ only)': ['child-ai'],
            '🥞Template Type (🏗️ only)': 'Multi Page',
            '🎨Creator Name': 'Creator Alpha',
            '📋 Unique Viewers': 100,
            '📋 Cumulative Purchases': 1,
            '📋 Cumulative Revenue': 49,
            '🥞CMS Slug (formula)': 'studio-alpha-new-template',
            '📅LMT': '2026-03-16T05:31:00.000Z',
          },
        },
        {
          id: 'recBetaNewStudio',
          fields: {
            Name: 'Studio Beta New',
            '⚙️🆎Type (Text)': 'Template🏗️',
            '🚀Marketplace Status': '3️⃣Published🚀',
            'ℹ️Description (Short)': 'New studio template',
            'ℹ️Description (Long).html': '<p>New studio template.</p>',
            '🪣Category Group(s) Display Name': ['Portfolio & Agency'],
            '🪣Category Group(s) CMS Slug': ['portfolio-and-agency-websites'],
            '🔍Algolia Child Category (🏗️ only)': ['child-ai'],
            '🥞Template Type (🏗️ only)': 'Multi Page',
            '🎨Creator Name': 'Creator Beta',
            '📋 Unique Viewers': 100,
            '📋 Cumulative Purchases': 1,
            '📋 Cumulative Revenue': 49,
            '🥞CMS Slug (formula)': 'studio-beta-new-template',
            '📅LMT': '2026-03-16T05:32:00.000Z',
          },
        },
      ],
      styles: LOOKUPS.styles,
      childCategories: LOOKUPS.childCategories,
      tags: LOOKUPS.tags,
    });
    const { env, close } = createTestEnv({
      SEARCH_RANKING_CONFIG_JSON: JSON.stringify({
        signalWeights: {
          text: 0,
          popularity: 0,
          views: 0,
          purchases: 0,
          conversionRate: 0,
          revenue: 0,
          freshness: 0,
          creatorTrackRecord: 5,
          creatorDiversity: 0,
          exactTitle: 0,
          categoryMatch: 0,
          querySaturation: 0,
        },
      }),
    });

    try {
      const rebuild = await callWorker(
        new Request('https://templates.test/api/templates/admin/rebuild', {
          method: 'POST',
          headers: { Authorization: 'Bearer sync-token' },
        }),
        env,
      );
      expect(rebuild.status).toBe(200);

      const response = await callWorker(new Request('https://templates.test/api/templates/search?q=studio'), env);
      const payload = (await response.json()) as { items: Array<{ name: string }> };

      expect(payload.items.map((item) => item.name)).toEqual(['Studio Alpha New', 'Studio Beta New']);
    } finally {
      fetchMock.mockRestore();
      close();
    }
  });

  it('keeps stronger templates ahead when creator track record is only a bounded prior', async () => {
    const fetchMock = installAirtableFetchMock({
      publishedAssets: [
        {
          id: 'recAlphaLegacyQuality',
          fields: {
            Name: 'Alpha Legacy',
            '⚙️🆎Type (Text)': 'Template🏗️',
            '🚀Marketplace Status': '3️⃣Published🚀',
            'ℹ️Description (Short)': 'Established portfolio template',
            'ℹ️Description (Long).html': '<p>Established portfolio template.</p>',
            '🪣Category Group(s) Display Name': ['Portfolio & Agency'],
            '🪣Category Group(s) CMS Slug': ['portfolio-and-agency-websites'],
            '🔍Algolia Child Category (🏗️ only)': ['child-ai'],
            '🥞Template Type (🏗️ only)': 'Multi Page',
            '🎨Creator Name': 'Creator Alpha',
            '📋 Unique Viewers': 2600,
            '📋 Cumulative Purchases': 70,
            '📋 Cumulative Revenue': 3430,
            '🥞CMS Slug (formula)': 'alpha-legacy-quality-template',
            '📅LMT': '2026-03-16T05:33:00.000Z',
          },
        },
        {
          id: 'recAlphaNewQuality',
          fields: {
            Name: 'Studio Alpha New',
            '⚙️🆎Type (Text)': 'Template🏗️',
            '🚀Marketplace Status': '3️⃣Published🚀',
            'ℹ️Description (Short)': 'New studio template',
            'ℹ️Description (Long).html': '<p>New studio template.</p>',
            '🪣Category Group(s) Display Name': ['Portfolio & Agency'],
            '🪣Category Group(s) CMS Slug': ['portfolio-and-agency-websites'],
            '🔍Algolia Child Category (🏗️ only)': ['child-ai'],
            '🥞Template Type (🏗️ only)': 'Multi Page',
            '🎨Creator Name': 'Creator Alpha',
            '📋 Unique Viewers': 100,
            '📋 Cumulative Purchases': 1,
            '📋 Cumulative Revenue': 49,
            '🥞CMS Slug (formula)': 'studio-alpha-new-quality-template',
            '📅LMT': '2026-03-16T05:34:00.000Z',
          },
        },
        {
          id: 'recBetaWinnerQuality',
          fields: {
            Name: 'Studio Beta Winner',
            '⚙️🆎Type (Text)': 'Template🏗️',
            '🚀Marketplace Status': '3️⃣Published🚀',
            'ℹ️Description (Short)': 'Winning studio template',
            'ℹ️Description (Long).html': '<p>Winning studio template.</p>',
            '🪣Category Group(s) Display Name': ['Portfolio & Agency'],
            '🪣Category Group(s) CMS Slug': ['portfolio-and-agency-websites'],
            '🔍Algolia Child Category (🏗️ only)': ['child-ai'],
            '🥞Template Type (🏗️ only)': 'Multi Page',
            '🎨Creator Name': 'Creator Beta',
            '📋 Unique Viewers': 900,
            '📋 Cumulative Purchases': 20,
            '📋 Cumulative Revenue': 980,
            '🥞CMS Slug (formula)': 'studio-beta-winner-quality-template',
            '📅LMT': '2026-03-16T05:35:00.000Z',
          },
        },
      ],
      styles: LOOKUPS.styles,
      childCategories: LOOKUPS.childCategories,
      tags: LOOKUPS.tags,
    });
    const { env, close } = createTestEnv({
      SEARCH_RANKING_CONFIG_JSON: JSON.stringify({
        signalWeights: {
          text: 0,
          popularity: 0,
          views: 0,
          purchases: 3,
          conversionRate: 0,
          revenue: 2,
          freshness: 0,
          creatorTrackRecord: 3,
          creatorDiversity: 0,
          exactTitle: 0,
          categoryMatch: 0,
          querySaturation: 0,
        },
      }),
    });

    try {
      const rebuild = await callWorker(
        new Request('https://templates.test/api/templates/admin/rebuild', {
          method: 'POST',
          headers: { Authorization: 'Bearer sync-token' },
        }),
        env,
      );
      expect(rebuild.status).toBe(200);

      const response = await callWorker(new Request('https://templates.test/api/templates/search?q=studio'), env);
      const payload = (await response.json()) as { items: Array<{ name: string }> };

      expect(payload.items.map((item) => item.name)).toEqual(['Studio Beta Winner', 'Studio Alpha New']);
    } finally {
      fetchMock.mockRestore();
      close();
    }
  });

  it('gives exact-title matches a mild boost during search', async () => {
    const fetchMock = installAirtableFetchMock({
      publishedAssets: [
        {
          id: 'recExact',
          fields: {
            Name: 'Exact Craft',
            '⚙️🆎Type (Text)': 'Template🏗️',
            '🚀Marketplace Status': '3️⃣Published🚀',
            'ℹ️Description (Short)': 'Exact title should promote itself',
            'ℹ️Description (Long).html': '<p>Exact title boost.</p>',
            '🪣Category Group(s) Display Name': ['Retail & E-Commerce'],
            '🪣Category Group(s) CMS Slug': ['retail-and-e-commerce-websites'],
            '🔍Algolia Child Category (🏗️ only)': ['child-crafts'],
            '🥞Template Type (🏗️ only)': 'Multi Page',
            '📋 Unique Viewers': 10,
            '📋 Cumulative Purchases': 0,
            '📋 Cumulative Revenue': 0,
            '🥞CMS Slug (formula)': 'exact-craft',
            '📅LMT': '2026-03-16T05:10:00.000Z',
          },
        },
        {
          id: 'recTaxonomy',
          fields: {
            Name: 'Craft Collective',
            '⚙️🆎Type (Text)': 'Template🏗️',
            '🚀Marketplace Status': '3️⃣Published🚀',
            'ℹ️Description (Short)': 'Taxonomy-rich craft template',
            'ℹ️Description (Long).html': '<p>Matches via category alone.</p>',
            '🪣Category Group(s) Display Name': ['Retail & E-Commerce'],
            '🪣Category Group(s) CMS Slug': ['retail-and-e-commerce-websites'],
            '🔍Algolia Child Category (🏗️ only)': ['child-crafts'],
            '🥞Template Type (🏗️ only)': 'Multi Page',
            '📋 Unique Viewers': 200,
            '📋 Cumulative Purchases': 5,
            '📋 Cumulative Revenue': 450,
            '🥞CMS Slug (formula)': 'craft-collective',
            '📅LMT': '2026-03-16T05:11:00.000Z',
          },
        },
      ],
      styles: LOOKUPS.styles,
      childCategories: [
        ...LOOKUPS.childCategories,
        {
          id: 'child-crafts',
          fields: {
            Category: 'Arts & Crafts Store',
            'Display name': 'Arts & Crafts Store',
            'Parent Category Name': 'Retail & E-Commerce',
            '🪣Category Groups': 'retail-and-e-commerce-websites',
            'Related Keywords': 'craft, handmade',
          },
        },
      ],
      tags: LOOKUPS.tags,
    });
    const { env, close } = createTestEnv({
      SEARCH_RANKING_CONFIG_JSON: JSON.stringify({
        signalWeights: {
          text: 0,
          popularity: 0,
          views: 0,
          purchases: 0,
          conversionRate: 0,
          revenue: 0,
          exactTitle: 5,
        },
        controls: {
          taxonomyPrecedenceMinQueryLength: 5,
        },
      }),
    });

    try {
      const rebuild = await callWorker(
        new Request('https://templates.test/api/templates/admin/rebuild', {
          method: 'POST',
          headers: { Authorization: 'Bearer sync-token' },
        }),
        env,
      );
      expect(rebuild.status).toBe(200);

      const response = await callWorker(new Request('https://templates.test/api/templates/search?q=exact%20craft'), env);
      const payload = (await response.json()) as { items: Array<{ name: string }> };

      expect(payload.items[0]?.name).toBe('Exact Craft');
    } finally {
      fetchMock.mockRestore();
      close();
    }
  });
});
