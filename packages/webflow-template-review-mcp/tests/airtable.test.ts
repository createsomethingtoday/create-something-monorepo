import assert from 'node:assert/strict';
import test from 'node:test';

import { AirtableClient } from '../src/airtable.js';
import {
  CONFIRMED_ASSET_FIELDS,
  CONFIRMED_VERSION_FIELDS,
  TABLE_IDS,
} from '../src/schema.js';

const ericReviewer = {
  id: 'usr_eric',
  email: 'eric.unger@webflow.com',
  name: 'Eric Unger',
};

const otherReviewer = {
  id: 'usr_other',
  email: 'other.reviewer@webflow.com',
  name: 'Other Reviewer',
};

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}

function extractVersionAssetIds(formula: string): string[] {
  return [...formula.matchAll(/\{⚙️👛Asset Record ID\} = '([^']+)'/g)].map((match) => match[1]);
}

test('listAssetQueue paginates Airtable records beyond the first page', async () => {
  const client = new AirtableClient({
    apiKey: 'test',
    fetchFn: async (input) => {
      const url = new URL(String(input));
      const offset = url.searchParams.get('offset');

      if (!url.pathname.includes(`/${TABLE_IDS.assets}`)) {
        throw new Error(`Unexpected fetch: ${url.toString()}`);
      }

      const start = offset ? 100 : 0;
      const count = offset ? 50 : 100;
      return jsonResponse({
        records: Array.from({ length: count }, (_, index) => ({
          id: `rec_asset_${start + index}`,
          createdTime: '2026-03-12T00:00:00.000Z',
          fields: {
            [CONFIRMED_ASSET_FIELDS.type]: 'Template🏗️',
            [CONFIRMED_ASSET_FIELDS.name]: `Template ${start + index}`,
          },
        })),
        ...(offset ? {} : { offset: 'next-page' }),
      });
    },
  });

  const queue = await client.listAssetQueue(150);

  assert.equal(queue.length, 150);
  assert.equal(queue[0]?.templateName, 'Template 0');
  assert.equal(queue[149]?.templateName, 'Template 149');
});

test('listAssetQueueDetailed continues scanning until assigned-filter matches are found', async () => {
  const client = new AirtableClient({
    apiKey: 'test',
    fetchFn: async (input) => {
      const url = new URL(String(input));

      if (url.pathname.includes(`/${TABLE_IDS.assets}`)) {
        const offset = url.searchParams.get('offset');
        const start = offset ? 100 : 0;
        const count = offset ? 5 : 100;

        return jsonResponse({
          records: Array.from({ length: count }, (_, index) => {
            const assetIndex = start + index;
            return {
              id: `rec_asset_${assetIndex}`,
              createdTime: '2026-03-12T00:00:00.000Z',
              fields: {
                [CONFIRMED_ASSET_FIELDS.type]: 'Template🏗️',
                [CONFIRMED_ASSET_FIELDS.name]: `Template ${assetIndex}`,
                [CONFIRMED_ASSET_FIELDS.latestReviewStatus]: '🆕Ready for Review',
                [CONFIRMED_ASSET_FIELDS.submittedDate]: `2026-03-${String(12 - Math.min(assetIndex, 9)).padStart(2, '0')}T12:00:00.000Z`,
              },
            };
          }),
          ...(offset ? {} : { offset: 'page-2' }),
        });
      }

      if (url.pathname.includes(`/${TABLE_IDS.assetVersions}`)) {
        const formula = url.searchParams.get('filterByFormula') ?? '';
        const assetIds = extractVersionAssetIds(formula);
        return jsonResponse({
          records: assetIds.map((assetId) => {
            const assetNumber = Number(assetId.replace('rec_asset_', ''));
            return {
              id: `rec_version_${assetNumber}`,
              createdTime: '2026-03-12T00:00:00.000Z',
              fields: {
                [CONFIRMED_VERSION_FIELDS.assetRecordId]: assetId,
                [CONFIRMED_VERSION_FIELDS.versionNumber]: 0,
                [CONFIRMED_VERSION_FIELDS.reviewStatus]: '🆕Ready for Review',
                [CONFIRMED_VERSION_FIELDS.reviewOwner]: assetNumber < 100 ? otherReviewer : null,
                [CONFIRMED_VERSION_FIELDS.submissionDatetime]: `2026-03-12T${String(assetNumber % 24).padStart(2, '0')}:00:00.000Z`,
              },
            };
          }),
        });
      }

      throw new Error(`Unexpected fetch: ${url.toString()}`);
    },
  });

  const queue = await client.listAssetQueueDetailed({
    status: 'ready_to_review',
    assigned: 'unassigned',
    limit: 3,
    currentReviewer: ericReviewer,
  });

  assert.equal(queue.items.length, 3);
  assert.deepEqual(
    queue.items.map((item) => item.assetId),
    ['rec_asset_100', 'rec_asset_101', 'rec_asset_102'],
  );
  assert.ok(queue.items.every((item) => item.isUnassigned));
});

