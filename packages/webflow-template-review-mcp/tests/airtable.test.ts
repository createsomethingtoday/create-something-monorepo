import assert from 'node:assert/strict';
import test from 'node:test';

import { AirtableClient } from '../src/airtable.js';
import { CONFIRMED_ASSET_FIELDS, CONFIRMED_VERSION_FIELDS, CONFIRMED_WRITE_FIELD_IDS, METRICS_ASSET_FIELD_IDS, TABLE_IDS } from '../src/schema.js';

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

test('getMarketplaceMetrics reads id-keyed fields so analytics survive display-name drift', async () => {
  let capturedUrl: URL | null = null;
  const client = new AirtableClient({
    apiKey: 'test',
    fetchFn: async (input) => {
      const url = new URL(String(input));
      capturedUrl = url;

      if (!url.pathname.includes(`/${TABLE_IDS.assets}`)) {
        throw new Error(`Unexpected fetch: ${url.toString()}`);
      }

      return jsonResponse({
        records: [
          {
            id: 'rec_metrics_asset',
            createdTime: '2026-03-14T00:00:00.000Z',
            fields: {
              [METRICS_ASSET_FIELD_IDS.marketplaceStatus]: '3️⃣Published🚀',
              [METRICS_ASSET_FIELD_IDS.latestReviewStatus]: '✅Approved',
              [METRICS_ASSET_FIELD_IDS.latestReviewDate]: '2026-03-15T18:00:00.000Z',
              [METRICS_ASSET_FIELD_IDS.qualityScore]: '✅Good',
              [METRICS_ASSET_FIELD_IDS.submittedDate]: '2026-03-14T12:00:00.000Z',
              [METRICS_ASSET_FIELD_IDS.publishedDate]: '2026-03-16T09:00:00.000Z',
              [METRICS_ASSET_FIELD_IDS.decisionDate]: '2026-03-15T18:00:00.000Z',
            },
          },
        ],
      });
    },
  });

  const metrics = await client.getMarketplaceMetrics({
    days: 7,
    end_date: '2026-03-17',
  });

  assert.ok(capturedUrl);
  assert.equal(capturedUrl.searchParams.get('returnFieldsByFieldId'), 'true');
  assert.deepEqual(capturedUrl.searchParams.getAll('fields[]'), [
    METRICS_ASSET_FIELD_IDS.marketplaceStatus,
    METRICS_ASSET_FIELD_IDS.latestReviewStatus,
    METRICS_ASSET_FIELD_IDS.latestReviewDate,
    METRICS_ASSET_FIELD_IDS.qualityScore,
    METRICS_ASSET_FIELD_IDS.submittedDate,
    METRICS_ASSET_FIELD_IDS.publishedDate,
    METRICS_ASSET_FIELD_IDS.decisionDate,
  ]);
  assert.equal(metrics.totals.templatesScanned, 1);
  assert.equal(metrics.totals.submissions, 1);
  assert.equal(metrics.totals.decisions, 1);
  assert.equal(metrics.totals.approvals, 1);
  assert.equal(metrics.totals.published, 1);
  assert.equal(metrics.reviewStatusActivity['✅Approved'], 1);
  assert.equal(metrics.qualityRatingSnapshot['✅Good'], 1);
  assert.equal(metrics.backlogSnapshot.published, 1);
  assert.equal(metrics.turnaround.decidedCount, 1);
  assert.equal(metrics.turnaround.averageHours, 30);
});

test('getMarketplaceMetrics paginates the full template base instead of capping at 1000 records', async () => {
  const capturedUrls: URL[] = [];
  const client = new AirtableClient({
    apiKey: 'test',
    fetchFn: async (input) => {
      const url = new URL(String(input));
      capturedUrls.push(url);

      if (!url.pathname.includes(`/${TABLE_IDS.assets}`)) {
        throw new Error(`Unexpected fetch: ${url.toString()}`);
      }

      const offset = url.searchParams.get('offset');
      return jsonResponse({
        records: Array.from({ length: offset ? 50 : 100 }, (_, index) => ({
          id: `rec_metrics_${offset ? 100 + index : index}`,
          createdTime: '2026-03-14T00:00:00.000Z',
          fields: {},
        })),
        ...(offset ? {} : { offset: 'next-page' }),
      });
    },
  });

  const metrics = await client.getMarketplaceMetrics({
    days: 7,
    end_date: '2026-03-17',
  });

  assert.equal(metrics.totals.templatesScanned, 150);
  assert.equal(capturedUrls.length, 2);
  assert.equal(capturedUrls[0]?.searchParams.get('maxRecords'), null);
  assert.equal(capturedUrls[1]?.searchParams.get('offset'), 'next-page');
});

