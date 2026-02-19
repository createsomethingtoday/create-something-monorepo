import { describe, expect, it } from 'vitest';

import { AirtableClient, ensureWritableFields } from '../src/airtable.js';
import { validateBearerAuth } from '../src/auth.js';
import {
  ASSET_FIELDS,
  STATUS_ENUMS,
  assertAllowedTableId,
  assertEnumValue,
  isTemplateScopedAssetFields,
} from '../src/schema.js';
import { detectReadOnlyWriteAttempts } from '../src/tools.js';

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
    expect(() => assertAllowedTableId('tblHxZ2hgSFLZxsZu')).not.toThrow();
  });

  it('detects template-only scope from template marker fields', () => {
    expect(
      isTemplateScopedAssetFields({
        [ASSET_FIELDS.typeText]: 'Template🏗️',
      }),
    ).toBe(true);

    expect(
      isTemplateScopedAssetFields({
        [ASSET_FIELDS.typeText]: 'App🖥️',
        [ASSET_FIELDS.typeCms]: false,
        [ASSET_FIELDS.typeEcommerce]: false,
        [ASSET_FIELDS.typeMultiLayout]: false,
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
        [ASSET_FIELDS.latestReviewStatus]: ['✅Approved'],
      }),
    ).toThrow();
  });

  it('validates enum values for review statuses and quality rating', () => {
    expect(() =>
      assertEnumValue('🏃🏾In Review', STATUS_ENUMS.reviewStatus, 'review_status'),
    ).not.toThrow();

    expect(() =>
      assertEnumValue('✅Good', STATUS_ENUMS.qualityRating, 'quality_rating'),
    ).not.toThrow();

    expect(() =>
      assertEnumValue('NOT_A_STATUS', STATUS_ENUMS.reviewStatus, 'review_status'),
    ).toThrow();
  });
});

describe('computed field write protection', () => {
  it('flags direct writes to read-only derived fields', () => {
    const rejected = detectReadOnlyWriteAttempts({
      asset_id: 'rec123',
      latest_review_status: '✅Approved',
      days_in_current_review_stage: 2,
      release_date: '2026-02-19',
    });

    expect(rejected).toEqual([
      'latest_review_status',
      'days_in_current_review_stage',
      'release_date',
    ]);
  });

  it('returns empty list when only writable fields are provided', () => {
    const rejected = detectReadOnlyWriteAttempts({
      asset_id: 'rec123',
      marketplace_status: '3️⃣Published🚀',
      mrp_id_overwrite: 'MRP-123',
    });

    expect(rejected).toEqual([]);
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
