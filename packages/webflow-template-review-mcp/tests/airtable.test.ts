import test from 'node:test';
import assert from 'node:assert/strict';

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
