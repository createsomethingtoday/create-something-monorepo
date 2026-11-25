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
        { templateId: 'a'.repeat(24), mrpId: 'b'.repeat(24), name: 'Same', sales: 3, revenue: 150, fulfillmentSales: 1 },
        { templateId: 'c'.repeat(24), mrpId: 'd'.repeat(24), name: 'Same', sales: 2, revenue: 80, fulfillmentSales: 2 }
      ],
      assets: [
        {
          templateId: 'a'.repeat(24),
          creatorEmail: 'owner@example.test',
          categories: ['Agency', 'Portfolio']
        },
        {
          templateId: 'c'.repeat(24),
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
    expect(leaderboard.summary.totalFulfillmentSales).toBe(3);
    expect(leaderboard.leaderboard[0]).toMatchObject({
      templateId: 'a'.repeat(24),
      creatorEmail: 'owner@example.test',
      totalRevenue30d: 150,
      fulfillmentSales30d: 1
    });
    expect(leaderboard.leaderboard[1].templateId).toBe('c'.repeat(24));
    expect(leaderboard.leaderboard[1]).not.toHaveProperty('creatorEmail');
    expect(leaderboard.leaderboard[1]).not.toHaveProperty('totalRevenue30d');
    expect(leaderboard.leaderboard[1]).not.toHaveProperty('fulfillmentSales30d');
    // No revenue split in this snapshot: link sales count at list price.
    expect(leaderboard.summary.revenueBasis).toBe('list-price');
    expect(leaderboard.leaderboard[0]).not.toHaveProperty('checkoutRevenue30d');
  });
  it('shows and ranks leaderboard revenue from Marketplace checkout only when the snapshot has the split', async () => {
    const id = (char: string) => char.repeat(24);
    const snapshot = buildMarketplaceSnapshot({
      snapshotAt: '2026-09-21T16:00:00.000Z',
      sellers: [
        // Owner: 3 sales, 2 through links. $150 at list price, $50 through checkout.
        { templateId: id('a'), mrpId: id('b'), name: 'Mine', sales: 3, revenue: 150, fulfillmentSales: 2, fulfillmentRevenue: 100 },
        // Competitor: 3 sales through checkout, $120.
        { templateId: id('c'), mrpId: id('d'), name: 'Theirs', sales: 3, revenue: 120, fulfillmentSales: 0, fulfillmentRevenue: 0 }
      ],
      assets: [
        { templateId: id('a'), creatorEmail: 'owner@example.test', categories: ['Agency'] },
        { templateId: id('c'), creatorEmail: 'competitor@example.test', categories: ['Agency'] }
      ],
      categories: [{ name: 'Agency', group: 'Business' }]
    });
    const freshness = { timestamp: snapshot.snapshotAt, source: 'field', fieldName: 'SNAPSHOT_AT' };
    mocks.client.mockReturnValue({
      getLeaderboard: async () => ({ records: snapshot.leaderboard, marketplaceSummary: snapshot.summary, freshness }),
      getCreatorByEmail: async () => null,
      getAssetsByEmail: async () => []
    });
    const body = (await (await leaderboardGET(event('owner@example.test'))).json()) as {
      summary: Record<string, unknown>;
      leaderboard: Array<Record<string, unknown>>;
      userTemplates: Array<Record<string, unknown>>;
    };
    expect(body.summary.revenueBasis).toBe('marketplace-checkout');
    // Same sales: the competitor is first, because more of its revenue went through checkout.
    expect(body.leaderboard.map((row) => [row.templateName, row.salesRank, row.revenueRank])).toEqual([
      ['Theirs', 1, 1],
      ['Mine', 1, 2]
    ]);
    // The owner sees both numbers for their own template, and the checkout number is the one that counts.
    expect(body.userTemplates[0]).toMatchObject({ totalSales30d: 3, fulfillmentSales30d: 2, totalRevenue30d: 150, checkoutRevenue30d: 50 });
    expect(body.summary.userTotalRevenue).toBe(50);
    expect(body.summary.userBestRank).toBe(2);
    // A competitor's revenue and sales split stay private in both forms.
    expect(body.leaderboard[0]).not.toHaveProperty('totalRevenue30d');
    expect(body.leaderboard[0]).not.toHaveProperty('checkoutRevenue30d');
    expect(body.leaderboard[0]).not.toHaveProperty('fulfillmentSales30d');
  });
  it('passes listed supply, the 90-day window and their totals through, and counts competition from supply', async () => {
    const id = (char: string) => char.repeat(24);
    const input = {
      snapshotAt: '2026-09-21T16:00:00.000Z',
      sellers: [
        { templateId: id('a'), mrpId: id('b'), name: 'One', sales: 3, revenue: 150, fulfillmentSales: 1 },
        { templateId: id('c'), mrpId: id('d'), name: 'Two', sales: 2, revenue: 80, fulfillmentSales: 0 }
      ],
      assets: [
        { templateId: id('a'), creatorEmail: 'owner@example.test', categories: ['Agency'], listed: true },
        { templateId: id('c'), creatorEmail: 'other@example.test', categories: ['Agency'], listed: true },
        { templateId: id('e'), creatorEmail: 'third@example.test', categories: ['Agency', 'Events'], listed: true }
      ],
      categories: [
        { name: 'Agency', group: 'Business' },
        { name: 'Events', group: 'Community' }
      ]
    };
    const serve = (snapshot: ReturnType<typeof buildMarketplaceSnapshot>) =>
      mocks.client.mockReturnValue({
        getCategoryPerformance: async () => ({
          records: snapshot.categories,
          marketplaceSummary: snapshot.summary,
          freshness: { timestamp: snapshot.snapshotAt, source: 'field', fieldName: 'SNAPSHOT_AT' }
        })
      });
    type Body = {
      categories: Array<Record<string, unknown>>;
      insights: Array<{ type: string; message: string }>;
      summary: { segments: Record<string, unknown> };
    };

    serve(
      buildMarketplaceSnapshot({
        ...input,
        sellers90: [
          { templateId: id('a'), sales: 9, revenue: 450, fulfillmentSales: 2 },
          { templateId: id('c'), sales: 2, revenue: 80, fulfillmentSales: 0 },
          { templateId: id('e'), sales: 1, revenue: 40, fulfillmentSales: 0 }
        ]
      })
    );
    const body = (await (await categoriesGET(event('owner@example.test'))).json()) as Body;
    expect(body.summary.segments).toEqual({
      listedTemplates: 3,
      sellingTemplates: 2,
      fulfillmentSales: 1,
      totalSales: 5,
      totalRevenue: 230,
      totalSales90d: 12,
      totalRevenue90d: 570,
      sellingTemplates90d: 3
    });
    expect(body.categories.find((row) => row.subcategory === 'Agency')).toMatchObject({
      listedTemplates: 3,
      templatesInSubcategory: 2,
      fulfillmentSales30d: 1,
      templatesWithSales90d: 3,
      totalSales90d: 12,
      fulfillmentSales90d: 2
    });
    expect(body.categories.find((row) => row.subcategory === 'Events')).toMatchObject({
      listedTemplates: 1,
      templatesInSubcategory: 0,
      totalSales30d: 0
    });
    expect(body.insights.find((insight) => insight.type === 'opportunity')?.message).toBe(
      '"Agency" has low competition with 3 listed templates and $115 avg revenue.'
    );

    // A snapshot from before supply existed: no supply totals, and the older wording.
    serve(buildMarketplaceSnapshot({ ...input, assets: input.assets.map(({ listed: _listed, ...asset }) => asset) }));
    const legacy = (await (await categoriesGET(event('owner@example.test'))).json()) as Body;
    expect(legacy.summary.segments).toMatchObject({ listedTemplates: null, totalSales90d: null, sellingTemplates: 2 });
    expect(legacy.categories.every((row) => row.listedTemplates === undefined)).toBe(true);
    expect(legacy.insights.find((insight) => insight.type === 'opportunity')?.message).toContain('low competition with 2 templates');
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
