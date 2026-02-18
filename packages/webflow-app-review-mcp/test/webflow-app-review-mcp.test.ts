import { describe, expect, it } from 'vitest';

import { AirtableClient, ensureWritableFields } from '../src/airtable.js';
import { validateBearerAuth } from '../src/auth.js';
import {
  ASSET_FIELDS,
  STATUS_ENUMS,
  assertAllowedTableId,
  assertEnumValue,
  isAppScopedAssetFields,
} from '../src/schema.js';
import { planComputedFieldWriteRouting } from '../src/tools.js';

describe('worker bearer auth', () => {
  const baseEnv = {
    MCP_API_KEY: 'secret-token',
  };

  it('returns 401 when Authorization header is missing', () => {
    const request = new Request('https://example.com/mcp');
    const result = validateBearerAuth(request, baseEnv);
    expect(result).not.toBeNull();
    expect(result?.status).toBe(401);
  });

  it('returns 401 for invalid bearer token', () => {
    const request = new Request('https://example.com/mcp', {
      headers: { Authorization: 'Bearer wrong-token' },
    });
    const result = validateBearerAuth(request, baseEnv);
    expect(result).not.toBeNull();
    expect(result?.status).toBe(401);
  });

  it('returns null for valid bearer token', () => {
    const request = new Request('https://example.com/mcp', {
      headers: { Authorization: 'Bearer secret-token' },
    });
    const result = validateBearerAuth(request, baseEnv);
    expect(result).toBeNull();
  });

  it('returns 500 when MCP_API_KEY is not configured', () => {
    const request = new Request('https://example.com/mcp', {
      headers: { Authorization: 'Bearer anything' },
    });
    const result = validateBearerAuth(request, {});
    expect(result).not.toBeNull();
    expect(result?.status).toBe(500);
  });
});

describe('schema guards', () => {
  it('rejects table IDs outside Assets + Asset Versions scope', () => {
    expect(() => assertAllowedTableId('tblInvalid123')).toThrow();
    expect(() => assertAllowedTableId('tblRwzpWoLgE9MrUm')).not.toThrow();
  });

  it('detects apps-only scope from app marker fields', () => {
    expect(
      isAppScopedAssetFields({
        [ASSET_FIELDS.capabilities]: 'Designer Extension',
      }),
    ).toBe(true);

    expect(
      isAppScopedAssetFields({
        [ASSET_FIELDS.capabilities]: '',
        [ASSET_FIELDS.clientId]: '',
        [ASSET_FIELDS.appId]: [],
        [ASSET_FIELDS.visibility]: '',
      }),
    ).toBe(false);
  });

  it('enforces writable field allowlist', () => {
    expect(() =>
      ensureWritableFields('assets', {
        [ASSET_FIELDS.marketplaceStatus]: '3️⃣Published🚀',
      }),
    ).not.toThrow();

    expect(() =>
      ensureWritableFields('assets', {
        [ASSET_FIELDS.latestReviewStatus]: '✅Approved',
      }),
    ).toThrow();
  });

  it('validates enum values for review and marketplace statuses', () => {
    expect(() =>
      assertEnumValue('3️⃣Published🚀', STATUS_ENUMS.marketplaceStatus, 'marketplace_status'),
    ).not.toThrow();

    expect(() => assertEnumValue('NOT_A_STATUS', STATUS_ENUMS.reviewStatus, 'review_status')).toThrow();
  });
});

describe('computed field routing', () => {
  it('rejects direct writes to non-routable computed fields', () => {
    const plan = planComputedFieldWriteRouting({
      asset_id: 'rec123',
      days_in_current_review_stage: 5,
    });

    expect(plan.shouldRouteToVersion).toBe(false);
    expect(plan.rejectedComputedFields).toContain('days_in_current_review_stage');
  });

  it('routes review-state writes to version fields', () => {
    const plan = planComputedFieldWriteRouting({
      asset_id: 'rec123',
      latest_review_status: '✅Approved',
    });

    expect(plan.rejectedComputedFields).toHaveLength(0);
    expect(plan.shouldRouteToVersion).toBe(true);
  });
});

describe('airtable retry behavior', () => {
  it('retries on 429 and succeeds within retry budget', async () => {
    let attempts = 0;
    const sleepCalls: number[] = [];

    const fetchImpl: typeof fetch = async () => {
      attempts += 1;
      if (attempts <= 2) {
        return new Response(JSON.stringify({ error: { message: 'rate limited' } }), {
          status: 429,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ records: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    };

    const client = new AirtableClient({
      apiKey: 'pat-test',
      fetchImpl,
      sleepMs: async (ms) => {
        sleepCalls.push(ms);
      },
    });

    const response = await client.listRecords('assets', { pageSize: 1 });

    expect(response.records).toEqual([]);
    expect(attempts).toBe(3);
    expect(sleepCalls.length).toBe(2);
  });
});