test('getMarketplaceMetrics preserves Airtable list error details for schema drift debugging', async () => {
  const client = new AirtableClient({
    apiKey: 'test',
    fetchFn: async () =>
      new Response(
        JSON.stringify({
          error: {
            type: 'UNKNOWN_FIELD_NAME',
            message: 'Unknown field name: "📝Description"',
          },
        }),
        {
          status: 422,
          headers: { 'content-type': 'application/json' },
        },
      ),
  });

  await assert.rejects(
    client.getMarketplaceMetrics({
      days: 7,
      end_date: '2026-03-17',
    }),
    (error: unknown) => {
      assert.equal((error as { code?: string }).code, 'AIRTABLE_LIST_FAILED');
      assert.deepEqual((error as { details?: unknown }).details, {
        tableId: TABLE_IDS.assets,
        filterByFormula: `{${CONFIRMED_ASSET_FIELDS.type}} = 'Template🏗️'`,
        fieldIds: [
          METRICS_ASSET_FIELD_IDS.marketplaceStatus,
          METRICS_ASSET_FIELD_IDS.latestReviewStatus,
          METRICS_ASSET_FIELD_IDS.latestReviewDate,
          METRICS_ASSET_FIELD_IDS.qualityScore,
          METRICS_ASSET_FIELD_IDS.submittedDate,
          METRICS_ASSET_FIELD_IDS.publishedDate,
          METRICS_ASSET_FIELD_IDS.decisionDate,
        ],
        returnFieldsByFieldId: true,
        airtable: {
          error: {
            type: 'UNKNOWN_FIELD_NAME',
            message: 'Unknown field name: "📝Description"',
          },
        },
      });
      return true;
    },
  );
});

test('getAssetById maps current asset fields and compatibility aliases', async () => {
  const client = new AirtableClient({
    apiKey: 'test',
    fetchFn: async (input) => {
      const url = new URL(String(input));

      if (!url.pathname.includes(`/${TABLE_IDS.assets}/rec_asset_current`)) {
        throw new Error(`Unexpected fetch: ${url.toString()}`);
      }

      return jsonResponse({
        id: 'rec_asset_current',
        createdTime: '2026-03-17T00:00:00.000Z',
        fields: {
          [CONFIRMED_ASSET_FIELDS.type]: 'Template🏗️',
          [CONFIRMED_ASSET_FIELDS.name]: 'Conicorn',
          [CONFIRMED_ASSET_FIELDS.descriptionShort]: 'Short description',
          [CONFIRMED_ASSET_FIELDS.descriptionLongHtml]: '<p>Long description</p>',
          [CONFIRMED_ASSET_FIELDS.latestReviewStatus]: '✅Approved',
          [CONFIRMED_ASSET_FIELDS.latestReviewDate]: '2026-03-16T18:00:00.000Z',
          [CONFIRMED_ASSET_FIELDS.rejectionFeedback]: 'Plain rejection feedback',
          [CONFIRMED_ASSET_FIELDS.publishedDate]: '2026-03-17',
        },
      });
    },
  });

  const asset = await client.getAssetById('rec_asset_current');

  assert.ok(asset);
  assert.equal(asset.description, '<p>Long description</p>');
  assert.equal(asset.descriptionLongHtml, '<p>Long description</p>');
  assert.equal(asset.latestReviewDate, '2026-03-16T18:00:00.000Z');
  assert.equal(asset.rejectionFeedbackHtml, 'Plain rejection feedback');
  assert.equal(asset.publishedDate, '2026-03-17');
});

test('getVersionById maps the current version-side MRP and agent feedback fields', async () => {
  const client = new AirtableClient({
    apiKey: 'test',
    fetchFn: async (input) => {
      const url = new URL(String(input));

      if (!url.pathname.includes(`/${TABLE_IDS.assetVersions}/rec_version_current`)) {
        throw new Error(`Unexpected fetch: ${url.toString()}`);
      }

      return jsonResponse({
        id: 'rec_version_current',
        createdTime: '2026-03-17T00:00:00.000Z',
        fields: {
          [CONFIRMED_VERSION_FIELDS.assetRecordId]: 'rec_asset_current',
          [CONFIRMED_VERSION_FIELDS.mrpIdOverwrite]: 'mrp_current_123',
          [CONFIRMED_VERSION_FIELDS.agentReviewFeedback]: 'AI draft feedback',
        },
      });
    },
  });

  const version = await client.getVersionById('rec_version_current');

  assert.ok(version);
  assert.equal(version.mrpIdOverwrite, 'mrp_current_123');
  assert.equal(version.agentReviewFeedback, 'AI draft feedback');
});

