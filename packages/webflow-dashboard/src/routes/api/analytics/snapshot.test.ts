import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  buildMarketplaceSnapshot,
  snapshotToFields
} from '@create-something/webflow-dashboard-core/marketplace-snapshot';
import { getAirtableClient } from '$lib/server/airtable';
afterEach(() => vi.unstubAllGlobals());
describe('dashboard snapshot reader', () => {
  it('reads both projections once and retains template identity', async () => {
    const snapshot = buildMarketplaceSnapshot({
      snapshotAt: '2026-09-21T16:00:00.000Z',
      sellers: [
        { templateId: 'a'.repeat(24), mrpId: 'b'.repeat(24), name: 'Same', sales: 3, revenue: 150 }
      ],
      assets: [
        {
          templateId: 'a'.repeat(24),
          creatorEmail: 'fixture@example.test',
          categories: ['Agency', 'Portfolio']
        }
      ],
      categories: [
        { name: 'Agency', group: 'Business' },
        { name: 'Portfolio', group: 'Business' }
      ]
    });
    const fetcher = vi.fn(async () =>
      Response.json({ records: [{ fields: snapshotToFields(snapshot) }] })
    );
    vi.stubGlobal('fetch', fetcher);
    const client = getAirtableClient({
      AIRTABLE_API_KEY: 'fixture-only',
      AIRTABLE_BASE_ID: 'appMoIgXMTTTNIc3p',
      MARKETPLACE_INSIGHTS_SNAPSHOT_TABLE_ID: 'tblSnapshotTest01'
    });
    const [leaderboard, categories] = await Promise.all([
      client.getLeaderboard(),
      client.getCategoryPerformance()
    ]);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(leaderboard.records[0].templateId).toBe('a'.repeat(24));
    expect(categories.marketplaceSummary?.totalSales).toBe(3);
  });
});
