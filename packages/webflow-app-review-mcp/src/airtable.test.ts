import { describe, expect, it, vi } from 'vitest';

import { AirtableClient, AirtableClientError, assertScopedTable } from './airtable.js';
import { FIELD_IDS, VIEW_IDS } from './schema.js';

describe('AirtableClient scope and validation', () => {
  it('enforces scoped table IDs', () => {
    expect(() => assertScopedTable('tblRwzpWoLgE9MrUm')).not.toThrow();
    expect(() => assertScopedTable('tblInvalidTable')).toThrowError(AirtableClientError);
  });

  it('rejects unsupported asset metadata keys', async () => {
    const fetchFn = vi.fn();
    const client = new AirtableClient({
      apiKey: 'token',
      fetchFn,
    });

    await expect(
      client.updateAssetMetadata('recAsset', { unknown_key: 'value' }),
    ).rejects.toMatchObject({ code: 'INVALID_ASSET_FIELDS' });
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('rejects read-only asset metadata keys', async () => {
    const fetchFn = vi.fn();
    const client = new AirtableClient({
      apiKey: 'token',
      fetchFn,
    });

    await expect(
      client.updateAssetMetadata('recAsset', { latest_review_status: '✅Approved' }),
    ).rejects.toMatchObject({ code: 'READ_ONLY_ASSET_FIELDS' });
    expect(fetchFn).not.toHaveBeenCalled();
  });
});

describe('AirtableClient retry behavior', () => {
  it('retries retryable status codes with backoff and succeeds', async () => {
    const sleeps: number[] = [];
    let callCount = 0;

    const fetchFn = vi.fn(async () => {
      callCount += 1;
      if (callCount === 1) return new Response('rate limited', { status: 429 });
      if (callCount === 2) return new Response('upstream error', { status: 503 });
      return new Response(
        JSON.stringify({
          records: [{ id: 'rec1', fields: { fldUzJBor3Gnkykjc: 'App One' } }],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    });

    const client = new AirtableClient({
      apiKey: 'token',
      fetchFn,
      sleepFn: async (ms) => {
        sleeps.push(ms);
      },
      maxRetries: 3,
    });

    const health = await client.healthCheck();
    expect(health.ok).toBe(true);
    expect(callCount).toBe(3);
    expect(sleeps.length).toBe(2);
    expect(sleeps[0]).toBeGreaterThan(0);
  });
});

describe('AirtableClient related-asset cleanup', () => {
  const sourceRecords = {
    records: [
      {
        id: 'recAssetA',
        fields: {
          [FIELD_IDS.assets.relatedAssets]: ['recLinkedArchivedStatus', 'recLinkedArchivedName', 'recLinkedKeep'],
        },
      },
      {
        id: 'recAssetB',
        fields: {
          [FIELD_IDS.assets.relatedAssets]: ['recLinkedArchivedName'],
        },
      },
      {
        id: 'recAssetC',
        fields: {},
      },
    ],
  };

  const linkedRecords = {
    records: [
      {
        id: 'recLinkedArchivedStatus',
        fields: {
          [FIELD_IDS.assets.lifecycleStatus]: 'Archived',
          [FIELD_IDS.assets.name]: 'Legacy Connector',
        },
      },
      {
        id: 'recLinkedArchivedName',
        fields: {
          [FIELD_IDS.assets.lifecycleStatus]: 'Published',
          [FIELD_IDS.assets.name]: 'Archived Template Snapshot',
        },
      },
      {
        id: 'recLinkedKeep',
        fields: {
          [FIELD_IDS.assets.lifecycleStatus]: 'Published',
          [FIELD_IDS.assets.name]: 'Current Template',
        },
      },
    ],
  };

  it('supports dry-run cleanup with view scoping and no mutation', async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify(sourceRecords), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(linkedRecords), { status: 200 }));

    const client = new AirtableClient({
      apiKey: 'token',
      fetchFn,
    });

    const result = await client.cleanupArchivedRelatedAssetLinks({
      dryRun: true,
      sampleLimit: 10,
    });

    expect(result).toMatchObject({
      dryRun: true,
      viewId: VIEW_IDS.assetsDailyAssetLinkCleanup,
      recordsScanned: 3,
      uniqueLinkedRecordsEvaluated: 3,
      recordsWithChanges: 2,
      recordsUpdated: 0,
      linksRemoved: 3,
      sampleUpdatedRecordIds: ['recAssetA', 'recAssetB'],
      removeReasons: {
        statusMatches: 1,
        nameMatches: 1,
        statusAndNameMatches: 0,
      },
    });

    expect(fetchFn).toHaveBeenCalledTimes(2);
    const firstRequestUrl = new URL(String(fetchFn.mock.calls[0]?.[0]));
    expect(firstRequestUrl.searchParams.get('view')).toBe(VIEW_IDS.assetsDailyAssetLinkCleanup);
  });

  it('applies cleanup updates in batches when dry_run is false', async () => {
    const patchBodies: Array<{ records: Array<{ id: string; fields: Record<string, unknown> }> }> = [];

    const fetchFn = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const method = init?.method ?? 'GET';
      const url = new URL(String(input));

      if (method === 'GET' && !url.searchParams.get('filterByFormula')) {
        return new Response(JSON.stringify(sourceRecords), { status: 200 });
      }
      if (method === 'GET' && url.searchParams.get('filterByFormula')) {
        return new Response(JSON.stringify(linkedRecords), { status: 200 });
      }
      if (method === 'PATCH') {
        const body = JSON.parse(String(init?.body)) as {
          records: Array<{ id: string; fields: Record<string, unknown> }>;
        };
        patchBodies.push(body);
        return new Response(JSON.stringify({ records: body.records }), { status: 200 });
      }

      return new Response('unexpected request', { status: 500 });
    });

    const client = new AirtableClient({
      apiKey: 'token',
      fetchFn,
    });

    const result = await client.cleanupArchivedRelatedAssetLinks({
      dryRun: false,
      sampleLimit: 10,
    });

    expect(result.recordsWithChanges).toBe(2);
    expect(result.recordsUpdated).toBe(2);
    expect(result.linksRemoved).toBe(3);
    expect(patchBodies).toHaveLength(1);
    expect(patchBodies[0]).toEqual({
      records: [
        {
          id: 'recAssetA',
          fields: {
            [FIELD_IDS.assets.relatedAssets]: ['recLinkedKeep'],
          },
        },
        {
          id: 'recAssetB',
          fields: {
            [FIELD_IDS.assets.relatedAssets]: [],
          },
        },
      ],
    });
  });
});
