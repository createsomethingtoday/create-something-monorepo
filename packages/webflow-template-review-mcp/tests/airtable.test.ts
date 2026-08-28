import assert from 'node:assert/strict';
import test from 'node:test';

import { AirtableClient } from '../src/airtable.js';
import { CONFIRMED_ASSET_FIELDS, CONFIRMED_VERSION_FIELDS, CONFIRMED_WRITE_FIELD_IDS, FEATURED_ASSET_FIELDS, FEATURED_ASSET_FIELD_IDS, METRICS_ASSET_FIELD_IDS, TABLE_IDS } from '../src/schema.js';

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
          [CONFIRMED_ASSET_FIELDS.uid]: 'conicorn',
          [CONFIRMED_ASSET_FIELDS.descriptionShort]: 'Short description',
          [CONFIRMED_ASSET_FIELDS.descriptionLongHtml]: '<p>Long description</p>',
          [CONFIRMED_ASSET_FIELDS.adminDetailPagePath]: '/templates/html/conicorn-website-template',
          [CONFIRMED_ASSET_FIELDS.adminRecommendedType]: 'CMS',
          [CONFIRMED_ASSET_FIELDS.categoryNames]: ['Design Portfolio', 'Creative Agency'],
          [CONFIRMED_ASSET_FIELDS.categoryCmsSlugs]: ['design-portfolio-websites', 'creative-agency-websites'],
          [CONFIRMED_ASSET_FIELDS.categoryGroupDisplayName]: ['Portfolio & Agency'],
          [CONFIRMED_ASSET_FIELDS.categoryGroupCmsSlug]: ['portfolio-and-agency-websites'],
          [CONFIRMED_ASSET_FIELDS.latestReviewStatus]: '✅Approved',
          [CONFIRMED_ASSET_FIELDS.latestReviewDate]: '2026-03-16T18:00:00.000Z',
          [CONFIRMED_ASSET_FIELDS.rejectionFeedback]: 'Plain rejection feedback',
          [CONFIRMED_ASSET_FIELDS.publishedDate]: '2026-03-17',
          [CONFIRMED_ASSET_FIELDS.templatePriceFilter]: 99,
        },
      });
    },
  });

  const asset = await client.getAssetById('rec_asset_current');

  assert.ok(asset);
  assert.equal(asset.uid, 'conicorn');
  assert.equal(asset.description, '<p>Long description</p>');
  assert.equal(asset.descriptionLongHtml, '<p>Long description</p>');
  assert.equal(asset.adminDetailPagePath, '/templates/html/conicorn-website-template');
  assert.equal(asset.adminRecommendedType, 'CMS');
  assert.deepEqual(asset.categoryNames, ['Design Portfolio', 'Creative Agency']);
  assert.deepEqual(asset.categoryCmsSlugs, ['design-portfolio-websites', 'creative-agency-websites']);
  assert.deepEqual(asset.categoryGroupDisplayNames, ['Portfolio & Agency']);
  assert.deepEqual(asset.categoryGroupCmsSlugs, ['portfolio-and-agency-websites']);
  assert.equal(asset.latestReviewDate, '2026-03-16T18:00:00.000Z');
  assert.equal(asset.rejectionFeedbackHtml, 'Plain rejection feedback');
  assert.equal(asset.publishedDate, '2026-03-17');
  assert.equal(asset.templatePriceFilter, 99);
});