test('listVersionsForAgentFeedback filters for ready rows without existing agent feedback by default', async () => {
  let capturedUrl: URL | null = null;
  const client = new AirtableClient({
    apiKey: 'test',
    fetchFn: async (input) => {
      capturedUrl = new URL(String(input));
      return jsonResponse({
        records: [
          {
            id: 'rec_version_ready',
            createdTime: '2026-03-17T00:00:00.000Z',
            fields: {
              [CONFIRMED_VERSION_FIELDS.assetRecordId]: 'rec_asset_current',
              [CONFIRMED_VERSION_FIELDS.reviewStatus]: '🆕Ready for Review',
            },
          },
        ],
      });
    },
  });

  const versions = await client.listVersionsForAgentFeedback({
    limit: 5,
    viewId: 'viw_ready_queue',
  });

  assert.ok(capturedUrl);
  assert.equal(capturedUrl.searchParams.get('view'), 'viw_ready_queue');
  assert.match(capturedUrl.searchParams.get('filterByFormula') ?? '', /LEN\(TRIM\(\{📝Agent Review Feedback\} & ""\)\) = 0/);
  assert.equal(capturedUrl.searchParams.get('sort[0][field]'), CONFIRMED_VERSION_FIELDS.submissionDatetime);
  assert.equal(capturedUrl.searchParams.get('sort[0][direction]'), 'asc');
  assert.equal(versions.length, 1);
  assert.equal(versions[0]?.reviewStatus, '🆕Ready for Review');
});

test('listVersionsForAgentFeedback can scope to recent submitted rows newest first', async () => {
  let capturedUrl: URL | null = null;
  const client = new AirtableClient({
    apiKey: 'test',
    fetchFn: async (input) => {
      capturedUrl = new URL(String(input));
      return jsonResponse({ records: [] });
    },
  });

  await client.listVersionsForAgentFeedback({
    limit: 10,
    submittedSince: '2026-05-27T00:00:00.000Z',
    submittedUntil: '2026-06-03T23:59:59.000Z',
    sortDirection: 'desc',
  });

  assert.ok(capturedUrl);
  const formula = capturedUrl.searchParams.get('filterByFormula') ?? '';
  assert.match(formula, /IS_AFTER\(\{📅Submission Datetime\}, DATEADD\(DATETIME_PARSE\('2026-05-27T00:00:00.000Z'\), -1, 'seconds'\)\)/);
  assert.match(formula, /IS_BEFORE\(\{📅Submission Datetime\}, DATEADD\(DATETIME_PARSE\('2026-06-03T23:59:59.000Z'\), 1, 'seconds'\)\)/);
  assert.equal(capturedUrl.searchParams.get('sort[0][field]'), CONFIRMED_VERSION_FIELDS.submissionDatetime);
  assert.equal(capturedUrl.searchParams.get('sort[0][direction]'), 'desc');
});

test('listVersionsForAgentFeedback rejects invalid submitted date filters', async () => {
  const client = new AirtableClient({
    apiKey: 'test',
    fetchFn: async () => {
      throw new Error('fetch should not be called for invalid date filters');
    },
  });

  await assert.rejects(
    client.listVersionsForAgentFeedback({
      submittedSince: 'not-a-date',
    }),
    (error: unknown) => {
      assert.equal((error as { code?: string }).code, 'INVALID_DATE_FILTER');
      return true;
    },
  );
});

test('listReleases uses the stable Airtable release table id', async () => {
  let capturedUrl: URL | null = null;
  const client = new AirtableClient({
    apiKey: 'test',
    fetchFn: async (input) => {
      capturedUrl = new URL(String(input));
      return jsonResponse({ records: [] });
    },
  });

  await client.listReleases();

  assert.ok(capturedUrl);
  assert.equal(capturedUrl.pathname, `/v0/appMoIgXMTTTNIc3p/tblhLAXcJiXrkZxUL`);
});

