import assert from 'node:assert/strict';
import { test } from 'node:test';
import worker, {
  htmlToPlainText,
  normalizeInsightCategories,
  normalizeInsights,
  normalizeSubscriptionCta,
  normalizeTeam
} from '../src/worker.mjs';

test('normalizes the single published Subscription CTA record for the global component contract', () => {
  const subscription = normalizeSubscriptionCta([
    {
      id: 'draft-subscription',
      lastPublished: null,
      fieldData: {
        heading: 'Draft heading',
        'supporting-copy': 'Draft supporting copy',
        'button-text': 'Draft button'
      }
    },
    {
      id: 'global-subscription',
      isDraft: false,
      lastPublished: null,
      fieldData: {
        heading: 'Receive new Cato insights.',
        'supporting-copy':
          'Get Cato reports, research, resources, and company updates as they publish.',
        'button-text': 'Subscribe to alerts'
      }
    }
  ]);

  assert.deepEqual(subscription, {
    heading: 'Receive new Cato insights.',
    supportingCopy: 'Get Cato reports, research, resources, and company updates as they publish.',
    buttonText: 'Subscribe to alerts'
  });
});

test('normalizes published Insight Categories for the global mega-menu contract', () => {
  const categories = normalizeInsightCategories([
    {
      id: 'draft-category',
      lastPublished: null,
      fieldData: {
        name: 'Draft category',
        slug: 'draft-category'
      }
    },
    {
      id: 'resiliency-category',
      lastPublished: '2026-07-14T12:00:00.000Z',
      fieldData: {
        name: 'Global Risk Briefs',
        slug: 'resiliency-reports',
        'mega-menu-summary': 'Edit this once in the Insight Categories CMS collection.',
        'sort-order': 10
      }
    },
    {
      id: 'newsroom-category',
      lastPublished: '2026-07-14T12:00:00.000Z',
      fieldData: {
        name: 'Press Room',
        slug: 'newsroom',
        'mega-menu-summary': 'CMS-owned company news navigation copy.',
        'sort-order': 30
      }
    }
  ]);

  assert.deepEqual(
    categories.map(({ id, page, title, cardSummary }) => ({ id, page, title, cardSummary })),
    [
      {
        id: 'resiliency',
        page: 'resiliency-reports.html',
        title: 'Global Risk Briefs',
        cardSummary: 'Edit this once in the Insight Categories CMS collection.'
      },
      {
        id: 'newsroom',
        page: 'newsroom.html',
        title: 'Press Room',
        cardSummary: 'CMS-owned company news navigation copy.'
      }
    ]
  );
});