test('listMyQueueDetailed reads reviewer-owned versions directly and hydrates only matching assets', async () => {
  const client = new AirtableClient({
    apiKey: 'test',
    fetchFn: async (input) => {
      const url = new URL(String(input));

      if (url.pathname.includes(`/${TABLE_IDS.assetVersions}`)) {
        return jsonResponse({
          records: [
            {
              id: 'rec_finoraa_v0',
              createdTime: '2026-03-10T00:00:00.000Z',
              fields: {
                [CONFIRMED_VERSION_FIELDS.assetRecordId]: 'rec_asset_finoraa',
                [CONFIRMED_VERSION_FIELDS.versionNumber]: 0,
                [CONFIRMED_VERSION_FIELDS.reviewStatus]: '🔁Response to Review',
                [CONFIRMED_VERSION_FIELDS.reviewOwner]: ericReviewer,
                [CONFIRMED_VERSION_FIELDS.submissionDatetime]: '2026-03-08T21:08:33.000Z',
              },
            },
          ],
        });
      }

      if (url.pathname.includes(`/${TABLE_IDS.assets}`)) {
        const formula = url.searchParams.get('filterByFormula') ?? '';
        assert.match(formula, /RECORD_ID\(\)/);
        return jsonResponse({
          records: [
            {
              id: 'rec_asset_finoraa',
              createdTime: '2026-03-08T21:08:20.000Z',
              fields: {
                [CONFIRMED_ASSET_FIELDS.type]: 'Template🏗️',
                [CONFIRMED_ASSET_FIELDS.name]: 'Finoraa',
                [CONFIRMED_ASSET_FIELDS.latestReviewStatus]: '🔁Response to Review',
                [CONFIRMED_ASSET_FIELDS.submittedDate]: '2026-03-08T21:08:20.000Z',
              },
            },
          ],
        });
      }

      throw new Error(`Unexpected fetch: ${url.toString()}`);
    },
  });

  const queue = await client.listMyQueueDetailed({
    currentReviewer: ericReviewer,
  });

  assert.equal(queue.items.length, 1);
  assert.equal(queue.items[0]?.templateName, 'Finoraa');
  assert.equal(queue.items[0]?.assignableVersionId, 'rec_finoraa_v0');
  assert.equal(queue.items[0]?.reviewOwner?.id, ericReviewer.id);
});

test('assignSelfToVersion rejects conflicting reviewer assignments', async () => {
  const client = new AirtableClient({
    apiKey: 'test',
    fetchFn: async (input) => {
      const url = new URL(String(input));

      if (url.pathname.includes(`/${TABLE_IDS.assetVersions}/rec_conflict_version`)) {
        return jsonResponse({
          id: 'rec_conflict_version',
          createdTime: '2026-03-12T00:00:00.000Z',
          fields: {
            [CONFIRMED_VERSION_FIELDS.assetRecordId]: 'rec_asset_conflict',
            [CONFIRMED_VERSION_FIELDS.reviewOwner]: otherReviewer,
            [CONFIRMED_VERSION_FIELDS.versionNumber]: 0,
          },
        });
      }

      if (url.pathname.includes(`/${TABLE_IDS.assets}/rec_asset_conflict`)) {
        return jsonResponse({
          id: 'rec_asset_conflict',
          createdTime: '2026-03-12T00:00:00.000Z',
          fields: {
            [CONFIRMED_ASSET_FIELDS.type]: 'Template🏗️',
            [CONFIRMED_ASSET_FIELDS.name]: 'Conflict Template',
          },
        });
      }

      throw new Error(`Unexpected fetch: ${url.toString()}`);
    },
  });

  await assert.rejects(
    client.assignSelfToVersion('rec_conflict_version', ericReviewer),
    (error: unknown) => {
      assert.equal((error as { code?: string }).code, 'REVIEWER_ASSIGNMENT_CONFLICT');
      return true;
    },
  );
});