test('updateAssetMetadata maps legacy description input onto the current long-html field', async () => {
  const client = new AirtableClient({
    apiKey: 'test',
    fetchFn: async (input, init) => {
      const url = new URL(String(input));

      if (!url.pathname.includes(`/${TABLE_IDS.assets}/rec_asset_update`)) {
        throw new Error(`Unexpected fetch: ${url.toString()}`);
      }

      assert.equal(init?.method, 'PATCH');
      assert.deepEqual(JSON.parse(String(init?.body)), {
        fields: {
          [CONFIRMED_ASSET_FIELDS.descriptionLongHtml]: '<p>Updated description</p>',
        },
      });

      return jsonResponse({
        id: 'rec_asset_update',
        createdTime: '2026-03-17T00:00:00.000Z',
        fields: {
          [CONFIRMED_ASSET_FIELDS.type]: 'Template🏗️',
          [CONFIRMED_ASSET_FIELDS.name]: 'Conicorn',
          [CONFIRMED_ASSET_FIELDS.descriptionLongHtml]: '<p>Updated description</p>',
        },
      });
    },
  });

  const asset = await client.updateAssetMetadata('rec_asset_update', {
    description: '<p>Updated description</p>',
  });

  assert.equal(asset.description, '<p>Updated description</p>');
  assert.equal(asset.descriptionLongHtml, '<p>Updated description</p>');
});

test('listAssetQueueDetailed applies queue filters on versions before hydrating assets', async () => {
  const capturedUrls: URL[] = [];
  const client = new AirtableClient({
    apiKey: 'test',
    fetchFn: async (input) => {
      const url = new URL(String(input));
      capturedUrls.push(url);

      if (url.pathname.includes(`/${TABLE_IDS.assetVersions}`)) {
        const formula = url.searchParams.get('filterByFormula') ?? '';
        assert.match(formula, new RegExp(`\\{${CONFIRMED_VERSION_FIELDS.reviewStatus}\\} = '🆕Ready for Review'`));
        assert.match(formula, new RegExp(`ARRAYJOIN\\(\\{${CONFIRMED_VERSION_FIELDS.reviewOwner}\\}\\)`));
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
                [CONFIRMED_VERSION_FIELDS.submissionDatetime]: '2026-03-10T12:00:00.000Z',
              },
            },
          ],
        });
      }

      if (url.pathname.includes(`/${TABLE_IDS.assets}`)) {
        assert.match(url.searchParams.get('filterByFormula') ?? '', /RECORD_ID\(\)/);
        return jsonResponse({
          records: [
            {
              id: 'rec_asset_finoraa',
              createdTime: '2026-03-10T00:00:00.000Z',
              fields: {
                [CONFIRMED_ASSET_FIELDS.type]: 'Template🏗️',
                [CONFIRMED_ASSET_FIELDS.name]: 'Finoraa',
                [CONFIRMED_ASSET_FIELDS.latestReviewStatus]: '🆕Ready for Review',
                [CONFIRMED_ASSET_FIELDS.submittedDate]: '2026-03-10T12:00:00.000Z',
              },
            },
          ],
        });
      }

      throw new Error(`Unexpected fetch: ${url.toString()}`);
    },
  });

  const queue = await client.listAssetQueueDetailed({
    status: 'ready_to_review',
    assigned: 'unassigned',
    limit: 10,
    currentReviewer: ericReviewer,
  });

  assert.equal(queue.items.length, 1);
  assert.equal(queue.items[0]?.assignableVersionId, 'rec_finoraa_v1');
  assert.equal(queue.items[0]?.normalizedStatus, 'ready_to_review');
  assert.equal(capturedUrls[0]?.pathname.includes(`/${TABLE_IDS.assetVersions}`), true);
  assert.equal(capturedUrls[1]?.pathname.includes(`/${TABLE_IDS.assets}`), true);
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

