import { afterEach, describe, expect, it, vi } from 'vitest';

import { backfillCreatorFieldsByName } from '../src/db.js';
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

  it('backfills missing creator metadata from matching creator names', async () => {
    const { env, close } = createTestEnv();

    try {
      await env.DB.prepare(
        `INSERT INTO template_documents (
          id,
          template_slug,
          name,
          creator_name,
          creator_record_id,
          creator_profile_url,
          creator_avatar_url,
          creator_avatar_alt,
          synced_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
        .bind(
          'recKnownEclipso',
          'known-eclipso-template',
          'Known Eclipso',
          'Eclipso Studio',
          'recWm0pLj5ytkkPYm',
          'https://webflow.com/templates/designers/eclipso-studio',
          'https://assets.example.com/eclipso-avatar.png',
          'Eclipso Studio',
          '2026-05-19T00:00:00.000Z',
        )
        .run();

      await env.DB.prepare(
        `INSERT INTO template_documents (
          id,
          template_slug,
          name,
          creator_name,
          synced_at
        ) VALUES (?, ?, ?, ?, ?)`,
      )
        .bind('recAluro', 'aluro-website-template', 'Aluro', 'Eclipso Studio', '2026-05-19T00:00:00.000Z')
        .run();

      await backfillCreatorFieldsByName(env.DB, '2026-05-20T00:00:00.000Z');

      const row = await env.DB.prepare(
        `SELECT creator_record_id, creator_profile_url, creator_avatar_url, creator_avatar_alt
         FROM template_documents
         WHERE id = ?`,
      )
        .bind('recAluro')
        .first<{
          creator_record_id: string | null;
          creator_profile_url: string | null;
          creator_avatar_url: string | null;
          creator_avatar_alt: string | null;
        }>();

      expect(row).toEqual({
        creator_record_id: 'recWm0pLj5ytkkPYm',
        creator_profile_url: 'https://webflow.com/templates/designers/eclipso-studio',
        creator_avatar_url: 'https://assets.example.com/eclipso-avatar.png',
        creator_avatar_alt: 'Eclipso Studio',
      });
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
        items: Array<{ name: string }>;
        available_facets: { styles: Array<{ slug: string }>; types: Array<{ value: string }> };
        subcategory_pills: Array<{ slug: string; active: boolean }>;
      };

      expect(categoryPayload.items.map((item) => item.name)).toEqual(['Setrex', 'Agentflow']);
      expect(categoryPayload.available_facets.styles.map((item) => item.slug)).toEqual(['dark-websites', 'modern']);
      expect(categoryPayload.available_facets.types.map((item) => item.value)).toEqual(['Multi Layout', 'Multi Page']);
      expect(categoryPayload.subcategory_pills.map((pill) => pill.slug)).toEqual(['ai-websites', 'software-and-saas-websites']);
      expect(categoryPayload.subcategory_pills.find((pill) => pill.slug === 'ai-websites')?.active).toBe(true);

      const itemsOnlySearch = await callWorker(
        new Request('https://templates.test/api/templates/search?include=items&category_group_slug=technology-websites'),
        env,
      );
      const itemsOnlyPayload = (await itemsOnlySearch.json()) as {
        items: Array<{ name: string }>;
        available_facets: { styles: unknown[]; types: unknown[] };
        category_pills: unknown[];
        subcategory_pills: unknown[];
      };

      expect(itemsOnlyPayload.items.map((item) => item.name)).toEqual(['Setrex', 'Agentflow', 'Catalis']);
      expect(itemsOnlyPayload.available_facets.styles).toEqual([]);
      expect(itemsOnlyPayload.available_facets.types).toEqual([]);
      expect(itemsOnlyPayload.category_pills).toEqual([]);
      expect(itemsOnlyPayload.subcategory_pills).toEqual([]);

      const facetsAndPillsSearch = await callWorker(
        new Request('https://templates.test/api/templates/search?include=facets,pills&category_group_slug=technology-websites'),
        env,
      );
      const facetsAndPillsPayload = (await facetsAndPillsSearch.json()) as {
        items: unknown[];
        available_facets: { styles: Array<{ slug: string }>; types: Array<{ value: string }> };
        subcategory_pills: Array<{ slug: string }>;
      };

      expect(facetsAndPillsPayload.items).toEqual([]);
      expect(facetsAndPillsPayload.available_facets.styles.map((item) => item.slug)).toEqual(['dark-websites', 'modern']);
      expect(facetsAndPillsPayload.available_facets.types.map((item) => item.value)).toEqual([
        'Multi Layout',
        'Multi Page',
        'One Page',
      ]);
      expect(facetsAndPillsPayload.subcategory_pills.map((pill) => pill.slug)).toEqual([
        'ai-websites',
        'software-and-saas-websites',
      ]);

      const search = await callWorker(new Request('https://templates.test/api/templates/search?q=workflow'), env);
      const searchPayload = (await search.json()) as { items: Array<{ name: string }> };
      expect(searchPayload.items.map((item) => item.name)).toEqual(['Agentflow']);
    } finally {
      fetchMock.mockRestore();
      close();
    }
  });
});