test('serves global categories and article items from the public Insights endpoint', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.includes('/collections/categories/items')) {
      return new Response(
        JSON.stringify({
          items: [
            {
              id: 'category-resiliency',
              lastPublished: '2026-07-14T12:00:00.000Z',
              fieldData: {
                name: 'Global Risk Briefs',
                slug: 'resiliency-reports',
                'mega-menu-summary': 'One CMS edit updates every menu.'
              }
            }
          ]
        })
      );
    }

    if (url.includes('/collections/subscription/items')) {
      return new Response(
        JSON.stringify({
          items: [
            {
              id: 'global-subscription',
              lastPublished: '2026-07-16T19:40:00.000Z',
              fieldData: {
                heading: 'Receive new Cato insights.',
                'supporting-copy': 'One CMS edit updates every subscription CTA.',
                'button-text': 'Join alerts'
              }
            }
          ]
        })
      );
    }

    return new Response(
      JSON.stringify({
        items: [
          {
            id: 'insight-one',
            lastPublished: '2026-07-14T12:00:00.000Z',
            fieldData: {
              name: 'Supply update',
              slug: 'supply-update',
              categories: ['69fd0f88dd6c789f8c5720a5'],
              'content-label': 'Global Risk Briefs'
            }
          }
        ]
      })
    );
  };

  try {
    const response = await worker.fetch(new Request('https://example.com/api/cato/insights'), {
      WEBFLOW_AGENT_ACCESS: 'test-token',
      WEBFLOW_INSIGHTS_COLLECTION_ID: 'insights',
      WEBFLOW_INSIGHT_CATEGORIES_COLLECTION_ID: 'categories',
      WEBFLOW_SUBSCRIPTION_CTA_COLLECTION_ID: 'subscription'
    });
    const payload = await response.json();

    assert.equal(response.status, 200);
    assert.equal(payload.categories[0].title, 'Global Risk Briefs');
    assert.equal(payload.categories[0].cardSummary, 'One CMS edit updates every menu.');
    assert.equal(payload.items[0].title, 'Supply update');
    assert.deepEqual(payload.subscription, {
      heading: 'Receive new Cato insights.',
      supportingCopy: 'One CMS edit updates every subscription CTA.',
      buttonText: 'Join alerts'
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('normalizes published resiliency insights with the existing endpoint shape', () => {
  const items = normalizeInsights(
    [
      {
        id: 'draft',
        isDraft: true,
        lastPublished: null,
        fieldData: {
          name: 'Draft alert',
          slug: 'draft-alert',
          categories: ['69fd0f88dd6c789f8c5720a5']
        }
      },
      {
        id: 'published',
        isDraft: true,
        lastPublished: '2026-05-07T00:00:00.000Z',
        fieldData: {
          name: 'Nasal Oral Endotracheal Tubes Backorders',
          slug: 'nasal-oral-endotracheal-tubes-backorders',
          categories: ['69fd0f88dd6c789f8c5720a5'],
          'resource-type': '0e5ef31b9a043353f4c9fc760c3c669b',
          'content-label': 'Resiliency Report',
          'short-summary': 'Allocation pressure is concentrated in pediatric sizes.',
          'publish-date': '2026-05-07T00:00:00.000Z'
        }
      }
    ],
    { category: 'resiliency' }
  );

  assert.equal(items.length, 1);
  assert.deepEqual(
    {
      title: items[0].title,
      slug: items[0].slug,
      href: items[0].href,
      category: items[0].category,
      pill: items[0].pill
    },
    {
      title: 'Nasal Oral Endotracheal Tubes Backorders',
      slug: 'nasal-oral-endotracheal-tubes-backorders',
      href: '/insights/nasal-oral-endotracheal-tubes-backorders',
      category: 'resiliency',
      pill: 'Resiliency Report'
    }
  );
});

test('normalizes team members for endpoint-driven leadership and board components', () => {
  const people = normalizeTeam([
    {
      id: 'ryan',
      lastPublished: '2026-07-06T15:44:00.000Z',
      fieldData: {
        name: 'Ryan Zackon',
        slug: 'ryan-zackon',
        type: '6319b950e246fe2e75f029a26f942eb0',
        'job-position': 'President & Chief Executive Officer',
        bio: '<p>CEO profile.</p>',
        'profile-image': {
          url: 'https://cdn.example.com/ryan-zackon-rz-placeholder.svg'
        },
        order: 5
      }
    },
    {
      id: 'bala',
      lastPublished: '2026-03-12T15:07:00.000Z',
      fieldData: {
        name: 'Bala Iyer',
        type: '6319b950e246fe2e75f029a26f942eb0',
        'job-position': 'Board Chair',
        bio: '<p>Board chair profile.</p>',
        'profile-image': {
          url: 'https://cdn.example.com/bala.webp'
        },
        order: 1
      }
    }
  ]);

  assert.deepEqual(
    people.map((person) => [person.name, person.group, person.imageUrl]),
    [
      ['Bala Iyer', 'board', 'https://cdn.example.com/bala.webp'],
      ['Ryan Zackon', 'leadership', ''],
      ['Ryan Zackon', 'board', '']
    ]
  );
});

test('filters team members by group after expanding both-group profiles', () => {
  const people = normalizeTeam(
    [
      {
        id: 'ryan',
        lastPublished: '2026-07-06T15:44:00.000Z',
        fieldData: {
          name: 'Ryan Zackon',
          type: '6319b950e246fe2e75f029a26f942eb0',
          'job-position': 'President & Chief Executive Officer',
          order: 1
        }
      }
    ],
    { group: 'leadership' }
  );

  assert.equal(people.length, 1);
  assert.equal(people[0].group, 'leadership');
});

test('converts Webflow rich text bio HTML to plain text for modals', () => {
  assert.equal(
    htmlToPlainText('<p>Finance &amp; transformation<br>leader.</p>'),
    'Finance & transformation\nleader.'
  );
});

test('does not expose raw rich text bio through team fieldData', () => {
  const [person] = normalizeTeam([
    {
      id: 'ryan',
      lastPublished: '2026-07-06T15:44:00.000Z',
      fieldData: {
        name: 'Ryan Zackon',
        type: 'b611c7f779873dca0854edd623ff287f',
        bio: '<p>Ryan leads Cato &amp; healthcare teams.</p>',
        order: 1
      }
    }
  ]);

  assert.equal(person.bio, 'Ryan leads Cato & healthcare teams.');
  assert.equal(person.fieldData.bio, 'Ryan leads Cato & healthcare teams.');
  assert.doesNotMatch(person.fieldData.bio, /<p>/);
});