test('requireAssignedVersion rejects unassigned versions', async () => {
  const client = new AirtableClient({
    apiKey: 'test',
    fetchFn: async (input) => {
      const url = new URL(String(input));

      if (url.pathname.includes(`/${TABLE_IDS.assetVersions}/rec_unassigned_version`)) {
        return jsonResponse({
          id: 'rec_unassigned_version',
          createdTime: '2026-03-12T00:00:00.000Z',
          fields: {
            [CONFIRMED_VERSION_FIELDS.assetRecordId]: 'rec_asset_unassigned',
            [CONFIRMED_VERSION_FIELDS.versionNumber]: 0,
          },
        });
      }

      if (url.pathname.includes(`/${TABLE_IDS.assets}/rec_asset_unassigned`)) {
        return jsonResponse({
          id: 'rec_asset_unassigned',
          createdTime: '2026-03-12T00:00:00.000Z',
          fields: {
            [CONFIRMED_ASSET_FIELDS.type]: 'Template🏗️',
            [CONFIRMED_ASSET_FIELDS.name]: 'Unassigned Template',
          },
        });
      }

      throw new Error(`Unexpected fetch: ${url.toString()}`);
    },
  });

  await assert.rejects(
    client.requireAssignedVersion('rec_unassigned_version', ericReviewer),
    (error: unknown) => {
      assert.equal((error as { code?: string }).code, 'REVIEWER_ASSIGNMENT_REQUIRED');
      return true;
    },
  );
});

test('getReviewContext disables publishing when the asset is already published', async () => {
  const client = new AirtableClient({
    apiKey: 'test',
    fetchFn: async (input) => {
      const url = new URL(String(input));

      if (url.pathname.includes(`/${TABLE_IDS.assetVersions}/rec_published_version`)) {
        return jsonResponse({
          id: 'rec_published_version',
          createdTime: '2026-03-12T00:00:00.000Z',
          fields: {
            [CONFIRMED_VERSION_FIELDS.assetRecordId]: 'rec_asset_published',
            [CONFIRMED_VERSION_FIELDS.reviewOwner]: ericReviewer,
            [CONFIRMED_VERSION_FIELDS.reviewStatus]: '✅Approved',
            [CONFIRMED_VERSION_FIELDS.versionNumber]: 0,
          },
        });
      }

      if (url.pathname.includes(`/${TABLE_IDS.assets}/rec_asset_published`)) {
        return jsonResponse({
          id: 'rec_asset_published',
          createdTime: '2026-03-12T00:00:00.000Z',
          fields: {
            [CONFIRMED_ASSET_FIELDS.type]: 'Template🏗️',
            [CONFIRMED_ASSET_FIELDS.name]: 'Published Template',
            [CONFIRMED_ASSET_FIELDS.marketplaceStatus]: '3️⃣Published🚀',
            [CONFIRMED_ASSET_FIELDS.publishedDate]: '2026-03-11T00:00:00.000Z',
          },
        });
      }

      throw new Error(`Unexpected fetch: ${url.toString()}`);
    },
  });

  const context = await client.getReviewContext('rec_published_version', ericReviewer);

  assert.equal(context.canPublish, false);
  assert.equal(context.asset?.marketplaceStatus, '3️⃣Published🚀');
});

test('getMarketplaceMetrics scans beyond the old 1000-record cap', async () => {
  const totalAssets = 1050;
  const client = new AirtableClient({
    apiKey: 'test',
    fetchFn: async (input) => {
      const url = new URL(String(input));
      const offset = Number(url.searchParams.get('offset') ?? '0');

      if (!url.pathname.includes(`/${TABLE_IDS.assets}`)) {
        throw new Error(`Unexpected fetch: ${url.toString()}`);
      }

      const count = Math.min(100, totalAssets - offset);
      return jsonResponse({
        records: Array.from({ length: count }, (_, index) => ({
          id: `rec_asset_${offset + index}`,
          createdTime: '2026-03-12T00:00:00.000Z',
          fields: {
            [CONFIRMED_ASSET_FIELDS.type]: 'Template🏗️',
            [CONFIRMED_ASSET_FIELDS.latestReviewStatus]: '🆕Ready for Review',
            [CONFIRMED_ASSET_FIELDS.latestReviewDate]: '2026-03-12T00:00:00.000Z',
            [CONFIRMED_ASSET_FIELDS.qualityScore]: '✅Good',
            [CONFIRMED_ASSET_FIELDS.submittedDate]: '2026-03-12T00:00:00.000Z',
          },
        })),
        ...(offset + count < totalAssets ? { offset: String(offset + count) } : {}),
      });
    },
  });

  const metrics = await client.getMarketplaceMetrics({
    days: 7,
    end_date: '2026-03-12',
  });

  assert.equal(metrics.totals.templatesScanned, totalAssets);
  assert.equal(metrics.totals.submissions, totalAssets);
});
