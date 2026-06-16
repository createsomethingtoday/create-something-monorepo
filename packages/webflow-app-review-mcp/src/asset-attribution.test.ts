import { describe, expect, it, vi } from 'vitest';

import {
  ASSET_ATTRIBUTION_ERROR_STATUS,
  ASSET_ATTRIBUTION_FIELD_NAMES,
  ASSET_ATTRIBUTION_READY_STATUS,
  ASSET_ATTRIBUTION_REVIEW_TYPE,
  resolveAssetAttributionSubmittedAfter,
  runAssetAttributionSync
} from './asset-attribution.js';
import { FIELD_IDS, TABLE_IDS } from './schema.js';

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

function versionRecord(
  id: string,
  fields: Record<string, unknown>,
  createdTime = '2026-05-29T12:00:00.000Z'
) {
  return {
    id,
    createdTime,
    fields
  };
}

function targetFields(overrides?: Record<string, unknown>) {
  return {
    [ASSET_ATTRIBUTION_FIELD_NAMES.reviewStatus]: ASSET_ATTRIBUTION_ERROR_STATUS,
    [ASSET_ATTRIBUTION_FIELD_NAMES.reviewType]: ASSET_ATTRIBUTION_REVIEW_TYPE,
    [ASSET_ATTRIBUTION_FIELD_NAMES.tmpuid]: 'sato-video-player',
    [ASSET_ATTRIBUTION_FIELD_NAMES.appId]: 'app_123',
    [ASSET_ATTRIBUTION_FIELD_NAMES.workspaceId]: 'workspace_123',
    [ASSET_ATTRIBUTION_FIELD_NAMES.createdAt]: '2026-05-29T12:00:00.000Z',
    ...(overrides ?? {})
  };
}

describe('resolveAssetAttributionSubmittedAfter', () => {
  it('uses the later value between the rolling lookback and automation start', () => {
    expect(
      resolveAssetAttributionSubmittedAfter({
        now: new Date('2026-05-29T12:00:00.000Z'),
        lookbackHours: 72,
        startAt: '2026-05-29T00:00:00.000Z'
      }).toISOString()
    ).toBe('2026-05-29T00:00:00.000Z');

    expect(
      resolveAssetAttributionSubmittedAfter({
        now: new Date('2026-06-02T12:00:00.000Z'),
        lookbackHours: 72,
        startAt: '2026-05-29T00:00:00.000Z'
      }).toISOString()
    ).toBe('2026-05-30T12:00:00.000Z');
  });
});

describe('runAssetAttributionSync', () => {
  it('links recent missing Asset Update rows using exact prior version identity and marks them ready', async () => {
    const fetchFn = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(String(input));

      if (
        url.pathname.endsWith(`/${TABLE_IDS.assetVersions}`) &&
        (!init?.method || init.method === 'GET')
      ) {
        const formula = url.searchParams.get('filterByFormula') ?? '';
        if (formula.includes(ASSET_ATTRIBUTION_ERROR_STATUS)) {
          return jsonResponse({
            records: [versionRecord('rec-target', targetFields())]
          });
        }

        if (
          formula.includes('sato-video-player') &&
          formula.includes('app_123') &&
          formula.includes('workspace_123')
        ) {
          return jsonResponse({
            records: [
              versionRecord('rec-history-newer', {
                ...targetFields({
                  [ASSET_ATTRIBUTION_FIELD_NAMES.asset]: ['recAsset'],
                  [ASSET_ATTRIBUTION_FIELD_NAMES.createdAt]: '2026-05-29T11:00:00.000Z',
                  [ASSET_ATTRIBUTION_FIELD_NAMES.reviewStatus]: '✅Approved'
                })
              })
            ]
          });
        }
      }

      if (url.pathname.endsWith(`/${TABLE_IDS.assetVersions}`) && init?.method === 'PATCH') {
        return jsonResponse({ records: [{ id: 'rec-target', fields: {} }] });
      }

      return new Response('not found', { status: 404 });
    });

    const summary = await runAssetAttributionSync({
      apiKey: 'token',
      fetchFn,
      now: new Date('2026-05-29T12:30:00.000Z'),
      startAt: '2026-05-29T00:00:00.000Z'
    });

    expect(summary.updated).toBe(1);
    expect(summary.updates[0]).toMatchObject({
      assetId: 'recAsset',
      matchedFromVersionId: 'rec-history-newer',
      versionId: 'rec-target'
    });

    const patchCall = fetchFn.mock.calls.find(([, init]) => init?.method === 'PATCH');
    expect(patchCall).toBeDefined();
    const [, patchInit] = patchCall!;
    const payload = JSON.parse(String(patchInit?.body)) as {
      records: Array<{ id: string; fields: Record<string, unknown> }>;
    };
    expect(payload.records[0]?.fields).toEqual({
      [FIELD_IDS.versions.assetLink]: ['recAsset'],
      [FIELD_IDS.versions.reviewStatus]: ASSET_ATTRIBUTION_READY_STATUS
    });
  });

  it('skips recent rows when no exact attributed Asset Update history exists', async () => {
    const fetchFn = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(String(input));

      if (
        url.pathname.endsWith(`/${TABLE_IDS.assetVersions}`) &&
        (!init?.method || init.method === 'GET')
      ) {
        const formula = url.searchParams.get('filterByFormula') ?? '';
        if (formula.includes(ASSET_ATTRIBUTION_ERROR_STATUS)) {
          return jsonResponse({
            records: [
              versionRecord(
                'rec-target',
                targetFields({ [ASSET_ATTRIBUTION_FIELD_NAMES.tmpuid]: 'adobe-marketo-engage' })
              )
            ]
          });
        }

        return jsonResponse({ records: [] });
      }

      return new Response('not found', { status: 404 });
    });

    const summary = await runAssetAttributionSync({
      apiKey: 'token',
      fetchFn,
      now: new Date('2026-05-29T12:30:00.000Z'),
      startAt: '2026-05-29T00:00:00.000Z'
    });

    expect(summary.updated).toBe(0);
    expect(summary.skipped).toEqual([
      {
        appId: 'app_123',
        reason: 'no_exact_asset_version_match',
        tmpuid: 'adobe-marketo-engage',
        versionId: 'rec-target',
        workspaceId: 'workspace_123'
      }
    ]);
    expect(fetchFn.mock.calls.some(([, init]) => init?.method === 'PATCH')).toBe(false);
  });
});
