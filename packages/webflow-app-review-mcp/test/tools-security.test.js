import { describe, expect, it } from 'vitest';

import { registerTools } from '../src/tools.js';

function createMockServer() {
  const handlers = new Map();
  return {
    handlers,
    tool(name, _description, _schema, handler) {
      handlers.set(name, handler);
    },
  };
}

function parseToolResult(result) {
  return JSON.parse(result.content[0].text);
}

function createClient(overrides = {}) {
  const baseAsset = {
    assetId: 'rec-app-1',
    appName: 'Secure Test App',
    credentials: 'user:test@example.com pass:super-secret',
    latestReviewFeedback: 'ok',
    descriptionLongHtml: '<p>description</p>',
  };
  return {
    getAssetById: async () => baseAsset,
    getAssetByAppId: async () => baseAsset,
    listVersionsForAsset: async () => [],
    updateAssetMetadata: async () => baseAsset,
    setMarketplaceStatus: async () => baseAsset,
    ...overrides,
  };
}

describe('tool security defaults', () => {
  it('redacts credentials by default on app_review_get_asset', async () => {
    const server = createMockServer();
    const client = createClient();
    registerTools(server, () => client);

    const handler = server.handlers.get('app_review_get_asset');
    const result = await handler({ asset_id: 'rec-app-1' });
    const parsed = parseToolResult(result);

    expect(parsed.ok).toBe(true);
    expect(parsed.data.asset.credentials).toBe('[REDACTED]');
    expect(parsed.data.compacted).toBe(true);
  });

  it('returns credentials only with include_sensitive_fields=true', async () => {
    const server = createMockServer();
    const client = createClient();
    registerTools(server, () => client);

    const handler = server.handlers.get('app_review_get_asset');
    const result = await handler({ asset_id: 'rec-app-1', include_sensitive_fields: true });
    const parsed = parseToolResult(result);

    expect(parsed.ok).toBe(true);
    expect(parsed.data.asset.credentials).toContain('super-secret');
  });

  it('redacts credentials in update responses', async () => {
    const server = createMockServer();
    const client = createClient({
      updateAssetMetadata: async () => ({
        assetId: 'rec-app-1',
        appName: 'Secure Test App',
        credentials: 'new-secret',
      }),
    });
    registerTools(server, () => client);

    const handler = server.handlers.get('app_review_update_asset_metadata');
    const result = await handler({ asset_id: 'rec-app-1', app_name: 'Renamed App' });
    const parsed = parseToolResult(result);

    expect(parsed.ok).toBe(true);
    expect(parsed.data.updated_asset.credentials).toBe('[REDACTED]');
  });
});
