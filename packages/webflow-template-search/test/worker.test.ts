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
      '🥞💲Template Price Filter (🏗️ only)': 169,
      '🚀📅Published Date': '2026-03-01',
      '🥞CMS Slug (formula)': 'agentflow-formula-slug',
      '🎨Creator Name': 'BRIX Templates',
      '🖼️Thumbnail Image': [{ url: 'https://example.com/agentflow.png' }],
      '🔗Listing URL': 'https://webflow.com/templates/html/stale-agentflow-template',
      '🕸️View Asset Listing': { url: 'https://webflow.com/templates/html/agentflow-live-template' },
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
      '🥞💲Template Price Filter (🏗️ only)': 79,
      '🚀📅Published Date': '2026-02-15',
      '🥞CMS Slug (formula)': 'setrex-website-template',
      '🎨Creator Name': 'Arini Studio',
      '🖼️Thumbnail Image': [{ url: 'https://cdn.prod.website-files.com/5e593fb060cf877cf875dd1f/setrex.png' }],
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

function chunkTimestamp(index: number): string {
  return new Date(Date.UTC(2026, 2, 16, 5, Math.floor(index / 60), index % 60)).toISOString();
}

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
        items: Array<{ name: string; thumbnail_image_url: string | null }>;
        available_facets: { styles: Array<{ slug: string }>; types: Array<{ value: string }> };
        subcategory_pills: Array<{ slug: string; active: boolean }>;
      };

      expect(categoryPayload.items.map((item) => item.name)).toEqual(['Setrex', 'Agentflow']);
      expect(categoryPayload.items[0]?.thumbnail_image_url).toBe(
        'https://cdn.prod.website-files.com/5e593fb060cf877cf875dd1f/setrex.png',
      );
      expect(categoryPayload.items[1]?.thumbnail_image_url).toBeNull();
      expect(categoryPayload.available_facets.styles.map((item) => item.slug)).toEqual(['dark-websites', 'modern']);
      expect(categoryPayload.available_facets.types.map((item) => item.value)).toEqual(['Multi Layout', 'Multi Page']);
      expect(categoryPayload.subcategory_pills.map((pill) => pill.slug)).toEqual(['ai-websites', 'software-and-saas-websites']);
      expect(categoryPayload.subcategory_pills.find((pill) => pill.slug === 'ai-websites')?.active).toBe(true);

      const search = await callWorker(new Request('https://templates.test/api/templates/search?q=workflow'), env);
      const searchPayload = (await search.json()) as {
        items: Array<{ name: string; template_slug: string; url: string | null; thumbnail_image_url: string | null }>;
      };
      expect(searchPayload.items.map((item) => item.name)).toEqual(['Agentflow']);
      expect(searchPayload.items[0]).toMatchObject({
        template_slug: 'agentflow-live-template',
        url: 'https://webflow.com/templates/html/agentflow-live-template',
        thumbnail_image_url: null,
      });

      const clientScript = await callWorker(new Request('https://templates.test/api/templates/client.js'), env);
      expect(clientScript.status).toBe(200);
      expect(clientScript.headers.get('cache-control')).toBe('no-store, max-age=0');
    } finally {
      fetchMock.mockRestore();
      close();
    }
  });

  it('chunks large rebuilds across multiple authenticated calls', async () => {
    const staleAsset = {
      id: 'recChunkLegacy100',
      fields: {
        ...PUBLISHED_ASSETS[0].fields,
        Name: 'Legacy Duplicate Entry',
        '🥞CMS Slug (formula)': 'chunk-template-100',
        '🔗Listing URL': 'https://webflow.com/templates/html/chunk-template-100',
        '🕸️View Asset Listing': { url: 'https://webflow.com/templates/html/chunk-template-100' },
        '📅LMT': '2026-03-01T05:00:00.000Z',
      },
    };
    const manyAssets = Array.from({ length: 101 }, (_, index) => ({
      id: `recChunk${index}`,
      fields: {
        ...PUBLISHED_ASSETS[0].fields,
        Name: `Chunk Template ${index}`,
        '🥞CMS Slug (formula)': `chunk-template-${index}`,
        '🔗Listing URL': `https://webflow.com/templates/html/chunk-template-${index}`,
        '🕸️View Asset Listing': { url: `https://webflow.com/templates/html/chunk-template-${index}` },
        '📅LMT': chunkTimestamp(index),
      },
    }));

    let fetchMock = installAirtableFetchMock({
      publishedAssets: [staleAsset],
      styles: LOOKUPS.styles,
      childCategories: LOOKUPS.childCategories,
      tags: LOOKUPS.tags,
    });
    const { env, close } = createTestEnv();

    try {
      const seedRebuild = await callWorker(
        new Request('https://templates.test/api/templates/admin/rebuild', {
          method: 'POST',
          headers: { Authorization: 'Bearer sync-token' },
        }),
        env,
      );
      expect(seedRebuild.status).toBe(200);

      fetchMock.mockRestore();
      fetchMock = installAirtableFetchMock({
        publishedAssets: manyAssets,
        styles: LOOKUPS.styles,
        childCategories: LOOKUPS.childCategories,
        tags: LOOKUPS.tags,
      });

      const firstRebuild = await callWorker(
        new Request('https://templates.test/api/templates/admin/rebuild', {
          method: 'POST',
          headers: { Authorization: 'Bearer sync-token' },
        }),
        env,
      );
      expect(firstRebuild.status).toBe(202);
      const firstPayload = (await firstRebuild.json()) as { status?: string; indexed_records: number };
      expect(firstPayload.status).toBe('in_progress');
      expect(firstPayload.indexed_records).toBe(100);

      const incompleteSearch = await callWorker(new Request('https://templates.test/api/templates/search?q=100'), env);
      const incompletePayload = (await incompleteSearch.json()) as { items: Array<{ name: string }> };
      expect(incompletePayload.items).toEqual([]);

      const secondRebuild = await callWorker(
        new Request('https://templates.test/api/templates/admin/rebuild', {
          method: 'POST',
          headers: { Authorization: 'Bearer sync-token' },
        }),
        env,
      );
      expect(secondRebuild.status).toBe(200);
      const secondPayload = (await secondRebuild.json()) as { status?: string; indexed_records: number };
      expect(secondPayload.status).toBe('completed');
      expect(secondPayload.indexed_records).toBe(101);

      const completedSearch = await callWorker(new Request('https://templates.test/api/templates/search?q=100'), env);
      const completedPayload = (await completedSearch.json()) as { items: Array<{ name: string }> };
      expect(completedPayload.items.map((item) => item.name)).toEqual(['Chunk Template 100']);
    } finally {
      fetchMock.mockRestore();
      close();
    }
  }, 15000);
});
