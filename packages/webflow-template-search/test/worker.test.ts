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

      expect(categoryPayload.items.map((item) => item.name)).toEqual(['Agentflow', 'Setrex']);
      expect(categoryPayload.items[0]?.cumulative_revenue).toBe(1890);
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

  it('boosts templates in matching categories above description-only matches', async () => {
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

      const response = await callWorker(new Request('https://templates.test/api/templates/search?q=craft'), env);
      const payload = (await response.json()) as { items: Array<{ name: string }> };

      // Handmade Haven is in the "Arts & Crafts Store" child category,
      // so categoryMatch signal should lift it above CraftMaster which
      // only matches via name/description despite having way more purchases.
      expect(payload.items[0]?.name).toBe('Handmade Haven');
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
