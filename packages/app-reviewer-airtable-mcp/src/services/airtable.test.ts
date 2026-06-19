import assert from 'node:assert/strict';
import test from 'node:test';

import { AirtableClient } from './airtable.js';
import { FIELD_IDS, TABLE_IDS } from '../schemas/index.js';

function makeClient(fetchFn: typeof fetch) {
  return new AirtableClient({
    tokenProvider: { getAccessToken: async () => 'test-token' },
    baseId: 'appTestBase',
    fetchFn,
    sleepFn: async () => {},
    maxRetries: 0,
  });
}

test('listAssets projects summary fields and returns the Airtable cursor', async () => {
  const seen: URL[] = [];
  const client = makeClient(async (input) => {
    seen.push(new URL(String(input)));
    return Response.json({
      records: [
        {
          id: 'recAsset1',
          createdTime: '2026-06-19T00:00:00.000Z',
          fields: {
            [FIELD_IDS.assets.name]: 'Example App',
            [FIELD_IDS.assets.appId]: 'app_123',
            [FIELD_IDS.assets.credentials]: 'hidden',
          },
        },
      ],
      offset: 'itrNext',
    });
  });

  const page = await client.listAssets({ limit: 10 });

  assert.equal(page.nextOffset, 'itrNext');
  assert.equal(page.records[0]?.fields.appName, 'Example App');
  assert.equal(page.records[0]?.fields.credentials, undefined);
  assert.equal(seen[0]?.pathname, `/v0/appTestBase/${TABLE_IDS.assets}`);
  assert.equal(seen[0]?.searchParams.get('returnFieldsByFieldId'), 'true');
  assert.equal(seen[0]?.searchParams.get('pageSize'), '10');
  assert.equal(seen[0]?.searchParams.has('maxRecords'), false);
  assert.ok(seen[0]?.searchParams.getAll('fields[]').includes(FIELD_IDS.assets.name));
  assert.ok(!seen[0]?.searchParams.getAll('fields[]').includes(FIELD_IDS.assets.credentials));
});

test('listAssets includes sensitive projection only when requested', async () => {
  const seen: URL[] = [];
  const client = makeClient(async (input) => {
    seen.push(new URL(String(input)));
    return Response.json({ records: [] });
  });

  await client.listAssets({ preset: 'sensitive', includeSensitive: true, limit: 1 });

  assert.ok(seen[0]?.searchParams.getAll('fields[]').includes(FIELD_IDS.assets.credentials));
});

test('listVersions filters by asset id and clamps page size to 100', async () => {
  const seen: URL[] = [];
  const client = makeClient(async (input) => {
    seen.push(new URL(String(input)));
    return Response.json({
      records: [
        {
          id: 'recVersion1',
          fields: {
            [FIELD_IDS.versions.versionNumber]: 7,
            [FIELD_IDS.versions.assetRecordIdRollup]: ['recAsset1'],
          },
        },
      ],
    });
  });

  const page = await client.listVersions({ assetId: 'recAsset1', limit: 500 });

  assert.equal(page.records[0]?.assetId, 'recAsset1');
  assert.equal(seen[0]?.pathname, `/v0/appTestBase/${TABLE_IDS.assetVersions}`);
  assert.equal(seen[0]?.searchParams.get('pageSize'), '100');
  assert.match(seen[0]?.searchParams.get('filterByFormula') ?? '', /recAsset1/);
});