test('listMyQueueDetailed defaults to active assigned statuses', async () => {
  let capturedVersionUrl: URL | null = null;
  const client = new AirtableClient({
    apiKey: 'test',
    fetchFn: async (input) => {
      const url = new URL(String(input));

      if (url.pathname.includes(`/${TABLE_IDS.assetVersions}`)) {
        capturedVersionUrl = url;
        return jsonResponse({
          records: [
            {
              id: 'rec_active_v1',
              createdTime: '2026-03-12T00:00:00.000Z',
              fields: {
                [CONFIRMED_VERSION_FIELDS.assetRecordId]: 'rec_asset_active',
                [CONFIRMED_VERSION_FIELDS.versionNumber]: 1,
                [CONFIRMED_VERSION_FIELDS.reviewStatus]: '🏃🏾In Review',
                [CONFIRMED_VERSION_FIELDS.reviewOwner]: ericReviewer,
                [CONFIRMED_VERSION_FIELDS.submissionDatetime]: '2026-03-12T12:00:00.000Z',
              },
            },
            {
              id: 'rec_done_v1',
              createdTime: '2026-03-11T00:00:00.000Z',
              fields: {
                [CONFIRMED_VERSION_FIELDS.assetRecordId]: 'rec_asset_done',
                [CONFIRMED_VERSION_FIELDS.versionNumber]: 1,
                [CONFIRMED_VERSION_FIELDS.reviewStatus]: '✅Approved',
                [CONFIRMED_VERSION_FIELDS.reviewOwner]: ericReviewer,
                [CONFIRMED_VERSION_FIELDS.submissionDatetime]: '2026-03-11T12:00:00.000Z',
              },
            },
          ],
        });
      }

      if (url.pathname.includes(`/${TABLE_IDS.assets}`)) {
        return jsonResponse({
          records: [
            {
              id: 'rec_asset_active',
              createdTime: '2026-03-12T00:00:00.000Z',
              fields: {
                [CONFIRMED_ASSET_FIELDS.type]: 'Template🏗️',
                [CONFIRMED_ASSET_FIELDS.name]: 'Active Template',
                [CONFIRMED_ASSET_FIELDS.latestReviewStatus]: '🏃🏾In Review',
              },
            },
            {
              id: 'rec_asset_done',
              createdTime: '2026-03-11T00:00:00.000Z',
              fields: {
                [CONFIRMED_ASSET_FIELDS.type]: 'Template🏗️',
                [CONFIRMED_ASSET_FIELDS.name]: 'Done Template',
                [CONFIRMED_ASSET_FIELDS.latestReviewStatus]: '✅Approved',
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

  assert.ok(capturedVersionUrl);
  const formula = capturedVersionUrl.searchParams.get('filterByFormula') ?? '';
  assert.match(formula, /Ready for Review/);
  assert.match(formula, /In Review/);
  assert.match(formula, /Changes Requested/);
  assert.doesNotMatch(formula, /Approved/);
  assert.equal(queue.items.length, 1);
  assert.equal(queue.items[0]?.templateName, 'Active Template');
  assert.equal(queue.items[0]?.normalizedStatus, 'in_review');
});

test('listMyQueueDetailed bounds reviewer scans to a buffered limit', async () => {
  let capturedVersionUrl: URL | null = null;
  const client = new AirtableClient({
    apiKey: 'test',
    fetchFn: async (input) => {
      const url = new URL(String(input));

      if (url.pathname.includes(`/${TABLE_IDS.assetVersions}`)) {
        capturedVersionUrl = url;
        return jsonResponse({ records: [] });
      }

      throw new Error(`Unexpected fetch: ${url.toString()}`);
    },
  });

  const queue = await client.listMyQueueDetailed({
    limit: 10,
    currentReviewer: ericReviewer,
  });

  assert.equal(queue.items.length, 0);
  assert.ok(capturedVersionUrl);
  assert.equal(capturedVersionUrl.searchParams.get('maxRecords'), '100');
  assert.equal(capturedVersionUrl.searchParams.get('pageSize'), '100');
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

  await assert.rejects(client.assignSelfToVersion('rec_version_conflict', ericReviewer), (error: unknown) => {
    assert.equal((error as { code?: string }).code, 'REVIEWER_ASSIGNMENT_CONFLICT');
    return true;
  });
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

  await assert.rejects(client.requireAssignedVersion('rec_version_unassigned', ericReviewer), (error: unknown) => {
    assert.equal((error as { code?: string }).code, 'REVIEWER_ASSIGNMENT_REQUIRED');
    return true;
  });
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
      assert.deepEqual(JSON.parse(String(init?.body)), {
        fields: {
          [CONFIRMED_WRITE_FIELD_IDS.versions.reviewFeedback]: 'Draft feedback',
        },
      });

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

test('updateVersionReview reasserts review owner after review field mutations', async () => {
  const bodies: unknown[] = [];
  const client = new AirtableClient({
    apiKey: 'test',
    reviewOwnerReassertionDelayMs: 0,
    fetchFn: async (input, init) => {
      const url = new URL(String(input));

      assert.match(url.pathname, new RegExp(`/${TABLE_IDS.assetVersions}/rec_version_reassert_owner$`));
      assert.equal(init?.method, 'PATCH');
      bodies.push(JSON.parse(String(init?.body)));

      if (bodies.length === 1) {
        return jsonResponse({
          id: 'rec_version_reassert_owner',
          createdTime: '2026-03-18T00:00:00.000Z',
          fields: {
            [CONFIRMED_VERSION_FIELDS.assetRecordId]: 'rec_asset_current',
            [CONFIRMED_VERSION_FIELDS.reviewOwner]: ericReviewer,
            [CONFIRMED_VERSION_FIELDS.reviewStatus]: '🏃🏾In Review',
          },
        });
      }

      if (bodies.length === 2) {
        return jsonResponse({
          id: 'rec_version_reassert_owner',
          createdTime: '2026-03-18T00:00:00.000Z',
          fields: {
            [CONFIRMED_VERSION_FIELDS.assetRecordId]: 'rec_asset_current',
            [CONFIRMED_VERSION_FIELDS.reviewOwner]: ericReviewer,
            [CONFIRMED_VERSION_FIELDS.reviewStatus]: '🏃🏾In Review',
          },
        });
      }

      throw new Error('Unexpected extra Airtable write');
    },
  });

  const version = await client.updateVersionReview('rec_version_reassert_owner', {
    review_owner: { id: ericReviewer.id },
    review_status: '🏃🏾In Review',
  });

  assert.deepEqual(bodies, [
    {
      fields: {
        [CONFIRMED_VERSION_FIELDS.reviewOwner]: { id: ericReviewer.id },
        [CONFIRMED_VERSION_FIELDS.reviewStatus]: '🏃🏾In Review',
      },
    },
    {
      fields: {
        [CONFIRMED_VERSION_FIELDS.reviewOwner]: { id: ericReviewer.id },
      },
    },
  ]);
  assert.equal(version.reviewOwner?.id, ericReviewer.id);
  assert.equal(version.reviewStatus, '🏃🏾In Review');
});

test('updateVersionReview fails when review owner reassertion returns a different owner', async () => {
  let calls = 0;
  const client = new AirtableClient({
    apiKey: 'test',
    reviewOwnerReassertionDelayMs: 0,
    fetchFn: async () => {
      calls += 1;
      return jsonResponse({
        id: 'rec_version_reassert_mismatch',
        createdTime: '2026-03-18T00:00:00.000Z',
        fields: {
          [CONFIRMED_VERSION_FIELDS.assetRecordId]: 'rec_asset_current',
          [CONFIRMED_VERSION_FIELDS.reviewOwner]: calls === 1 ? ericReviewer : { id: 'usr_micah', email: 'micah@webflow.com' },
          [CONFIRMED_VERSION_FIELDS.reviewStatus]: '🏃🏾In Review',
        },
      });
    },
  });

  await assert.rejects(
    client.updateVersionReview('rec_version_reassert_mismatch', {
      review_owner: { id: ericReviewer.id },
      review_status: '🏃🏾In Review',
    }),
    (error: unknown) => {
      assert.equal((error as { code?: string }).code, 'REVIEW_OWNER_REASSERTION_FAILED');
      assert.deepEqual((error as { details?: unknown }).details, {
        version_id: 'rec_version_reassert_mismatch',
        expected_reviewer_id: ericReviewer.id,
        actual_reviewer_id: 'usr_micah',
        reassertion_delay_ms: 0,
      });
      return true;
    },
  );
});

test('updateVersionReview writes agent review feedback to the confirmed field id', async () => {
  const client = new AirtableClient({
    apiKey: 'test',
    fetchFn: async (input, init) => {
      const url = new URL(String(input));

      assert.match(url.pathname, new RegExp(`/${TABLE_IDS.assetVersions}/rec_version_agent_feedback$`));
      assert.equal(init?.method, 'PATCH');
      assert.deepEqual(JSON.parse(String(init?.body)), {
        fields: {
          [CONFIRMED_WRITE_FIELD_IDS.versions.agentReviewFeedback]: 'AI supplemental draft',
        },
      });

      return jsonResponse({
        id: 'rec_version_agent_feedback',
        createdTime: '2026-03-18T00:00:00.000Z',
        fields: {
          [CONFIRMED_VERSION_FIELDS.assetRecordId]: 'rec_asset_current',
          [CONFIRMED_VERSION_FIELDS.agentReviewFeedback]: 'AI supplemental draft',
        },
      });
    },
  });

  const version = await client.updateVersionReview('rec_version_agent_feedback', {
    agent_review_feedback: 'AI supplemental draft',
  });

  assert.equal(version.agentReviewFeedback, 'AI supplemental draft');
});
