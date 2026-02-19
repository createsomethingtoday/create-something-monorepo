import { describe, it, expect } from 'vitest';

import { AirtableClient } from '../src/airtable.js';
import { APP_ASSET_TYPE, FIELD_IDS } from '../src/schema.js';

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function makeRecord(id, fields) {
  return { id, fields };
}

const TEMPLATE_ASSET_TYPE = 'Template🏗️';

describe('AirtableClient queue + lookup behavior', () => {
  it('applies queue limit after app-scope filtering', async () => {
    const fetchFn = async (input) => {
      const url = new URL(String(input));
      const offset = url.searchParams.get('offset');

      if (!offset) {
        return jsonResponse({
          records: [
            makeRecord('rec-non-app', {
              [FIELD_IDS.assets.name]: 'Non App Record',
              [FIELD_IDS.assets.type]: TEMPLATE_ASSET_TYPE,
              [FIELD_IDS.assets.visibility]: 'Public',
            }),
            makeRecord('rec-app-1', {
              [FIELD_IDS.assets.name]: 'App One',
              [FIELD_IDS.assets.type]: APP_ASSET_TYPE,
              [FIELD_IDS.assets.visibility]: 'Public',
            }),
          ],
          offset: 'page-2',
        });
      }

      return jsonResponse({
        records: [
          makeRecord('rec-app-2', {
            [FIELD_IDS.assets.name]: 'App Two',
            [FIELD_IDS.assets.type]: APP_ASSET_TYPE,
            [FIELD_IDS.assets.visibility]: 'Public',
          }),
          makeRecord('rec-app-3', {
            [FIELD_IDS.assets.name]: 'App Three',
            [FIELD_IDS.assets.type]: APP_ASSET_TYPE,
            [FIELD_IDS.assets.visibility]: 'Public',
          }),
        ],
      });
    };

    const client = new AirtableClient({ apiKey: 'test-key', fetchFn });
    const queue = await client.listAssetQueue(2);

    expect(queue).toHaveLength(2);
    expect(queue.map((q) => q.assetId)).toEqual(['rec-app-1', 'rec-app-2']);
  });

  it('scans all pages when resolving asset by app id', async () => {
    const fetchFn = async (input) => {
      const url = new URL(String(input));
      const offset = url.searchParams.get('offset');

      if (!offset) {
        return jsonResponse({
          records: [
            makeRecord('rec-app-a', {
              [FIELD_IDS.assets.name]: 'App A',
              [FIELD_IDS.assets.type]: APP_ASSET_TYPE,
              [FIELD_IDS.assets.appId]: ['alpha'],
              [FIELD_IDS.assets.visibility]: 'Public',
            }),
            makeRecord('rec-template-b', {
              [FIELD_IDS.assets.name]: 'Template B',
              [FIELD_IDS.assets.type]: TEMPLATE_ASSET_TYPE,
              [FIELD_IDS.assets.appId]: ['beta-target'],
              [FIELD_IDS.assets.visibility]: 'Public',
            }),
          ],
          offset: 'page-2',
        });
      }

      return jsonResponse({
        records: [
          makeRecord('rec-app-b', {
            [FIELD_IDS.assets.name]: 'App B',
            [FIELD_IDS.assets.type]: APP_ASSET_TYPE,
            [FIELD_IDS.assets.appId]: ['beta-target'],
            [FIELD_IDS.assets.visibility]: 'Public',
          }),
        ],
      });
    };

    const client = new AirtableClient({ apiKey: 'test-key', fetchFn });
    const asset = await client.getAssetByAppId('BETA-TARGET');

    expect(asset).not.toBeNull();
    expect(asset?.assetId).toBe('rec-app-b');
    expect(asset?.appName).toBe('App B');
  });

  it('resolves asset by record id via RECORD_ID formula lookup', async () => {
    const fetchFn = async (input) => {
      const url = new URL(String(input));
      const formula = url.searchParams.get('filterByFormula');

      if (formula === "RECORD_ID() = 'rec-app-by-id'") {
        return jsonResponse({
          records: [
            makeRecord('rec-app-by-id', {
              [FIELD_IDS.assets.name]: 'App By Id',
              [FIELD_IDS.assets.type]: APP_ASSET_TYPE,
              [FIELD_IDS.assets.visibility]: 'Public',
            }),
          ],
        });
      }

      return jsonResponse({ records: [] });
    };

    const client = new AirtableClient({ apiKey: 'test-key', fetchFn });
    const asset = await client.getAssetById('rec-app-by-id');

    expect(asset).not.toBeNull();
    expect(asset?.assetId).toBe('rec-app-by-id');
    expect(asset?.appName).toBe('App By Id');
  });
});

describe('AirtableClient fetch binding', () => {
  it('calls injected fetch with global this binding', async () => {
    function thisSensitiveFetch() {
      if (this !== globalThis) {
        throw new Error('bad-this-binding');
      }
      return jsonResponse({
        records: [
          makeRecord('rec-app-health', {
            [FIELD_IDS.assets.name]: 'Health App',
            [FIELD_IDS.assets.type]: APP_ASSET_TYPE,
            [FIELD_IDS.assets.visibility]: 'Public',
          }),
        ],
      });
    }

    const client = new AirtableClient({ apiKey: 'test-key', fetchFn: thisSensitiveFetch });
    const health = await client.healthCheck();

    expect(health.ok).toBe(true);
    expect(health.sampleAssetsRead).toBe(1);
  });
});