test('getAssetThumbnails returns attachment details for admin thumbnail handoff', async () => {
  const client = new AirtableClient({
    apiKey: 'test',
    fetchFn: async (input) => {
      const url = new URL(String(input));

      if (!url.pathname.includes(`/${TABLE_IDS.assets}/rec_asset_thumbs`)) {
        throw new Error(`Unexpected fetch: ${url.toString()}`);
      }

      return jsonResponse({
        id: 'rec_asset_thumbs',
        createdTime: '2026-03-17T00:00:00.000Z',
        fields: {
          [CONFIRMED_ASSET_FIELDS.type]: 'Template🏗️',
          [CONFIRMED_ASSET_FIELDS.name]: 'Conicorn',
          [CONFIRMED_ASSET_FIELDS.thumbnailImage]: [
            {
              id: 'att_primary',
              url: 'https://airtable.example/primary.png',
              filename: 'conicorn-thumbnail.png',
              type: 'image/png',
              size: 245000,
              width: 1440,
              height: 1080,
            },
          ],
          [CONFIRMED_ASSET_FIELDS.thumbnailImageSecondary]: [
            { id: 'att_secondary', url: 'https://airtable.example/secondary.png', filename: 'conicorn-secondary.png' },
          ],
        },
      });
    },
  });

  const thumbnails = await client.getAssetThumbnails('rec_asset_thumbs');

  assert.ok(thumbnails);
  assert.equal(thumbnails.assetId, 'rec_asset_thumbs');
  assert.equal(thumbnails.templateName, 'Conicorn');
  assert.deepEqual(thumbnails.thumbnail, {
    url: 'https://airtable.example/primary.png',
    filename: 'conicorn-thumbnail.png',
    type: 'image/png',
    sizeBytes: 245000,
    width: 1440,
    height: 1080,
  });
  assert.deepEqual(thumbnails.secondaryThumbnails, [
    { url: 'https://airtable.example/secondary.png', filename: 'conicorn-secondary.png' },
  ]);
  assert.deepEqual(thumbnails.carouselImages, []);
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

// Trailing newline is deliberate: real Airtable checklist values end with one,
// and read-modify-write must not silently drop it.
const REVIEW_CHECKLIST_RAW = '### Panel\n[ ] first item\n- 🔵 sub criterion\n[x] second item\n';
const PUBLISHING_CHECKLIST_RAW = '[ ] publish step one\n    - nested note\n[ ] publish step two';

function versionRecord(id: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    createdTime: '2026-07-28T00:00:00.000Z',
    fields: {
      [CONFIRMED_VERSION_FIELDS.assetRecordId]: 'rec_asset_checklist',
      [CONFIRMED_VERSION_FIELDS.reviewOwner]: ericReviewer,
      [CONFIRMED_VERSION_FIELDS.reviewChecklist]: REVIEW_CHECKLIST_RAW,
      [CONFIRMED_VERSION_FIELDS.publishingChecklist]: PUBLISHING_CHECKLIST_RAW,
      ...overrides,
    },
  };
}

const checklistAssetRecord = {
  id: 'rec_asset_checklist',
  createdTime: '2026-07-28T00:00:00.000Z',
  fields: {
    [CONFIRMED_ASSET_FIELDS.type]: 'Template🏗️',
    [CONFIRMED_ASSET_FIELDS.name]: 'Checklist Template',
  },
};

function checklistClient(onPatch?: (body: unknown) => unknown) {
  const patches: unknown[] = [];
  const client = new AirtableClient({
    apiKey: 'test',
    reviewOwnerReassertionDelayMs: 0,
    fetchFn: async (input, init) => {
      const url = new URL(String(input));
      if (init?.method === 'PATCH') {
        const body = JSON.parse(String(init.body));
        patches.push(body);
        const override = onPatch?.(body);
        return jsonResponse(override ?? versionRecord('rec_version_checklist'));
      }
      if (url.pathname.includes(`/${TABLE_IDS.assets}/`)) return jsonResponse(checklistAssetRecord);
      return jsonResponse(versionRecord('rec_version_checklist'));
    },
  });
  return { client, patches };
}

test('getVersionChecklists returns structured items and progress for both checklist fields', async () => {
  const { client } = checklistClient();

  const result = await client.getVersionChecklists('rec_version_checklist');

  assert.equal(result.templateName, 'Checklist Template');
  assert.equal(result.checklists.review.present, true);
  assert.equal(result.checklists.review.fieldName, CONFIRMED_VERSION_FIELDS.reviewChecklist);
  assert.deepEqual(result.checklists.review.summary, { total: 2, checked: 1, unchecked: 1, complete: false });
  assert.deepEqual(
    result.checklists.review.items.map((item) => [item.index, item.text, item.checked, item.section]),
    [
      [1, 'first item', false, 'Panel'],
      [2, 'second item', true, 'Panel'],
    ],
  );
  assert.deepEqual(result.checklists.publishing.summary, { total: 2, checked: 0, unchecked: 2, complete: false });
});

test('getVersionChecklists reports an absent checklist field as not present', async () => {
  const client = new AirtableClient({
    apiKey: 'test',
    fetchFn: async (input) => {
      const url = new URL(String(input));
      if (url.pathname.includes(`/${TABLE_IDS.assets}/`)) return jsonResponse(checklistAssetRecord);
      return jsonResponse(
        versionRecord('rec_version_no_checklist', {
          [CONFIRMED_VERSION_FIELDS.reviewChecklist]: undefined,
        }),
      );
    },
  });

  const result = await client.getVersionChecklists('rec_version_no_checklist');

  assert.equal(result.checklists.review.present, false);
  assert.deepEqual(result.checklists.review.items, []);
  assert.equal(result.checklists.publishing.present, true);
});

test('setVersionChecklistItems writes a byte-preserving edit that keeps the trailing newline', async () => {
  const { client, patches } = checklistClient();

  const result = await client.setVersionChecklistItems('rec_version_checklist', {
    checklist: 'review',
    items: [{ index: 1, checked: true, expectedText: 'first item' }],
    expected_total: 2,
    review_owner: { id: ericReviewer.id },
  });

  assert.equal(result.written, true);
  // Two writes: the checklist edit, then the existing review-owner reassertion.
  assert.equal(patches.length, 2);
  assert.deepEqual((patches[1] as { fields: Record<string, unknown> }).fields, {
    [CONFIRMED_VERSION_FIELDS.reviewOwner]: { id: ericReviewer.id },
  });
  const written = (patches[0] as { fields: Record<string, string> }).fields[CONFIRMED_VERSION_FIELDS.reviewChecklist];

  assert.equal(written, '### Panel\n[x] first item\n- 🔵 sub criterion\n[x] second item\n');
  assert.equal(written.length, REVIEW_CHECKLIST_RAW.length, 'edit must not change field length');
  assert.equal(written.endsWith('\n'), true, 'trailing newline must survive read-modify-write');
  assert.deepEqual(result.after, { total: 2, checked: 2, unchecked: 0, complete: true });
  assert.deepEqual(result.changed, [{ index: 1, text: 'first item', section: 'Panel', from: false, to: true }]);
});

test('setVersionChecklistItems targets the publishing field when asked', async () => {
  const { client, patches } = checklistClient();

  await client.setVersionChecklistItems('rec_version_checklist', {
    checklist: 'publishing',
    items: [{ index: 2, checked: true, expectedText: 'publish step two' }],
    expected_total: 2,
  });

  const fields = (patches[0] as { fields: Record<string, string> }).fields;
  assert.equal(fields[CONFIRMED_VERSION_FIELDS.publishingChecklist], '[ ] publish step one\n    - nested note\n[x] publish step two');
  assert.equal(CONFIRMED_VERSION_FIELDS.reviewChecklist in fields, false);
});

test('setVersionChecklistItems skips the Airtable write when nothing changed', async () => {
  const { client, patches } = checklistClient();

  const result = await client.setVersionChecklistItems('rec_version_checklist', {
    checklist: 'review',
    items: [{ index: 2, checked: true, expectedText: 'second item' }],
    expected_total: 2,
  });

  assert.equal(result.written, false);
  assert.deepEqual(result.changed, []);
  assert.equal(patches.length, 0, 'no-op edits must not issue an Airtable write');
});

test('setVersionChecklistItems rejects a stale expected_total', async () => {
  const { client, patches } = checklistClient();

  await assert.rejects(
    client.setVersionChecklistItems('rec_version_checklist', {
      checklist: 'review',
      items: [{ index: 1, checked: true, expectedText: 'first item' }],
      expected_total: 10,
    }),
    (error: unknown) => {
      assert.equal((error as { code?: string }).code, 'CHECKLIST_TOTAL_MISMATCH');
      assert.equal((error as { status?: number }).status, 409);
      assert.deepEqual((error as { details?: Record<string, unknown> }).details, {
        version_id: 'rec_version_checklist',
        checklist: 'review',
        field: CONFIRMED_VERSION_FIELDS.reviewChecklist,
        expected_total: 10,
        actual_total: 2,
      });
      return true;
    },
  );

  assert.equal(patches.length, 0);
});

test('setVersionChecklistItems rejects stale item text when the count is unchanged', async () => {
  const { client, patches } = checklistClient();

  await assert.rejects(
    client.setVersionChecklistItems('rec_version_checklist', {
      checklist: 'review',
      items: [{ index: 1, checked: true, expectedText: 'a previously selected item' }],
      expected_total: 2,
    }),
    (error: unknown) => {
      assert.equal((error as { code?: string }).code, 'CHECKLIST_ITEM_TEXT_MISMATCH');
      assert.equal((error as { status?: number }).status, 400);
      assert.deepEqual((error as { details?: Record<string, unknown> }).details, {
        version_id: 'rec_version_checklist',
        checklist: 'review',
        field: CONFIRMED_VERSION_FIELDS.reviewChecklist,
        mismatches: [
          {
            index: 1,
            expected_text: 'a previously selected item',
            actual_text: 'first item',
          },
        ],
      });
      return true;
    },
  );

  assert.equal(patches.length, 0);
});

test('setVersionChecklistItems surfaces parser failures and missing checklist content', async () => {
  const { client } = checklistClient();

  await assert.rejects(
    client.setVersionChecklistItems('rec_version_checklist', {
      checklist: 'review',
      items: [{ index: 99, checked: true, expectedText: 'missing item' }],
      expected_total: 2,
    }),
    (error: unknown) => {
      assert.equal((error as { code?: string }).code, 'CHECKLIST_ITEM_OUT_OF_RANGE');
      assert.equal((error as { status?: number }).status, 400);
      return true;
    },
  );

  const emptyClient = new AirtableClient({
    apiKey: 'test',
    fetchFn: async (input) => {
      const url = new URL(String(input));
      if (url.pathname.includes(`/${TABLE_IDS.assets}/`)) return jsonResponse(checklistAssetRecord);
      return jsonResponse(versionRecord('rec_version_empty', { [CONFIRMED_VERSION_FIELDS.reviewChecklist]: '' }));
    },
  });

  await assert.rejects(
    emptyClient.setVersionChecklistItems('rec_version_empty', {
      checklist: 'review',
      items: [{ index: 1, checked: true, expectedText: 'missing item' }],
      expected_total: 0,
    }),
    (error: unknown) => {
      assert.equal((error as { code?: string }).code, 'CHECKLIST_MISSING');
      assert.equal((error as { status?: number }).status, 409);
      return true;
    },
  );
});

test('completePublishing leaves the publishing checklist untouched by default', async () => {
  const { client, patches } = checklistClient();

  const result = await client.completePublishing('rec_version_checklist', {
    release_record_id: 'rec_release_1',
    review_owner: { id: ericReviewer.id },
  });

  const fields = (patches[0] as { fields: Record<string, unknown> }).fields;
  assert.equal(CONFIRMED_VERSION_FIELDS.publishingChecklist in fields, false, 'release attachment must not assert checklist completion');
  assert.equal(result.publishingChecklist.markedAllComplete, false);
  assert.deepEqual(result.publishingChecklist.unchecked, 2);
});

test('completePublishing marks every publishing item only when explicitly opted in', async () => {
  const { client, patches } = checklistClient();

  const result = await client.completePublishing('rec_version_checklist', {
    release_record_id: 'rec_release_1',
    mark_all_publishing_items: true,
    review_owner: { id: ericReviewer.id },
  });

  const fields = (patches[0] as { fields: Record<string, string> }).fields;
  assert.equal(fields[CONFIRMED_VERSION_FIELDS.publishingChecklist], '[x] publish step one\n    - nested note\n[x] publish step two');
  assert.equal(result.publishingChecklist.markedAllComplete, true);
});

test('completePublishing still fails closed when opting in with no checklist content', async () => {
  const client = new AirtableClient({
    apiKey: 'test',
    fetchFn: async (input, init) => {
      const url = new URL(String(input));
      if (init?.method === 'PATCH') throw new Error('should not write');
      if (url.pathname.includes(`/${TABLE_IDS.assetReleases}/`)) {
        return jsonResponse({ id: 'rec_release_1', createdTime: '2026-07-28T00:00:00.000Z', fields: {} });
      }
      if (url.pathname.includes(`/${TABLE_IDS.assets}/`)) return jsonResponse(checklistAssetRecord);
      return jsonResponse(versionRecord('rec_version_empty_publish', { [CONFIRMED_VERSION_FIELDS.publishingChecklist]: undefined }));
    },
  });

  await assert.rejects(
    client.completePublishing('rec_version_empty_publish', {
      release_record_id: 'rec_release_1',
      mark_all_publishing_items: true,
    }),
    (error: unknown) => {
      assert.equal((error as { code?: string }).code, 'PUBLISHING_CHECKLIST_MISSING');
      return true;
    },
  );
});

test('getReviewContext exposes checklist progress for gating', async () => {
  const { client } = checklistClient();

  const context = await client.getReviewContext('rec_version_checklist', ericReviewer);

  assert.deepEqual(context.checklistProgress, {
    review: { total: 2, checked: 1, unchecked: 1, complete: false },
    publishing: { total: 2, checked: 0, unchecked: 2, complete: false },
  });
});

test('findRawHtmlTag detects tag-shaped sequences but not autolinks or comparisons', async () => {
  const { findRawHtmlTag } = await import('../src/airtable.js');

  // The Onart truncation case: backtick-wrapped raw tag still truncates today.
  assert.equal(findRawHtmlTag('A `<script type="application/ld+json">` block now appears on every page'), '<script type="application/ld+json">');
  assert.equal(findRawHtmlTag('close the </div> properly'), '</div>');
  assert.equal(findRawHtmlTag('use <br/> sparingly'), '<br/>');

  assert.equal(findRawHtmlTag('see <https://example.com/a?b=1> for details'), null);
  assert.equal(findRawHtmlTag('when x < y the loop exits'), null);
  assert.equal(findRawHtmlTag('rated <3 by users'), null);
  assert.equal(findRawHtmlTag('plain feedback with `backticked code` and **bold**'), null);
});

test('updateVersionReview rejects raw HTML tags in creator-facing feedback before calling Airtable', async () => {
  let called = false;
  const client = new AirtableClient({
    apiKey: 'test',
    fetchFn: async () => {
      called = true;
      throw new Error('should not run');
    },
  });

  await assert.rejects(
    client.updateVersionReview('rec_version_raw_html', {
      review_feedback: 'Remove the `<script type="application/ld+json">` block from every page.',
    }),
    (error: unknown) => {
      assert.equal((error as { code?: string }).code, 'RAW_HTML_IN_FEEDBACK');
      assert.deepEqual((error as { details?: unknown }).details, {
        field: 'review_feedback',
        tag: '<script type="application/ld+json">',
      });
      return true;
    },
  );

  await assert.rejects(
    client.updateVersionReview('rec_version_raw_html_rejection', {
      rejection_feedback: 'The <div> nesting is broken throughout.',
    }),
    (error: unknown) => {
      assert.equal((error as { code?: string }).code, 'RAW_HTML_IN_FEEDBACK');
      assert.deepEqual((error as { details?: unknown }).details, {
        field: 'rejection_feedback',
        tag: '<div>',
      });
      return true;
    },
  );

  assert.equal(called, false);
});

test('updateVersionReview allows autolinks and internal agent feedback with raw tags', async () => {
  const client = new AirtableClient({
    apiKey: 'test',
    fetchFn: async (input, init) => {
      const url = new URL(String(input));
      if (!url.pathname.includes(`/${TABLE_IDS.assetVersions}/rec_version_safe_feedback`)) {
        throw new Error(`Unexpected fetch: ${url.toString()}`);
      }
      const body = JSON.parse(String(init?.body));
      return jsonResponse({
        id: 'rec_version_safe_feedback',
        createdTime: '2026-08-10T00:00:00.000Z',
        fields: body.fields,
      });
    },
  });

  // Autolinks and backticked non-tag references pass.
  await client.updateVersionReview('rec_version_safe_feedback', {
    review_feedback: 'See <https://webflow.com/templates/submission-guidelines> and drop the `application/ld+json` block.',
  });

  // agent_review_feedback is internal-only (never emailed) — raw tags allowed.
  await client.updateVersionReview('rec_version_safe_feedback', {
    agent_review_feedback: 'Found <script type="application/ld+json"> on all 18 pages via sandbox crawl.',
  });
});

test('listFeaturedCandidates filters to the remaining-eligible pool and summarizes it', async () => {
  const capturedFormulas: string[] = [];
  const now = new Date();
  const pastMonthDate = new Date(now.getTime() - 40 * 24 * 60 * 60 * 1000).toISOString();
  const client = new AirtableClient({
    apiKey: 'test',
    fetchFn: async (input) => {
      const url = new URL(String(input));
      if (url.pathname.includes(`/${TABLE_IDS.assetVotingState}`)) {
        return jsonResponse({
          records: [
            {
              id: 'rec_state_ald',
              fields: { '👍 count': 3, '👎 count': 1, 'Net votes': 2, 'In qualified pool?': 1 },
            },
          ],
        });
      }
      if (!url.pathname.includes(`/${TABLE_IDS.assets}`)) {
        throw new Error(`Unexpected fetch: ${url.toString()}`);
      }
      capturedFormulas.push(url.searchParams.get('filterByFormula') ?? '');
      return jsonResponse({
        records: [
          {
            id: 'rec_candidate_past',
            createdTime: pastMonthDate,
            fields: {
              [CONFIRMED_ASSET_FIELDS.name]: 'Alderas',
              [CONFIRMED_ASSET_FIELDS.websiteUrl]: 'https://alderas.webflow.io',
              [CONFIRMED_ASSET_FIELDS.submittedDate]: pastMonthDate,
              [CONFIRMED_ASSET_FIELDS.qualityScore]: ['🥇Exceptional'],
              [CONFIRMED_ASSET_FIELDS.categoryNames]: ['Business', 'Agency'],
              [FEATURED_ASSET_FIELDS.creatorLink]: ['rec_creator_radiant'],
              [FEATURED_ASSET_FIELDS.creatorName]: 'Radiant Templates',
              [FEATURED_ASSET_FIELDS.creatorTimesFeatured]: [22],
              [FEATURED_ASSET_FIELDS.reviewerPick]: true,
              [FEATURED_ASSET_FIELDS.reviewerPickReason]: 'Strong layout system for agency sites.',
              [FEATURED_ASSET_FIELDS.votingStateLink]: ['rec_state_ald'],
            },
          },
          {
            id: 'rec_candidate_current',
            createdTime: now.toISOString(),
            fields: {
              [CONFIRMED_ASSET_FIELDS.name]: 'Brokerwise',
              [CONFIRMED_ASSET_FIELDS.submittedDate]: now.toISOString(),
              [CONFIRMED_ASSET_FIELDS.qualityScore]: ['🥇Exceptional'],
              [CONFIRMED_ASSET_FIELDS.categoryNames]: ['Business'],
              [FEATURED_ASSET_FIELDS.creatorLink]: ['rec_creator_grabui'],
              [FEATURED_ASSET_FIELDS.creatorName]: 'Grabui Library',
              [FEATURED_ASSET_FIELDS.creatorTimesFeatured]: [4],
            },
          },
        ],
      });
    },
  });

  const result = await client.listFeaturedCandidates();

  const formula = capturedFormulas[0] ?? '';
  assert.ok(formula.includes(`{${FEATURED_ASSET_FIELDS.isEligibleForUpcomingFeatured}} = 1`));
  assert.ok(formula.includes(`DATETIME_DIFF(TODAY(), {${CONFIRMED_ASSET_FIELDS.submittedDate}}, 'months') <= 1`));
  assert.ok(formula.includes(`NOT({${FEATURED_ASSET_FIELDS.isFeatured}})`));

  assert.equal(result.monthsBackApplied, 1);
  assert.equal(result.includeAlreadyFeaturedApplied, false);
  assert.equal(result.summary.templatesAvailable, 2);
  assert.equal(result.summary.creatorsAvailable, 2);
  assert.equal(result.summary.currentMonthCount, 1);
  assert.equal(result.summary.pastMonthsCount, 1);
  assert.equal(result.summary.reviewerPicksMade, 1);
  assert.equal(result.summary.pickReasonsWritten, 1);
  assert.deepEqual(result.summary.categoryCounts, { Business: 2, Agency: 1 });

  // Current-month submissions sort ahead of past-month fallback candidates.
  assert.equal(result.candidates[0]?.templateName, 'Brokerwise');
  assert.equal(result.candidates[0]?.monthsSinceSubmission, 0);
  assert.equal(result.candidates[1]?.templateName, 'Alderas');
  assert.equal(result.candidates[1]?.monthsSinceSubmission, 1);
  assert.equal(result.candidates[1]?.creatorTimesFeatured, 22);
  assert.deepEqual(result.candidates[1]?.categories, ['Business', 'Agency']);
  assert.equal(result.candidates[1]?.reviewerPick, true);
  assert.equal(result.candidates[0]?.reviewerPick, false);

  // Read-only vote state joins onto candidates so the coordinator can judge
  // batch readiness without mutating anything.
  assert.equal(result.candidates[1]?.votingStateId, 'rec_state_ald');
  assert.deepEqual(result.candidates[1]?.voteTallies, { up: 3, down: 1, net: 2, inQualifiedPool: true });
  assert.equal(result.candidates[0]?.voteTallies, undefined);
});

test('listFeaturedCandidates keeps already-featured templates only when asked', async () => {
  const capturedFormulas: string[] = [];
  const client = new AirtableClient({
    apiKey: 'test',
    fetchFn: async (input) => {
      const url = new URL(String(input));
      capturedFormulas.push(url.searchParams.get('filterByFormula') ?? '');
      return jsonResponse({ records: [] });
    },
  });

  await client.listFeaturedCandidates({ includeAlreadyFeatured: true, monthsBack: 0 });

  const formula = capturedFormulas[0] ?? '';
  assert.ok(!formula.includes(`NOT({${FEATURED_ASSET_FIELDS.isFeatured}})`));
  assert.ok(formula.includes(`DATETIME_DIFF(TODAY(), {${CONFIRMED_ASSET_FIELDS.submittedDate}}, 'months') <= 0`));
});

test('setFeaturedPick stages drafts by field ID and surfaces style warnings', async () => {
  const patches: Array<{ path: string; body: Record<string, unknown> }> = [];
  const assetFields = {
    [CONFIRMED_ASSET_FIELDS.type]: 'Template🏗️',
    [CONFIRMED_ASSET_FIELDS.name]: 'Brokerwise',
    [FEATURED_ASSET_FIELDS.isEligibleForUpcomingFeatured]: 1,
  };
  const client = new AirtableClient({
    apiKey: 'test',
    fetchFn: async (input, init) => {
      const url = new URL(String(input));
      if (init?.method === 'PATCH') {
        patches.push({ path: url.pathname, body: JSON.parse(String(init.body)) as Record<string, unknown> });
        return jsonResponse({
          id: 'rec_asset_pick',
          fields: { ...assetFields, [FEATURED_ASSET_FIELDS.reviewerPick]: true, [FEATURED_ASSET_FIELDS.reviewerPickReasonAiDraft]: 'Short draft.' },
        });
      }
      return jsonResponse({ id: 'rec_asset_pick', fields: assetFields });
    },
  });

  const result = await client.setFeaturedPick('rec_asset_pick', {
    reviewer_pick: true,
    pick_reason_draft: 'Short draft.',
  });

  assert.equal(patches.length, 1);
  const patchedFields = (patches[0]?.body as { fields: Record<string, unknown> }).fields;
  assert.deepEqual(Object.keys(patchedFields).sort(), [FEATURED_ASSET_FIELD_IDS.reviewerPick, FEATURED_ASSET_FIELD_IDS.reviewerPickReasonAiDraft].sort());
  assert.equal(result.candidate.reviewerPick, true);
  assert.ok(result.warnings.some((warning) => warning.startsWith('pick_reason_short')));
  assert.ok(result.warnings.some((warning) => warning.startsWith('pick_without_live_reason')));
});

test('setFeaturedPick rejects raw HTML in the live creator-facing reason', async () => {
  const client = new AirtableClient({
    apiKey: 'test',
    fetchFn: async () => {
      throw new Error('No fetch expected — validation happens before any request.');
    },
  });

  await assert.rejects(
    client.setFeaturedPick('rec_asset', { pick_reason: 'Uses <script type="application/ld+json"> markup nicely.' }),
    (error: Error & { code?: string }) => error.code === 'RAW_HTML_IN_PICK_REASON',
  );
});

test('castFeaturedVote creates voting state when missing and upserts the reviewer vote', async () => {
  const creates: Array<{ path: string; body: Record<string, unknown> }> = [];
  const assetFields = {
    [CONFIRMED_ASSET_FIELDS.type]: 'Template🏗️',
    [CONFIRMED_ASSET_FIELDS.name]: 'Alderas',
  };
  const client = new AirtableClient({
    apiKey: 'test',
    fetchFn: async (input, init) => {
      const url = new URL(String(input));
      if (init?.method === 'POST') {
        const body = JSON.parse(String(init.body)) as Record<string, unknown>;
        creates.push({ path: url.pathname, body });
        if (url.pathname.endsWith(`/${TABLE_IDS.assetVotingState}`)) {
          return jsonResponse({ id: 'rec_state_new', fields: body.fields as Record<string, unknown> });
        }
        return jsonResponse({ id: 'rec_vote_new', fields: body.fields as Record<string, unknown> });
      }
      if (url.pathname.endsWith('/rec_asset_vote')) {
        return jsonResponse({ id: 'rec_asset_vote', fields: assetFields });
      }
      if (url.pathname.endsWith('/rec_state_new')) {
        return jsonResponse({
          id: 'rec_state_new',
          fields: { '👍 count': 1, '👎 count': 0, 'Net votes': 1, 'In qualified pool?': 1 },
        });
      }
      throw new Error(`Unexpected fetch: ${url.toString()}`);
    },
  });

  const result = await client.castFeaturedVote('rec_asset_vote', { vote: 'up', note: 'Strong pick.' }, ericReviewer);

  assert.equal(creates.length, 2);
  const voteFields = (creates[1]?.body as { fields: Record<string, unknown> }).fields;
  assert.deepEqual(voteFields['Reviewer'], { id: ericReviewer.id });
  assert.equal(voteFields['Vote'], '👍 Up');
  assert.equal(result.action, 'created');
  assert.equal(result.votingStateId, 'rec_state_new');
  assert.deepEqual(result.tallies, { up: 1, down: 0, net: 1, inQualifiedPool: true });
});

test('castFeaturedVote updates an existing vote instead of double-counting', async () => {
  const patches: string[] = [];
  const client = new AirtableClient({
    apiKey: 'test',
    fetchFn: async (input, init) => {
      const url = new URL(String(input));
      if (init?.method === 'PATCH') {
        patches.push(url.pathname);
        return jsonResponse({ id: 'rec_vote_existing', fields: { Vote: '👎 Down', Note: 'Changed my mind.' } });
      }
      if (init?.method === 'POST') {
        throw new Error('No create expected when the reviewer already voted.');
      }
      if (url.pathname.endsWith('/rec_asset_vote2')) {
        return jsonResponse({
          id: 'rec_asset_vote2',
          fields: {
            [CONFIRMED_ASSET_FIELDS.type]: 'Template🏗️',
            [CONFIRMED_ASSET_FIELDS.name]: 'Nevio',
            ['🏗️Voting State']: ['rec_state_existing'],
          },
        });
      }
      if (url.pathname.endsWith('/rec_state_existing')) {
        return jsonResponse({
          id: 'rec_state_existing',
          fields: { '🗳️Votes': ['rec_vote_existing'], '👍 count': 0, '👎 count': 1, 'Net votes': -1, 'In qualified pool?': 0 },
        });
      }
      if (url.pathname.endsWith(`/${TABLE_IDS.reviewerVotes}`)) {
        return jsonResponse({
          records: [{ id: 'rec_vote_existing', fields: { Reviewer: { id: ericReviewer.id }, Vote: '👍 Up' } }],
        });
      }
      throw new Error(`Unexpected fetch: ${url.toString()}`);
    },
  });

  const result = await client.castFeaturedVote('rec_asset_vote2', { vote: 'down', note: 'Changed my mind.' }, ericReviewer);

  assert.deepEqual(patches, [`/v0/appMoIgXMTTTNIc3p/${TABLE_IDS.reviewerVotes}/rec_vote_existing`]);
  assert.equal(result.action, 'updated');
  assert.equal(result.vote, '👎 Down');
});

test('setFeaturedFlag writes the checkbox by field ID and reports the armed period', async () => {
  const patches: Array<Record<string, unknown>> = [];
  const reason = 'Brokerwise stands out for its confident financial-services layout system and clear conversion paths, making it a strong fit for brokerages and advisory firms that want an authoritative online presence with an obvious enquiry path for prospective clients.';
  const client = new AirtableClient({
    apiKey: 'test',
    fetchFn: async (input, init) => {
      const url = new URL(String(input));
      if (init?.method === 'PATCH') {
        patches.push(JSON.parse(String(init.body)) as Record<string, unknown>);
        return jsonResponse({
          id: 'rec_asset_flag',
          fields: {
            [CONFIRMED_ASSET_FIELDS.type]: 'Template🏗️',
            [CONFIRMED_ASSET_FIELDS.name]: 'Brokerwise',
            [FEATURED_ASSET_FIELDS.isFeatured]: true,
            [FEATURED_ASSET_FIELDS.isFeaturedPeriod]: '2026-09-01',
            [FEATURED_ASSET_FIELDS.isEligibleForUpcomingFeatured]: 1,
            [FEATURED_ASSET_FIELDS.reviewerPickReason]: reason,
          },
        });
      }
      if (url.pathname.endsWith('/rec_state_flag')) {
        return jsonResponse({ id: 'rec_state_flag', fields: { 'In qualified pool?': 1 } });
      }
      return jsonResponse({
        id: 'rec_asset_flag',
        fields: {
          [CONFIRMED_ASSET_FIELDS.type]: 'Template🏗️',
          [CONFIRMED_ASSET_FIELDS.name]: 'Brokerwise',
          [FEATURED_ASSET_FIELDS.reviewerPickReason]: reason,
          [FEATURED_ASSET_FIELDS.reviewerPick]: true,
          [FEATURED_ASSET_FIELDS.isEligibleForUpcomingFeatured]: 1,
          ['🏗️Voting State']: ['rec_state_flag'],
        },
      });
    },
  });

  const result = await client.setFeaturedFlag('rec_asset_flag', true);

  assert.deepEqual((patches[0] as { fields: Record<string, unknown> }).fields, { [FEATURED_ASSET_FIELD_IDS.isFeatured]: true });
  assert.equal(result.isFeatured, true);
  assert.equal(result.featuredPeriod, '2026-09-01');
  assert.deepEqual(result.warnings, []);
});

test('setFeaturedFlag rejects featuring before any write when the live pick reason is empty', async () => {
  let patched = false;
  const client = new AirtableClient({
    apiKey: 'test',
    fetchFn: async (input, init) => {
      if (init?.method === 'PATCH') {
        patched = true;
        throw new Error('No PATCH expected — featuring must be rejected before the write.');
      }
      return jsonResponse({
        id: 'rec_asset_noreason',
        fields: { [CONFIRMED_ASSET_FIELDS.type]: 'Template🏗️', [CONFIRMED_ASSET_FIELDS.name]: 'Vesper' },
      });
    },
  });

  await assert.rejects(
    client.setFeaturedFlag('rec_asset_noreason', true),
    (error: Error & { code?: string }) => error.code === 'MISSING_PICK_REASON',
  );
  assert.equal(patched, false);

  // Unchecking (the abort path) never requires a reason.
  const unflagClient = new AirtableClient({
    apiKey: 'test',
    fetchFn: async (input, init) => {
      if (init?.method === 'PATCH') {
        return jsonResponse({
          id: 'rec_asset_noreason',
          fields: { [CONFIRMED_ASSET_FIELDS.type]: 'Template🏗️', [CONFIRMED_ASSET_FIELDS.name]: 'Vesper', [FEATURED_ASSET_FIELDS.isFeatured]: false },
        });
      }
      return jsonResponse({
        id: 'rec_asset_noreason',
        fields: { [CONFIRMED_ASSET_FIELDS.type]: 'Template🏗️', [CONFIRMED_ASSET_FIELDS.name]: 'Vesper' },
      });
    },
  });
  const reverted = await unflagClient.setFeaturedFlag('rec_asset_noreason', false);
  assert.equal(reverted.isFeatured, false);
});

test('castFeaturedVote self-heals duplicate votes onto a deterministic keeper', async () => {
  const deleted: string[] = [];
  const patchedIds: string[] = [];
  let stateReads = 0;
  const client = new AirtableClient({
    apiKey: 'test',
    fetchFn: async (input, init) => {
      const url = new URL(String(input));
      if (init?.method === 'POST') {
        return jsonResponse({ id: 'rec_vote_zz', fields: { Vote: '👍 Up' } });
      }
      if (init?.method === 'PATCH') {
        const id = url.pathname.split('/').pop() ?? '';
        patchedIds.push(id);
        return jsonResponse({ id, fields: { Vote: '👍 Up' } });
      }
      if (init?.method === 'DELETE') {
        deleted.push(url.pathname.split('/').pop() ?? '');
        return jsonResponse({ deleted: true });
      }
      if (url.pathname.endsWith('/rec_asset_dup')) {
        return jsonResponse({
          id: 'rec_asset_dup',
          fields: {
            [CONFIRMED_ASSET_FIELDS.type]: 'Template🏗️',
            [CONFIRMED_ASSET_FIELDS.name]: 'Mello',
            ['🏗️Voting State']: ['rec_state_dup'],
          },
        });
      }
      if (url.pathname.endsWith('/rec_state_dup')) {
        stateReads += 1;
        // 1st read (pre-create ownVote check): no votes visible yet → create path.
        // 2nd read (reconciliation): the race is now visible — two votes exist.
        // 3rd read (tallies): healed counts.
        if (stateReads === 1) return jsonResponse({ id: 'rec_state_dup', fields: { '🗳️Votes': [] } });
        return jsonResponse({
          id: 'rec_state_dup',
          fields: { '🗳️Votes': ['rec_vote_aa', 'rec_vote_zz'], '👍 count': 1, '👎 count': 0, 'Net votes': 1, 'In qualified pool?': 1 },
        });
      }
      if (url.pathname.endsWith(`/${TABLE_IDS.reviewerVotes}`)) {
        return jsonResponse({
          records: [
            { id: 'rec_vote_aa', fields: { Reviewer: { id: ericReviewer.id }, Vote: '👍 Up' } },
            { id: 'rec_vote_zz', fields: { Reviewer: { id: ericReviewer.id }, Vote: '👍 Up' } },
          ],
        });
      }
      throw new Error(`Unexpected fetch: ${url.toString()}`);
    },
  });

  const result = await client.castFeaturedVote('rec_asset_dup', { vote: 'up' }, ericReviewer);

  assert.deepEqual(patchedIds, ['rec_vote_aa']);
  assert.deepEqual(deleted, ['rec_vote_zz']);
  assert.equal(result.voteId, 'rec_vote_aa');
  assert.equal(result.action, 'updated');
});

test('castFeaturedVote merges duplicate voting states into a deterministic keeper before voting', async () => {
  const deleted: string[] = [];
  const relinked: Array<{ id: string; body: Record<string, unknown> }> = [];
  const client = new AirtableClient({
    apiKey: 'test',
    fetchFn: async (input, init) => {
      const url = new URL(String(input));
      const recordId = url.pathname.split('/').pop() ?? '';
      if (init?.method === 'DELETE') {
        deleted.push(recordId);
        return jsonResponse({ deleted: true });
      }
      if (init?.method === 'PATCH') {
        const body = JSON.parse(String(init.body)) as Record<string, unknown>;
        if (recordId === 'rec_vote_stray') {
          relinked.push({ id: recordId, body });
          return jsonResponse({ id: recordId, fields: {} });
        }
        return jsonResponse({ id: recordId, fields: { Vote: '👍 Up' } });
      }
      if (init?.method === 'POST') {
        return jsonResponse({ id: 'rec_vote_mine', fields: { Vote: '👍 Up' } });
      }
      if (recordId === 'rec_asset_split') {
        return jsonResponse({
          id: 'rec_asset_split',
          fields: {
            [CONFIRMED_ASSET_FIELDS.type]: 'Template🏗️',
            [CONFIRMED_ASSET_FIELDS.name]: 'Fluexa',
            ['🏗️Voting State']: ['rec_state_b', 'rec_state_a'],
          },
        });
      }
      if (recordId === 'rec_state_b') {
        return jsonResponse({ id: 'rec_state_b', fields: { '🗳️Votes': ['rec_vote_stray'] } });
      }
      if (recordId === 'rec_state_a') {
        return jsonResponse({
          id: 'rec_state_a',
          fields: { '🗳️Votes': [], '👍 count': 2, '👎 count': 0, 'Net votes': 2, 'In qualified pool?': 1 },
        });
      }
      if (url.pathname.endsWith(`/${TABLE_IDS.reviewerVotes}`)) {
        return jsonResponse({ records: [] });
      }
      throw new Error(`Unexpected fetch: ${url.toString()}`);
    },
  });

  const result = await client.castFeaturedVote('rec_asset_split', { vote: 'up' }, ericReviewer);

  // Keeper is the lexicographically lowest state id; the duplicate's stray
  // vote is re-linked onto it before the duplicate state is deleted.
  assert.equal(result.votingStateId, 'rec_state_a');
  assert.deepEqual(relinked, [{ id: 'rec_vote_stray', body: { fields: { 'Asset Voting State': ['rec_state_a'] } } }]);
  assert.deepEqual(deleted, ['rec_state_b']);
});

test('castFeaturedVote collapses same-reviewer duplicates on the update branch too', async () => {
  const deleted: string[] = [];
  const patchedIds: string[] = [];
  const client = new AirtableClient({
    apiKey: 'test',
    fetchFn: async (input, init) => {
      const url = new URL(String(input));
      const recordId = url.pathname.split('/').pop() ?? '';
      if (init?.method === 'DELETE') {
        deleted.push(recordId);
        return jsonResponse({ deleted: true });
      }
      if (init?.method === 'PATCH') {
        patchedIds.push(recordId);
        return jsonResponse({ id: recordId, fields: { Vote: '👎 Down' } });
      }
      if (init?.method === 'POST') {
        throw new Error('No create expected — the reviewer already has votes.');
      }
      if (recordId === 'rec_asset_merged') {
        return jsonResponse({
          id: 'rec_asset_merged',
          fields: {
            [CONFIRMED_ASSET_FIELDS.type]: 'Template🏗️',
            [CONFIRMED_ASSET_FIELDS.name]: 'Ardor',
            ['🏗️Voting State']: ['rec_state_m'],
          },
        });
      }
      if (recordId === 'rec_state_m') {
        return jsonResponse({
          id: 'rec_state_m',
          fields: { '🗳️Votes': ['rec_vote_aa', 'rec_vote_zz'], '👍 count': 0, '👎 count': 1, 'Net votes': -1, 'In qualified pool?': 0 },
        });
      }
      if (url.pathname.endsWith(`/${TABLE_IDS.reviewerVotes}`)) {
        return jsonResponse({
          records: [
            { id: 'rec_vote_aa', fields: { Reviewer: { id: ericReviewer.id }, Vote: '👍 Up' } },
            { id: 'rec_vote_zz', fields: { Reviewer: { id: ericReviewer.id }, Vote: '👍 Up' } },
          ],
        });
      }
      throw new Error(`Unexpected fetch: ${url.toString()}`);
    },
  });

  const result = await client.castFeaturedVote('rec_asset_merged', { vote: 'down' }, ericReviewer);

  // ownVote (rec_vote_aa) is updated, then reconciliation deletes the merged
  // duplicate — no double count survives even though no create happened.
  assert.deepEqual(patchedIds, ['rec_vote_aa']);
  assert.deepEqual(deleted, ['rec_vote_zz']);
  assert.equal(result.voteId, 'rec_vote_aa');
  assert.equal(result.action, 'updated');
});

test('setFeaturedFlag rejects unmet selection state unless deliberately overridden', async () => {
  let patched = false;
  const makeFetch = () => async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input));
    if (init?.method === 'PATCH') {
      patched = true;
      return jsonResponse({
        id: 'rec_asset_unqualified',
        fields: {
          [CONFIRMED_ASSET_FIELDS.type]: 'Template🏗️',
          [CONFIRMED_ASSET_FIELDS.name]: 'Stotage',
          [FEATURED_ASSET_FIELDS.isFeatured]: true,
          [FEATURED_ASSET_FIELDS.isFeaturedPeriod]: '2026-09-01',
        },
      });
    }
    // Pre-read: has a live reason but no star, ineligible, and no voting state.
    return jsonResponse({
      id: 'rec_asset_unqualified',
      fields: {
        [CONFIRMED_ASSET_FIELDS.type]: 'Template🏗️',
        [CONFIRMED_ASSET_FIELDS.name]: 'Stotage',
        [FEATURED_ASSET_FIELDS.reviewerPickReason]: 'A perfectly buyer-safe reason of reasonable length for the purposes of this test, written in third-person marketplace prose and describing what makes the template stand out for its audience and use case in enough detail.',
      },
    });
  };

  const client = new AirtableClient({ apiKey: 'test', fetchFn: makeFetch() });
  await assert.rejects(
    client.setFeaturedFlag('rec_asset_unqualified', true),
    (error: Error & { code?: string; details?: { unmet?: string[] } }) => {
      assert.equal(error.code, 'SELECTION_CHECKS_UNMET');
      assert.equal(error.details?.unmet?.length, 3);
      return true;
    },
  );
  assert.equal(patched, false);

  const overrideClient = new AirtableClient({ apiKey: 'test', fetchFn: makeFetch() });
  const result = await overrideClient.setFeaturedFlag('rec_asset_unqualified', true, { overrideSelectionChecks: true });
  assert.equal(patched, true);
  assert.equal(result.isFeatured, true);
  assert.equal(result.overriddenChecks?.length, 3);
});
