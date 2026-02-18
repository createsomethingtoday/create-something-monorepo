import { describe, expect, it, vi } from 'vitest';

import { AirtableClient, AirtableClientError, assertScopedTable } from './airtable.js';

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

