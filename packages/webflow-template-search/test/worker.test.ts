import { afterEach, describe, expect, it, vi } from 'vitest';

import { installAirtableFetchMock } from './support/airtable.js';
import { callScheduled, callWorker, createTestEnv } from './support/worker.js';

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
      webflowItems: [
        {
          id: 'wf-agentflow',
          fieldData: {
            slug: 'agentflow-website-template',
            'thumbnail-image': { url: 'https://cdn.prod.website-files.com/templates/agentflow.webp' },
            'thumbnail-image-secondary': { url: 'https://cdn.prod.website-files.com/templates/agentflow-hover.webp' },
          },
        },
        {
          id: 'wf-setrex',
          fieldData: {
            slug: 'setrex-website-template',
            'thumbnail-image': { url: 'https://cdn.prod.website-files.com/templates/setrex.webp' },
          },
        },
      ],
    });
    const { env, close } = createTestEnv();
    env.CMS_READ_ONLY = 'test-webflow-token';
    env.WEBFLOW_TEMPLATES_COLLECTION_ID = 'templates-collection';

    try {
      const rebuild = await callWorker(
        new Request('https://templates.test/api/templates/admin/rebuild', {
          method: 'POST',
          headers: { Authorization: 'Bearer sync-token' },
        }),
        env,
      );
      expect(rebuild.status).toBe(200);
      const rebuildPayload = (await rebuild.json()) as {
        webflow_images?: { fetched_items: number; matched_records: number; configured: boolean };
      };
      expect(rebuildPayload.webflow_images).toEqual({ fetched_items: 2, matched_records: 2, configured: true });

      const categorySearch = await callWorker(
        new Request('https://templates.test/api/templates/search?category_group_slug=technology-websites&child_category_slug=ai-websites'),
        env,
      );
      const categoryPayload = (await categorySearch.json()) as {
        items: Array<{ name: string; thumbnail_image_url: string | null; thumbnail_image_secondary_url: string | null }>;
        available_facets: { styles: Array<{ slug: string }>; types: Array<{ value: string }> };
        subcategory_pills: Array<{ slug: string; active: boolean }>;
      };

      expect(categoryPayload.items.map((item) => item.name)).toEqual(['Setrex', 'Agentflow']);
      expect(categoryPayload.items[0].thumbnail_image_url).toBe('https://cdn.prod.website-files.com/templates/setrex.webp');
      expect(categoryPayload.items[1].thumbnail_image_url).toBe('https://cdn.prod.website-files.com/templates/agentflow.webp');
      expect(categoryPayload.items[1].thumbnail_image_secondary_url).toBe('https://cdn.prod.website-files.com/templates/agentflow-hover.webp');
      expect(categoryPayload.available_facets.styles.map((item) => item.slug)).toEqual(['dark-websites', 'modern']);
      expect(categoryPayload.available_facets.types.map((item) => item.value)).toEqual(['Multi Layout', 'Multi Page']);
      expect(categoryPayload.subcategory_pills.map((pill) => pill.slug)).toEqual(['ai-websites', 'software-and-saas-websites']);
      expect(categoryPayload.subcategory_pills.find((pill) => pill.slug === 'ai-websites')?.active).toBe(true);

      const search = await callWorker(new Request('https://templates.test/api/templates/search?q=workflow'), env);
      const searchPayload = (await search.json()) as { items: Array<{ name: string }> };
      expect(searchPayload.items.map((item) => item.name)).toEqual(['Agentflow']);

      const metadataResponse = await callWorker(
        new Request('https://templates.test/api/templates/categories/technology-websites'),
        env,
      );
      const metadataPayload = (await metadataResponse.json()) as {
        name: string;
        title: string;
        canonical_url: string;
        total_items: number;
      };
      expect(metadataResponse.status).toBe(200);
      expect(metadataPayload).toMatchObject({
        name: 'Technology',
        title: 'Technology Website Templates & Page Designs | Webflow',
        canonical_url: 'https://webflow.com/templates/category/technology-websites',
        total_items: 3,
      });

      const missingMetadata = await callWorker(new Request('https://templates.test/api/templates/categories/unknown-websites'), env);
      expect(missingMetadata.status).toBe(404);

      const imageSync = await callWorker(
        new Request('https://templates.test/api/templates/admin/webflow-images', {
          method: 'POST',
          headers: { Authorization: 'Bearer sync-token' },
        }),
        env,
      );
      expect(imageSync.status).toBe(200);
      await expect(imageSync.json()).resolves.toMatchObject({
        fetched_items: 2,
        matched_records: 2,
        configured: true,
      });
    } finally {
      fetchMock.mockRestore();
      close();
    }
  });

  it('preserves durable Webflow image URLs across incremental Airtable syncs', async () => {
    const expiringAttachmentUrl = 'https://airtable.com/attachments/expiring/agentflow.png';
    const durableThumbnail = 'https://cdn.prod.website-files.com/templates/agentflow.webp';
    const durableSecondary = 'https://cdn.prod.website-files.com/templates/agentflow-hover.webp';

    const fetchMock = installAirtableFetchMock({
      publishedAssets: PUBLISHED_ASSETS,
      incrementalAssets: [
        {
          ...PUBLISHED_ASSETS[0],
          fields: {
            ...PUBLISHED_ASSETS[0].fields,
            '🖼️Thumbnail Image': [{ url: expiringAttachmentUrl }],
            '🖼️Thumbnail Image (Secondary)': [{ url: expiringAttachmentUrl }],
            '📅LMT': '2026-03-17T05:13:07.000Z',
          },
        },
      ],
      styles: LOOKUPS.styles,
      childCategories: LOOKUPS.childCategories,
      tags: LOOKUPS.tags,
      webflowItems: [
        {
          id: 'wf-agentflow',
          fieldData: {
            slug: 'agentflow-website-template',
            'thumbnail-image': { url: durableThumbnail },
            'thumbnail-image-secondary': { url: durableSecondary },
          },
        },
      ],
    });
    const { env, close } = createTestEnv();
    env.CMS_READ_ONLY = 'test-webflow-token';

    try {
      const rebuild = await callWorker(
        new Request('https://templates.test/api/templates/admin/rebuild', {
          method: 'POST',
          headers: { Authorization: 'Bearer sync-token' },
        }),
        env,
      );
      expect(rebuild.status).toBe(200);

      // Drop the Webflow token so the incremental sync cannot refetch durable URLs.
      delete env.CMS_READ_ONLY;

      const incremental = await callWorker(
        new Request('https://templates.test/api/templates/admin/sync', {
          method: 'POST',
          headers: { Authorization: 'Bearer sync-token' },
        }),
        env,
      );
      expect(incremental.status).toBe(200);

      const search = await callWorker(
        new Request('https://templates.test/api/templates/search?q=Agentflow'),
        env,
      );
      const payload = (await search.json()) as {
        items: Array<{ thumbnail_image_url: string | null; thumbnail_image_secondary_url: string | null }>;
      };
      expect(payload.items[0].thumbnail_image_url).toBe(durableThumbnail);
      expect(payload.items[0].thumbnail_image_secondary_url).toBe(durableSecondary);
    } finally {
      fetchMock.mockRestore();
      close();
    }
  });

  it('refreshes Webflow image updates in bounded scheduled batches', async () => {
    const agentflowInitial = 'https://cdn.prod.website-files.com/templates/agentflow-old.webp';
    const agentflowUpdated = 'https://cdn.prod.website-files.com/templates/agentflow-updated.webp';
    const setrexInitial = 'https://cdn.prod.website-files.com/templates/setrex-old.webp';
    const setrexUpdated = 'https://cdn.prod.website-files.com/templates/setrex-updated.webp';
    const webflowItems = [
      {
        id: 'wf-agentflow',
        fieldData: {
          name: 'Agentflow',
          slug: 'agentflow-webflow-slug',
          'thumbnail-image': { url: agentflowInitial },
        },
      },
      {
        id: 'wf-setrex',
        fieldData: {
          name: 'Setrex',
          slug: 'setrex-website-template',
          'thumbnail-image': { url: setrexInitial },
        },
      },
    ];
    const fetchMock = installAirtableFetchMock({
      publishedAssets: PUBLISHED_ASSETS,
      styles: LOOKUPS.styles,
      childCategories: LOOKUPS.childCategories,
      tags: LOOKUPS.tags,
      webflowItems,
    });
    const { env, close } = createTestEnv();
    env.CMS_READ_ONLY = 'test-webflow-token';
    env.WEBFLOW_IMAGE_SYNC_MAX_ITEMS = '1';

    try {
      const rebuild = await callWorker(
        new Request('https://templates.test/api/templates/admin/rebuild', {
          method: 'POST',
          headers: { Authorization: 'Bearer sync-token' },
        }),
        env,
      );
      expect(rebuild.status).toBe(200);

      webflowItems[0].fieldData['thumbnail-image'] = { url: agentflowUpdated };
      webflowItems[1].fieldData['thumbnail-image'] = { url: setrexUpdated };

      await callScheduled('37 * * * *', env);

      const firstSearch = await callWorker(new Request('https://templates.test/api/templates/search?q=Agentflow'), env);
      const firstPayload = (await firstSearch.json()) as { items: Array<{ thumbnail_image_url: string | null }> };
      expect(firstPayload.items[0].thumbnail_image_url).toBe(agentflowUpdated);

      const setrexBeforeSecondBatch = await callWorker(new Request('https://templates.test/api/templates/search?q=Setrex'), env);
      const setrexBeforePayload = (await setrexBeforeSecondBatch.json()) as { items: Array<{ thumbnail_image_url: string | null }> };
      expect(setrexBeforePayload.items[0].thumbnail_image_url).toBe(setrexInitial);

      await callScheduled('37 * * * *', env);

      const setrexAfterSecondBatch = await callWorker(new Request('https://templates.test/api/templates/search?q=Setrex'), env);
      const setrexAfterPayload = (await setrexAfterSecondBatch.json()) as { items: Array<{ thumbnail_image_url: string | null }> };
      expect(setrexAfterPayload.items[0].thumbnail_image_url).toBe(setrexUpdated);
    } finally {
      fetchMock.mockRestore();
      close();
    }
  });

  it('throws when WEBFLOW_IMAGE_SYNC_REQUIRED is set without a token during full rebuild', async () => {
    const fetchMock = installAirtableFetchMock({
      publishedAssets: PUBLISHED_ASSETS,
      styles: LOOKUPS.styles,
      childCategories: LOOKUPS.childCategories,
      tags: LOOKUPS.tags,
    });
    const { env, close } = createTestEnv();
    env.WEBFLOW_IMAGE_SYNC_REQUIRED = 'true';

    try {
      const rebuild = await callWorker(
        new Request('https://templates.test/api/templates/admin/rebuild', {
          method: 'POST',
          headers: { Authorization: 'Bearer sync-token' },
        }),
        env,
      );
      expect(rebuild.status).toBe(500);
      const body = (await rebuild.json()) as { error: string; details?: string };
      expect(body.error).toBe('Request failed');
      expect(body.details ?? '').toMatch(/CMS_READ_ONLY/);
    } finally {
      fetchMock.mockRestore();
      close();
    }
  });
});
