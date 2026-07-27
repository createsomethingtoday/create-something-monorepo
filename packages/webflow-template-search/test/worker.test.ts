import { createHmac } from 'node:crypto';

import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  acquireSyncJobLock,
  backfillCreatorFieldsByName,
  backfillCreatorFieldsFromLookup,
  getPublicSearchCacheVersion,
  heartbeatSyncJobLock,
  listTemplateImageBackfillRows,
  listTemplateImageRefreshRows,
  markTemplateImageBackfillAttempts,
  recordSyncSummary,
  setSyncCursor,
  updateTemplateDocumentImages,
  updateTemplateImagesFromWebflow,
} from '../src/db.js';
import worker from '../src/index.js';
import { DESIGNERS_COLLECTION_ID, TEMPLATES_COLLECTION_ID, extractTemplateOffer } from '../src/webflow.js';
import { installAirtableFetchMock } from './support/airtable.js';
import { callScheduled, callWorker, createTestEnv } from './support/worker.js';

const LOOKUPS = {
  styles: [
    { id: 'style-dark', fields: { Name: 'Dark', '🥞CMS Slug': 'dark-websites' } },
    { id: 'style-modern', fields: { Name: 'Modern', '🥞CMS Slug': 'modern' } },
  ],
  childCategories: [
    {
      id: 'parent-technology',
      fields: {
        Category: 'Technology',
        'Display name': 'Technology',
        Tier: 'Parent',
        type: 'category_group',
      },
    },
    {
      id: 'parent-architecture-design',
      fields: {
        Category: 'Architecture & Design',
        'Display name': 'Architecture & Design',
        Tier: 'Parent',
        type: 'category_group',
      },
    },
    {
      id: 'child-ai',
      fields: {
        Category: 'AI',
        'Display name': 'AI',
        'Parent Category': ['parent-technology'],
        'Parent Category Name': 'Technology',
        '🪣Category Groups': 'technology-websites',
        Tier: 'Child',
        type: 'category',
        'Related Keywords': 'automation, agent',
      },
    },
    {
      id: 'child-saas',
      fields: {
        Category: 'Software & SaaS',
        'Display name': 'Software & SaaS',
        'Parent Category': ['parent-technology'],
        'Parent Category Name': 'Technology',
        '🪣Category Groups': 'technology-websites',
        Tier: 'Child',
        type: 'category',
        'Related Keywords': 'saas, software',
      },
    },
    {
      id: 'child-architecture',
      fields: {
        Category: 'Architecture',
        'Display name': 'Architecture',
        'Parent Category': ['parent-architecture-design'],
        'Parent Category Name': 'Architecture & Design',
        '🪣Category Groups': 'architecture-and-design-websites',
        Tier: 'Child',
        type: 'category',
        'Related Keywords': 'architecture, design',
      },
    },
  ],
  tags: [{ id: 'tag-automation', fields: { Name: 'Automation', '🥞CMS Slug': 'automation' } }],
  creators: [
    { id: 'creator-brix', fields: { Name: 'BRIX Templates', '🥞CMS Slug': 'brix-templates' } },
    { id: 'creator-arini', fields: { Name: 'Arini Studio', '🥞CMS Slug': 'arini-studio' } },
    { id: 'creator-temlis', fields: { Name: 'Temlis', '🥞CMS Slug': 'temlis' } },
  ],
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
      'ℹ️🪣Categories': ['child-ai'],
      'ℹ️🪣Categories (Text)': ['AI'],
      '🥞CMS Slug (from ℹ️🪣Categories)': ['ai-websites'],
      'ℹ️👘Styles': ['style-modern'],
      'ℹ️🏷️Tags (Multi)': ['tag-automation'],
      '🥞Template Type (🏗️ only)': 'Multi Layout',
      'Is free?': 1, // Stale checkbox on a paid template; numeric price should win.
      '🥞Is Currently Featured? (🏗️ only)': 1,
      'ℹ️Is Featured? (🖥️, 🏗️only)': 0,
      '🖌️Popularity Score': 87.4,
      '📋 Unique Viewers': 2400,
      '📋 Cumulative Purchases': 21,
      '🥞💲Template Price Filter (🏗️ only)': 169,
      '🚀📅Published Date': '2026-03-01',
      '🥞CMS Slug (formula)': 'agentflow-website-template',
      '🎨Creator': ['creator-brix'],
      '🎨Creator Name': 'BRIX Templates',
      '🖼️Thumbnail Image': [{ url: 'https://example.com/agentflow.png' }],
      '🔗Listing URL': 'https://webflow.com/templates/html/agentflow-website-template',
      '🔗Preview Site URL': 'https://agentflow.example.com',
      '🔗Website URL': 'https://webflow.com/templates/html/agentflow-website-template',
      'ℹ️MRP ID': ['mrp-agentflow'],
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
      'ℹ️🪣Categories': ['child-ai'],
      'ℹ️🪣Categories (Text)': ['AI'],
      '🥞CMS Slug (from ℹ️🪣Categories)': ['ai-websites'],
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
      '👀📅Decision Date (Override)': '2026-04-05',
      '🚀📅Published Date': '2026-02-15',
      '🥞CMS Slug (formula)': 'setrex-website-template',
      '🎨Creator': ['creator-arini'],
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
      'ℹ️🪣Categories': ['child-saas'],
      'ℹ️🪣Categories (Text)': ['Software & SaaS'],
      '🥞CMS Slug (from ℹ️🪣Categories)': ['software-and-saas-websites'],
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
      '🎨Creator': ['creator-temlis'],
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
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function signedWebhookRequest(payload: unknown, secret = 'webhook-secret') {
  const body = JSON.stringify(payload);
  return new Request('https://templates.test/api/templates/webhooks/webflow', {
    method: 'POST',
    body,
    headers: {
      'content-type': 'application/json',
      'x-webflow-signature': createHmac('sha256', secret).update(body).digest('hex'),
    },
  });
}

function installSearchCacheStub() {
  const store = new Map<string, Response>();
  const match = vi.fn(async (request: Request) => store.get(request.url)?.clone());
  const put = vi.fn(async (request: Request, response: Response) => {
    store.set(request.url, response.clone());
  });

  vi.stubGlobal('caches', {
    default: { match, put },
  });

  return { store, match, put };
}

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

  it('requires auth for sync status', async () => {
    const { env, close } = createTestEnv();
    try {
      const response = await callWorker(new Request('https://templates.test/api/templates/admin/sync-status'), env);
      expect(response.status).toBe(401);
    } finally {
      close();
    }
  });

  it('returns 409 when another sync job is running', async () => {
    const { env, close } = createTestEnv();

    try {
      await acquireSyncJobLock(env.DB, 'incremental');

      const response = await callWorker(
        new Request('https://templates.test/api/templates/admin/sync', {
          method: 'POST',
          headers: { Authorization: 'Bearer sync-token' },
        }),
        env,
      );
      const payload = (await response.json()) as { error: string; active_job: { mode: string; status: string } | null };

      expect(response.status).toBe(409);
      expect(payload.error).toBe('A template sync job is already running.');
      expect(payload.active_job).toMatchObject({ mode: 'incremental', status: 'running' });
    } finally {
      close();
    }
  });

  it('allows targeted record sync to replace a stale running sync lock', async () => {
    const fetchMock = installAirtableFetchMock({
      publishedAssets: [PUBLISHED_ASSETS[0]],
      styles: LOOKUPS.styles,
      childCategories: LOOKUPS.childCategories,
      tags: LOOKUPS.tags,
    });
    const { env, close } = createTestEnv();
    env.WEBFLOW_API_TOKEN = 'test-webflow-token';
    env.WEBFLOW_TEMPLATE_ASSET_SITE_ID = '5e593fb060cf877cf875dd1f';

    try {
      await acquireSyncJobLock(env.DB, 'incremental');
      await env.DB.prepare(
        `UPDATE sync_jobs
         SET heartbeat_at = ?, expires_at = ?
         WHERE lock_key = ?`,
      )
        .bind('2026-01-01T00:00:00.000Z', '2099-01-01T00:00:00.000Z', 'template_sync')
        .run();

      const response = await callWorker(
        new Request('https://templates.test/api/templates/admin/sync-records', {
          method: 'POST',
          headers: {
            Authorization: 'Bearer sync-token',
            'content-type': 'application/json',
          },
          body: JSON.stringify({ ids: ['recAgentflow'] }),
        }),
        env,
      );
      expect(response.status).toBe(200);

      const row = await env.DB.prepare('SELECT mode, status FROM sync_jobs WHERE lock_key = ?')
        .bind('template_sync')
        .first<{ mode: string; status: string }>();
      expect(row).toMatchObject({ mode: 'records', status: 'succeeded' });
    } finally {
      fetchMock.mockRestore();
      close();
    }
  });

  it('allows image refresh to replace a stale running sync lock', async () => {
    const fetchMock = installAirtableFetchMock({
      publishedAssets: [PUBLISHED_ASSETS[0]],
      styles: LOOKUPS.styles,
      childCategories: LOOKUPS.childCategories,
      tags: LOOKUPS.tags,
      creators: LOOKUPS.creators,
    });
    const { env, close } = createTestEnv();

    try {
      const lock = await acquireSyncJobLock(env.DB, 'image_refresh', { now: '2026-06-18T22:00:00.000Z' });
      expect(lock.acquired).toBe(true);
      await env.DB.prepare(
        `UPDATE sync_jobs
         SET heartbeat_at = ?, expires_at = ?
         WHERE lock_key = ?`,
      )
        .bind('2026-06-18T22:00:00.000Z', '2099-01-01T00:00:00.000Z', 'template_sync')
        .run();

      const response = await callWorker(
        new Request('https://templates.test/api/templates/admin/refresh-images', {
          method: 'POST',
          headers: { Authorization: 'Bearer sync-token' },
        }),
        env,
      );
      expect(response.status).toBe(200);

      const row = await env.DB.prepare('SELECT job_id, mode, status FROM sync_jobs WHERE lock_key = ?')
        .bind('template_sync')
        .first<{ job_id: string; mode: string; status: string }>();
      expect(row).toMatchObject({ mode: 'image_refresh', status: 'succeeded' });
      expect(row?.job_id).not.toBe(lock.lock.jobId);
    } finally {
      fetchMock.mockRestore();
      close();
    }
  });

  it('can start image refresh in the background and record the summary', async () => {
    const fetchMock = installAirtableFetchMock({
      publishedAssets: [PUBLISHED_ASSETS[0]],
      styles: LOOKUPS.styles,
      childCategories: LOOKUPS.childCategories,
      tags: LOOKUPS.tags,
      creators: LOOKUPS.creators,
    });
    const { env, close } = createTestEnv();

    try {
      const response = await callWorker(
        new Request('https://templates.test/api/templates/admin/refresh-images?background=true', {
          method: 'POST',
          headers: { Authorization: 'Bearer sync-token' },
        }),
        env,
      );
      const payload = (await response.json()) as { status: string };
      expect(response.status).toBe(200);
      expect(payload.status).toBe('image_refresh_started');

      const status = await callWorker(
        new Request('https://templates.test/api/templates/admin/sync-status', {
          headers: { Authorization: 'Bearer sync-token' },
        }),
        env,
      );
      const statusPayload = (await status.json()) as {
        sync_state: Record<string, { value: { mode?: string; fetched_records?: number } }>;
      };
      expect(statusPayload.sync_state.last_image_refresh.value).toMatchObject({
        mode: 'image_refresh',
        fetched_records: 1,
      });
    } finally {
      fetchMock.mockRestore();
      close();
    }
  });

  it('rotates generic image backfill past recently unresolved rows', async () => {
    const { env, close } = createTestEnv();

    try {
      const rows = [
        ['recMissingHot', 'missing-hot-template', 'Missing Hot', 1, 100, '2026-06-23T00:00:00.000Z'],
        ['recMissingWarm', 'missing-warm-template', 'Missing Warm', 0, 90, '2026-06-23T00:00:00.000Z'],
        ['recRepairableLater', 'repairable-later-template', 'Repairable Later', 0, 10, '2026-06-22T00:00:00.000Z'],
      ];

      for (const row of rows) {
        await env.DB.prepare(
          `INSERT INTO template_documents (
            id,
            template_slug,
            name,
            is_featured,
            popularity_score,
            source_last_modified_time,
            synced_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        )
          .bind(...row, '2026-06-23T01:00:00.000Z')
          .run();
      }

      await markTemplateImageBackfillAttempts(
        env.DB,
        [
          {
            id: 'recMissingHot',
            templateSlug: 'missing-hot-template',
            name: 'Missing Hot',
            listingUrl: null,
            thumbnailImageUrl: null,
            thumbnailImageSecondaryUrl: null,
          },
          {
            id: 'recMissingWarm',
            templateSlug: 'missing-warm-template',
            name: 'Missing Warm',
            listingUrl: null,
            thumbnailImageUrl: null,
            thumbnailImageSecondaryUrl: null,
          },
        ],
        [],
        '2026-06-23T04:00:00.000Z',
      );

      const selected = await listTemplateImageBackfillRows(env.DB, 1, [], {
        now: '2026-06-23T05:00:00.000Z',
      });

      expect(selected.map((row) => row.id)).toEqual(['recRepairableLater']);
    } finally {
      close();
    }
  });

  it('uses sync job heartbeats to distinguish fresh and stale running locks', async () => {
    const { env, close } = createTestEnv();

    try {
      const lock = await acquireSyncJobLock(env.DB, 'incremental', { now: '2026-06-18T22:00:00.000Z' });
      expect(lock.acquired).toBe(true);

      await heartbeatSyncJobLock(env.DB, lock.lock, '2026-06-18T22:06:00.000Z');
      const freshTakeover = await acquireSyncJobLock(env.DB, 'incremental', {
        now: '2026-06-18T22:15:00.000Z',
        staleHeartbeatMs: 10 * 60 * 1000,
      });
      expect(freshTakeover.acquired).toBe(false);
      expect(freshTakeover.activeJob).toMatchObject({
        job_id: lock.lock.jobId,
        heartbeat_at: '2026-06-18T22:06:00.000Z',
      });

      const staleTakeover = await acquireSyncJobLock(env.DB, 'incremental', {
        now: '2026-06-18T22:17:00.000Z',
        staleHeartbeatMs: 10 * 60 * 1000,
      });
      expect(staleTakeover.acquired).toBe(true);
      expect(staleTakeover.lock.jobId).not.toBe(lock.lock.jobId);
    } finally {
      close();
    }
  });

  it('uses an extended sync lock for manual full rebuilds', async () => {
    const fetchMock = installAirtableFetchMock({
      publishedAssets: PUBLISHED_ASSETS,
      styles: LOOKUPS.styles,
      childCategories: LOOKUPS.childCategories,
      tags: LOOKUPS.tags,
    });
    const { env, close } = createTestEnv();

    try {
      const response = await callWorker(
        new Request('https://templates.test/api/templates/admin/rebuild', {
          method: 'POST',
          headers: { Authorization: 'Bearer sync-token' },
        }),
        env,
      );
      expect(response.status).toBe(200);

      const row = await env.DB.prepare(
        `SELECT mode, status, started_at, expires_at
         FROM sync_jobs
         WHERE lock_key = ?`,
      )
        .bind('template_sync')
        .first<{ mode: string; status: string; started_at: string; expires_at: string }>();
      const ttlMs = new Date(row?.expires_at ?? 0).getTime() - new Date(row?.started_at ?? 0).getTime();

      expect(row).toMatchObject({ mode: 'full', status: 'succeeded' });
      expect(ttlMs).toBe(3 * 60 * 60 * 1000);
    } finally {
      fetchMock.mockRestore();
      close();
    }
  });

  it('can force-refresh creator profiles when a stale sync lock is present', async () => {
    const fetchMock = installAirtableFetchMock({
      publishedAssets: [],
      webflowCollectionItems: {
        [DESIGNERS_COLLECTION_ID]: [
          {
            id: 'designer-brix',
            isArchived: false,
            isDraft: false,
            fieldData: {
              'sync-record-id': 'recDesignerBrix',
              name: 'BRIX Templates',
              slug: 'brix-templates',
              avatar: {
                url: 'https://cdn.prod.website-files.com/site/brix-avatar.webp',
                alt: 'BRIX Templates',
              },
            },
          },
        ],
      },
    });
    const { env, close } = createTestEnv();
    env.WEBFLOW_API_TOKEN = 'test-webflow-cms-token';

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
          'recMismatchedBrixTemplate',
          'mismatched-brix-template',
          'Mismatched BRIX Template',
          'BRIX Templates',
          'recOldBrix',
          'https://webflow.com/templates/designers/airtable-brix',
          'https://v5.airtableusercontent.com/v3/u/53/temporary-brix',
          'Airtable BRIX',
          '2026-05-26T00:00:00.000Z',
      )
        .run();
      await acquireSyncJobLock(env.DB, 'incremental');
      await env.DB.prepare(
        `UPDATE sync_jobs
         SET heartbeat_at = ?, expires_at = ?
         WHERE lock_key = ?`,
      )
        .bind('2026-01-01T00:00:00.000Z', '2099-01-01T00:00:00.000Z', 'template_sync')
        .run();
      const response = await callWorker(
        new Request('https://templates.test/api/templates/admin/refresh-creators?force=true', {
          method: 'POST',
          headers: { Authorization: 'Bearer sync-token' },
        }),
        env,
      );
      const payload = (await response.json()) as { mode: string; fetched_records: number };
      expect(response.status).toBe(200);
      expect(payload).toMatchObject({ mode: 'creator_refresh', fetched_records: 1 });

      const row = await env.DB.prepare(
        `SELECT creator_record_id, creator_profile_url, creator_avatar_url, creator_avatar_alt
         FROM template_documents
         WHERE id = ?`,
      )
        .bind('recMismatchedBrixTemplate')
        .first<{
          creator_record_id: string | null;
          creator_profile_url: string | null;
          creator_avatar_url: string | null;
          creator_avatar_alt: string | null;
        }>();
      expect(row).toEqual({
        creator_record_id: 'recDesignerBrix',
        creator_profile_url: 'https://webflow.com/templates/designers/brix-templates',
        creator_avatar_url: 'https://cdn.prod.website-files.com/site/brix-avatar.webp',
        creator_avatar_alt: 'BRIX Templates',
      });
    } finally {
      fetchMock.mockRestore();
      close();
    }
  });

  it('does not force-refresh creator profiles while a fresh sync lock is running', async () => {
    const { env, close } = createTestEnv();
    env.WEBFLOW_API_TOKEN = 'test-webflow-cms-token';

    try {
      await acquireSyncJobLock(env.DB, 'incremental');
      const response = await callWorker(
        new Request('https://templates.test/api/templates/admin/refresh-creators?force=true', {
          method: 'POST',
          headers: { Authorization: 'Bearer sync-token' },
        }),
        env,
      );
      const payload = (await response.json()) as { error: string; active_job: { mode: string; status: string } | null };

      expect(response.status).toBe(409);
      expect(payload.error).toBe('A template sync job is already running.');
      expect(payload.active_job).toMatchObject({ mode: 'incremental', status: 'running' });
    } finally {
      close();
    }
  });

  it('force-refreshes requested creator profiles through targeted Webflow designer lookup', async () => {
    const fetchMock = installAirtableFetchMock({
      publishedAssets: [],
      webflowCollectionItems: {
        [DESIGNERS_COLLECTION_ID]: [
          {
            id: 'designer-brix',
            isArchived: false,
            isDraft: false,
            fieldData: {
              'sync-record-id': 'creator-brix',
              name: 'BRIX Templates',
              slug: 'brix-templates',
              avatar: {
                url: 'https://cdn.prod.website-files.com/site/brix-targeted.webp',
                alt: 'BRIX Templates',
              },
            },
          },
          {
            id: 'designer-webestica',
            isArchived: false,
            isDraft: false,
            fieldData: {
              'sync-record-id': 'creator-webestica',
              name: 'Webestica',
              slug: 'webestica',
              avatar: {
                url: 'https://cdn.prod.website-files.com/site/webestica-targeted.webp',
                alt: 'Webestica',
              },
            },
          },
        ],
      },
    });
    const { env, close } = createTestEnv();
    env.WEBFLOW_API_TOKEN = 'test-webflow-cms-token';

    try {
      await env.DB.prepare(
        `INSERT INTO template_documents (
          id,
          template_slug,
          name,
          creator_name,
          creator_record_id,
          creator_avatar_url,
          synced_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?), (?, ?, ?, ?, ?, ?, ?)`,
      )
        .bind(
          'recBrixTemplate',
          'brix-template',
          'BRIX Template',
          'BRIX Templates',
          'creator-brix',
          'https://v5.airtableusercontent.com/v3/u/53/temporary-brix',
          '2026-05-26T00:00:00.000Z',
          'recWebesticaTemplate',
          'webestica-template',
          'Webestica Template',
          'Webestica',
          'creator-webestica',
          'https://v5.airtableusercontent.com/v3/u/53/temporary-webestica',
          '2026-05-26T00:00:00.000Z',
        )
        .run();

      const response = await callWorker(
        new Request('https://templates.test/api/templates/admin/refresh-creators?force=true&name=BRIX%20Templates', {
          method: 'POST',
          headers: { Authorization: 'Bearer sync-token' },
        }),
        env,
      );
      const payload = (await response.json()) as { mode: string; fetched_records: number; refreshed_records: number };
      expect(response.status).toBe(200);
      expect(payload).toMatchObject({ mode: 'creator_refresh', fetched_records: 1 });

      const rows = await env.DB.prepare(
        `SELECT id, creator_avatar_url
         FROM template_documents
         WHERE id IN (?, ?)
         ORDER BY id`,
      )
        .bind('recBrixTemplate', 'recWebesticaTemplate')
        .all<{ id: string; creator_avatar_url: string | null }>();
      expect(rows.results).toEqual([
        { id: 'recBrixTemplate', creator_avatar_url: 'https://cdn.prod.website-files.com/site/brix-targeted.webp' },
        { id: 'recWebesticaTemplate', creator_avatar_url: 'https://v5.airtableusercontent.com/v3/u/53/temporary-webestica' },
      ]);
    } finally {
      fetchMock.mockRestore();
      close();
    }
  });

  it('syncs specific Airtable template records by ID', async () => {
    const fetchMock = installAirtableFetchMock({
      publishedAssets: [
        {
          ...PUBLISHED_ASSETS[0],
          fields: {
            ...PUBLISHED_ASSETS[0].fields,
            '🎨Creator': ['recDesignerBrix'],
            '🎨Creator Name': 'BRIX Templates',
          },
        },
        ...PUBLISHED_ASSETS.slice(1),
      ],
      styles: LOOKUPS.styles,
      childCategories: LOOKUPS.childCategories,
      tags: LOOKUPS.tags,
      creators: [
        {
          id: 'recDesignerBrix',
          fields: {
            Name: 'BRIX Templates',
            '🥞CMS Slug': 'airtable-brix',
            '🖼️Avatar (Primary)': [{ url: 'https://cdn.prod.website-files.com/site/brix-airtable-avatar.webp' }],
            '🖼️Avatar Alt Text': 'Airtable BRIX',
          },
        },
      ],
      webflowCollectionItems: {
        [DESIGNERS_COLLECTION_ID]: [
          {
            id: 'designer-brix',
            isArchived: false,
            isDraft: false,
            fieldData: {
              'sync-record-id': 'recDesignerBrix',
              name: 'BRIX Templates',
              slug: 'brix-templates',
              avatar: {
                url: 'https://cdn.prod.website-files.com/site/brix-avatar.webp',
                alt: 'BRIX Templates',
              },
            },
          },
        ],
      },
    });
    const { env, close } = createTestEnv();
    env.WEBFLOW_API_TOKEN = 'test-webflow-cms-token';

    try {
      const response = await callWorker(
        new Request('https://templates.test/api/templates/admin/sync-records', {
          method: 'POST',
          headers: {
            Authorization: 'Bearer sync-token',
            'content-type': 'application/json',
          },
          body: JSON.stringify({ ids: ['recAgentflow'] }),
        }),
        env,
      );
      const payload = (await response.json()) as { mode: string; fetched_records: number; indexed_records: number };
      expect(response.status).toBe(200);
      expect(payload).toMatchObject({ mode: 'records', fetched_records: 1, indexed_records: 1 });

      const search = await callWorker(new Request('https://templates.test/api/templates/search?q=agentflow'), env);
      const searchPayload = (await search.json()) as {
        items: Array<{
          name: string;
          price: number | null;
          is_free: boolean;
          creator_profile_url: string | null;
          creator_avatar_url: string | null;
          creator_avatar_alt: string | null;
        }>;
      };
      expect(
        searchPayload.items.map((item) => ({
          name: item.name,
          price: item.price,
          is_free: item.is_free,
          creator_profile_url: item.creator_profile_url,
          creator_avatar_url: item.creator_avatar_url,
          creator_avatar_alt: item.creator_avatar_alt,
        })),
      ).toEqual([
        {
          name: 'Agentflow',
          price: 169,
          is_free: false,
          creator_profile_url: 'https://webflow.com/templates/designers/brix-templates',
          creator_avatar_url: 'https://cdn.prod.website-files.com/site/brix-avatar.webp',
          creator_avatar_alt: 'BRIX Templates',
        },
      ]);
      expect(fetchMock.mock.calls.some(([input]) => new URL(typeof input === 'string' ? input : input.url).hostname === 'api.webflow.com')).toBe(
        true,
      );

      const missingSearch = await callWorker(new Request('https://templates.test/api/templates/search?q=setrex'), env);
      const missingPayload = (await missingSearch.json()) as { pagination: { total_items: number } };
      expect(missingPayload.pagination.total_items).toBe(0);
    } finally {
      fetchMock.mockRestore();
      close();
    }
  });

  it('includes name-only creator records in creator slug search results after rebuild', async () => {
    const codepluz = {
      ...PUBLISHED_ASSETS[0],
      id: 'recCodepluz',
      fields: {
        ...PUBLISHED_ASSETS[0].fields,
        Name: 'Codepluz',
        '🥞CMS Slug': 'codepluz-website-template',
        '🥞CMS Slug (formula)': 'codepluz-website-template',
        '🎨Creator': ['creator-onmix'],
        '🎨Creator Name': 'Onmix',
        '🔗Listing URL': 'https://webflow.com/templates/html/codepluz-website-template',
        '🔗Preview Site URL': 'https://codepluz.example.com',
        '🔗Website URL': 'https://webflow.com/templates/html/codepluz-website-template',
      },
    };
    const fitizo = {
      ...PUBLISHED_ASSETS[1],
      id: 'recFitizo',
      fields: {
        ...PUBLISHED_ASSETS[1].fields,
        Name: 'Fitizo',
        '🥞CMS Slug': 'fitizo-gym-website-template',
        '🥞CMS Slug (formula)': 'fitizo-gym-website-template',
        '🎨Creator': [],
        '🎨Creator Name': 'Onmix',
        '🔗Listing URL': 'https://webflow.com/templates/html/fitizo-gym-website-template',
        '🔗Preview Site URL': 'https://fitizo.example.com',
        '🔗Website URL': 'https://webflow.com/templates/html/fitizo-gym-website-template',
      },
    };
    const fetchMock = installAirtableFetchMock({
      publishedAssets: [codepluz, fitizo],
      styles: LOOKUPS.styles,
      childCategories: LOOKUPS.childCategories,
      tags: LOOKUPS.tags,
      creators: [
        {
          id: 'creator-onmix',
          fields: {
            Name: 'Onmix',
            '🥞CMS Slug': 'onmix',
            '🖼️Avatar (Primary)': [{ url: 'https://cdn.prod.website-files.com/site/onmix-avatar.webp' }],
            '🖼️Avatar Alt Text': 'Onmix',
          },
        },
      ],
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
        new Request('https://templates.test/api/templates/search?creator_slug=onmix&page_size=10'),
        env,
      );
      const payload = (await response.json()) as {
        items: Array<{ name: string; creator_slug: string | null; creator_profile_url: string | null }>;
        pagination: { total_items: number };
      };

      expect(payload.pagination.total_items).toBe(2);
      expect(payload.items.map((item) => item.name).sort()).toEqual(['Codepluz', 'Fitizo']);
      expect(payload.items.find((item) => item.name === 'Fitizo')).toMatchObject({
        creator_slug: 'onmix',
        creator_profile_url: 'https://webflow.com/templates/designers/onmix',
      });
    } finally {
      fetchMock.mockRestore();
      close();
    }
  });

  it('continues targeted record sync when Webflow designer enrichment returns a 500', async () => {
    const fetchMock = installAirtableFetchMock({
      publishedAssets: [
        {
          ...PUBLISHED_ASSETS[0],
          fields: {
            ...PUBLISHED_ASSETS[0].fields,
            '🎨Creator': ['creator-brix'],
            '🎨Creator Name': 'BRIX Templates',
          },
        },
      ],
      styles: LOOKUPS.styles,
      childCategories: LOOKUPS.childCategories,
      tags: LOOKUPS.tags,
      creators: LOOKUPS.creators,
      webflowCollectionItemErrors: {
        [DESIGNERS_COLLECTION_ID]: {
          status: 500,
          body: { message: 'An Internal Error Occurred', code: 'internal_error', details: [] },
          headers: { 'retry-after': '0' },
        },
      },
    });
    const { env, close } = createTestEnv();
    env.WEBFLOW_API_TOKEN = 'test-webflow-cms-token';

    try {
      const response = await callWorker(
        new Request('https://templates.test/api/templates/admin/sync-records', {
          method: 'POST',
          headers: {
            Authorization: 'Bearer sync-token',
            'content-type': 'application/json',
          },
          body: JSON.stringify({ ids: ['recAgentflow'] }),
        }),
        env,
      );
      const payload = (await response.json()) as {
        mode: string;
        indexed_records: number;
        warnings?: Array<{ source: string; message: string }>;
      };
      expect(response.status).toBe(200);
      expect(payload).toMatchObject({
        mode: 'records',
        indexed_records: 1,
        warnings: [
          {
            source: 'webflow_designer_targets',
          },
        ],
      });
      expect(payload.warnings?.[0]?.message).toContain('Webflow API error (500)');
      expect(fetchMock.mock.calls.some(([input]) => new URL(typeof input === 'string' ? input : input.url).hostname === 'api.webflow.com')).toBe(
        true,
      );

      const search = await callWorker(new Request('https://templates.test/api/templates/search?q=agentflow'), env);
      const searchPayload = (await search.json()) as {
        items: Array<{ name: string; creator_slug: string | null; creator_profile_url: string | null }>;
      };
      expect(searchPayload.items).toHaveLength(1);
      expect(searchPayload.items[0]).toMatchObject({
        name: 'Agentflow',
        creator_slug: 'brix-templates',
        creator_profile_url: 'https://webflow.com/templates/designers/brix-templates',
      });

      const status = await callWorker(
        new Request('https://templates.test/api/templates/admin/sync-status', {
          headers: { Authorization: 'Bearer sync-token' },
        }),
        env,
      );
      const statusPayload = (await status.json()) as {
        sync_state: Record<string, { value: { mode?: string; warnings?: Array<{ source: string }> } } | undefined>;
      };
      expect(statusPayload.sync_state.last_sync_warning?.value).toMatchObject({
        mode: 'records',
        warnings: [{ source: 'webflow_designer_targets' }],
      });
    } finally {
      fetchMock.mockRestore();
      close();
    }
  });

  it('retries transient Webflow target rate limits before indexing targeted records', async () => {
    const fetchMock = installAirtableFetchMock({
      publishedAssets: [
        {
          ...PUBLISHED_ASSETS[0],
          fields: {
            ...PUBLISHED_ASSETS[0].fields,
            '🎨Creator': ['creator-brix'],
            '🎨Creator Name': 'BRIX Templates',
            '🖼️Thumbnail Image': [{ url: 'https://v5.airtableusercontent.com/v3/u/53/temporary-agentflow' }],
          },
        },
      ],
      styles: LOOKUPS.styles,
      childCategories: LOOKUPS.childCategories,
      tags: LOOKUPS.tags,
      creators: LOOKUPS.creators,
      webflowCollectionItemErrorSequences: {
        [TEMPLATES_COLLECTION_ID]: [
          {
            status: 429,
            body: { message: 'Too Many Requests', code: 'too_many_requests', details: [] },
            headers: { 'retry-after': '0' },
          },
        ],
        [DESIGNERS_COLLECTION_ID]: [
          {
            status: 429,
            body: { message: 'Too Many Requests', code: 'too_many_requests', details: [] },
            headers: { 'retry-after': '0' },
          },
        ],
      },
      webflowCollectionItems: {
        [TEMPLATES_COLLECTION_ID]: [
          {
            id: 'template-agentflow',
            isArchived: false,
            isDraft: false,
            fieldData: {
              'sync-record-id': 'recAgentflow',
              name: 'Agentflow',
              slug: 'agentflow-website-template',
              'main-thumbnail': { url: 'https://cdn.prod.website-files.com/site/agentflow-retried.webp' },
            },
          },
        ],
        [DESIGNERS_COLLECTION_ID]: [
          {
            id: 'designer-brix',
            isArchived: false,
            isDraft: false,
            fieldData: {
              'sync-record-id': 'creator-brix',
              name: 'BRIX Templates',
              slug: 'brix-templates',
              avatar: {
                url: 'https://cdn.prod.website-files.com/site/brix-retried.webp',
                alt: 'BRIX Templates',
              },
            },
          },
        ],
      },
    });
    const { env, close } = createTestEnv();
    env.WEBFLOW_API_TOKEN = 'test-webflow-cms-token';

    try {
      const response = await callWorker(
        new Request('https://templates.test/api/templates/admin/sync-records', {
          method: 'POST',
          headers: {
            Authorization: 'Bearer sync-token',
            'content-type': 'application/json',
          },
          body: JSON.stringify({ ids: ['recAgentflow'] }),
        }),
        env,
      );
      const payload = (await response.json()) as { warnings?: Array<{ source: string }> };
      expect(response.status).toBe(200);
      expect(payload.warnings).toBeUndefined();

      const search = await callWorker(new Request('https://templates.test/api/templates/search?q=agentflow'), env);
      const searchPayload = (await search.json()) as {
        items: Array<{ thumbnail_image_url: string | null; creator_avatar_url: string | null }>;
      };
      expect(searchPayload.items[0]).toMatchObject({
        thumbnail_image_url: 'https://cdn.prod.website-files.com/site/agentflow-retried.webp',
        creator_avatar_url: 'https://cdn.prod.website-files.com/site/brix-retried.webp',
      });

      const webflowItemUrls = fetchMock.mock.calls
        .map(([input]) => new URL(typeof input === 'string' ? input : input.url))
        .filter((url) => url.hostname === 'api.webflow.com' && /\/v2\/collections\/[^/]+\/items$/.test(url.pathname));
      expect(webflowItemUrls.some((url) => url.searchParams.get('slug') === 'agentflow-website-template')).toBe(true);
      expect(webflowItemUrls.some((url) => url.searchParams.get('slug') === 'brix-templates')).toBe(true);
      expect(webflowItemUrls.some((url) => url.searchParams.get('name') === 'Agentflow')).toBe(false);
      expect(webflowItemUrls.some((url) => url.searchParams.get('name') === 'BRIX Templates')).toBe(false);
    } finally {
      fetchMock.mockRestore();
      close();
    }
  });

  it('falls back to targeted Webflow name lookup when the Airtable slug is stale', async () => {
    const equalizeAsset = {
      ...PUBLISHED_ASSETS[0],
      id: 'recEqualize',
      fields: {
        ...PUBLISHED_ASSETS[0].fields,
        Name: 'Equalize',
        '🥞CMS Slug (formula)': 'equalize-website-template',
        '🎨Creator': ['creator-brix'],
        '🎨Creator Name': 'BRIX Templates',
        '🖼️Thumbnail Image': [{ url: 'https://v5.airtableusercontent.com/v3/u/53/temporary-equalize' }],
        '🔗Listing URL': 'https://webflow.com/templates/html/equalize-website-template',
        '🔗Preview Site URL': 'https://equalize.webflow.io',
        '🔗Website URL': 'https://equalize.webflow.io',
      },
    };
    const fetchMock = installAirtableFetchMock({
      publishedAssets: [equalizeAsset],
      styles: LOOKUPS.styles,
      childCategories: LOOKUPS.childCategories,
      tags: LOOKUPS.tags,
      creators: LOOKUPS.creators,
      webflowCollectionItems: {
        [TEMPLATES_COLLECTION_ID]: [
          {
            id: 'item-equalize',
            isArchived: false,
            isDraft: false,
            fieldData: {
              name: 'Equalize',
              slug: 'equalize-charity-website-template',
              thumbnail: { url: 'https://cdn.prod.website-files.com/site/equalize.webp' },
            },
          },
        ],
        [DESIGNERS_COLLECTION_ID]: [
          {
            id: 'designer-brix',
            isArchived: false,
            isDraft: false,
            fieldData: {
              'sync-record-id': 'creator-brix',
              name: 'BRIX Templates',
              slug: 'brix-templates',
              avatar: {
                url: 'https://cdn.prod.website-files.com/site/brix.webp',
                alt: 'BRIX Templates',
              },
            },
          },
        ],
      },
    });
    const { env, close } = createTestEnv();
    env.WEBFLOW_API_TOKEN = 'test-webflow-cms-token';

    try {
      const response = await callWorker(
        new Request('https://templates.test/api/templates/admin/sync-records', {
          method: 'POST',
          headers: {
            Authorization: 'Bearer sync-token',
            'content-type': 'application/json',
          },
          body: JSON.stringify({ ids: ['recEqualize'] }),
        }),
        env,
      );
      const payload = (await response.json()) as { warnings?: Array<{ source: string }> };
      expect(response.status).toBe(200);
      expect(payload.warnings).toBeUndefined();

      const search = await callWorker(new Request('https://templates.test/api/templates/search?q=equalize'), env);
      const searchPayload = (await search.json()) as {
        items: Array<{ template_slug: string; thumbnail_image_url: string | null; creator_avatar_url: string | null }>;
      };
      expect(searchPayload.items[0]).toMatchObject({
        template_slug: 'equalize-charity-website-template',
        thumbnail_image_url: 'https://cdn.prod.website-files.com/site/equalize.webp',
        creator_avatar_url: 'https://cdn.prod.website-files.com/site/brix.webp',
      });

      const templateItemUrls = fetchMock.mock.calls
        .map(([input]) => new URL(typeof input === 'string' ? input : input.url))
        .filter((url) => url.hostname === 'api.webflow.com' && url.pathname.includes(TEMPLATES_COLLECTION_ID));
      expect(templateItemUrls.some((url) => url.searchParams.get('slug') === 'equalize-website-template')).toBe(true);
      expect(templateItemUrls.some((url) => url.searchParams.get('name') === 'Equalize')).toBe(true);
    } finally {
      fetchMock.mockRestore();
      close();
    }
  });

  it('preserves stable Webflow assets when targeted enrichment is rate limited', async () => {
    const dataset = {
      publishedAssets: [
        {
          ...PUBLISHED_ASSETS[0],
          fields: {
            ...PUBLISHED_ASSETS[0].fields,
            '🎨Creator': ['creator-brix'],
            '🎨Creator Name': 'BRIX Templates',
            '🖼️Thumbnail Image': [{ url: 'https://v5.airtableusercontent.com/v3/u/53/temporary-agentflow' }],
          },
        },
      ],
      styles: LOOKUPS.styles,
      childCategories: LOOKUPS.childCategories,
      tags: LOOKUPS.tags,
      creators: LOOKUPS.creators,
      webflowCollectionItems: {
        [TEMPLATES_COLLECTION_ID]: [
          {
            id: 'template-agentflow',
            isArchived: false,
            isDraft: false,
            fieldData: {
              'sync-record-id': 'recAgentflow',
              name: 'Agentflow',
              slug: 'agentflow-website-template',
              'main-thumbnail': { url: 'https://cdn.prod.website-files.com/site/agentflow-stable.webp' },
            },
          },
        ],
        [DESIGNERS_COLLECTION_ID]: [
          {
            id: 'designer-brix',
            isArchived: false,
            isDraft: false,
            fieldData: {
              'sync-record-id': 'creator-brix',
              name: 'BRIX Templates',
              slug: 'brix-templates',
              avatar: {
                url: 'https://cdn.prod.website-files.com/site/brix-stable.webp',
                alt: 'BRIX Templates',
              },
            },
          },
        ],
      },
    };
    const fetchMock = installAirtableFetchMock(dataset);
    const { env, close } = createTestEnv();
    env.WEBFLOW_API_TOKEN = 'test-webflow-cms-token';

    try {
      const firstSync = await callWorker(
        new Request('https://templates.test/api/templates/admin/sync-records', {
          method: 'POST',
          headers: {
            Authorization: 'Bearer sync-token',
            'content-type': 'application/json',
          },
          body: JSON.stringify({ ids: ['recAgentflow'] }),
        }),
        env,
      );
      expect(firstSync.status).toBe(200);
      const firstSearch = await callWorker(new Request('https://templates.test/api/templates/search?q=agentflow'), env);
      const firstSearchPayload = (await firstSearch.json()) as {
        items: Array<{ thumbnail_image_url: string | null; creator_avatar_url: string | null }>;
      };
      const stableThumbnailUrl = firstSearchPayload.items[0]?.thumbnail_image_url;
      const stableCreatorAvatarUrl = firstSearchPayload.items[0]?.creator_avatar_url;
      expect(stableThumbnailUrl?.startsWith('https://cdn.prod.website-files.com/')).toBe(true);
      expect(stableCreatorAvatarUrl).toBe('https://cdn.prod.website-files.com/site/brix-stable.webp');

      dataset.webflowCollectionItemErrors = {
        [TEMPLATES_COLLECTION_ID]: {
          status: 429,
          body: { message: 'Too Many Requests', code: 'too_many_requests', details: [] },
          headers: { 'retry-after': '0' },
        },
        [DESIGNERS_COLLECTION_ID]: {
          status: 429,
          body: { message: 'Too Many Requests', code: 'too_many_requests', details: [] },
          headers: { 'retry-after': '0' },
        },
      };

      const secondSync = await callWorker(
        new Request('https://templates.test/api/templates/admin/sync-records', {
          method: 'POST',
          headers: {
            Authorization: 'Bearer sync-token',
            'content-type': 'application/json',
          },
          body: JSON.stringify({ ids: ['recAgentflow'] }),
        }),
        env,
      );
      const secondPayload = (await secondSync.json()) as { warnings?: Array<{ source: string }> };
      expect(secondSync.status).toBe(200);
      expect(secondPayload.warnings).toEqual(
        expect.arrayContaining([
          { source: 'webflow_template_targets', message: expect.any(String) },
          { source: 'webflow_designer_targets', message: expect.any(String) },
        ]),
      );

      const search = await callWorker(new Request('https://templates.test/api/templates/search?q=agentflow'), env);
      const searchPayload = (await search.json()) as {
        items: Array<{ thumbnail_image_url: string | null; creator_avatar_url: string | null }>;
      };
      expect(searchPayload.items[0]).toMatchObject({
        thumbnail_image_url: stableThumbnailUrl,
        creator_avatar_url: stableCreatorAvatarUrl,
      });
    } finally {
      fetchMock.mockRestore();
      close();
    }
  });

  it('removes published templates from search when Airtable marks them detail only', async () => {
    const detailOnlyAsset = {
      ...PUBLISHED_ASSETS[0],
      fields: {
        ...PUBLISHED_ASSETS[0].fields,
        '👁️Search Visibility (🏗️ only)': 'Detail only',
      },
    };
    const fetchMock = installAirtableFetchMock({
      ...LOOKUPS,
      publishedAssets: [detailOnlyAsset],
    });
    const { env, close } = createTestEnv();

    try {
      const response = await callWorker(
        new Request('https://templates.test/api/templates/admin/sync-records', {
          method: 'POST',
          headers: {
            Authorization: 'Bearer sync-token',
            'content-type': 'application/json',
          },
          body: JSON.stringify({ ids: ['recAgentflow'] }),
        }),
        env,
      );
      const payload = (await response.json()) as {
        mode: string;
        fetched_records: number;
        indexed_records: number;
        removed_records: number;
      };
      expect(response.status).toBe(200);
      expect(payload).toMatchObject({
        mode: 'records',
        fetched_records: 1,
        indexed_records: 0,
        removed_records: 1,
      });

      const search = await callWorker(new Request('https://templates.test/api/templates/search?q=agentflow'), env);
      const searchPayload = (await search.json()) as { pagination: { total_items: number } };
      expect(searchPayload.pagination.total_items).toBe(0);
    } finally {
      fetchMock.mockRestore();
      close();
    }
  });

  it('keeps canonical Airtable creator profile slugs when Webflow CMS has an archive designer slug', async () => {
    const focusedAsset = {
      ...PUBLISHED_ASSETS[0],
      id: 'recFocused',
      fields: {
        ...PUBLISHED_ASSETS[0].fields,
        Name: 'Focused',
        '🥞CMS Slug (formula)': 'focused-website-template',
        '🎨Creator': ['recDesignerGuilty'],
        '🎨Creator Name': 'Guilty as Foxx',
      },
    };
    const fetchMock = installAirtableFetchMock({
      publishedAssets: [focusedAsset],
      styles: LOOKUPS.styles,
      childCategories: LOOKUPS.childCategories,
      tags: LOOKUPS.tags,
      creators: [
        {
          id: 'recDesignerGuilty',
          fields: {
            Name: 'Guilty as Foxx',
            '🥞CMS Slug': 'guilty-as-foxx',
            '🖼️Avatar (Primary)': [{ url: 'https://v5.airtableusercontent.com/v3/u/53/temporary-guilty' }],
            '🖼️Avatar Alt Text': 'Guilty as Foxx',
          },
        },
      ],
      webflowCollectionItems: {
        [DESIGNERS_COLLECTION_ID]: [
          {
            id: 'designer-guilty-archive',
            isArchived: false,
            isDraft: false,
            fieldData: {
              'sync-record-id': 'recDesignerGuilty',
              name: 'Guilty as Foxx',
              slug: 'guilty-as-foxx-archive',
              avatar: {
                url: 'https://cdn.prod.website-files.com/site/guilty-avatar.webp',
                alt: 'Guilty as Foxx',
              },
            },
          },
        ],
      },
    });
    const { env, close } = createTestEnv();
    env.WEBFLOW_API_TOKEN = 'test-webflow-cms-token';

    try {
      const response = await callWorker(
        new Request('https://templates.test/api/templates/admin/sync-records', {
          method: 'POST',
          headers: {
            Authorization: 'Bearer sync-token',
            'content-type': 'application/json',
          },
          body: JSON.stringify({ ids: ['recFocused'] }),
        }),
        env,
      );
      expect(response.status).toBe(200);

      const search = await callWorker(new Request('https://templates.test/api/templates/search?q=focused'), env);
      const searchPayload = (await search.json()) as {
        items: Array<{
          name: string;
          creator_slug: string | null;
          creator_profile_url: string | null;
          creator_avatar_url: string | null;
        }>;
      };
      expect(searchPayload.items).toHaveLength(1);
      expect(searchPayload.items[0]).toMatchObject({
        name: 'Focused',
        creator_slug: 'guilty-as-foxx',
        creator_profile_url: 'https://webflow.com/templates/designers/guilty-as-foxx',
        creator_avatar_url: 'https://cdn.prod.website-files.com/site/guilty-avatar.webp',
      });

      const refresh = await callWorker(
        new Request('https://templates.test/api/templates/admin/refresh-creators?force=true', {
          method: 'POST',
          headers: { Authorization: 'Bearer sync-token' },
        }),
        env,
      );
      expect(refresh.status).toBe(200);

      const refreshedRow = await env.DB.prepare(
        `SELECT creator_slug, creator_profile_url, creator_avatar_url
         FROM template_documents
         WHERE id = ?`,
      )
        .bind('recFocused')
        .first<{ creator_slug: string | null; creator_profile_url: string | null; creator_avatar_url: string | null }>();
      expect(refreshedRow).toMatchObject({
        creator_slug: 'guilty-as-foxx',
        creator_profile_url: 'https://webflow.com/templates/designers/guilty-as-foxx',
        creator_avatar_url: 'https://cdn.prod.website-files.com/site/guilty-avatar.webp',
      });
    } finally {
      fetchMock.mockRestore();
      close();
    }
  });

  it('returns authenticated sync status and clears stale same-mode sync errors', async () => {
    const { env, close } = createTestEnv();

    try {
      await env.DB.prepare(
        'INSERT INTO sync_state (key, value_json, updated_at) VALUES (?, ?, ?)',
      )
        .bind(
          'last_sync_error',
          JSON.stringify({
            cron: '*/5 * * * *',
            mode: 'incremental',
            failed_at: '2026-05-22T14:57:09.882Z',
            error: 'D1_ERROR: too many SQL variables at offset 521: SQLITE_ERROR',
          }),
          '2026-05-22T14:57:09.882Z',
        )
        .run();

      await recordSyncSummary(
        env.DB,
        {
          mode: 'incremental',
          started_at: '2026-05-22T15:00:37.856Z',
          finished_at: '2026-05-22T15:12:36.124Z',
          fetched_records: 542,
          indexed_records: 524,
          removed_records: 18,
          backfilled_records: 201535,
          image_refreshed_records: 15,
          cursor: '2026-05-21T03:25:50.403Z',
        },
        'last_incremental_sync',
      );
      await acquireSyncJobLock(env.DB, 'image_refresh');

      const response = await callWorker(
        new Request('https://templates.test/api/templates/admin/sync-status', {
          headers: { Authorization: 'Bearer sync-token' },
        }),
        env,
      );
      const payload = (await response.json()) as {
        status: string;
        active_job: { mode: string; status: string; summary: unknown } | null;
        latest_job: { mode: string; status: string; summary: unknown } | null;
        sync_state: Record<string, { value: { mode?: string; fetched_records?: number } }>;
      };

      expect(response.status).toBe(200);
      expect(payload.status).toBe('ok');
      expect(payload.active_job).toMatchObject({ mode: 'image_refresh', status: 'running', summary: null });
      expect(payload.latest_job).toMatchObject({ mode: 'image_refresh', status: 'running', summary: null });
      expect(payload.sync_state.last_incremental_sync.value).toMatchObject({
        mode: 'incremental',
        fetched_records: 542,
      });
      expect(payload.sync_state.last_sync_error).toBeUndefined();
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

  it('backfills missing creator metadata from a unique creator lookup name', async () => {
    const { env, close } = createTestEnv();

    try {
      await env.DB.prepare(
        `INSERT INTO template_documents (
          id,
          template_slug,
          name,
          creator_name,
          synced_at
        ) VALUES (?, ?, ?, ?, ?)`,
      )
        .bind('recFitizo', 'fitizo-gym-website-template', 'Fitizo', 'Onmix', '2026-05-19T00:00:00.000Z')
        .run();

      await backfillCreatorFieldsFromLookup(
        env.DB,
        new Map([
          [
            'creator-onmix',
            {
              id: 'creator-onmix',
              name: 'Onmix',
              slug: 'onmix',
              profileUrl: 'https://webflow.com/templates/designers/onmix',
              avatarUrl: 'https://cdn.prod.website-files.com/site/onmix-avatar.webp',
              avatarAlt: 'Onmix',
            },
          ],
        ]),
        '2026-05-20T00:00:00.000Z',
      );

      const row = await env.DB.prepare(
        `SELECT creator_record_id, creator_slug, creator_profile_url, creator_avatar_url, creator_avatar_alt
         FROM template_documents
         WHERE id = ?`,
      )
        .bind('recFitizo')
        .first<{
          creator_record_id: string | null;
          creator_slug: string | null;
          creator_profile_url: string | null;
          creator_avatar_url: string | null;
          creator_avatar_alt: string | null;
        }>();

      expect(row).toEqual({
        creator_record_id: 'creator-onmix',
        creator_slug: 'onmix',
        creator_profile_url: 'https://webflow.com/templates/designers/onmix',
        creator_avatar_url: 'https://cdn.prod.website-files.com/site/onmix-avatar.webp',
        creator_avatar_alt: 'Onmix',
      });
    } finally {
      close();
    }
  });

  it('backfills missing creator metadata through the admin creator backfill route', async () => {
    const fetchMock = installAirtableFetchMock({
      publishedAssets: [],
      styles: LOOKUPS.styles,
      childCategories: LOOKUPS.childCategories,
      tags: LOOKUPS.tags,
      creators: [
        {
          id: 'creator-onmix',
          fields: {
            Name: 'Onmix',
            '🥞CMS Slug': 'onmix',
            '🖼️Avatar (Primary)': [{ url: 'https://cdn.prod.website-files.com/site/onmix-avatar.webp' }],
            '🖼️Avatar Alt Text': 'Onmix',
          },
        },
      ],
    });
    const { env, close } = createTestEnv();

    try {
      await env.DB.prepare(
        `INSERT INTO template_documents (
          id,
          template_slug,
          name,
          creator_name,
          synced_at
        ) VALUES (?, ?, ?, ?, ?)`,
      )
        .bind('recFitizo', 'fitizo-gym-website-template', 'Fitizo', 'Onmix', '2026-05-19T00:00:00.000Z')
        .run();

      const response = await callWorker(
        new Request('https://templates.test/api/templates/admin/backfill-creators?name=Onmix', {
          method: 'POST',
          headers: { Authorization: 'Bearer sync-token' },
        }),
        env,
      );
      const payload = (await response.json()) as { mode: string; fetched_records: number; backfilled_records: number };
      expect(response.status).toBe(200);
      expect(payload).toMatchObject({ mode: 'creator_backfill', fetched_records: 1 });

      const row = await env.DB.prepare(
        `SELECT creator_record_id, creator_slug, creator_profile_url
         FROM template_documents
         WHERE id = ?`,
      )
        .bind('recFitizo')
        .first<{ creator_record_id: string | null; creator_slug: string | null; creator_profile_url: string | null }>();
      expect(row).toEqual({
        creator_record_id: 'creator-onmix',
        creator_slug: 'onmix',
        creator_profile_url: 'https://webflow.com/templates/designers/onmix',
      });
    } finally {
      fetchMock.mockRestore();
      close();
    }
  });

  it('rejects Webflow webhooks with an invalid signature', async () => {
    const { env, close } = createTestEnv();
    env.WEBFLOW_WEBHOOK_SECRET = 'webhook-secret';

    try {
      const response = await callWorker(
        new Request('https://templates.test/api/templates/webhooks/webflow', {
          method: 'POST',
          body: JSON.stringify({
            triggerType: 'collection_item_changed',
            payload: {
              id: 'item-agentflow',
              cid: TEMPLATES_COLLECTION_ID,
              isArchived: false,
              isDraft: false,
              fieldData: { 'sync-record-id': 'recAgentflow' },
            },
          }),
          headers: { 'x-webflow-signature': 'bad-signature' },
        }),
        env,
      );

      expect(response.status).toBe(401);
      await expect(response.json()).resolves.toEqual({ error: 'Invalid signature' });
    } finally {
      close();
    }
  });

  it('updates template images from signed Webflow collection webhooks', async () => {
    const fetchMock = installAirtableFetchMock({
      publishedAssets: PUBLISHED_ASSETS,
      styles: LOOKUPS.styles,
      childCategories: LOOKUPS.childCategories,
      tags: LOOKUPS.tags,
    });
    const { env, close } = createTestEnv();
    env.WEBFLOW_WEBHOOK_SECRET = 'webhook-secret';

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
        signedWebhookRequest({
          triggerType: 'collection_item_changed',
          payload: {
            id: 'item-agentflow',
            cid: TEMPLATES_COLLECTION_ID,
            isArchived: false,
            isDraft: false,
            fieldData: {
              'sync-record-id': 'recAgentflow',
              name: 'Agentflow',
              slug: 'agentflow-updated-website-template',
              'template-price': 'Free',
              thumbnail: { url: 'https://cdn.prod.website-files.com/site/agentflow-webhook.webp' },
              'thumbnail-secondary': { url: 'https://cdn.prod.website-files.com/site/agentflow-hover-webhook.webp' },
              'slider-images': [
                { url: 'https://cdn.prod.website-files.com/site/agentflow-slide-1.webp' },
                { url: 'https://cdn.prod.website-files.com/site/agentflow-slide-2.webp' },
              ],
            },
          },
        }),
        env,
      );

      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toMatchObject({
        status: 'updated',
        collection: 'templates',
        id: 'recAgentflow',
      });

      const row = await env.DB.prepare(
        `SELECT template_slug, listing_url, thumbnail_image_url, thumbnail_image_secondary_url, carousel_image_urls_json, price, is_free
         FROM template_documents
         WHERE id = ?`,
      )
        .bind('recAgentflow')
        .first<{
          template_slug: string;
          listing_url: string | null;
          thumbnail_image_url: string | null;
          thumbnail_image_secondary_url: string | null;
          carousel_image_urls_json: string;
          price: number | null;
          is_free: number;
        }>();

      expect(row).toMatchObject({
        template_slug: 'agentflow-updated-website-template',
        listing_url: 'https://webflow.com/templates/html/agentflow-updated-website-template',
        thumbnail_image_url: 'https://cdn.prod.website-files.com/site/agentflow-webhook.webp',
        thumbnail_image_secondary_url: 'https://cdn.prod.website-files.com/site/agentflow-hover-webhook.webp',
        price: 0,
        is_free: 1,
      });
      expect(JSON.parse(row?.carousel_image_urls_json ?? '[]')).toEqual([
        'https://cdn.prod.website-files.com/site/agentflow-slide-1.webp',
        'https://cdn.prod.website-files.com/site/agentflow-slide-2.webp',
      ]);
    } finally {
      fetchMock.mockRestore();
      close();
    }
  });

  it('updates creator avatars from signed Webflow designer webhooks', async () => {
    const fetchMock = installAirtableFetchMock({
      publishedAssets: PUBLISHED_ASSETS,
      styles: LOOKUPS.styles,
      childCategories: LOOKUPS.childCategories,
      tags: LOOKUPS.tags,
    });
    const { env, close } = createTestEnv();
    env.WEBFLOW_WEBHOOK_SECRET = 'webhook-secret';

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
        `UPDATE template_documents
         SET creator_record_id = ?,
             creator_profile_url = ?,
             creator_avatar_url = ?,
             creator_avatar_alt = ?
         WHERE id = ?`,
      )
        .bind(
          'recDesignerBrix',
          'https://webflow.com/templates/designers/old-brix',
          'https://v5.airtableusercontent.com/v3/u/53/temporary-brix',
          'Old BRIX',
          'recAgentflow',
        )
        .run();

      const response = await callWorker(
        signedWebhookRequest({
          triggerType: 'collection_item_published',
          payload: {
            id: 'designer-brix',
            cid: DESIGNERS_COLLECTION_ID,
            isArchived: false,
            isDraft: false,
            fieldData: {
              'sync-record-id': 'recDesignerBrix',
              name: 'BRIX Templates',
              slug: 'brix-templates',
              avatar: {
                url: 'https://cdn.prod.website-files.com/site/brix-avatar.webp',
                alt: 'BRIX Templates',
              },
            },
          },
        }),
        env,
      );

      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toMatchObject({
        status: 'updated',
        collection: 'designers',
        id: 'recDesignerBrix',
      });

      const row = await env.DB.prepare(
        `SELECT creator_record_id, creator_profile_url, creator_avatar_url, creator_avatar_alt
         FROM template_documents
         WHERE id = ?`,
      )
        .bind('recAgentflow')
        .first<{
          creator_record_id: string | null;
          creator_profile_url: string | null;
          creator_avatar_url: string | null;
          creator_avatar_alt: string | null;
        }>();

      expect(row).toEqual({
        creator_record_id: 'recDesignerBrix',
        creator_profile_url: 'https://webflow.com/templates/designers/brix-templates',
        creator_avatar_url: 'https://cdn.prod.website-files.com/site/brix-avatar.webp',
        creator_avatar_alt: 'BRIX Templates',
      });
    } finally {
      fetchMock.mockRestore();
      close();
    }
  });

  it('repairs creator profile URLs from slug-only Webflow designer webhooks', async () => {
    const fetchMock = installAirtableFetchMock({
      publishedAssets: PUBLISHED_ASSETS,
      styles: LOOKUPS.styles,
      childCategories: LOOKUPS.childCategories,
      tags: LOOKUPS.tags,
    });
    const { env, close } = createTestEnv();
    env.WEBFLOW_WEBHOOK_SECRET = 'webhook-secret';

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
        `UPDATE template_documents
         SET creator_record_id = ?,
             creator_profile_url = ?,
             creator_avatar_url = ?,
             creator_avatar_alt = ?
         WHERE id = ?`,
      )
        .bind(
          'recDesignerBrix',
          'https://webflow.com/templates/designers/old-brix',
          'https://assets.example.com/brix-old.png',
          'Old BRIX',
          'recAgentflow',
        )
        .run();

      const response = await callWorker(
        signedWebhookRequest({
          triggerType: 'collection_item_changed',
          payload: {
            id: 'designer-brix',
            cid: DESIGNERS_COLLECTION_ID,
            isArchived: false,
            isDraft: false,
            fieldData: {
              'sync-record-id': 'recDesignerBrix',
              name: 'BRIX Templates',
              slug: 'brix-templates',
            },
          },
        }),
        env,
      );

      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toMatchObject({
        status: 'updated',
        collection: 'designers',
        id: 'recDesignerBrix',
      });

      const row = await env.DB.prepare(
        `SELECT creator_profile_url, creator_avatar_url, creator_avatar_alt
         FROM template_documents
         WHERE id = ?`,
      )
        .bind('recAgentflow')
        .first<{
          creator_profile_url: string | null;
          creator_avatar_url: string | null;
          creator_avatar_alt: string | null;
        }>();

      expect(row).toEqual({
        creator_profile_url: 'https://webflow.com/templates/designers/brix-templates',
        creator_avatar_url: 'https://assets.example.com/brix-old.png',
        creator_avatar_alt: 'Old BRIX',
      });
    } finally {
      fetchMock.mockRestore();
      close();
    }
  });

  it('rebuilds the index and serves filtered search results', async () => {
    const fetchMock = installAirtableFetchMock({
      publishedAssets: PUBLISHED_ASSETS,
      styles: LOOKUPS.styles,
      childCategories: LOOKUPS.childCategories,
      tags: LOOKUPS.tags,
      creators: LOOKUPS.creators,
    });
    const { env, close } = createTestEnv();

    try {
      // A row absent from the fresh Airtable snapshot must be swept by the rebuild.
      await env.DB.prepare(
        'INSERT INTO template_documents (id, template_slug, name, synced_at) VALUES (?, ?, ?, ?)',
      )
        .bind('recStaleSweep', 'stale-sweep-template', 'Stale Sweep', '2026-01-01T00:00:00.000Z')
        .run();

      const rebuild = await callWorker(
        new Request('https://templates.test/api/templates/admin/rebuild', {
          method: 'POST',
          headers: { Authorization: 'Bearer sync-token' },
        }),
        env,
      );
      expect(rebuild.status).toBe(200);

      const staleRow = await env.DB.prepare('SELECT id FROM template_documents WHERE id = ?').bind('recStaleSweep').first();
      expect(staleRow).toBeNull();
      const fullSummary = await env.DB.prepare('SELECT value_json FROM sync_state WHERE key = ?')
        .bind('last_full_sync')
        .first<{ value_json: string }>();
      expect(JSON.parse(fullSummary?.value_json ?? '{}')).toMatchObject({ mode: 'full', removed_records: 1 });

      const categorySearch = await callWorker(
        new Request('https://templates.test/api/templates/search?category_group_slug=technology-websites&child_category_slug=ai-websites'),
        env,
      );
      expect(categorySearch.headers.get('cache-control')).toBe(
        'public, max-age=60, s-maxage=300, stale-while-revalidate=86400',
      );
      expect(categorySearch.headers.get('cdn-cache-control')).toBe(
        'public, max-age=300, stale-while-revalidate=86400',
      );
      const categoryPayload = (await categorySearch.json()) as {
        items: Array<{ name: string; purchase_url: string | null }>;
        available_facets: { styles: Array<{ slug: string }>; types: Array<{ value: string }> };
        subcategory_pills: Array<{ slug: string; active: boolean }>;
      };

      expect(categoryPayload.items.map((item) => item.name)).toEqual(['Setrex', 'Agentflow']);
      expect(categoryPayload.items.find((item) => item.name === 'Agentflow')?.purchase_url).toBe(
        'https://webflow.com/dashboard/marketplace-checkout/redirect?rtype=Template&rid=mrp-agentflow&unauthSignup=true',
      );
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

      const gridItemsOnlySearch = await callWorker(
        new Request('https://templates.test/api/templates/search?include=items&view=grid&category_group_slug=technology-websites'),
        env,
      );
      const gridItemsOnlyPayload = (await gridItemsOnlySearch.json()) as {
        items: Array<{ name: string; styles?: unknown[]; tags?: unknown[] }>;
      };

      expect(gridItemsOnlyPayload.items.map((item) => item.name)).toEqual(['Setrex', 'Agentflow', 'Catalis']);
      expect(gridItemsOnlyPayload.items[0]).not.toHaveProperty('styles');
      expect(gridItemsOnlyPayload.items[0]).not.toHaveProperty('tags');

      const freeSearch = await callWorker(new Request('https://templates.test/api/templates/search?scope=free&page_size=10'), env);
      const freePayload = (await freeSearch.json()) as {
        items: Array<{ name: string; price: number | null; is_free: boolean }>;
      };
      expect(freePayload.items.map((item) => ({ name: item.name, price: item.price, is_free: item.is_free }))).toEqual([
        { name: 'Catalis', price: 0, is_free: true },
      ]);

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
      const searchPayload = (await search.json()) as {
        items: Array<{ name: string }>;
        applied_filters: { relaxed: boolean };
      };
      expect(searchPayload.items.map((item) => item.name)).toEqual(['Agentflow']);
      expect(searchPayload.applied_filters.relaxed).toBe(false);

      // Strict AND-matching returns nothing when one token has no match; the
      // worker retries once with OR'ed tokens instead of a dead-end empty grid.
      const relaxedSearch = await callWorker(
        new Request('https://templates.test/api/templates/search?q=workflow%20zzznomatch'),
        env,
      );
      const relaxedPayload = (await relaxedSearch.json()) as {
        items: Array<{ name: string }>;
        applied_filters: { relaxed: boolean };
      };
      expect(relaxedPayload.items.map((item) => item.name)).toEqual(['Agentflow']);
      expect(relaxedPayload.applied_filters.relaxed).toBe(true);

      // A single unmatched token cannot be relaxed; the empty result stands.
      const unmatchedSearch = await callWorker(
        new Request('https://templates.test/api/templates/search?q=zzznomatch'),
        env,
      );
      const unmatchedPayload = (await unmatchedSearch.json()) as {
        items: unknown[];
        applied_filters: { relaxed: boolean };
      };
      expect(unmatchedPayload.items).toEqual([]);
      expect(unmatchedPayload.applied_filters.relaxed).toBe(false);

      const newestSearch = await callWorker(new Request('https://templates.test/api/templates/search?sort=newest&page_size=10'), env);
      const newestPayload = (await newestSearch.json()) as { items: Array<{ name: string; published_date: string | null }> };
      expect(newestPayload.items.map((item) => ({ name: item.name, published_date: item.published_date }))).toEqual([
        { name: 'Setrex', published_date: '2026-04-05' },
        { name: 'Catalis', published_date: '2026-03-10' },
        { name: 'Agentflow', published_date: '2026-03-01' },
      ]);

      const bestSellingSearch = await callWorker(
        new Request('https://templates.test/api/templates/search?sort=best_selling&page_size=10'),
        env,
      );
      const bestSellingPayload = (await bestSellingSearch.json()) as {
        sort: string;
        items: Array<{ name: string; cumulative_purchases: number | null }>;
      };
      expect(bestSellingPayload.sort).toBe('best_selling');
      expect(bestSellingPayload.items.map((item) => ({ name: item.name, purchases: item.cumulative_purchases }))).toEqual([
        { name: 'Agentflow', purchases: 21 },
        { name: 'Setrex', purchases: 18 },
        { name: 'Catalis', purchases: 9 },
      ]);

      for (const sortAlias of ['best_sellers', 'best-sellers']) {
        const aliasSearch = await callWorker(
          new Request(`https://templates.test/api/templates/search?sort=${sortAlias}&page_size=10`),
          env,
        );
        const aliasPayload = (await aliasSearch.json()) as {
          sort: string;
          items: Array<{ name: string }>;
        };
        expect(aliasPayload.sort).toBe('best_selling');
        expect(aliasPayload.items.map((item) => item.name)).toEqual(['Agentflow', 'Setrex', 'Catalis']);
      }

      const defaultQuerySearch = await callWorker(new Request('https://templates.test/api/templates/search?q=technology&page_size=10'), env);
      const defaultQueryPayload = (await defaultQuerySearch.json()) as { items: Array<{ name: string }> };
      expect(defaultQueryPayload.items.map((item) => item.name)).toEqual(['Setrex', 'Agentflow', 'Catalis']);

      const newestQuerySearch = await callWorker(
        new Request('https://templates.test/api/templates/search?q=technology&sort=newest&page_size=10'),
        env,
      );
      const newestQueryPayload = (await newestQuerySearch.json()) as {
        items: Array<{ name: string; published_date: string | null }>;
      };
      expect(newestQueryPayload.items.map((item) => ({ name: item.name, published_date: item.published_date }))).toEqual([
        { name: 'Setrex', published_date: '2026-04-05' },
        { name: 'Catalis', published_date: '2026-03-10' },
        { name: 'Agentflow', published_date: '2026-03-01' },
      ]);

      const priceAscQuerySearch = await callWorker(
        new Request('https://templates.test/api/templates/search?q=technology&sort=price_asc&page_size=10'),
        env,
      );
      const priceAscQueryPayload = (await priceAscQuerySearch.json()) as {
        items: Array<{ name: string; price: number | null }>;
      };
      expect(priceAscQueryPayload.items.map((item) => ({ name: item.name, price: item.price }))).toEqual([
        { name: 'Catalis', price: 0 },
        { name: 'Setrex', price: 79 },
        { name: 'Agentflow', price: 169 },
      ]);

      const priceDescQuerySearch = await callWorker(
        new Request('https://templates.test/api/templates/search?q=technology&sort=price_desc&page_size=10'),
        env,
      );
      const priceDescQueryPayload = (await priceDescQuerySearch.json()) as {
        items: Array<{ name: string; price: number | null }>;
      };
      expect(priceDescQueryPayload.items.map((item) => ({ name: item.name, price: item.price }))).toEqual([
        { name: 'Agentflow', price: 169 },
        { name: 'Setrex', price: 79 },
        { name: 'Catalis', price: 0 },
      ]);

      const stylePageSearch = await callWorker(
        new Request('https://templates.test/api/templates/search?style_slug=modern&page_size=10'),
        env,
      );
      const stylePagePayload = (await stylePageSearch.json()) as {
        items: Array<{ name: string }>;
        applied_filters: { style_slug: string | null };
      };
      expect(stylePagePayload.applied_filters.style_slug).toBe('modern');
      expect(stylePagePayload.items.map((item) => item.name)).toEqual(['Agentflow', 'Catalis']);

      const tagPageSearch = await callWorker(
        new Request('https://templates.test/api/templates/search?tag_slug=automation&page_size=10'),
        env,
      );
      const tagPagePayload = (await tagPageSearch.json()) as {
        items: Array<{ name: string }>;
        applied_filters: { tag_slug: string | null };
      };
      expect(tagPagePayload.applied_filters.tag_slug).toBe('automation');
      expect(tagPagePayload.items.map((item) => item.name)).toEqual(['Agentflow']);

      const indexedCreatorRow = await env.DB
        .prepare('SELECT creator_record_id, creator_slug, creator_profile_url FROM template_documents WHERE id = ?')
        .bind('recAgentflow')
        .first<{ creator_record_id: string | null; creator_slug: string | null; creator_profile_url: string | null }>();
      expect(indexedCreatorRow).toMatchObject({
        creator_record_id: 'creator-brix',
        creator_slug: 'brix-templates',
        creator_profile_url: 'https://webflow.com/templates/designers/brix-templates',
      });

      const creatorProfileSearch = await callWorker(
        new Request('https://templates.test/api/templates/search?designer_slug=brix-templates&page_size=10'),
        env,
      );
      const creatorProfilePayload = (await creatorProfileSearch.json()) as {
        items: Array<{ name: string; creator_slug: string | null; creator_profile_url: string | null }>;
        applied_filters: { creator_slug: string | null };
      };
      expect(creatorProfilePayload.applied_filters.creator_slug).toBe('brix-templates');
      expect(creatorProfilePayload.items.map((item) => item.name)).toEqual(['Agentflow']);
      expect(creatorProfilePayload.items[0]).toMatchObject({
        creator_slug: 'brix-templates',
        creator_profile_url: 'https://webflow.com/templates/designers/brix-templates',
      });

      await env.DB.prepare('UPDATE template_documents SET creator_slug = ?, creator_profile_url = ? WHERE id = ?')
        .bind('brix-templates-archive', 'https://webflow.com/templates/designers/brix-templates-archive', 'recAgentflow')
        .run();

      const canonicalCreatorProfileSearch = await callWorker(
        new Request('https://templates.test/api/templates/search?designer_slug=brix-templates&page_size=10'),
        env,
      );
      const canonicalCreatorProfilePayload = (await canonicalCreatorProfileSearch.json()) as {
        items: Array<{ name: string; creator_slug: string | null; creator_profile_url: string | null }>;
        applied_filters: { creator_slug: string | null };
      };
      expect(canonicalCreatorProfilePayload.applied_filters.creator_slug).toBe('brix-templates');
      expect(canonicalCreatorProfilePayload.items.map((item) => item.name)).toEqual(['Agentflow']);
      expect(canonicalCreatorProfilePayload.items[0]).toMatchObject({
        creator_slug: 'brix-templates',
        creator_profile_url: 'https://webflow.com/templates/designers/brix-templates',
      });

      const archiveCreatorProfileSearch = await callWorker(
        new Request('https://templates.test/api/templates/search?designer_slug=brix-templates-archive&page_size=10'),
        env,
      );
      const archiveCreatorProfilePayload = (await archiveCreatorProfileSearch.json()) as {
        items: Array<{ name: string }>;
        applied_filters: { creator_slug: string | null };
      };
      expect(archiveCreatorProfilePayload.applied_filters.creator_slug).toBe('brix-templates-archive');
      expect(archiveCreatorProfilePayload.items.map((item) => item.name)).toEqual(['Agentflow']);
      expect(archiveCreatorProfilePayload.items[0]).toMatchObject({
        creator_slug: 'brix-templates',
        creator_profile_url: 'https://webflow.com/templates/designers/brix-templates',
      });
    } finally {
      fetchMock.mockRestore();
      close();
    }
  });

  it('refuses to sweep the live index when the rebuild snapshot is implausibly small', async () => {
    const fetchMock = installAirtableFetchMock({
      publishedAssets: [PUBLISHED_ASSETS[0]],
      styles: LOOKUPS.styles,
      childCategories: LOOKUPS.childCategories,
      tags: LOOKUPS.tags,
      creators: LOOKUPS.creators,
    });
    const { env, close } = createTestEnv();

    try {
      // Live index has 10 rows; the snapshot returns only 1 (below the 80% guard).
      // A partial or failed Airtable fetch must not mass-delete the marketplace.
      for (let index = 0; index < 10; index += 1) {
        await env.DB.prepare(
          'INSERT INTO template_documents (id, template_slug, name, synced_at) VALUES (?, ?, ?, ?)',
        )
          .bind(`recGuard${index}`, `guard-template-${index}`, `Guard Template ${index}`, '2026-01-01T00:00:00.000Z')
          .run();
      }

      const rebuild = await callWorker(
        new Request('https://templates.test/api/templates/admin/rebuild', {
          method: 'POST',
          headers: { Authorization: 'Bearer sync-token' },
        }),
        env,
      );
      expect(rebuild.status).toBe(200);

      const survivors = await env.DB.prepare("SELECT COUNT(*) AS count FROM template_documents WHERE id LIKE 'recGuard%'").first<{
        count: number;
      }>();
      expect(survivors?.count).toBe(10);

      const fullSummary = await env.DB.prepare('SELECT value_json FROM sync_state WHERE key = ?')
        .bind('last_full_sync')
        .first<{ value_json: string }>();
      const parsedSummary = JSON.parse(fullSummary?.value_json ?? '{}') as {
        removed_records: number;
        indexed_records: number;
        warnings?: Array<{ source: string }>;
      };
      expect(parsedSummary.removed_records).toBe(0);
      expect(parsedSummary.indexed_records).toBe(1);
      expect(parsedSummary.warnings?.some((warning) => warning.source === 'full_sync_sweep')).toBe(true);
    } finally {
      fetchMock.mockRestore();
      close();
    }
  });

  it('scopes child category filters and pills to the selected parent category group', async () => {
    const crossListedAsset = {
      ...PUBLISHED_ASSETS[0],
      id: 'recCrossListed',
      fields: {
        ...PUBLISHED_ASSETS[0].fields,
        Name: 'Crosslisted',
        'ℹ️Description (Short)': 'A template listed across unrelated category groups',
        'ℹ️Description (Long).html': '<p>Used to validate parent and child category alignment.</p>',
        '🪣Category Group(s) Display Name': ['Technology', 'Architecture & Design'],
        '🪣Category Group(s) CMS Slug': ['technology', 'architecture-and-design'],
        'ℹ️🪣Categories': ['child-ai', 'child-architecture'],
        'ℹ️🪣Categories (Text)': ['AI', 'Architecture'],
        '🥞CMS Slug (from ℹ️🪣Categories)': ['ai-websites', 'architecture-websites'],
        '🥞CMS Slug (formula)': 'crosslisted-website-template',
        '🔗Listing URL': 'https://webflow.com/templates/html/crosslisted-website-template',
        '🔗Preview Site URL': 'https://crosslisted.example.com',
        '🔗Website URL': 'https://webflow.com/templates/html/crosslisted-website-template',
        '🚀📅Published Date': '2026-04-01',
        '📅LMT': '2026-04-01T05:14:00.000Z',
      },
    };
    const fetchMock = installAirtableFetchMock({
      publishedAssets: [crossListedAsset],
      styles: LOOKUPS.styles,
      childCategories: LOOKUPS.childCategories,
      tags: LOOKUPS.tags,
      creators: LOOKUPS.creators,
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

      const membershipRows = await env.DB
        .prepare(
          `SELECT category_group_slug, child_category_slug
           FROM template_category_memberships
           WHERE template_document_id = ?
           ORDER BY category_group_slug, child_category_slug`,
        )
        .bind('recCrossListed')
        .all<{ category_group_slug: string; child_category_slug: string }>();
      expect(membershipRows.results).toEqual([
        { category_group_slug: 'architecture-and-design-websites', child_category_slug: 'architecture-websites' },
        { category_group_slug: 'technology-websites', child_category_slug: 'ai-websites' },
      ]);

      const architecturePillsSearch = await callWorker(
        new Request('https://templates.test/api/templates/search?include=pills&category_group_slug=architecture-and-design-websites'),
        env,
      );
      const architecturePillsPayload = (await architecturePillsSearch.json()) as {
        subcategory_pills: Array<{ slug: string }>;
      };
      expect(architecturePillsPayload.subcategory_pills.map((pill) => pill.slug)).toEqual(['architecture-websites']);

      await env.DB.prepare(
        'INSERT OR REPLACE INTO slug_aliases (slug_type, alias_slug, canonical_slug) VALUES (?, ?, ?)',
      )
        .bind('child_category', 'architecture', 'architecture-websites')
        .run();
      await env.DB.prepare(
        `INSERT OR REPLACE INTO template_category_memberships (
          template_document_id,
          category_group_name,
          category_group_slug,
          child_category_name,
          child_category_slug
        ) VALUES (?, ?, ?, ?, ?)`,
      )
        .bind('recCrossListed', 'Architecture & Design', 'architecture-and-design-websites', 'Architecture', 'architecture')
        .run();

      const aliasedPillsSearch = await callWorker(
        new Request('https://templates.test/api/templates/search?include=pills&category_group_slug=architecture-and-design-websites'),
        env,
      );
      const aliasedPillsPayload = (await aliasedPillsSearch.json()) as {
        subcategory_pills: Array<{ slug: string; count: number }>;
      };
      expect(aliasedPillsPayload.subcategory_pills.map((pill) => ({ slug: pill.slug, count: pill.count }))).toEqual([
        { slug: 'architecture', count: 1 },
      ]);

      const incompatibleSearch = await callWorker(
        new Request(
          'https://templates.test/api/templates/search?include=items&category_group_slug=architecture-and-design-websites&child_category_slug=ai-websites',
        ),
        env,
      );
      const incompatiblePayload = (await incompatibleSearch.json()) as {
        items: Array<{ name: string }>;
        pagination: { total_items: number };
      };
      expect(incompatiblePayload.pagination.total_items).toBe(0);
      expect(incompatiblePayload.items).toEqual([]);

      const compatibleSearch = await callWorker(
        new Request(
          'https://templates.test/api/templates/search?include=items&category_group_slug=technology-websites&child_category_slug=ai-websites',
        ),
        env,
      );
      const compatiblePayload = (await compatibleSearch.json()) as { items: Array<{ name: string }> };
      expect(compatiblePayload.items.map((item) => item.name)).toEqual(['Crosslisted']);
    } finally {
      fetchMock.mockRestore();
      close();
    }
  });

  it('indexes current Airtable category records as public child category aliases', async () => {
    const renewableAsset = {
      ...PUBLISHED_ASSETS[0],
      id: 'recBrightSolar',
      fields: {
        ...PUBLISHED_ASSETS[0].fields,
        Name: 'Bright Solar',
        'ℹ️Description (Short)': 'Renewable energy website template',
        'ℹ️Description (Long).html': '<p>Solar and clean energy landing pages.</p>',
        '🪣Category Group(s) Display Name': ['Environment'],
        '🪣Category Group(s) CMS Slug': ['environment'],
        'ℹ️🪣Categories': ['recRenewableEnergy', 'recNatureConservation'],
        'ℹ️🪣Categories (Text)': ['Renewable energy', 'Nature & Conservation'],
        '🥞CMS Slug (from ℹ️🪣Categories)': ['nature-and-conservation-websites'],
        '🥞CMS Slug (formula)': 'bright-solar-website-template',
        '🔗Listing URL': 'https://webflow.com/templates/html/bright-solar-website-template',
        '🔗Preview Site URL': 'https://bright-solar.example.com',
        '🔗Website URL': 'https://webflow.com/templates/html/bright-solar-website-template',
        '🚀📅Published Date': '2026-04-12',
        '📅LMT': '2026-04-12T05:14:00.000Z',
      },
    };
    const currentCategoryRecords = [
      {
        id: 'recRenewableEnergy',
        fields: {
          Name: 'Renewable energy',
          '🪣Category Group Display Names': ['Environment'],
          '🪣Category Group CMS Slug': ['environment-websites'],
          '🆎Asset Type': 'Template🏗️',
        },
      },
      {
        id: 'recNatureConservation',
        fields: {
          Name: 'Nature & Conservation',
          '🪣Category Group Display Names': ['Environment'],
          '🪣Category Group CMS Slug': ['environment-websites'],
          '🆎Asset Type': 'Template🏗️',
        },
      },
    ];
    const fetchMock = installAirtableFetchMock({
      publishedAssets: [renewableAsset],
      styles: LOOKUPS.styles,
      childCategories: currentCategoryRecords,
      tags: LOOKUPS.tags,
      creators: LOOKUPS.creators,
    });
    const { env, close } = createTestEnv();
    env.AIRTABLE_CHILD_CATEGORIES_TABLE_ID = 'tblSygBX7adZ4VNjK';

    try {
      const rebuild = await callWorker(
        new Request('https://templates.test/api/templates/admin/rebuild', {
          method: 'POST',
          headers: { Authorization: 'Bearer sync-token' },
        }),
        env,
      );
      expect(rebuild.status).toBe(200);

      const aliasRow = await env.DB.prepare(
        'SELECT canonical_slug FROM slug_aliases WHERE slug_type = ? AND alias_slug = ?',
      )
        .bind('child_category', 'renewable-energy')
        .first<{ canonical_slug: string }>();
      expect(aliasRow).toEqual({ canonical_slug: 'renewable-energy-websites' });

      const membershipRows = await env.DB
        .prepare(
          `SELECT category_group_slug, child_category_slug
           FROM template_category_memberships
           WHERE template_document_id = ?
           ORDER BY child_category_slug`,
        )
        .bind('recBrightSolar')
        .all<{ category_group_slug: string; child_category_slug: string }>();
      expect(membershipRows.results).toEqual([
        { category_group_slug: 'environment-websites', child_category_slug: 'nature-and-conservation-websites' },
        { category_group_slug: 'environment-websites', child_category_slug: 'renewable-energy-websites' },
      ]);

      const publicSearch = await callWorker(
        new Request('https://templates.test/api/templates/search?child_category_slug=renewable-energy&include=items&view=grid&page_size=10'),
        env,
      );
      const publicPayload = (await publicSearch.json()) as {
        items: Array<{ name: string; child_categories: Array<{ slug: string; url: string }> }>;
        pagination: { total_items: number };
        applied_filters: { child_category_slug: string | null };
      };
      expect(publicPayload.pagination.total_items).toBe(1);
      expect(publicPayload.applied_filters.child_category_slug).toBe('renewable-energy');
      expect(publicPayload.items.map((item) => item.name)).toEqual(['Bright Solar']);
      expect(publicPayload.items[0]?.child_categories).toEqual([
        {
          name: 'Renewable energy',
          slug: 'renewable-energy',
          url: 'https://webflow.com/templates/subcategory/renewable-energy',
        },
        {
          name: 'Nature & Conservation',
          slug: 'nature-and-conservation',
          url: 'https://webflow.com/templates/subcategory/nature-and-conservation',
        },
      ]);
    } finally {
      fetchMock.mockRestore();
      close();
    }
  });

  it('serves cacheable first-page public searches from the edge cache', async () => {
    const fetchMock = installAirtableFetchMock({
      publishedAssets: PUBLISHED_ASSETS,
      styles: LOOKUPS.styles,
      childCategories: LOOKUPS.childCategories,
      tags: LOOKUPS.tags,
      creators: LOOKUPS.creators,
    });
    const cache = installSearchCacheStub();
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

      const request = new Request(
        'https://templates.test/api/templates/search?category_group_slug=technology-websites&include=items&view=grid&page=1&page_size=24',
      );
      const first = await callWorker(request, env);
      expect(first.headers.get('x-template-search-cache')).toBe('MISS');
      expect(cache.put).toHaveBeenCalledTimes(1);

      await env.DB.prepare('DELETE FROM template_child_categories').run();
      await env.DB.prepare('DELETE FROM template_styles').run();
      await env.DB.prepare('DELETE FROM template_documents').run();

      const second = await callWorker(request, env);
      const secondPayload = (await second.json()) as { items: Array<{ name: string }> };

      expect(second.headers.get('x-template-search-cache')).toBe('HIT');
      expect(cache.match).toHaveBeenCalledTimes(2);
      expect(secondPayload.items.map((item) => item.name)).toEqual(['Setrex', 'Agentflow', 'Catalis']);
    } finally {
      fetchMock.mockRestore();
      close();
    }
  });

  it('rotates first-page public search cache keys after sync writes', async () => {
    const fetchMock = installAirtableFetchMock({
      publishedAssets: PUBLISHED_ASSETS,
      styles: LOOKUPS.styles,
      childCategories: LOOKUPS.childCategories,
      tags: LOOKUPS.tags,
      creators: LOOKUPS.creators,
    });
    const cache = installSearchCacheStub();
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
      const firstVersion = await getPublicSearchCacheVersion(env.DB, 'fallback');

      const request = new Request(
        'https://templates.test/api/templates/search?category_group_slug=technology-websites&include=items&view=grid&page=1&page_size=24',
      );
      const first = await callWorker(request, env);
      expect(first.headers.get('x-template-search-cache')).toBe('MISS');
      const second = await callWorker(request, env);
      expect(second.headers.get('x-template-search-cache')).toBe('HIT');

      const recordSync = await callWorker(
        new Request('https://templates.test/api/templates/admin/sync-records', {
          method: 'POST',
          headers: { Authorization: 'Bearer sync-token', 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids: ['recAgentflow'] }),
        }),
        env,
      );
      expect(recordSync.status).toBe(200);
      const secondVersion = await getPublicSearchCacheVersion(env.DB, 'fallback');
      expect(secondVersion).not.toBe(firstVersion);

      const afterSync = await callWorker(request, env);
      expect(afterSync.headers.get('x-template-search-cache')).toBe('MISS');
      expect(cache.put).toHaveBeenCalledTimes(2);
    } finally {
      fetchMock.mockRestore();
      close();
    }
  });

  it('prefers Webflow CMS item images over temporary Airtable attachments', async () => {
    const fetchMock = installAirtableFetchMock({
      publishedAssets: [
        {
          ...PUBLISHED_ASSETS[0],
          fields: {
            ...PUBLISHED_ASSETS[0].fields,
            '🖼️Thumbnail Image': [{ url: 'https://v5.airtableusercontent.com/v3/u/53/temporary-agentflow' }],
            '🖼️Thumbnail Image (Secondary)': [
              { url: 'https://v5.airtableusercontent.com/v3/u/53/temporary-agentflow-secondary' },
            ],
          },
        },
      ],
      styles: LOOKUPS.styles,
      childCategories: LOOKUPS.childCategories,
      tags: LOOKUPS.tags,
      webflowCollections: [{ id: 'collection-templates', slug: 'templates', displayName: 'Templates' }],
      webflowCollectionItems: {
        'collection-templates': [
          {
            id: 'item-agentflow',
            fieldData: {
              slug: 'agentflow-website-template',
              name: 'Agentflow',
              'template-price': 'Free',
              'thumbnail-image': { url: 'https://cdn.prod.website-files.com/site/agentflow.webp' },
              'thumbnail-image-secondary': {
                url: 'https://cdn.prod.website-files.com/site/agentflow-hover.webp',
              },
            },
          },
        ],
      },
    });
    const { env, close } = createTestEnv();
    env.WEBFLOW_API_TOKEN = 'test-webflow-cms-token';
    env.WEBFLOW_TEMPLATE_ASSET_SITE_ID = '5e593fb060cf877cf875dd1f';

    try {
      const rebuild = await callWorker(
        new Request('https://templates.test/api/templates/admin/rebuild', {
          method: 'POST',
          headers: { Authorization: 'Bearer sync-token' },
        }),
        env,
      );
      expect(rebuild.status).toBe(200);

      const response = await callWorker(new Request('https://templates.test/api/templates/search?q=agentflow'), env);
      const payload = (await response.json()) as {
        items: Array<{
          thumbnail_image_url: string | null;
          thumbnail_image_secondary_url: string | null;
          price: number | null;
          is_free: boolean;
        }>;
      };

      expect(payload.items[0]?.thumbnail_image_url).toBe('https://cdn.prod.website-files.com/site/agentflow.webp');
      expect(payload.items[0]?.thumbnail_image_secondary_url).toBe(
        'https://cdn.prod.website-files.com/site/agentflow-hover.webp',
      );
      expect(payload.items[0]).toMatchObject({ price: 0, is_free: true });
    } finally {
      fetchMock.mockRestore();
      close();
    }
  });

  it('uses Webflow assets for templates missing from the CMS image index without overriding CMS images', async () => {
    const fetchMock = installAirtableFetchMock({
      publishedAssets: [
        {
          ...PUBLISHED_ASSETS[0],
          fields: {
            ...PUBLISHED_ASSETS[0].fields,
            '🖼️Thumbnail Image': [{ url: 'https://v5.airtableusercontent.com/v3/u/53/temporary-agentflow' }],
          },
        },
        {
          ...PUBLISHED_ASSETS[1],
          fields: {
            ...PUBLISHED_ASSETS[1].fields,
            '🖼️Thumbnail Image': [{ url: 'https://v5.airtableusercontent.com/v3/u/53/temporary-setrex' }],
          },
        },
      ],
      styles: LOOKUPS.styles,
      childCategories: LOOKUPS.childCategories,
      tags: LOOKUPS.tags,
      webflowCollections: [{ id: 'collection-templates', slug: 'templates', displayName: 'Templates' }],
      webflowCollectionItems: {
        'collection-templates': [
          {
            id: 'item-agentflow',
            fieldData: {
              slug: 'agentflow-website-template',
              name: 'Agentflow',
              'thumbnail-image': { url: 'https://cdn.prod.website-files.com/site/agentflow-cms.webp' },
            },
          },
        ],
      },
      webflowAssets: [
        {
          id: 'asset-agentflow',
          contentType: 'image/webp',
          hostedUrl: 'https://cdn.prod.website-files.com/site/agentflow-asset.webp',
          originalFileName: 'agentflow.webp',
          displayName: 'agentflow.webp',
        },
        {
          id: 'asset-setrex',
          contentType: 'image/webp',
          hostedUrl: 'https://cdn.prod.website-files.com/site/setrex-asset.webp',
          originalFileName: 'setrex.webp',
          displayName: 'setrex.webp',
        },
      ],
    });
    const { env, close } = createTestEnv();
    env.WEBFLOW_API_TOKEN = 'test-webflow-cms-token';
    env.WEBFLOW_TEMPLATE_ASSET_SITE_ID = '5e593fb060cf877cf875dd1f';

    try {
      const rebuild = await callWorker(
        new Request('https://templates.test/api/templates/admin/rebuild', {
          method: 'POST',
          headers: { Authorization: 'Bearer sync-token' },
        }),
        env,
      );
      expect(rebuild.status).toBe(200);

      const response = await callWorker(new Request('https://templates.test/api/templates/search?page_size=10'), env);
      const payload = (await response.json()) as { items: Array<{ name: string; thumbnail_image_url: string | null }> };

      expect(payload.items.find((item) => item.name === 'Agentflow')?.thumbnail_image_url).toBe(
        'https://cdn.prod.website-files.com/site/agentflow-cms.webp',
      );
      expect(payload.items.find((item) => item.name === 'Setrex')?.thumbnail_image_url).toBe(
        'https://cdn.prod.website-files.com/site/setrex-asset.webp',
      );
    } finally {
      fetchMock.mockRestore();
      close();
    }
  });

  it('matches Webflow CMS thumbnails by exact slug before fuzzy template name', async () => {
    const flowFluxen = {
      ...PUBLISHED_ASSETS[0],
      id: 'recFlowFluxen',
      fields: {
        ...PUBLISHED_ASSETS[0].fields,
        Name: 'Fluxen',
        '🥞CMS Slug': 'fluxen-website-template',
        '🥞CMS Slug (formula)': 'fluxen-studio-website-template',
        '🎨Creator Name': 'Flow Nija',
        '🖼️Thumbnail Image': [{ url: 'https://v5.airtableusercontent.com/v3/u/53/temporary-flow-fluxen' }],
        '🔗Listing URL': 'https://webflow.com/templates/html/fluxen-website-template',
        '🔗Preview Site URL': 'https://fluxen-studio.webflow.io',
        '🔗Website URL': 'https://fluxen-studio.webflow.io',
      },
    };
    const metaFluxen = {
      ...PUBLISHED_ASSETS[1],
      id: 'recMetaFluxen',
      fields: {
        ...PUBLISHED_ASSETS[1].fields,
        Name: 'Fluxen.',
        '🥞CMS Slug': 'fluxen-saas-website-template',
        '🥞CMS Slug (formula)': 'fluxen-saas-website-template',
        '🎨Creator Name': 'Meta Flow',
        '🖼️Thumbnail Image': [{ url: 'https://v5.airtableusercontent.com/v3/u/53/temporary-meta-fluxen' }],
        '🔗Listing URL': 'https://webflow.com/templates/html/fluxen-saas-website-template',
        '🔗Preview Site URL': 'https://fluxen-template.webflow.io',
        '🔗Website URL': 'https://fluxen-template.webflow.io',
      },
    };
    const fetchMock = installAirtableFetchMock({
      publishedAssets: [flowFluxen, metaFluxen],
      styles: LOOKUPS.styles,
      childCategories: LOOKUPS.childCategories,
      tags: LOOKUPS.tags,
      webflowCollections: [{ id: TEMPLATES_COLLECTION_ID, slug: 'templates', displayName: 'Templates' }],
      webflowCollectionItems: {
        [TEMPLATES_COLLECTION_ID]: [
          {
            id: 'item-meta-fluxen',
            fieldData: {
              slug: 'fluxen-saas-website-template',
              name: 'Fluxen.',
              'thumbnail-image': { url: 'https://cdn.prod.website-files.com/site/meta-fluxen.webp' },
            },
          },
          {
            id: 'item-flow-fluxen',
            fieldData: {
              slug: 'fluxen-website-template',
              name: 'Fluxen',
              'thumbnail-image': { url: 'https://cdn.prod.website-files.com/site/flow-fluxen.webp' },
            },
          },
        ],
      },
    });
    const { env, close } = createTestEnv();
    env.WEBFLOW_API_TOKEN = 'test-webflow-cms-token';
    env.WEBFLOW_TEMPLATE_ASSET_SITE_ID = '5e593fb060cf877cf875dd1f';

    try {
      const rebuild = await callWorker(
        new Request('https://templates.test/api/templates/admin/rebuild', {
          method: 'POST',
          headers: { Authorization: 'Bearer sync-token' },
        }),
        env,
      );
      expect(rebuild.status).toBe(200);

      const response = await callWorker(new Request('https://templates.test/api/templates/search?q=fluxen&page_size=10'), env);
      const payload = (await response.json()) as {
        items: Array<{ name: string; template_slug: string; thumbnail_image_url: string | null }>;
      };

      expect(payload.items.find((item) => item.name === 'Fluxen')).toMatchObject({
        template_slug: 'fluxen-website-template',
        thumbnail_image_url: 'https://cdn.prod.website-files.com/site/flow-fluxen.webp',
      });
      expect(payload.items.find((item) => item.name === 'Fluxen.')).toMatchObject({
        template_slug: 'fluxen-saas-website-template',
        thumbnail_image_url: 'https://cdn.prod.website-files.com/site/meta-fluxen.webp',
      });
    } finally {
      fetchMock.mockRestore();
      close();
    }
  });

  it('uses a unique Webflow CMS item identity as the canonical template slug', async () => {
    const archflowAsset = {
      ...PUBLISHED_ASSETS[0],
      id: 'recArchflow',
      fields: {
        ...PUBLISHED_ASSETS[0].fields,
        Name: 'ArchFlow',
        '🥞CMS Slug': 'archflow-architecture-website-template',
        '🥞CMS Slug (formula)': 'archflow-architecture-website-template',
        '🎨Creator Name': 'Vik Studio',
        '🔗Listing URL': 'https://webflow.com/templates/html/archflow-architecture-website-template',
        '🔗Preview Site URL': 'https://archflow.example.com',
        '🔗Website URL': 'https://webflow.com/templates/html/archflow-architecture-website-template',
      },
    };
    const fetchMock = installAirtableFetchMock({
      publishedAssets: [archflowAsset],
      styles: LOOKUPS.styles,
      childCategories: LOOKUPS.childCategories,
      tags: LOOKUPS.tags,
      webflowCollections: [{ id: TEMPLATES_COLLECTION_ID, slug: 'templates', displayName: 'Templates' }],
      webflowCollectionItems: {
        [TEMPLATES_COLLECTION_ID]: [
          {
            id: 'item-archflow',
            fieldData: {
              'sync-record-id': 'recArchflow',
              name: 'ArchFlow',
              slug: 'archflow-architecture-website-template-22e18',
              thumbnail: { url: 'https://cdn.prod.website-files.com/site/archflow.webp' },
            },
          },
        ],
      },
    });
    const { env, close } = createTestEnv();
    env.WEBFLOW_API_TOKEN = 'test-webflow-cms-token';
    env.WEBFLOW_TEMPLATE_ASSET_SITE_ID = '5e593fb060cf877cf875dd1f';

    try {
      const rebuild = await callWorker(
        new Request('https://templates.test/api/templates/admin/rebuild', {
          method: 'POST',
          headers: { Authorization: 'Bearer sync-token' },
        }),
        env,
      );
      expect(rebuild.status).toBe(200);

      const response = await callWorker(new Request('https://templates.test/api/templates/search?q=archflow'), env);
      const payload = (await response.json()) as {
        items: Array<{ template_slug: string; url: string; thumbnail_image_url: string | null }>;
      };

      expect(payload.items[0]).toMatchObject({
        template_slug: 'archflow-architecture-website-template-22e18',
        url: 'https://webflow.com/templates/html/archflow-architecture-website-template-22e18',
        thumbnail_image_url: 'https://cdn.prod.website-files.com/site/archflow.webp',
      });
    } finally {
      fetchMock.mockRestore();
      close();
    }
  });

  it('prefers a main CMS thumbnail without promoting a generic primary to secondary', async () => {
    const ecovoltAsset = {
      ...PUBLISHED_ASSETS[0],
      id: 'recEcovolt',
      fields: {
        ...PUBLISHED_ASSETS[0].fields,
        Name: 'Ecovolt',
        '🥞CMS Slug': 'ecovolt-website-template',
        '🥞CMS Slug (formula)': 'ecovolt-farming-website-template',
        '🎨Creator Name': 'Zorion Studio',
        '🖼️Thumbnail Image': [{ url: 'https://v5.airtableusercontent.com/v3/u/53/temporary-ecovolt' }],
        '🔗Listing URL': 'https://webflow.com/templates/html/ecovolt-website-template',
        '🔗Preview Site URL': 'https://ecovolt-farming.webflow.io',
        '🔗Website URL': 'https://ecovolt-farming.webflow.io',
      },
    };
    const fetchMock = installAirtableFetchMock({
      publishedAssets: [ecovoltAsset],
      styles: LOOKUPS.styles,
      childCategories: LOOKUPS.childCategories,
      tags: LOOKUPS.tags,
      webflowCollections: [{ id: TEMPLATES_COLLECTION_ID, slug: 'templates', displayName: 'Templates' }],
      webflowCollectionItems: {
        [TEMPLATES_COLLECTION_ID]: [
          {
            id: 'item-ecovolt',
            fieldData: {
              slug: 'ecovolt-website-template',
              name: 'Ecovolt',
              thumbnail: { url: 'https://cdn.prod.website-files.com/site/ecovolt-generic.webp' },
              'main-thumbnail': { url: 'https://cdn.prod.website-files.com/site/ecovolt-main.webp' },
            },
          },
        ],
      },
    });
    const { env, close } = createTestEnv();
    env.WEBFLOW_API_TOKEN = 'test-webflow-cms-token';
    env.WEBFLOW_TEMPLATE_ASSET_SITE_ID = '5e593fb060cf877cf875dd1f';

    try {
      const rebuild = await callWorker(
        new Request('https://templates.test/api/templates/admin/rebuild', {
          method: 'POST',
          headers: { Authorization: 'Bearer sync-token' },
        }),
        env,
      );
      expect(rebuild.status).toBe(200);

      const response = await callWorker(new Request('https://templates.test/api/templates/search?q=ecovolt'), env);
      const payload = (await response.json()) as {
        items: Array<{ thumbnail_image_url: string | null; thumbnail_image_secondary_url: string | null }>;
      };

      expect(payload.items[0]?.thumbnail_image_url).toBe('https://cdn.prod.website-files.com/site/ecovolt-main.webp');
      expect(payload.items[0]?.thumbnail_image_secondary_url).toBeNull();
    } finally {
      fetchMock.mockRestore();
      close();
    }
  });

  it('keeps the CMS primary during targeted record thumbnail repairs', async () => {
    const ecovoltAsset = {
      ...PUBLISHED_ASSETS[0],
      id: 'recEcovolt',
      fields: {
        ...PUBLISHED_ASSETS[0].fields,
        Name: 'Ecovolt',
        '🥞CMS Slug': 'ecovolt-website-template',
        '🥞CMS Slug (formula)': 'ecovolt-farming-website-template',
        '🎨Creator Name': 'Zorion Studio',
        '🖼️Thumbnail Image': [{ url: 'https://v5.airtableusercontent.com/v3/u/53/temporary-ecovolt' }],
        '🔗Listing URL': 'https://webflow.com/templates/html/ecovolt-website-template',
        '🔗Preview Site URL': 'https://ecovolt-farming.webflow.io',
        '🔗Website URL': 'https://ecovolt-farming.webflow.io',
      },
    };
    const fetchMock = installAirtableFetchMock({
      publishedAssets: [ecovoltAsset],
      styles: LOOKUPS.styles,
      childCategories: LOOKUPS.childCategories,
      tags: LOOKUPS.tags,
      webflowCollections: [{ id: TEMPLATES_COLLECTION_ID, slug: 'templates', displayName: 'Templates' }],
      webflowCollectionItems: {
        [TEMPLATES_COLLECTION_ID]: [
          {
            id: 'item-ecovolt',
            fieldData: {
              slug: 'ecovolt-website-template',
              name: 'Ecovolt',
              thumbnail: { url: 'https://cdn.prod.website-files.com/site/ecovolt-stale-cms.webp' },
            },
          },
        ],
      },
      publishedTemplatePages: {
        '/templates/html/ecovolt-website-template':
          '<html><head><meta property="og:image" content="https://cdn.prod.website-files.com/site/ecovolt-public.webp"></head></html>',
      },
    });
    const { env, close } = createTestEnv();
    env.WEBFLOW_API_TOKEN = 'test-webflow-cms-token';
    env.WEBFLOW_TEMPLATE_ASSET_SITE_ID = '5e593fb060cf877cf875dd1f';

    try {
      const response = await callWorker(
        new Request('https://templates.test/api/templates/admin/sync-records', {
          method: 'POST',
          headers: {
            Authorization: 'Bearer sync-token',
            'content-type': 'application/json',
          },
          body: JSON.stringify({ ids: ['recEcovolt'] }),
        }),
        env,
      );
      expect(response.status).toBe(200);

      const payload = (await response.json()) as { image_refreshed_records: number };
      expect(payload.image_refreshed_records).toBe(0);

      const search = await callWorker(new Request('https://templates.test/api/templates/search?q=ecovolt'), env);
      const searchPayload = (await search.json()) as {
        items: Array<{ thumbnail_image_url: string | null; thumbnail_image_secondary_url: string | null }>;
      };

      expect(searchPayload.items[0]?.thumbnail_image_url).toBe('https://cdn.prod.website-files.com/site/ecovolt-stale-cms.webp');
      expect(searchPayload.items[0]?.thumbnail_image_secondary_url).toBeNull();
      expect(fetchMock.mock.calls.some(([input]) => new URL(typeof input === 'string' ? input : input.url).hostname === 'webflow.com')).toBe(
        false,
      );
    } finally {
      fetchMock.mockRestore();
      close();
    }
  });

  it('repairs stale template slugs and images from Webflow CMS by exact template name', async () => {
    const equalizeAsset = {
      ...PUBLISHED_ASSETS[0],
      id: 'recEqualize',
      fields: {
        ...PUBLISHED_ASSETS[0].fields,
        Name: 'Equalize',
        '🥞CMS Slug (formula)': 'equalize-website-template',
        '🖼️Thumbnail Image': [{ url: 'https://v5.airtableusercontent.com/v3/u/53/temporary-equalize' }],
        '🔗Listing URL': 'https://webflow.com/templates/html/equalize-website-template',
        '🔗Preview Site URL': 'https://equalize.webflow.io',
        '🔗Website URL': 'https://equalize.webflow.io',
      },
    };
    const fetchMock = installAirtableFetchMock({
      publishedAssets: [equalizeAsset],
      styles: LOOKUPS.styles,
      childCategories: LOOKUPS.childCategories,
      tags: LOOKUPS.tags,
      webflowCollectionItems: {
        [TEMPLATES_COLLECTION_ID]: [
          {
            id: 'item-equalize',
            fieldData: {
              name: 'Equalize',
              slug: 'equalize-charity-website-template',
              thumbnail: { url: 'https://cdn.prod.website-files.com/site/equalize.webp' },
            },
          },
        ],
      },
    });
    const { env, close } = createTestEnv();
    env.WEBFLOW_API_TOKEN = 'test-webflow-cms-token';

    try {
      const rebuild = await callWorker(
        new Request('https://templates.test/api/templates/admin/rebuild', {
          method: 'POST',
          headers: { Authorization: 'Bearer sync-token' },
        }),
        env,
      );
      expect(rebuild.status).toBe(200);

      const refresh = await callWorker(
        new Request('https://templates.test/api/templates/admin/refresh-images', {
          method: 'POST',
          headers: { Authorization: 'Bearer sync-token' },
        }),
        env,
      );
      expect(refresh.status).toBe(200);

      const response = await callWorker(new Request('https://templates.test/api/templates/search?q=equalize'), env);
      const payload = (await response.json()) as {
        items: Array<{ template_slug: string; url: string | null; thumbnail_image_url: string | null }>;
      };
      expect(payload.items[0]).toMatchObject({
        template_slug: 'equalize-charity-website-template',
        url: 'https://webflow.com/templates/html/equalize-charity-website-template',
        thumbnail_image_url: 'https://cdn.prod.website-files.com/site/equalize.webp',
      });
    } finally {
      fetchMock.mockRestore();
      close();
    }
  });

  it('uses Webflow designer CMS records before Airtable creator fallback during image refresh', async () => {
    const fetchMock = installAirtableFetchMock({
      publishedAssets: [
        {
          ...PUBLISHED_ASSETS[0],
          fields: {
            ...PUBLISHED_ASSETS[0].fields,
            '🎨Creator': ['recDesignerBrix'],
            '🎨Creator Name': 'BRIX Templates',
          },
        },
      ],
      styles: LOOKUPS.styles,
      childCategories: LOOKUPS.childCategories,
      tags: LOOKUPS.tags,
      creators: [
        {
          id: 'recDesignerBrix',
          fields: {
            Name: 'BRIX Templates',
            '🥞CMS Slug': 'airtable-brix',
            '🖼️Avatar (Primary)': [{ url: 'https://v5.airtableusercontent.com/v3/u/53/temporary-brix' }],
            '🖼️Avatar Alt Text': 'Airtable BRIX',
          },
        },
      ],
      webflowCollectionItems: {
        [DESIGNERS_COLLECTION_ID]: [
          {
            id: 'designer-brix',
            isArchived: false,
            isDraft: false,
            fieldData: {
              'sync-record-id': 'recDesignerBrix',
              name: 'BRIX Templates',
              slug: 'brix-templates',
              avatar: {
                url: 'https://cdn.prod.website-files.com/site/brix-avatar.webp',
                alt: 'BRIX Templates',
              },
            },
          },
        ],
      },
    });
    const { env, close } = createTestEnv();
    env.WEBFLOW_API_TOKEN = 'test-webflow-cms-token';

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
        `UPDATE template_documents
         SET creator_profile_url = ?,
             creator_avatar_url = ?,
             creator_avatar_alt = ?
         WHERE id = ?`,
      )
        .bind(
          'https://webflow.com/templates/designers/airtable-brix',
          'https://v5.airtableusercontent.com/v3/u/53/temporary-brix',
          'Airtable BRIX',
          'recAgentflow',
        )
        .run();

      const refresh = await callWorker(
        new Request('https://templates.test/api/templates/admin/refresh-images', {
          method: 'POST',
          headers: { Authorization: 'Bearer sync-token' },
        }),
        env,
      );
      expect(refresh.status).toBe(200);

      const row = await env.DB.prepare(
        `SELECT creator_profile_url, creator_avatar_url, creator_avatar_alt
         FROM template_documents
         WHERE id = ?`,
      )
        .bind('recAgentflow')
        .first<{
          creator_profile_url: string | null;
          creator_avatar_url: string | null;
          creator_avatar_alt: string | null;
        }>();

      expect(row).toEqual({
        creator_profile_url: 'https://webflow.com/templates/designers/brix-templates',
        creator_avatar_url: 'https://cdn.prod.website-files.com/site/brix-avatar.webp',
        creator_avatar_alt: 'BRIX Templates',
      });
    } finally {
      fetchMock.mockRestore();
      close();
    }
  });

  it('prefers stable Webflow project thumbnails over temporary Airtable attachments', async () => {
    const fetchMock = installAirtableFetchMock({
      publishedAssets: [
        {
          ...PUBLISHED_ASSETS[0],
          fields: {
            ...PUBLISHED_ASSETS[0].fields,
            '🖼️Thumbnail Image': [{ url: 'https://v5.airtableusercontent.com/v3/u/53/temporary-agentflow' }],
            '🖼️Thumbnail Image (Secondary)': [
              { url: 'https://v5.airtableusercontent.com/v3/u/53/temporary-agentflow-secondary' },
            ],
          },
        },
        {
          ...PUBLISHED_ASSETS[1],
          fields: {
            ...PUBLISHED_ASSETS[1].fields,
            '🖼️Thumbnail Image': [{ url: 'https://v5.airtableusercontent.com/v3/u/53/temporary-setrex' }],
          },
        },
      ],
      styles: LOOKUPS.styles,
      childCategories: LOOKUPS.childCategories,
      tags: LOOKUPS.tags,
      webflowAssets: [
        {
          id: 'asset-agentflow',
          contentType: 'image/webp',
          hostedUrl: 'https://cdn.prod.website-files.com/site/agentflow.webp',
          originalFileName: 'agentflow.webp',
          displayName: 'agentflow.webp',
        },
      ],
    });
    const { env, close } = createTestEnv();
    env.WEBFLOW_API_TOKEN = 'test-webflow-token';
    env.WEBFLOW_TEMPLATE_ASSET_SITE_ID = '5e593fb060cf877cf875dd1f';

    try {
      const rebuild = await callWorker(
        new Request('https://templates.test/api/templates/admin/rebuild', {
          method: 'POST',
          headers: { Authorization: 'Bearer sync-token' },
        }),
        env,
      );
      expect(rebuild.status).toBe(200);

      const response = await callWorker(new Request('https://templates.test/api/templates/search?scope=featured&page_size=10'), env);
      const payload = (await response.json()) as {
        items: Array<{ name: string; thumbnail_image_url: string | null; thumbnail_image_secondary_url: string | null }>;
      };

      expect(payload.items.find((item) => item.name === 'Agentflow')?.thumbnail_image_url).toBe(
        'https://cdn.prod.website-files.com/site/agentflow.webp',
      );
      expect(payload.items.find((item) => item.name === 'Agentflow')?.thumbnail_image_secondary_url).toBeNull();

      const setrexResponse = await callWorker(new Request('https://templates.test/api/templates/search?q=setrex'), env);
      const setrexPayload = (await setrexResponse.json()) as {
        items: Array<{ name: string; thumbnail_image_url: string | null }>;
      };
      expect(setrexPayload.items.find((item) => item.name === 'Setrex')?.thumbnail_image_url).toBeNull();
    } finally {
      fetchMock.mockRestore();
      close();
    }
  });

  it('refreshes indexed thumbnails when Webflow CMS images appear after Airtable sync', async () => {
    const dataset = {
      publishedAssets: [
        {
          ...PUBLISHED_ASSETS[0],
          fields: {
            ...PUBLISHED_ASSETS[0].fields,
            '🖼️Thumbnail Image': [{ url: 'https://v5.airtableusercontent.com/v3/u/53/temporary-agentflow' }],
          },
        },
      ],
      incrementalAssets: [],
      styles: LOOKUPS.styles,
      childCategories: LOOKUPS.childCategories,
      tags: LOOKUPS.tags,
      webflowCollectionItems: {
        [TEMPLATES_COLLECTION_ID]: [] as Array<Record<string, unknown>>,
      },
    };
    const fetchMock = installAirtableFetchMock(dataset);
    const { env, close } = createTestEnv();
    env.WEBFLOW_API_TOKEN = 'test-webflow-cms-token';

    try {
      const rebuild = await callWorker(
        new Request('https://templates.test/api/templates/admin/rebuild', {
          method: 'POST',
          headers: { Authorization: 'Bearer sync-token' },
        }),
        env,
      );
      expect(rebuild.status).toBe(200);

      const beforeRefresh = await callWorker(new Request('https://templates.test/api/templates/search?q=agentflow'), env);
      const beforePayload = (await beforeRefresh.json()) as { items: Array<{ thumbnail_image_url: string | null }> };
      expect(beforePayload.items[0]?.thumbnail_image_url).toBeNull();

      dataset.webflowCollectionItems[TEMPLATES_COLLECTION_ID] = [
        {
          id: 'template-agentflow',
          isArchived: false,
          isDraft: false,
          fieldData: {
            'sync-record-id': 'recAgentflow',
            name: 'Agentflow',
            slug: 'agentflow-website-template',
            'reviewer-pick-reason-featured-templates': 'Strong interaction polish and clear buyer-fit execution.',
            'main-thumbnail': { url: 'https://cdn.prod.website-files.com/site/agentflow-updated.webp' },
          },
        },
      ];

      const sync = await callWorker(
        new Request('https://templates.test/api/templates/admin/refresh-images', {
          method: 'POST',
          headers: { Authorization: 'Bearer sync-token' },
        }),
        env,
      );
      expect(sync.status).toBe(200);
      expect((await sync.json()) as { mode: string }).toMatchObject({
        mode: 'image_refresh',
      });

      const afterRefresh = await callWorker(new Request('https://templates.test/api/templates/search?q=agentflow'), env);
      const afterPayload = (await afterRefresh.json()) as {
        items: Array<{ thumbnail_image_url: string | null; reviewer_pick_reason: string | null }>;
      };
      expect(afterPayload.items[0]?.thumbnail_image_url).toBe(
        'https://cdn.prod.website-files.com/site/agentflow-updated.webp',
      );
      expect(afterPayload.items[0]?.reviewer_pick_reason).toBe(
        'Strong interaction polish and clear buyer-fit execution.',
      );
    } finally {
      fetchMock.mockRestore();
      close();
    }
  });

  it('keeps empty caught-up incremental sync bounded without loading the global Webflow image index', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-25T16:00:00.000Z'));

    const fetchMock = installAirtableFetchMock({
      publishedAssets: [PUBLISHED_ASSETS[0]],
      incrementalAssets: [],
      styles: LOOKUPS.styles,
      childCategories: LOOKUPS.childCategories,
      tags: LOOKUPS.tags,
      webflowCollectionItems: {
        [TEMPLATES_COLLECTION_ID]: [
          {
            id: 'item-agentflow',
            fieldData: {
              slug: 'agentflow-website-template',
              name: 'Agentflow',
              'thumbnail-image': { url: 'https://cdn.prod.website-files.com/site/agentflow.webp' },
            },
          },
        ],
      },
    });
    const { env, close } = createTestEnv();
    env.WEBFLOW_API_TOKEN = 'test-webflow-cms-token';
    env.WEBFLOW_TEMPLATE_ASSET_SITE_ID = '5e593fb060cf877cf875dd1f';
    env.WEBFLOW_TEMPLATE_COLLECTION_ID = TEMPLATES_COLLECTION_ID;

    try {
      await setSyncCursor(env.DB, '2026-06-25T15:59:00.000Z');

      const response = await worker.fetch(
        new Request('https://templates.test/api/templates/admin/sync', {
          method: 'POST',
          headers: { Authorization: 'Bearer sync-token' },
        }),
        env,
        { waitUntil() {}, passThroughOnException() {}, props: {} },
      );
      expect(response.status).toBe(200);
      expect((await response.json()) as { indexed_records: number; image_refreshed_records: number }).toMatchObject({
        indexed_records: 0,
        image_refreshed_records: 0,
      });
      expect(
        fetchMock.mock.calls.some(([input]) => {
          const url = new URL(typeof input === 'string' ? input : input.url);
          return url.hostname === 'api.webflow.com';
        }),
      ).toBe(false);
    } finally {
      fetchMock.mockRestore();
      close();
    }
  });

  it('reports progress between Webflow image update batches', async () => {
    const { env, close } = createTestEnv();
    const records = Array.from({ length: 51 }, (_, index) => {
      const suffix = String(index).padStart(2, '0');
      return {
        id: `recBatch${suffix}`,
        templateSlug: `batch-${suffix}-website-template`,
        name: `Batch ${suffix}`,
        listingUrl: `https://webflow.com/templates/html/batch-${suffix}-website-template`,
        thumbnailImageUrl: `https://cdn.prod.website-files.com/site/batch-${suffix}.webp`,
        thumbnailImageSecondaryUrl: null,
        carouselImageUrls: [],
        price: null,
        isFree: null,
      };
    });

    try {
      await env.DB.batch(
        records.map((record) =>
          env.DB.prepare(
            `INSERT INTO template_documents (id, template_slug, name, synced_at)
             VALUES (?, ?, ?, ?)`,
          ).bind(record.id, record.templateSlug, record.name, '2026-06-25T16:00:00.000Z'),
        ),
      );

      const onBatch = vi.fn(async () => {});
      await updateTemplateImagesFromWebflow(env.DB, records, '2026-06-25T17:00:00.000Z', { onBatch });

      const row = await env.DB.prepare('SELECT thumbnail_image_url FROM template_documents WHERE id = ?')
        .bind('recBatch50')
        .first<{ thumbnail_image_url: string | null }>();

      expect(row?.thumbnail_image_url).toBe('https://cdn.prod.website-files.com/site/batch-50.webp');
      expect(onBatch.mock.calls.length).toBeGreaterThan(1);
    } finally {
      close();
    }
  });

  it('reports progress between indexed image update batches', async () => {
    const { env, close } = createTestEnv();
    const updates = Array.from({ length: 51 }, (_, index) => {
      const suffix = String(index).padStart(2, '0');
      return {
        id: `recIndexedBatch${suffix}`,
        thumbnailImageUrl: `https://cdn.prod.website-files.com/site/indexed-batch-${suffix}.webp`,
        thumbnailImageSecondaryUrl: null,
      };
    });

    try {
      await env.DB.batch(
        updates.map((update, index) =>
          env.DB.prepare(
            `INSERT INTO template_documents (id, template_slug, name, synced_at)
             VALUES (?, ?, ?, ?)`,
          ).bind(
            update.id,
            `indexed-batch-${String(index).padStart(2, '0')}-website-template`,
            `Indexed Batch ${String(index).padStart(2, '0')}`,
            '2026-06-25T16:00:00.000Z',
          ),
        ),
      );

      const onBatch = vi.fn(async () => {});
      await updateTemplateDocumentImages(env.DB, updates, '2026-06-25T17:00:00.000Z', { onBatch });
      const row = await env.DB.prepare('SELECT thumbnail_image_url FROM template_documents WHERE id = ?')
        .bind('recIndexedBatch50')
        .first<{ thumbnail_image_url: string | null }>();

      expect(row?.thumbnail_image_url).toBe('https://cdn.prod.website-files.com/site/indexed-batch-50.webp');
      expect(onBatch.mock.calls.length).toBeGreaterThan(1);
    } finally {
      close();
    }
  });

  it('refreshes indexed price metadata from Webflow CMS items', async () => {
    const dataset = {
      publishedAssets: [PUBLISHED_ASSETS[0]],
      incrementalAssets: [],
      styles: LOOKUPS.styles,
      childCategories: LOOKUPS.childCategories,
      tags: LOOKUPS.tags,
      webflowCollectionItems: {
        [TEMPLATES_COLLECTION_ID]: [] as Array<Record<string, unknown>>,
      },
    };
    const fetchMock = installAirtableFetchMock(dataset);
    const { env, close } = createTestEnv();
    env.WEBFLOW_API_TOKEN = 'test-webflow-cms-token';

    try {
      const rebuild = await callWorker(
        new Request('https://templates.test/api/templates/admin/rebuild', {
          method: 'POST',
          headers: { Authorization: 'Bearer sync-token' },
        }),
        env,
      );
      expect(rebuild.status).toBe(200);

      const beforeRefresh = await callWorker(new Request('https://templates.test/api/templates/search?q=agentflow'), env);
      const beforePayload = (await beforeRefresh.json()) as { items: Array<{ price: number | null; is_free: boolean }> };
      expect(beforePayload.items[0]).toMatchObject({ price: 169, is_free: false });

      dataset.webflowCollectionItems[TEMPLATES_COLLECTION_ID] = [
        {
          id: 'item-agentflow',
          isArchived: false,
          isDraft: false,
          fieldData: {
            'sync-record-id': 'recAgentflow',
            name: 'Agentflow',
            slug: 'agentflow-website-template',
            thumbnail: { url: 'https://example.com/agentflow.png' },
            'template-price': 'Free',
          },
        },
      ];

      const refresh = await callWorker(
        new Request('https://templates.test/api/templates/admin/refresh-images', {
          method: 'POST',
          headers: { Authorization: 'Bearer sync-token' },
        }),
        env,
      );
      expect(refresh.status).toBe(200);
      await refresh.json();

      const afterRefresh = await callWorker(new Request('https://templates.test/api/templates/search?q=agentflow'), env);
      const afterPayload = (await afterRefresh.json()) as { items: Array<{ price: number | null; is_free: boolean }> };
      expect(afterPayload.items[0]).toMatchObject({ price: 0, is_free: true });

      const freeSearch = await callWorker(
        new Request('https://templates.test/api/templates/search?q=agentflow&free_only=true'),
        env,
      );
      const freePayload = (await freeSearch.json()) as { items: Array<{ name: string }> };
      expect(freePayload.items.map((item) => item.name)).toEqual(['Agentflow']);
    } finally {
      fetchMock.mockRestore();
      close();
    }
  });

  it('ignores unrelated amount fields when extracting Webflow offer metadata', () => {
    expect(extractTemplateOffer({ 'purchase-amount': 21 })).toBeNull();
    expect(extractTemplateOffer({ 'cumulative-purchase-amount': 21 })).toBeNull();
    expect(extractTemplateOffer({ 'template-price': '$49' })).toEqual({ price: 49, isFree: false });
  });

  it('does not refresh price metadata by ambiguous template name', async () => {
    const duplicateAgentflow = {
      ...PUBLISHED_ASSETS[1],
      id: 'recAgentflowDuplicate',
      fields: {
        ...PUBLISHED_ASSETS[1].fields,
        Name: 'Agentflow',
        '🥞CMS Slug (formula)': 'agentflow-alt-website-template',
        '🥞💲Template Price Filter (🏗️ only)': 79,
        '🔗Listing URL': 'https://webflow.com/templates/html/agentflow-alt-website-template',
        '🔗Preview Site URL': 'https://agentflow-alt.example.com',
        '🔗Website URL': 'https://webflow.com/templates/html/agentflow-alt-website-template',
      },
    };
    const dataset = {
      publishedAssets: [PUBLISHED_ASSETS[0], duplicateAgentflow],
      incrementalAssets: [],
      styles: LOOKUPS.styles,
      childCategories: LOOKUPS.childCategories,
      tags: LOOKUPS.tags,
      webflowCollectionItems: {
        [TEMPLATES_COLLECTION_ID]: [] as Array<Record<string, unknown>>,
      },
    };
    const fetchMock = installAirtableFetchMock(dataset);
    const { env, close } = createTestEnv();
    env.WEBFLOW_API_TOKEN = 'test-webflow-cms-token';

    try {
      const rebuild = await callWorker(
        new Request('https://templates.test/api/templates/admin/rebuild', {
          method: 'POST',
          headers: { Authorization: 'Bearer sync-token' },
        }),
        env,
      );
      expect(rebuild.status).toBe(200);

      dataset.webflowCollectionItems[TEMPLATES_COLLECTION_ID] = [
        {
          id: 'item-agentflow-name-only',
          isArchived: false,
          isDraft: false,
          fieldData: {
            name: 'Agentflow',
            'template-price': 'Free',
          },
        },
      ];

      const refresh = await callWorker(
        new Request('https://templates.test/api/templates/admin/refresh-images', {
          method: 'POST',
          headers: { Authorization: 'Bearer sync-token' },
        }),
        env,
      );
      expect(refresh.status).toBe(200);
      await refresh.json();

      const rows = await env.DB.prepare(
        `SELECT id, price, is_free
         FROM template_documents
         WHERE name = ?
         ORDER BY id`,
      )
        .bind('Agentflow')
        .all<{ id: string; price: number | null; is_free: number }>();

      expect(rows.results).toEqual([
        { id: 'recAgentflow', price: 169, is_free: 0 },
        { id: 'recAgentflowDuplicate', price: 79, is_free: 0 },
      ]);
    } finally {
      fetchMock.mockRestore();
      close();
    }
  });

  it('refreshes stale rows from the Webflow template API image index', async () => {
    const dataset = {
      publishedAssets: [
        {
          ...PUBLISHED_ASSETS[0],
          fields: {
            ...PUBLISHED_ASSETS[0].fields,
            '🖼️Thumbnail Image': [{ url: 'https://v5.airtableusercontent.com/v3/u/53/temporary-agentflow' }],
          },
        },
      ],
      incrementalAssets: [],
      styles: LOOKUPS.styles,
      childCategories: LOOKUPS.childCategories,
      tags: LOOKUPS.tags,
      webflowCollectionItems: {} as Record<string, Array<Record<string, unknown>>>,
    };
    const fetchMock = installAirtableFetchMock(dataset);
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

      const beforeRefresh = await callWorker(new Request('https://templates.test/api/templates/search?q=agentflow'), env);
      const beforePayload = (await beforeRefresh.json()) as { items: Array<{ thumbnail_image_url: string | null }> };
      expect(beforePayload.items[0]?.thumbnail_image_url).toBeNull();

      env.WEBFLOW_API_TOKEN = 'test-webflow-cms-token';
      env.WEBFLOW_TEMPLATE_ASSET_SITE_ID = 'site-webflow-templates';
      env.WEBFLOW_TEMPLATE_COLLECTION_ID = TEMPLATES_COLLECTION_ID;
      dataset.webflowCollectionItems[TEMPLATES_COLLECTION_ID] = [
        {
          id: 'template-agentflow',
          isArchived: false,
          isDraft: false,
          fieldData: {
            'sync-record-id': 'recAgentflow',
            name: 'Agentflow',
            slug: 'agentflow-website-template',
            'main-thumbnail': { url: 'https://cdn.prod.website-files.com/site/agentflow-published.webp' },
          },
        },
      ];

      const sync = await callWorker(
        new Request('https://templates.test/api/templates/admin/refresh-images', {
          method: 'POST',
          headers: { Authorization: 'Bearer sync-token' },
        }),
        env,
      );
      expect(sync.status).toBe(200);
      expect((await sync.json()) as { mode: string }).toMatchObject({
        mode: 'image_refresh',
      });

      const response = await callWorker(new Request('https://templates.test/api/templates/search?q=agentflow'), env);
      const payload = (await response.json()) as { items: Array<{ thumbnail_image_url: string | null }> };
      expect(payload.items[0]?.thumbnail_image_url).toBe(
        'https://cdn.prod.website-files.com/site/agentflow-published.webp',
      );
    } finally {
      fetchMock.mockRestore();
      close();
    }
  });

  it('refreshes changed Airtable rows from Webflow API when the stored thumbnail is already stable', async () => {
    const now = Date.now();
    const syncCursor = new Date(now - 5 * 60 * 1000).toISOString();
    const modifiedAt = new Date(now - 60 * 1000).toISOString();
    const staleStableAsset = {
      ...PUBLISHED_ASSETS[0],
      fields: {
        ...PUBLISHED_ASSETS[0].fields,
        '🖼️Thumbnail Image': [{ url: 'https://cdn.prod.website-files.com/site/agentflow-old.webp' }],
      },
    };
    const dataset = {
      publishedAssets: [staleStableAsset],
      incrementalAssets: [
        {
          ...staleStableAsset,
          fields: {
            ...staleStableAsset.fields,
            '📅LMT': modifiedAt,
          },
        },
      ],
      styles: LOOKUPS.styles,
      childCategories: LOOKUPS.childCategories,
      tags: LOOKUPS.tags,
      webflowCollectionItems: {} as Record<string, Array<Record<string, unknown>>>,
    };
    const fetchMock = installAirtableFetchMock(dataset);
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

      const beforeRefresh = await callWorker(new Request('https://templates.test/api/templates/search?q=agentflow'), env);
      const beforePayload = (await beforeRefresh.json()) as { items: Array<{ thumbnail_image_url: string | null }> };
      expect(beforePayload.items[0]?.thumbnail_image_url).toBe('https://cdn.prod.website-files.com/site/agentflow-old.webp');
      await setSyncCursor(env.DB, syncCursor);
      env.WEBFLOW_API_TOKEN = 'test-webflow-cms-token';
      env.WEBFLOW_TEMPLATE_ASSET_SITE_ID = 'site-webflow-templates';
      env.WEBFLOW_TEMPLATE_COLLECTION_ID = TEMPLATES_COLLECTION_ID;
      dataset.webflowCollectionItems[TEMPLATES_COLLECTION_ID] = [
        {
          id: 'template-agentflow',
          isArchived: false,
          isDraft: false,
          fieldData: {
            'sync-record-id': 'recAgentflow',
            name: 'Agentflow',
            slug: 'agentflow-website-template',
            'main-thumbnail': { url: 'https://cdn.prod.website-files.com/site/agentflow-new.webp' },
          },
        },
      ];

      const sync = await callWorker(
        new Request('https://templates.test/api/templates/admin/sync', {
          method: 'POST',
          headers: { Authorization: 'Bearer sync-token' },
        }),
        env,
      );
      expect(sync.status).toBe(200);
      expect((await sync.json()) as { indexed_records: number; image_refreshed_records: number }).toMatchObject({
        indexed_records: 1,
        image_refreshed_records: 0,
      });

      const response = await callWorker(new Request('https://templates.test/api/templates/search?q=agentflow'), env);
      const payload = (await response.json()) as { items: Array<{ thumbnail_image_url: string | null }> };
      expect(payload.items[0]?.thumbnail_image_url).toBe('https://cdn.prod.website-files.com/site/agentflow-new.webp');
    } finally {
      fetchMock.mockRestore();
      close();
    }
  });

  it('fast-forwards empty incremental windows before indexing newer changed rows', async () => {
    const changedAsset = {
      ...PUBLISHED_ASSETS[0],
      fields: {
        ...PUBLISHED_ASSETS[0].fields,
        '📅LMT': '2026-03-17T05:13:07.000Z',
      },
    };
    const fetchMock = installAirtableFetchMock({
      publishedAssets: [],
      incrementalAssets: [changedAsset],
      styles: LOOKUPS.styles,
      childCategories: LOOKUPS.childCategories,
      tags: LOOKUPS.tags,
    });
    const { env, close } = createTestEnv();

    try {
      await setSyncCursor(env.DB, '2026-03-17T04:00:00.000Z');

      const sync = await callWorker(
        new Request('https://templates.test/api/templates/admin/sync', {
          method: 'POST',
          headers: { Authorization: 'Bearer sync-token' },
        }),
        env,
      );
      expect(sync.status).toBe(200);
      const syncPayload = (await sync.json()) as {
        indexed_records: number;
        skipped_empty_windows?: number;
      };
      expect(syncPayload.indexed_records).toBe(1);
      expect(syncPayload.skipped_empty_windows).toBeGreaterThan(0);

      const search = await callWorker(new Request('https://templates.test/api/templates/search?q=agentflow'), env);
      const searchPayload = (await search.json()) as { items: Array<{ name: string }> };
      expect(searchPayload.items.map((item) => item.name)).toEqual(['Agentflow']);
      expect(fetchMock.mock.calls.some(([input]) => new URL(typeof input === 'string' ? input : input.url).hostname === 'api.webflow.com')).toBe(
        false,
      );
    } finally {
      fetchMock.mockRestore();
      close();
    }
  });

  it('continues stale incremental catch-up across non-empty windows in one run', async () => {
    const firstWindowAsset = {
      ...PUBLISHED_ASSETS[0],
      id: 'recFirstWindow',
      fields: {
        ...PUBLISHED_ASSETS[0].fields,
        Name: 'First Window',
        '📅LMT': '2026-03-17T05:13:07.000Z',
        '🥞CMS Slug (formula)': 'first-window-website-template',
        '🔗Listing URL': 'https://webflow.com/templates/html/first-window-website-template',
        '🔗Preview Site URL': 'https://first-window.example.com',
        '🔗Website URL': 'https://webflow.com/templates/html/first-window-website-template',
      },
    };
    const secondWindowAsset = {
      ...PUBLISHED_ASSETS[0],
      id: 'recSecondWindow',
      fields: {
        ...PUBLISHED_ASSETS[0].fields,
        Name: 'Second Window',
        '📅LMT': '2026-03-17T05:28:07.000Z',
        '🥞CMS Slug (formula)': 'second-window-website-template',
        '🔗Listing URL': 'https://webflow.com/templates/html/second-window-website-template',
        '🔗Preview Site URL': 'https://second-window.example.com',
        '🔗Website URL': 'https://webflow.com/templates/html/second-window-website-template',
      },
    };
    const fetchMock = installAirtableFetchMock({
      publishedAssets: [],
      incrementalAssets: [firstWindowAsset, secondWindowAsset],
      styles: LOOKUPS.styles,
      childCategories: LOOKUPS.childCategories,
      tags: LOOKUPS.tags,
    });
    const { env, close } = createTestEnv();

    try {
      await setSyncCursor(env.DB, '2026-03-17T05:00:00.000Z');

      const sync = await callWorker(
        new Request('https://templates.test/api/templates/admin/sync', {
          method: 'POST',
          headers: { Authorization: 'Bearer sync-token' },
        }),
        env,
      );
      expect(sync.status).toBe(200);
      const syncPayload = (await sync.json()) as {
        fetched_records: number;
        indexed_records: number;
      };
      expect(syncPayload).toMatchObject({
        fetched_records: 2,
        indexed_records: 2,
      });

      const search = await callWorker(new Request('https://templates.test/api/templates/search?q=window'), env);
      const searchPayload = (await search.json()) as { items: Array<{ name: string }> };
      expect(searchPayload.items.map((item) => item.name)).toEqual(['First Window', 'Second Window']);
    } finally {
      fetchMock.mockRestore();
      close();
    }
  });

  it('bounds stale changed-record catch-up without dropping same-timestamp records', async () => {
    const changedAssets = Array.from({ length: 130 }, (_, index) => {
      const timestamp =
        index < 78
          ? `2026-03-17T05:01:${String(index % 60).padStart(2, '0')}.${String(Math.floor(index / 60)).padStart(3, '0')}Z`
          : index < 82
            ? '2026-03-17T05:10:00.000Z'
            : '2026-03-17T05:11:00.000Z';
      return {
        ...PUBLISHED_ASSETS[0],
        id: `recBulk${String(index).padStart(3, '0')}`,
        fields: {
          ...PUBLISHED_ASSETS[0].fields,
          Name: `Bulk Template ${index}`,
          '📅LMT': timestamp,
          '🥞CMS Slug (formula)': `bulk-template-${index}`,
          '🔗Listing URL': `https://webflow.com/templates/html/bulk-template-${index}`,
          '🔗Preview Site URL': `https://bulk-template-${index}.example.com`,
          '🔗Website URL': `https://webflow.com/templates/html/bulk-template-${index}`,
        },
      };
    });
    const fetchMock = installAirtableFetchMock({
      publishedAssets: [],
      incrementalAssets: changedAssets,
      styles: LOOKUPS.styles,
      childCategories: LOOKUPS.childCategories,
      tags: LOOKUPS.tags,
    });
    const { env, close } = createTestEnv();
    env.WEBFLOW_API_TOKEN = 'test-webflow-token';
    env.WEBFLOW_TEMPLATE_ASSET_SITE_ID = '5e593fb060cf877cf875dd1f';

    try {
      await setSyncCursor(env.DB, '2026-03-17T05:00:00.000Z');

      const sync = await callWorker(
        new Request('https://templates.test/api/templates/admin/sync', {
          method: 'POST',
          headers: { Authorization: 'Bearer sync-token' },
        }),
        env,
      );
      expect(sync.status).toBe(200);
      const syncPayload = (await sync.json()) as {
        cursor: string;
        fetched_records: number;
        indexed_records: number;
      };
      expect(syncPayload).toMatchObject({
        cursor: '2026-03-17T05:10:00.000Z',
        fetched_records: 82,
        indexed_records: 82,
      });

      const included = await env.DB.prepare('SELECT id FROM template_documents WHERE id = ?').bind('recBulk081').first();
      expect(included).toEqual({ id: 'recBulk081' });

      const deferred = await env.DB.prepare('SELECT id FROM template_documents WHERE id = ?').bind('recBulk129').first();
      expect(deferred).toBeNull();
      expect(
        fetchMock.mock.calls.some(([input]) => {
          const url = new URL(typeof input === 'string' ? input : input.url);
          return url.hostname.includes('airtable.com') && url.searchParams.get('maxRecords') === '100';
        }),
      ).toBe(true);
      expect(fetchMock.mock.calls.some(([input]) => new URL(typeof input === 'string' ? input : input.url).hostname === 'api.webflow.com')).toBe(
        true,
      );
    } finally {
      fetchMock.mockRestore();
      close();
    }
  }, 10_000);

  it('sweeps recent publishes when stale catch-up hits the bulk-edit fetch cap', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-23T14:30:00.000Z'));
    const changedAssets = Array.from({ length: 130 }, (_, index) => {
      const timestamp =
        index < 78
          ? `2026-03-17T05:01:${String(index % 60).padStart(2, '0')}.${String(Math.floor(index / 60)).padStart(3, '0')}Z`
          : index < 82
            ? '2026-03-17T05:10:00.000Z'
            : '2026-03-17T05:11:00.000Z';
      return {
        ...PUBLISHED_ASSETS[0],
        id: `recBulkCatchup${String(index).padStart(3, '0')}`,
        fields: {
          ...PUBLISHED_ASSETS[0].fields,
          Name: `Bulk Catchup Template ${index}`,
          '📅LMT': timestamp,
          '🥞CMS Slug (formula)': `bulk-catchup-template-${index}`,
          '🔗Listing URL': `https://webflow.com/templates/html/bulk-catchup-template-${index}`,
          '🔗Preview Site URL': `https://bulk-catchup-template-${index}.example.com`,
          '🔗Website URL': `https://webflow.com/templates/html/bulk-catchup-template-${index}`,
        },
      };
    });
    const recentPublishedAsset = {
      ...PUBLISHED_ASSETS[0],
      id: 'recRecentBulkCatchup',
      fields: {
        ...PUBLISHED_ASSETS[0].fields,
        Name: 'Recent Bulk Catchup',
        '🚀📅Published Date': '2026-06-22',
        '🥞CMS Slug': 'recent-bulk-catchup-website-template',
        '🥞CMS Slug (formula)': 'recent-bulk-catchup-website-template',
        '🔗Listing URL': 'https://webflow.com/templates/html/recent-bulk-catchup-website-template',
        '🔗Website URL': 'https://webflow.com/templates/html/recent-bulk-catchup-website-template',
        '📅LMT': '2026-06-23T14:04:12.000Z',
      },
    };
    const fetchMock = installAirtableFetchMock({
      publishedAssets: [recentPublishedAsset],
      incrementalAssets: changedAssets,
      styles: LOOKUPS.styles,
      childCategories: LOOKUPS.childCategories,
      tags: LOOKUPS.tags,
      creators: LOOKUPS.creators,
    });
    const { env, close } = createTestEnv();

    try {
      await setSyncCursor(env.DB, '2026-03-17T05:00:00.000Z');

      const sync = await callWorker(
        new Request('https://templates.test/api/templates/admin/sync', {
          method: 'POST',
          headers: { Authorization: 'Bearer sync-token' },
        }),
        env,
      );
      expect(sync.status).toBe(200);
      const syncPayload = (await sync.json()) as {
        cursor: string;
        fetched_records: number;
        indexed_records: number;
        recent_published_records?: number;
      };
      expect(syncPayload).toMatchObject({
        cursor: '2026-03-17T05:10:00.000Z',
        fetched_records: 83,
        indexed_records: 83,
        recent_published_records: 1,
      });

      const search = await callWorker(new Request('https://templates.test/api/templates/search?q=Recent%20Bulk%20Catchup'), env);
      const payload = (await search.json()) as { items: Array<{ id: string; template_slug: string }> };
      expect(payload.items).toEqual([
        expect.objectContaining({
          id: 'recRecentBulkCatchup',
          template_slug: 'recent-bulk-catchup-website-template',
        }),
      ]);
      expect(
        fetchMock.mock.calls.some(([input]) => {
          const url = new URL(typeof input === 'string' ? input : input.url);
          return url.hostname.includes('airtable.com') && url.searchParams.get('maxRecords') === '100';
        }),
      ).toBe(true);
    } finally {
      fetchMock.mockRestore();
      close();
    }
  }, 10_000);

  it('bounds empty incremental catch-up windows so stale cursors advance in slices', async () => {
    const fetchMock = installAirtableFetchMock({
      publishedAssets: [],
      incrementalAssets: [],
      styles: LOOKUPS.styles,
      childCategories: LOOKUPS.childCategories,
      tags: LOOKUPS.tags,
    });
    const { env, close } = createTestEnv();
    env.WEBFLOW_API_TOKEN = 'test-webflow-token';
    env.WEBFLOW_TEMPLATE_ASSET_SITE_ID = '5e593fb060cf877cf875dd1f';

    try {
      await setSyncCursor(env.DB, '2026-03-17T00:00:00.000Z');

      const sync = await callWorker(
        new Request('https://templates.test/api/templates/admin/sync', {
          method: 'POST',
          headers: { Authorization: 'Bearer sync-token' },
        }),
        env,
      );
      expect(sync.status).toBe(200);
      const syncPayload = (await sync.json()) as {
        cursor: string;
        fetched_records: number;
        indexed_records: number;
        skipped_empty_windows?: number;
      };
      expect(syncPayload).toMatchObject({
        cursor: '2026-03-17T02:00:00.000Z',
        fetched_records: 0,
        indexed_records: 0,
        skipped_empty_windows: 8,
      });
      expect(fetchMock.mock.calls.some(([input]) => new URL(typeof input === 'string' ? input : input.url).hostname === 'api.webflow.com')).toBe(
        false,
      );
    } finally {
      fetchMock.mockRestore();
      close();
    }
  });

  it('sweeps missing recent publishes even while the LMT cursor is still catching up', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-23T14:30:00.000Z'));
    const recentPublishedAsset = {
      ...PUBLISHED_ASSETS[0],
      id: 'recRecentPayly',
      fields: {
        ...PUBLISHED_ASSETS[0].fields,
        Name: 'Recent Payly',
        '🚀📅Published Date': '2026-06-22',
        '🥞CMS Slug': 'recent-payly-website-template',
        '🥞CMS Slug (formula)': 'recent-payly-website-template',
        '🔗Listing URL': 'https://webflow.com/templates/html/recent-payly-website-template',
        '🔗Website URL': 'https://webflow.com/templates/html/recent-payly-website-template',
        '📅LMT': '2026-06-23T14:04:12.000Z',
      },
    };
    const fetchMock = installAirtableFetchMock({
      publishedAssets: [recentPublishedAsset],
      incrementalAssets: [],
      styles: LOOKUPS.styles,
      childCategories: LOOKUPS.childCategories,
      tags: LOOKUPS.tags,
      creators: LOOKUPS.creators,
    });
    const { env, close } = createTestEnv();

    try {
      await setSyncCursor(env.DB, '2026-03-17T00:00:00.000Z');

      const sync = await callWorker(
        new Request('https://templates.test/api/templates/admin/sync', {
          method: 'POST',
          headers: { Authorization: 'Bearer sync-token' },
        }),
        env,
      );
      expect(sync.status).toBe(200);
      const syncPayload = (await sync.json()) as {
        fetched_records: number;
        indexed_records: number;
        recent_published_records?: number;
        skipped_empty_windows?: number;
      };
      expect(syncPayload).toMatchObject({
        fetched_records: 1,
        indexed_records: 1,
        recent_published_records: 1,
        skipped_empty_windows: 8,
      });

      const search = await callWorker(new Request('https://templates.test/api/templates/search?q=Recent%20Payly'), env);
      const payload = (await search.json()) as { items: Array<{ id: string; template_slug: string }> };
      expect(payload.items).toEqual([
        expect.objectContaining({
          id: 'recRecentPayly',
          template_slug: 'recent-payly-website-template',
        }),
      ]);
    } finally {
      fetchMock.mockRestore();
      close();
    }
  });

  it('sweeps missing recently modified published templates even when published date is old', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-29T12:30:00.000Z'));
    const recentlyModifiedPublishedAsset = {
      ...PUBLISHED_ASSETS[0],
      id: 'recSafeHaven',
      fields: {
        ...PUBLISHED_ASSETS[0].fields,
        Name: 'SafeHaven',
        '🚀📅Published Date': '2026-06-01',
        '🥞CMS Slug': 'safehaven-website-template',
        '🥞CMS Slug (formula)': 'safehaven-website-template',
        '🔗Listing URL': 'https://webflow.com/templates/html/safehaven-website-template',
        '🔗Website URL': 'https://safehaven-template.webflow.io/',
        '📅LMT': '2026-06-29T12:22:54.000Z',
      },
    };
    const fetchMock = installAirtableFetchMock({
      publishedAssets: [recentlyModifiedPublishedAsset],
      incrementalAssets: [],
      styles: LOOKUPS.styles,
      childCategories: LOOKUPS.childCategories,
      tags: LOOKUPS.tags,
      creators: LOOKUPS.creators,
    });
    const { env, close } = createTestEnv();

    try {
      await setSyncCursor(env.DB, '2026-06-29T05:14:45.000Z');

      const sync = await callWorker(
        new Request('https://templates.test/api/templates/admin/sync', {
          method: 'POST',
          headers: { Authorization: 'Bearer sync-token' },
        }),
        env,
      );
      expect(sync.status).toBe(200);
      expect((await sync.json()) as { indexed_records: number; recent_published_records?: number }).toMatchObject({
        indexed_records: 1,
        recent_published_records: 1,
      });

      const search = await callWorker(new Request('https://templates.test/api/templates/search?q=SafeHaven'), env);
      const payload = (await search.json()) as { items: Array<{ id: string; template_slug: string }> };
      expect(payload.items).toEqual([
        expect.objectContaining({
          id: 'recSafeHaven',
          template_slug: 'safehaven-website-template',
        }),
      ]);
    } finally {
      fetchMock.mockRestore();
      close();
    }
  });

  it('sweeps stale recent publishes even while the LMT cursor is still catching up', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-23T14:30:00.000Z'));
    const stalePublishedAsset = {
      ...PUBLISHED_ASSETS[0],
      id: 'recRecentUpdate',
      fields: {
        ...PUBLISHED_ASSETS[0].fields,
        Name: 'Recent Update Old',
        '🚀📅Published Date': '2026-06-22',
        '🥞CMS Slug': 'recent-update-website-template',
        '🥞CMS Slug (formula)': 'recent-update-website-template',
        '🔗Listing URL': 'https://webflow.com/templates/html/recent-update-website-template',
        '🔗Website URL': 'https://webflow.com/templates/html/recent-update-website-template',
        '📅LMT': '2026-06-23T14:00:00.000Z',
      },
    };
    const updatedPublishedAsset = {
      ...stalePublishedAsset,
      fields: {
        ...stalePublishedAsset.fields,
        Name: 'Recent Update',
        'ℹ️Description (Short)': 'Updated while cursor is behind',
        '📅LMT': '2026-06-23T14:04:12.000Z',
      },
    };
    const dataset = {
      publishedAssets: [stalePublishedAsset],
      incrementalAssets: [],
      styles: LOOKUPS.styles,
      childCategories: LOOKUPS.childCategories,
      tags: LOOKUPS.tags,
      creators: LOOKUPS.creators,
    };
    const fetchMock = installAirtableFetchMock(dataset);
    const { env, close } = createTestEnv();

    try {
      const recordSync = await callWorker(
        new Request('https://templates.test/api/templates/admin/sync-records', {
          method: 'POST',
          headers: { Authorization: 'Bearer sync-token', 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids: ['recRecentUpdate'] }),
        }),
        env,
      );
      expect(recordSync.status).toBe(200);
      dataset.publishedAssets = [updatedPublishedAsset];
      await setSyncCursor(env.DB, '2026-03-17T00:00:00.000Z');

      const sync = await callWorker(
        new Request('https://templates.test/api/templates/admin/sync', {
          method: 'POST',
          headers: { Authorization: 'Bearer sync-token' },
        }),
        env,
      );
      expect(sync.status).toBe(200);
      const syncPayload = (await sync.json()) as {
        fetched_records: number;
        indexed_records: number;
        recent_published_records?: number;
        skipped_empty_windows?: number;
      };
      expect(syncPayload).toMatchObject({
        fetched_records: 1,
        indexed_records: 1,
        recent_published_records: 1,
        skipped_empty_windows: 8,
      });

      const row = await env.DB.prepare('SELECT name, description_short, source_last_modified_time FROM template_documents WHERE id = ?')
        .bind('recRecentUpdate')
        .first<{ name: string; description_short: string; source_last_modified_time: string }>();
      expect(row).toMatchObject({
        name: 'Recent Update',
        description_short: 'Updated while cursor is behind',
        source_last_modified_time: '2026-06-23T14:04:12.000Z',
      });
    } finally {
      fetchMock.mockRestore();
      close();
    }
  });

  it('sweeps missing recent publishes when the incremental cursor is caught up', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-23T14:30:00.000Z'));
    const recentPublishedAsset = {
      ...PUBLISHED_ASSETS[0],
      id: 'recRecentCaughtUp',
      fields: {
        ...PUBLISHED_ASSETS[0].fields,
        Name: 'Recent Caught Up',
        '🚀📅Published Date': '2026-06-23',
        '🥞CMS Slug': 'recent-caught-up-website-template',
        '🥞CMS Slug (formula)': 'recent-caught-up-website-template',
        '🔗Listing URL': 'https://webflow.com/templates/html/recent-caught-up-website-template',
        '🔗Website URL': 'https://webflow.com/templates/html/recent-caught-up-website-template',
        '📅LMT': '2026-06-23T14:04:12.000Z',
      },
    };
    const fetchMock = installAirtableFetchMock({
      publishedAssets: [recentPublishedAsset],
      incrementalAssets: [],
      styles: LOOKUPS.styles,
      childCategories: LOOKUPS.childCategories,
      tags: LOOKUPS.tags,
      creators: LOOKUPS.creators,
    });
    const { env, close } = createTestEnv();

    try {
      await setSyncCursor(env.DB, '2026-06-23T14:29:00.000Z');

      const sync = await callWorker(
        new Request('https://templates.test/api/templates/admin/sync', {
          method: 'POST',
          headers: { Authorization: 'Bearer sync-token' },
        }),
        env,
      );
      expect(sync.status).toBe(200);
      expect((await sync.json()) as { indexed_records: number; recent_published_records?: number }).toMatchObject({
        indexed_records: 1,
        recent_published_records: 1,
      });

      const search = await callWorker(new Request('https://templates.test/api/templates/search?q=Recent%20Caught%20Up'), env);
      const payload = (await search.json()) as { items: Array<{ id: string; template_slug: string }> };
      expect(payload.items).toEqual([
        expect.objectContaining({
          id: 'recRecentCaughtUp',
          template_slug: 'recent-caught-up-website-template',
        }),
      ]);
    } finally {
      fetchMock.mockRestore();
      close();
    }
  });

  it('takes over stale incremental sync locks before the 20-minute TTL expires', async () => {
    const changedAsset = {
      ...PUBLISHED_ASSETS[0],
      fields: {
        ...PUBLISHED_ASSETS[0].fields,
        '📅LMT': '2026-03-17T05:13:07.000Z',
      },
    };
    const fetchMock = installAirtableFetchMock({
      publishedAssets: [],
      incrementalAssets: [changedAsset],
      styles: LOOKUPS.styles,
      childCategories: LOOKUPS.childCategories,
      tags: LOOKUPS.tags,
    });
    const { env, close } = createTestEnv();

    try {
      await setSyncCursor(env.DB, '2026-03-17T05:00:00.000Z');
      const staleStartedAt = new Date(Date.now() - 11 * 60 * 1000).toISOString();
      const staleLock = await acquireSyncJobLock(env.DB, 'incremental', { now: staleStartedAt });
      expect(staleLock.acquired).toBe(true);

      const sync = await callWorker(
        new Request('https://templates.test/api/templates/admin/sync', {
          method: 'POST',
          headers: { Authorization: 'Bearer sync-token' },
        }),
        env,
      );
      expect(sync.status).toBe(200);
      expect((await sync.json()) as { mode: string; indexed_records: number }).toMatchObject({
        mode: 'incremental',
        indexed_records: 1,
      });

      const status = await callWorker(
        new Request('https://templates.test/api/templates/admin/sync-status', {
          headers: { Authorization: 'Bearer sync-token' },
        }),
        env,
      );
      const statusPayload = (await status.json()) as { active_job: null | { mode: string }; latest_job: { mode: string; status: string } };
      expect(statusPayload.active_job).toBeNull();
      expect(statusPayload.latest_job).toMatchObject({ mode: 'incremental', status: 'succeeded' });
    } finally {
      fetchMock.mockRestore();
      close();
    }
  });

  it('chunks changed template image refresh lookups within D1 bind limits', async () => {
    const { env, close } = createTestEnv();

    try {
      const changedIds = Array.from({ length: 130 }, (_, index) => `recBulk${String(index).padStart(3, '0')}`);
      for (let offset = 0; offset < changedIds.length; offset += 25) {
        const statements = changedIds.slice(offset, offset + 25).map((id, index) => {
          const rowNumber = offset + index;
          return env.DB.prepare(
            `INSERT INTO template_documents (
              id,
              template_slug,
              name,
              listing_url,
              thumbnail_image_url,
              synced_at
            ) VALUES (?, ?, ?, ?, ?, ?)`,
          ).bind(
            id,
            `bulk-template-${rowNumber}`,
            `Bulk Template ${rowNumber}`,
            `https://webflow.com/templates/html/bulk-template-${rowNumber}`,
            `https://cdn.prod.website-files.com/site/bulk-template-${rowNumber}.webp`,
            '2026-05-22T00:00:00.000Z',
          );
        });
        await env.DB.batch(statements);
      }

      const rows = await listTemplateImageRefreshRows(env.DB, changedIds);

      expect(rows).toHaveLength(changedIds.length);
      expect(new Set(rows.map((row) => row.id))).toEqual(new Set(changedIds));
    } finally {
      close();
    }
  });

  it('targets template image backfill by slug', async () => {
    const fetchMock = installAirtableFetchMock({
      publishedAssets: PUBLISHED_ASSETS,
      styles: LOOKUPS.styles,
      childCategories: LOOKUPS.childCategories,
      tags: LOOKUPS.tags,
      webflowCollectionItems: {
        [TEMPLATES_COLLECTION_ID]: [
          {
            id: 'template-agentflow',
            isArchived: false,
            isDraft: false,
            fieldData: {
              'sync-record-id': 'recAgentflow',
              name: 'Agentflow',
              slug: 'agentflow-website-template',
              'main-thumbnail': { url: 'https://cdn.prod.website-files.com/site/agentflow-targeted.webp' },
            },
          },
          {
            id: 'template-setrex',
            isArchived: false,
            isDraft: false,
            fieldData: {
              'sync-record-id': 'recSetrex',
              name: 'Setrex',
              slug: 'setrex-website-template',
              'main-thumbnail': { url: 'https://cdn.prod.website-files.com/site/setrex-targeted.webp' },
            },
          },
        ],
      },
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

      await env.DB.prepare('UPDATE template_documents SET thumbnail_image_url = NULL WHERE id IN (?, ?)')
        .bind('recAgentflow', 'recSetrex')
        .run();

      env.WEBFLOW_API_TOKEN = 'test-webflow-cms-token';
      env.WEBFLOW_TEMPLATE_ASSET_SITE_ID = 'site-webflow-templates';
      env.WEBFLOW_TEMPLATE_COLLECTION_ID = TEMPLATES_COLLECTION_ID;
      const backfill = await callWorker(
        new Request('https://templates.test/api/templates/admin/backfill-images?slug=agentflow-website-template', {
          method: 'POST',
          headers: { Authorization: 'Bearer sync-token' },
        }),
        env,
      );
      expect(backfill.status).toBe(200);
      expect(
        (await backfill.json()) as {
          requested_limit: number;
          scanned_records: number;
          updated_records: number;
          requested_template_slugs: string[];
        },
      ).toMatchObject({
        requested_limit: 48,
        requested_template_slugs: ['agentflow-website-template'],
        scanned_records: 1,
        updated_records: 1,
      });

      const agentflowResponse = await callWorker(new Request('https://templates.test/api/templates/search?q=agentflow'), env);
      const agentflowPayload = (await agentflowResponse.json()) as { items: Array<{ thumbnail_image_url: string | null }> };
      expect(agentflowPayload.items[0]?.thumbnail_image_url).toBe(
        'https://cdn.prod.website-files.com/site/agentflow-targeted.webp',
      );

      const setrexResponse = await callWorker(new Request('https://templates.test/api/templates/search?q=setrex'), env);
      const setrexPayload = (await setrexResponse.json()) as { items: Array<{ thumbnail_image_url: string | null }> };
      expect(setrexPayload.items[0]?.thumbnail_image_url).toBeNull();
    } finally {
      fetchMock.mockRestore();
      close();
    }
  });

  it('keeps the explicit CMS primary during rebuild when a numbered carousel image is present', async () => {
    const fetchMock = installAirtableFetchMock({
      publishedAssets: PUBLISHED_ASSETS,
      styles: LOOKUPS.styles,
      childCategories: LOOKUPS.childCategories,
      tags: LOOKUPS.tags,
      webflowCollectionItems: {
        [TEMPLATES_COLLECTION_ID]: [
          {
            id: 'template-agentflow',
            isArchived: false,
            isDraft: false,
            fieldData: {
              'sync-record-id': 'recAgentflow',
              name: 'Agentflow',
              slug: 'agentflow-website-template',
              'main-thumbnail': { url: 'https://cdn.prod.website-files.com/site/Thamnail_2.webp' },
              'slider-images': [{ url: 'https://cdn.prod.website-files.com/site/1.webp' }],
            },
          },
        ],
      },
    });
    const { env, close } = createTestEnv();

    try {
      env.WEBFLOW_API_TOKEN = 'test-webflow-cms-token';
      env.WEBFLOW_TEMPLATE_ASSET_SITE_ID = 'site-webflow-templates';
      env.WEBFLOW_TEMPLATE_COLLECTION_ID = TEMPLATES_COLLECTION_ID;

      const rebuild = await callWorker(
        new Request('https://templates.test/api/templates/admin/rebuild', {
          method: 'POST',
          headers: { Authorization: 'Bearer sync-token' },
        }),
        env,
      );
      expect(rebuild.status).toBe(200);

      const search = await callWorker(new Request('https://templates.test/api/templates/search?q=agentflow'), env);
      const payload = (await search.json()) as { items: Array<{ thumbnail_image_url: string | null }> };
      expect(payload.items[0]?.thumbnail_image_url).toBe(
        'https://cdn.prod.website-files.com/site/Thamnail_2.webp',
      );
    } finally {
      fetchMock.mockRestore();
      close();
    }
  });

  it('keeps the CMS primary during targeted image backfill when the public detail image differs', async () => {
    const fetchMock = installAirtableFetchMock({
      publishedAssets: PUBLISHED_ASSETS,
      styles: LOOKUPS.styles,
      childCategories: LOOKUPS.childCategories,
      tags: LOOKUPS.tags,
      webflowCollectionItems: {
        [TEMPLATES_COLLECTION_ID]: [
          {
            id: 'template-agentflow',
            isArchived: false,
            isDraft: false,
            fieldData: {
              'sync-record-id': 'recAgentflow',
              name: 'Agentflow',
              slug: 'agentflow-website-template',
              'main-thumbnail': { url: 'https://cdn.prod.website-files.com/site/Thamnail_2.webp' },
              'slider-images': [{ url: 'https://cdn.prod.website-files.com/site/1.webp' }],
            },
          },
        ],
      },
      publishedTemplatePages: {
        '/templates/html/agentflow-website-template':
          '<html><head><meta property="og:image" content="https://cdn.prod.website-files.com/site/1.webp"></head></html>',
      },
    });
    const cache = installSearchCacheStub();
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

      const publicSearchRequest = new Request(
        'https://templates.test/api/templates/search?include=items&view=grid&page=1&page_size=24',
      );
      const beforeResponse = await callWorker(publicSearchRequest, env);
      const beforePayload = (await beforeResponse.json()) as {
        items: Array<{ name: string; thumbnail_image_url: string | null }>;
      };
      expect(beforeResponse.headers.get('x-template-search-cache')).toBe('MISS');
      expect(beforePayload.items.find((item) => item.name === 'Agentflow')?.thumbnail_image_url).toBe(
        'https://example.com/agentflow.png',
      );
      expect((await callWorker(publicSearchRequest, env)).headers.get('x-template-search-cache')).toBe('HIT');

      env.WEBFLOW_API_TOKEN = 'test-webflow-cms-token';
      const backfill = await callWorker(
        new Request('https://templates.test/api/templates/admin/backfill-images?slug=agentflow-website-template', {
          method: 'POST',
          headers: { Authorization: 'Bearer sync-token' },
        }),
        env,
      );
      expect(backfill.status).toBe(200);
      expect(
        (await backfill.json()) as {
          scanned_records: number;
          updated_records: number;
          requested_template_slugs: string[];
        },
      ).toMatchObject({
        requested_template_slugs: ['agentflow-website-template'],
        scanned_records: 1,
        updated_records: 1,
      });

      const afterResponse = await callWorker(publicSearchRequest, env);
      const afterPayload = (await afterResponse.json()) as {
        items: Array<{ name: string; thumbnail_image_url: string | null }>;
      };
      expect(afterResponse.headers.get('x-template-search-cache')).toBe('MISS');
      expect(afterPayload.items.find((item) => item.name === 'Agentflow')?.thumbnail_image_url).toBe(
        'https://cdn.prod.website-files.com/site/Thamnail_2.webp',
      );
      expect(cache.put).toHaveBeenCalledTimes(2);
    } finally {
      fetchMock.mockRestore();
      close();
    }
  });

  it('prunes unresolved missing-image rows when the Webflow listing is 404', async () => {
    const fetchMock = installAirtableFetchMock({
      publishedAssets: PUBLISHED_ASSETS,
      styles: LOOKUPS.styles,
      childCategories: LOOKUPS.childCategories,
      tags: LOOKUPS.tags,
      publishedTemplatePages: {
        '/templates/html/setrex-website-template': '<html><head><title>Setrex</title></head></html>',
      },
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

      await env.DB.prepare('UPDATE template_documents SET thumbnail_image_url = NULL WHERE id IN (?, ?)')
        .bind('recAgentflow', 'recSetrex')
        .run();

      const prune = await callWorker(
        new Request(
          'https://templates.test/api/templates/admin/prune-missing-images?slugs=agentflow-website-template,setrex-website-template',
          {
            method: 'POST',
            headers: { Authorization: 'Bearer sync-token' },
          },
        ),
        env,
      );
      expect(prune.status).toBe(200);
      expect(
        (await prune.json()) as {
          requested_template_slugs: string[];
          scanned_records: number;
          pruned_records: number;
          skipped_records: Array<{ template_slug: string; status: number; reason: string }>;
        },
      ).toMatchObject({
        requested_template_slugs: ['agentflow-website-template', 'setrex-website-template'],
        scanned_records: 2,
        pruned_records: 1,
        skipped_records: [{ template_slug: 'setrex-website-template', status: 200, reason: 'listing_not_404' }],
      });

      const agentflowResponse = await callWorker(new Request('https://templates.test/api/templates/search?q=agentflow'), env);
      const agentflowPayload = (await agentflowResponse.json()) as { pagination: { total_items: number } };
      expect(agentflowPayload.pagination.total_items).toBe(0);

      const setrexResponse = await callWorker(new Request('https://templates.test/api/templates/search?q=setrex'), env);
      const setrexPayload = (await setrexResponse.json()) as {
        pagination: { total_items: number };
        items: Array<{ thumbnail_image_url: string | null }>;
      };
      expect(setrexPayload.pagination.total_items).toBe(1);
      expect(setrexPayload.items[0]?.thumbnail_image_url).toBeNull();
    } finally {
      fetchMock.mockRestore();
      close();
    }
  });

  it('runs scheduled image backfill and conservative prune maintenance', async () => {
    const fetchMock = installAirtableFetchMock({
      publishedAssets: PUBLISHED_ASSETS,
      styles: LOOKUPS.styles,
      childCategories: LOOKUPS.childCategories,
      tags: LOOKUPS.tags,
      webflowCollectionItems: {
        [TEMPLATES_COLLECTION_ID]: [
          {
            id: 'template-agentflow',
            isArchived: false,
            isDraft: false,
            fieldData: {
              'sync-record-id': 'recAgentflow',
              name: 'Agentflow',
              slug: 'agentflow-website-template',
              'main-thumbnail': { url: 'https://cdn.prod.website-files.com/site/agentflow-scheduled.webp' },
            },
          },
        ],
      },
      publishedTemplatePages: {
        '/templates/html/agentflow-website-template': '<html><head><title>Agentflow</title></head></html>',
      },
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

      await env.DB.prepare('UPDATE template_documents SET thumbnail_image_url = NULL WHERE id IN (?, ?)')
        .bind('recAgentflow', 'recSetrex')
        .run();

      env.WEBFLOW_API_TOKEN = 'test-webflow-cms-token';
      env.WEBFLOW_TEMPLATE_ASSET_SITE_ID = 'site-webflow-templates';
      env.WEBFLOW_TEMPLATE_COLLECTION_ID = TEMPLATES_COLLECTION_ID;
      await callScheduled('17 * * * *', env);
      const backfillState = await env.DB.prepare('SELECT value_json FROM sync_state WHERE key = ?')
        .bind('last_image_backfill')
        .first<{ value_json: string }>();
      expect(JSON.parse(backfillState?.value_json ?? '{}')).toMatchObject({
        mode: 'image_backfill',
        requested_limit: 48,
        scanned_records: 2,
        updated_records: 1,
      });

      const agentflowResponse = await callWorker(new Request('https://templates.test/api/templates/search?q=agentflow'), env);
      const agentflowPayload = (await agentflowResponse.json()) as { items: Array<{ thumbnail_image_url: string | null }> };
      expect(agentflowPayload.items[0]?.thumbnail_image_url).toBe(
        'https://cdn.prod.website-files.com/site/agentflow-scheduled.webp',
      );

      await callScheduled('47 3 * * *', env);
      const pruneState = await env.DB.prepare('SELECT value_json FROM sync_state WHERE key = ?')
        .bind('last_image_prune')
        .first<{ value_json: string }>();
      expect(JSON.parse(pruneState?.value_json ?? '{}')).toMatchObject({
        mode: 'image_prune',
        requested_limit: 24,
        scanned_records: 1,
        pruned_records: 1,
      });

      const setrexResponse = await callWorker(new Request('https://templates.test/api/templates/search?q=setrex'), env);
      const setrexPayload = (await setrexResponse.json()) as { pagination: { total_items: number } };
      expect(setrexPayload.pagination.total_items).toBe(0);
    } finally {
      fetchMock.mockRestore();
      close();
    }
  });

  it('backfills historical missing and temporary Airtable thumbnails from Webflow API', async () => {
    const fetchMock = installAirtableFetchMock({
      publishedAssets: PUBLISHED_ASSETS,
      styles: LOOKUPS.styles,
      childCategories: LOOKUPS.childCategories,
      tags: LOOKUPS.tags,
      webflowCollectionItems: {
        [TEMPLATES_COLLECTION_ID]: [
          {
            id: 'template-agentflow',
            isArchived: false,
            isDraft: false,
            fieldData: {
              'sync-record-id': 'recAgentflow',
              name: 'Agentflow',
              slug: 'agentflow-website-template',
              'main-thumbnail': { url: 'https://cdn.prod.website-files.com/site/agentflow-backfill.webp' },
            },
          },
          {
            id: 'template-setrex',
            isArchived: false,
            isDraft: false,
            fieldData: {
              'sync-record-id': 'recSetrex',
              name: 'Setrex',
              slug: 'setrex-website-template',
              'main-thumbnail': { url: 'https://cdn.prod.website-files.com/site/setrex-backfill.webp' },
            },
          },
        ],
      },
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

      await env.DB.prepare('UPDATE template_documents SET thumbnail_image_url = ? WHERE id = ?')
        .bind('https://v5.airtableusercontent.com/v3/u/53/temporary-agentflow', 'recAgentflow')
        .run();
      await env.DB.prepare('UPDATE template_documents SET thumbnail_image_url = ? WHERE id = ?')
        .bind(null, 'recSetrex')
        .run();

      env.WEBFLOW_API_TOKEN = 'test-webflow-cms-token';
      env.WEBFLOW_TEMPLATE_ASSET_SITE_ID = 'site-webflow-templates';
      env.WEBFLOW_TEMPLATE_COLLECTION_ID = TEMPLATES_COLLECTION_ID;
      const backfill = await callWorker(
        new Request('https://templates.test/api/templates/admin/backfill-images?limit=2', {
          method: 'POST',
          headers: { Authorization: 'Bearer sync-token' },
        }),
        env,
      );
      expect(backfill.status).toBe(200);
      expect((await backfill.json()) as { scanned_records: number; updated_records: number; remaining_temp_airtable_rows: number }).toMatchObject({
        scanned_records: 2,
        updated_records: 2,
        remaining_temp_airtable_rows: 0,
      });

      const agentflowResponse = await callWorker(new Request('https://templates.test/api/templates/search?q=agentflow'), env);
      const agentflowPayload = (await agentflowResponse.json()) as { items: Array<{ thumbnail_image_url: string | null }> };
      expect(agentflowPayload.items[0]?.thumbnail_image_url).toBe(
        'https://cdn.prod.website-files.com/site/agentflow-backfill.webp',
      );

      const setrexResponse = await callWorker(new Request('https://templates.test/api/templates/search?q=setrex'), env);
      const setrexPayload = (await setrexResponse.json()) as { items: Array<{ thumbnail_image_url: string | null }> };
      expect(setrexPayload.items[0]?.thumbnail_image_url).toBe('https://cdn.prod.website-files.com/site/setrex-backfill.webp');
    } finally {
      fetchMock.mockRestore();
      close();
    }
  });
});
