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

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
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

test('listAssetQueueDetailed selects the reviewer-assigned version for my_queue', async () => {
  const client = new AirtableClient({
    apiKey: 'test',
    fetchFn: async (input) => {
      const url = new URL(String(input));

      if (url.pathname.includes(`/${TABLE_IDS.assets}`)) {
        return jsonResponse({
          records: [
            {
              id: 'rec_asset_finoraa',
              createdTime: '2026-03-12T00:00:00.000Z',
              fields: {
                [CONFIRMED_ASSET_FIELDS.type]: 'Template🏗️',
                [CONFIRMED_ASSET_FIELDS.name]: 'Finoraa',
                [CONFIRMED_ASSET_FIELDS.latestReviewStatus]: '🔁Response to Review',
                [CONFIRMED_ASSET_FIELDS.submittedDate]: '2026-03-10T12:00:00.000Z',
              },
            },
          ],
        });
      }

      if (url.pathname.includes(`/${TABLE_IDS.assetVersions}`)) {
        return jsonResponse({
          records: [
            {
              id: 'rec_finoraa_v1',
              createdTime: '2026-03-11T00:00:00.000Z',
              fields: {
                [CONFIRMED_VERSION_FIELDS.assetRecordId]: 'rec_asset_finoraa',
                [CONFIRMED_VERSION_FIELDS.versionNumber]: 1,
                [CONFIRMED_VERSION_FIELDS.reviewStatus]: '🆕Ready for Review',
                [CONFIRMED_VERSION_FIELDS.reviewOwner]: null,
              },
            },
            {
              id: 'rec_finoraa_v0',
              createdTime: '2026-03-10T00:00:00.000Z',
              fields: {
                [CONFIRMED_VERSION_FIELDS.assetRecordId]: 'rec_asset_finoraa',
                [CONFIRMED_VERSION_FIELDS.versionNumber]: 0,
                [CONFIRMED_VERSION_FIELDS.reviewStatus]: '🔁Response to Review',
                [CONFIRMED_VERSION_FIELDS.reviewOwner]: ericReviewer,
              },
            },
          ],
        });
      }

      throw new Error(`Unexpected fetch: ${url.toString()}`);
    },
  });

  const queue = await client.listAssetQueueDetailed({
    assigned: 'assigned',
    onlyAssignedToCurrentReviewer: true,
    currentReviewer: ericReviewer,
  });

  assert.equal(queue.items.length, 1);
  assert.equal(queue.items[0]?.templateName, 'Finoraa');
  assert.equal(queue.items[0]?.assignableVersionId, 'rec_finoraa_v0');
  assert.equal(queue.items[0]?.reviewOwner?.id, ericReviewer.id);
  assert.equal(queue.items[0]?.isAssignedToCurrentReviewer, true);
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

test('assignSelfToVersion rejects versions already owned by another reviewer', async () => {
  const client = new AirtableClient({
    apiKey: 'test',
    fetchFn: async (input) => {
      const url = new URL(String(input));

      if (url.pathname.includes(`/${TABLE_IDS.assetVersions}/rec_version_conflict`)) {
        return jsonResponse({
          id: 'rec_version_conflict',
          createdTime: '2026-03-10T00:00:00.000Z',
          fields: {
            [CONFIRMED_VERSION_FIELDS.assetRecordId]: 'rec_asset_conflict',
            [CONFIRMED_VERSION_FIELDS.versionNumber]: 0,
            [CONFIRMED_VERSION_FIELDS.reviewOwner]: { id: 'usr_other', name: 'Other Reviewer' },
          },
        });
      }

      if (url.pathname.includes(`/${TABLE_IDS.assets}/rec_asset_conflict`)) {
        return jsonResponse({
          id: 'rec_asset_conflict',
          createdTime: '2026-03-10T00:00:00.000Z',
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
    client.assignSelfToVersion('rec_version_conflict', ericReviewer),
    (error: unknown) => {
      assert.equal((error as { code?: string }).code, 'REVIEWER_ASSIGNMENT_CONFLICT');
      return true;
    },
  );
});

test('requireAssignedVersion fails closed when the version is unassigned', async () => {
  const client = new AirtableClient({
    apiKey: 'test',
    fetchFn: async (input) => {
      const url = new URL(String(input));

      if (url.pathname.includes(`/${TABLE_IDS.assetVersions}/rec_version_unassigned`)) {
        return jsonResponse({
          id: 'rec_version_unassigned',
          createdTime: '2026-03-10T00:00:00.000Z',
          fields: {
            [CONFIRMED_VERSION_FIELDS.assetRecordId]: 'rec_asset_unassigned',
            [CONFIRMED_VERSION_FIELDS.versionNumber]: 0,
            [CONFIRMED_VERSION_FIELDS.reviewOwner]: null,
          },
        });
      }

      if (url.pathname.includes(`/${TABLE_IDS.assets}/rec_asset_unassigned`)) {
        return jsonResponse({
          id: 'rec_asset_unassigned',
          createdTime: '2026-03-10T00:00:00.000Z',
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
    client.requireAssignedVersion('rec_version_unassigned', ericReviewer),
    (error: unknown) => {
      assert.equal((error as { code?: string }).code, 'REVIEWER_ASSIGNMENT_REQUIRED');
      return true;
    },
  );
});

test('updateVersionReview rejects unsupported improvement areas before calling Airtable', async () => {
  let called = false;
  const client = new AirtableClient({
    apiKey: 'test',
    fetchFn: async () => {
      called = true;
      throw new Error('should not run');
    },
  });

  await assert.rejects(
    client.updateVersionReview('rec_version_invalid_area', {
      improvement_areas: ['Testing write access'],
    }),
    (error: unknown) => {
      assert.equal((error as { code?: string }).code, 'INVALID_IMPROVEMENT_AREAS');
      assert.deepEqual((error as { details?: { invalid?: string[] } }).details, {
        invalid: ['Testing write access'],
        allowed: [
          'Template: Overall user experience',
          'Template: Accessibility',
          'Template: Conversion best practices',
          'Template: Graphic design',
          'Template: Guidelines compliance',
          'Template: Hierarchy',
          'Template: Interaction design',
          'Template: Layout design quality',
          'Template: Responsive design',
          'Template: Site optimization',
          'Template: Technical requirements',
          'Template: Typography',
        ],
      });
      return true;
    },
  );

  assert.equal(called, false);
});

test('updateVersionReview includes Airtable error details on failed updates', async () => {
  const client = new AirtableClient({
    apiKey: 'test',
    fetchFn: async (input, init) => {
      const url = new URL(String(input));

      assert.match(url.pathname, new RegExp(`/${TABLE_IDS.assetVersions}/rec_version_error$`));
      assert.equal(init?.method, 'PATCH');

      return new Response(
        JSON.stringify({
          error: {
            type: 'INVALID_MULTIPLE_CHOICE_OPTIONS',
            message: 'Testing write access is not a valid option.',
          },
        }),
        {
          status: 422,
          headers: { 'content-type': 'application/json' },
        },
      );
    },
  });

  await assert.rejects(
    client.updateVersionReview('rec_version_error', {
      review_feedback: 'Draft feedback',
    }),
    (error: unknown) => {
      assert.equal((error as { code?: string }).code, 'AIRTABLE_UPDATE_FAILED');
      assert.deepEqual((error as { details?: unknown }).details, {
        tableId: TABLE_IDS.assetVersions,
        recordId: 'rec_version_error',
        airtable: {
          error: {
            type: 'INVALID_MULTIPLE_CHOICE_OPTIONS',
            message: 'Testing write access is not a valid option.',
          },
        },
      });
      return true;
    },
  );
});
