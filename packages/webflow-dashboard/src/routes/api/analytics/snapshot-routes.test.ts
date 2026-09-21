import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ client: vi.fn(), access: vi.fn() }));
vi.mock('$lib/server/airtable', () => ({ getAirtableClient: mocks.client }));
vi.mock('$lib/server/template-access', () => ({ requireTemplateAssetAccess: mocks.access }));
import { GET as categoriesGET } from './categories/+server';
import { GET as leaderboardGET } from './leaderboard/+server';
import { buildMarketplaceSnapshot } from '@create-something/webflow-dashboard-core/marketplace-snapshot';
const event = (email?: string) =>
  ({ locals: { user: email ? { email } : null }, platform: { env: {} } }) as any;
beforeEach(() => {
  vi.resetAllMocks();
});
describe('snapshot analytics API contracts', () => {
  it('uses unique totals and keeps competitor attribution and revenue private', async () => {
    const snapshot = buildMarketplaceSnapshot({
      snapshotAt: '2026-09-21T16:00:00.000Z',
      sellers: [
        { templateId: 'a'.repeat(24), mrpId: 'b'.repeat(24), name: 'Same', sales: 3, revenue: 150 },
        { templateId: 'c'.repeat(24), mrpId: 'd'.repeat(24), name: 'Same', sales: 2, revenue: 80 }
      ],
      assets: [
        {
          mrpId: 'b'.repeat(24),
          creatorEmail: 'owner@example.test',
          categories: ['Agency', 'Portfolio']
        },
        {
          mrpId: 'd'.repeat(24),
          creatorEmail: 'competitor@example.test',
          categories: ['Agency', 'Portfolio']
        }
      ],
      categories: [
        { name: 'Agency', group: 'Business' },
        { name: 'Portfolio', group: 'Business' }
      ]
    });
    const freshness = { timestamp: snapshot.snapshotAt, source: 'field', fieldName: 'SNAPSHOT_AT' };
    mocks.client.mockReturnValue({
      getCategoryPerformance: async () => ({
        records: snapshot.categories,
        marketplaceSummary: snapshot.summary,
        freshness
      }),
      getLeaderboard: async () => ({
        records: snapshot.leaderboard,
        marketplaceSummary: snapshot.summary,
        freshness
      }),
      getCreatorByEmail: async () => null,
      getAssetsByEmail: async () => []
    });
    const categories = await (await categoriesGET(event('owner@example.test'))).json() as { summary: Record<string, unknown> };
    const leaderboard = await (await leaderboardGET(event('owner@example.test'))).json() as { summary: Record<string, unknown>; leaderboard: Array<Record<string, unknown>> };
    expect(categories.summary).toMatchObject({
      totalSales: 5,
      totalRevenue: 230,
      totalTemplates: 2,
      salesSource: 'marketplace-snapshot'
    });
    expect(leaderboard.summary.totalMarketplaceSales).toBe(5);
    expect(leaderboard.leaderboard[0]).toMatchObject({
      templateId: 'a'.repeat(24),
      creatorEmail: 'owner@example.test',
      totalRevenue30d: 150
    });
    expect(leaderboard.leaderboard[1].templateId).toBe('c'.repeat(24));
    expect(leaderboard.leaderboard[1]).not.toHaveProperty('creatorEmail');
    expect(leaderboard.leaderboard[1]).not.toHaveProperty('totalRevenue30d');
  });
  it('denies anonymous requests before reading any source', async () => {
    await expect(categoriesGET(event())).rejects.toMatchObject({ status: 401 });
    await expect(leaderboardGET(event())).rejects.toMatchObject({ status: 401 });
    expect(mocks.client).not.toHaveBeenCalled();
  });
  it('preserves entitlement denial before reading any source', async () => {
    const { error } = await import('@sveltejs/kit');
    mocks.access.mockImplementation(() => error(403, 'No template access'));
    await expect(categoriesGET(event('owner@example.test'))).rejects.toMatchObject({ status: 403 });
    await expect(leaderboardGET(event('owner@example.test'))).rejects.toMatchObject({
      status: 403
    });
    expect(mocks.client).not.toHaveBeenCalled();
  });
});
