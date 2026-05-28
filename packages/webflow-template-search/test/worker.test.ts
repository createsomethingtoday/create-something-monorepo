import { afterEach, describe, expect, it, vi } from 'vitest';

import { clearLookupMapsCache } from '../src/airtable.js';
import { installAirtableFetchMock } from './support/airtable.js';
import { callWorker, createTestEnv } from './support/worker.js';

const LOOKUPS = {
  categoryGroups: [
    {
      id: 'group-technology',
      fields: {
        Name: 'Technology',
        'Display Name': 'Technology',
        '🥞CMS Slug': 'technology-websites',
        'ℹ️Description (Short)': 'Software, startups, AI, apps, and digital products.',
        'ℹ️Description (Landing page)': 'Launch software, SaaS, and AI websites with Webflow technology templates.',
        '❓Related Keywords for Algolia': 'software, saas, AI',
        '🥞CMS Status': 'Active',
      },
    },
    {
      id: 'group-blog',
      fields: {
        Name: 'Blog & Editorial',
        'Display Name': 'Blog & Editorial',
        '🥞CMS Slug': 'blog-and-editorial-websites',
        'ℹ️Description (Short)': 'Journalism, articles, publishing, and storytelling.',
        'ℹ️Description (Landing page)': 'Publish editorial sites, magazines, and content hubs with Webflow blog templates.',
        '❓Related Keywords for Algolia': 'blog, magazine',
        '🥞CMS Status': 'Active',
      },
    },
  ],
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
  clearLookupMapsCache();
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
      categoryGroups: LOOKUPS.categoryGroups,
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

      await env.DB.prepare(
        "INSERT INTO slug_aliases (slug_type, alias_slug, canonical_slug, note) VALUES ('child_category', 'ai', 'ai-websites', 'legacy unsuffixed route')",
      ).run();
      await env.DB.prepare(
        "INSERT INTO slug_aliases (slug_type, alias_slug, canonical_slug, note) VALUES ('child_category', 'software-and-saas', 'software-and-saas-websites', 'legacy unsuffixed route')",
      ).run();

      const categorySearch = await callWorker(
        new Request('https://templates.test/api/templates/search?category_group_slug=technology-websites&child_category_slug=ai'),
        env,
      );
      const categoryPayload = (await categorySearch.json()) as {
        items: Array<{ name: string; creator_profile_url: string | null; creator_avatar_url: string | null; creator_avatar_alt: string | null }>;
        available_facets: { styles: Array<{ slug: string }>; types: Array<{ value: string }> };
        applied_filters: { child_category_slug: string | null };
        category_pills: Array<{ slug: string; url: string; active: boolean }>;
        subcategory_pills: Array<{ slug: string; url: string; active: boolean }>;
      };

      expect(categoryPayload.items.map((item) => item.name)).toEqual(['Setrex', 'Agentflow']);
      expect(categoryPayload.available_facets.styles.map((item) => item.slug)).toEqual(['dark-websites', 'modern']);
      expect(categoryPayload.available_facets.types.map((item) => item.value)).toEqual(['Multi Layout', 'Multi Page']);
      expect(categoryPayload.applied_filters.child_category_slug).toBe('ai-websites');
      expect(categoryPayload.category_pills.map((pill) => pill.slug)).toEqual(['technology-websites']);
      expect(categoryPayload.category_pills[0]?.url).toBe('https://webflow.com/templates/category/technology-websites');
      expect(categoryPayload.subcategory_pills.map((pill) => pill.slug)).toEqual(['ai-websites', 'software-and-saas-websites']);
      expect(categoryPayload.subcategory_pills.map((pill) => pill.name)).toEqual(['AI', 'Software & SaaS']);
      expect(categoryPayload.subcategory_pills.map((pill) => pill.url)).toEqual([
        'https://webflow.com/templates/subcategory/ai-websites',
        'https://webflow.com/templates/subcategory/software-and-saas-websites',
      ]);
      expect(categoryPayload.subcategory_pills.find((pill) => pill.slug === 'ai-websites')?.active).toBe(true);

      await env.DB.prepare(
        "UPDATE template_documents SET creator_profile_url = 'https://webflow.com/templates/designers/brix-templates', creator_avatar_url = 'https://example.com/brix.png', creator_avatar_alt = 'BRIX Templates' WHERE id = 'recAgentflow'",
      ).run();

      const search = await callWorker(new Request('https://templates.test/api/templates/search?q=workflow'), env);
      const searchPayload = (await search.json()) as {
        items: Array<{ name: string; creator_profile_url: string | null; creator_avatar_url: string | null; creator_avatar_alt: string | null }>;
      };
      expect(searchPayload.items.map((item) => item.name)).toEqual(['Agentflow']);
      expect(searchPayload.items[0]?.creator_profile_url).toBe('https://webflow.com/templates/designers/brix-templates');
      expect(searchPayload.items[0]?.creator_avatar_url).toBe('https://example.com/brix.png');
      expect(searchPayload.items[0]?.creator_avatar_alt).toBe('BRIX Templates');

      const styleSearch = await callWorker(new Request('https://templates.test/api/templates/search?style_slug=dark'), env);
      const stylePayload = (await styleSearch.json()) as {
        items: Array<{ name: string }>;
        applied_filters: { styles: string[] };
        category_pills: Array<{ slug: string; count: number }>;
      };
      expect(stylePayload.applied_filters.styles).toEqual(['dark-websites']);
      expect(stylePayload.items.map((item) => item.name)).toEqual(['Setrex']);
      expect(stylePayload.category_pills).toMatchObject([{ slug: 'technology-websites', count: 1 }]);

      const suggest = await callWorker(new Request('https://templates.test/api/templates/suggest?q=agent&limit=1'), env);
      const suggestPayload = (await suggest.json()) as {
        items: Array<{ name: string; template_slug: string }>;
      };
      expect(suggestPayload.items).toMatchObject([{ name: 'Agentflow', template_slug: 'agentflow-website-template' }]);

      const taxonomy = await callWorker(
        new Request('https://templates.test/api/templates/taxonomy?category_group_slug=technology-websites'),
        env,
      );
      const taxonomyPayload = (await taxonomy.json()) as {
        description: string;
        category_group: { slug: string; description_short: string; description_landing_page: string; related_keywords: string[] } | null;
      };
      expect(taxonomyPayload.description).toBe('Launch software, SaaS, and AI websites with Webflow technology templates.');
      expect(taxonomyPayload.category_group).toMatchObject({
        slug: 'technology-websites',
        description_short: 'Software, startups, AI, apps, and digital products.',
        description_landing_page: 'Launch software, SaaS, and AI websites with Webflow technology templates.',
        related_keywords: ['software', 'saas', 'AI'],
      });

      const childTaxonomy = await callWorker(
        new Request('https://templates.test/api/templates/taxonomy?child_category_slug=ai-websites'),
        env,
      );
      const childTaxonomyPayload = (await childTaxonomy.json()) as {
        description: string;
        child_category: { slug: string; parent_category_group_slug: string | null; related_keywords: string[] } | null;
      };
      expect(childTaxonomyPayload.description).toBe('Launch software, SaaS, and AI websites with Webflow technology templates.');
      expect(childTaxonomyPayload.child_category).toMatchObject({
        slug: 'ai-websites',
        parent_category_group_slug: 'technology-websites',
        related_keywords: ['automation', 'agent'],
      });
    } finally {
      fetchMock.mockRestore();
      close();
    }
  });

  it('indexes parent taxonomy lookup records as category groups, not subcategories', async () => {
    const parentOnlyAsset = {
      ...PUBLISHED_ASSETS[0],
      id: 'recParentOnly',
      fields: {
        ...PUBLISHED_ASSETS[0].fields,
        Name: 'Editorial Base',
        '🪣Category Group(s) Display Name': [],
        '🪣Category Group(s) CMS Slug': [],
        '🔍Algolia Child Category (🏗️ only)': ['child-blog-parent'],
        '🥞CMS Slug (formula)': 'editorial-base-website-template',
      },
    };
    const fetchMock = installAirtableFetchMock({
      publishedAssets: [parentOnlyAsset],
      categoryGroups: LOOKUPS.categoryGroups,
      styles: LOOKUPS.styles,
      childCategories: [
        {
          id: 'child-blog-parent',
          fields: {
            Category: 'Blog & Editorial',
            'Display name': 'Blog & Editorial',
            Tier: 'Parent',
            type: 'group',
            '🪣Category Groups': 'Blog & Editorial',
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
        new Request('https://templates.test/api/templates/search?category_group_slug=blog-and-editorial-websites&include=items,facets,pills'),
        env,
      );
      const payload = (await response.json()) as {
        items: Array<{ name: string; category_groups: Array<{ slug: string; url: string }>; child_categories: Array<{ slug: string; url: string }> }>;
        category_pills: Array<{ slug: string; url: string; active: boolean }>;
        subcategory_pills: Array<{ slug: string; url: string; active: boolean }>;
      };

      expect(payload.items.map((item) => item.name)).toEqual(['Editorial Base']);
      expect(payload.items[0]?.category_groups).toMatchObject([
        {
          slug: 'blog-and-editorial-websites',
          url: 'https://webflow.com/templates/category/blog-and-editorial-websites',
        },
      ]);
      expect(payload.items[0]?.child_categories).toEqual([]);
      expect(payload.category_pills).toMatchObject([
        {
          slug: 'blog-and-editorial-websites',
          url: 'https://webflow.com/templates/category/blog-and-editorial-websites',
          active: true,
        },
      ]);
      expect(payload.subcategory_pills).toEqual([]);

      await env.DB.prepare(
        `
        UPDATE template_documents
        SET
          category_groups_json = '[]',
          category_group_slugs_json = '[]',
          child_categories_json = '["Blog & Editorial"]',
          child_category_slugs_json = '["blog-and-editorial-websites"]',
          category_groups_text = '',
          child_categories_text = 'Blog & Editorial'
        WHERE id = 'recParentOnly'
      `,
      ).run();
      await env.DB.prepare(
        "INSERT OR REPLACE INTO template_child_categories (template_document_id, child_category_name, child_category_slug) VALUES ('recParentOnly', 'Blog & Editorial', 'blog-and-editorial-websites')",
      ).run();

      const repair = await callWorker(
        new Request('https://templates.test/api/templates/admin/repair-taxonomy', {
          method: 'POST',
          headers: { Authorization: 'Bearer sync-token' },
        }),
        env,
      );
      const repairPayload = (await repair.json()) as { updated_documents: number; removed_child_links: number };
      expect(repair.status).toBe(200);
      expect(repairPayload.updated_documents).toBe(1);
      expect(repairPayload.removed_child_links).toBe(1);

      const repaired = await callWorker(
        new Request('https://templates.test/api/templates/search?category_group_slug=blog-and-editorial-websites&include=items,facets,pills'),
        env,
      );
      const repairedPayload = (await repaired.json()) as {
        items: Array<{ name: string; category_groups: Array<{ slug: string }>; child_categories: Array<{ slug: string }> }>;
        subcategory_pills: Array<{ slug: string }>;
      };
      expect(repairedPayload.items.map((item) => item.name)).toEqual(['Editorial Base']);
      expect(repairedPayload.items[0]?.category_groups).toMatchObject([{ slug: 'blog-and-editorial-websites' }]);
      expect(repairedPayload.items[0]?.child_categories).toEqual([]);
      expect(repairedPayload.subcategory_pills).toEqual([]);
    } finally {
      fetchMock.mockRestore();
      close();
    }
  });

  it('prefers the live CMS slug over the stale formula slug for template detail URLs', async () => {
    const staleFormulaAsset = {
      ...PUBLISHED_ASSETS[0],
      id: 'recFleety',
      fields: {
        ...PUBLISHED_ASSETS[0].fields,
        Name: 'Fleety Studio',
        '🥞CMS Slug': 'fleety-website-template',
        'Slug (from 🥞CMS Sync Records)': ['fleety-website-template'],
        '🥞CMS Slug (formula)': 'fleetytemplate-website-template',
        '🔗Listing URL': '',
      },
    };
    const fetchMock = installAirtableFetchMock({
      publishedAssets: [staleFormulaAsset],
      categoryGroups: LOOKUPS.categoryGroups,
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
        new Request('https://templates.test/api/templates/search?q=fleety&include=items,count&page_size=10'),
        env,
      );
      const payload = (await response.json()) as {
        items: Array<{ name: string; template_slug: string; url: string | null }>;
        pagination: { total_items: number };
      };

      expect(payload.pagination.total_items).toBe(1);
      expect(payload.items[0]).toMatchObject({
        name: 'Fleety Studio',
        template_slug: 'fleety-website-template',
        url: 'https://webflow.com/templates/html/fleety-website-template',
      });
    } finally {
      fetchMock.mockRestore();
      close();
    }
  });

  it('falls back to live CMS category fields when the Algolia child category field is empty', async () => {
    const cmsCategoryOnlyAsset = {
      ...PUBLISHED_ASSETS[2],
      id: 'recCmsCategoryOnly',
      fields: {
        ...PUBLISHED_ASSETS[2].fields,
        Name: 'Course Funnel',
        '🔍Algolia Child Category (🏗️ only)': [],
        'ℹ️🪣Categories (Text)': ['AI', 'Software & SaaS'],
        '🥞CMS Slug (from ℹ️🪣Categories)': ['ai-websites', 'software-and-saas-websites'],
        '🥞CMS Slug (formula)': 'course-funnel-website-template',
      },
    };
    const fetchMock = installAirtableFetchMock({
      publishedAssets: [cmsCategoryOnlyAsset],
      categoryGroups: LOOKUPS.categoryGroups,
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
        new Request('https://templates.test/api/templates/search?child_category_slug=ai-websites&include=items,count&page_size=10'),
        env,
      );
      const payload = (await response.json()) as {
        items: Array<{ name: string; child_categories: Array<{ slug: string }> }>;
        pagination: { total_items: number };
      };
      expect(payload.pagination.total_items).toBe(1);
      expect(payload.items).toMatchObject([
        {
          name: 'Course Funnel',
          child_categories: [{ slug: 'ai-websites' }, { slug: 'software-and-saas-websites' }],
        },
      ]);
    } finally {
      fetchMock.mockRestore();
      close();
    }
  });
});
