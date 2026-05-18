import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildCategorySnapshotKey,
  buildLeaderboardSnapshotKey,
  enrichCategoryRecordsWithHistory,
  enrichLeaderboardRecordsWithHistory,
  type MarketplaceCategoryRecord,
  type MarketplaceLeaderboardRecord
} from './marketplace-history.js';

const freshness = {
  timestamp: '2026-04-21T16:00:00.000Z',
  source: 'field' as const
};

test('buildLeaderboardSnapshotKey normalizes stable matching keys', () => {
  const key = buildLeaderboardSnapshotKey({
    templateName: '  Agency  Portfolio ',
    category: ' Design ',
    creatorEmail: 'Creator@Example.com '
  });

  assert.equal(key, 'agency portfolio::creator@example.com::design');
});

test('buildCategorySnapshotKey normalizes stable matching keys', () => {
  const key = buildCategorySnapshotKey({
    category: ' Business ',
    subcategory: ' Consulting  & Coaching '
  });

  assert.equal(key, 'business::consulting & coaching');
});

test('enrichLeaderboardRecordsWithHistory appends the current Airtable snapshot', () => {
  const records: MarketplaceLeaderboardRecord[] = [
    {
      templateName: 'Agency Portfolio',
      category: 'Design',
      creatorEmail: 'creator@example.com',
      totalSales30d: 180,
      totalRevenue30d: 5400,
      avgRevenuePerSale: 30,
      salesRank: 1,
      revenueRank: 1
    }
  ];

  const enriched = enrichLeaderboardRecordsWithHistory(
    records,
    [
      {
        snapshot_at: '2026-04-07T16:00:00.000Z',
        record_key: buildLeaderboardSnapshotKey(records[0]),
        total_sales_30d: 120
      },
      {
        snapshot_at: '2026-04-14T16:00:00.000Z',
        record_key: buildLeaderboardSnapshotKey(records[0]),
        total_sales_30d: 150
      }
    ],
    freshness
  );

  assert.deepEqual(enriched[0].trendData, [120, 150, 180]);
});

test('enrichLeaderboardRecordsWithHistory replaces duplicate current snapshot timestamps', () => {
  const records: MarketplaceLeaderboardRecord[] = [
    {
      templateName: 'SaaS Landing',
      category: 'Technology',
      creatorEmail: 'creator@example.com',
      totalSales30d: 95,
      totalRevenue30d: 1900,
      avgRevenuePerSale: 20,
      salesRank: 3,
      revenueRank: 4
    }
  ];

  const enriched = enrichLeaderboardRecordsWithHistory(
    records,
    [
      {
        snapshot_at: '2026-04-14T16:00:00.000Z',
        record_key: buildLeaderboardSnapshotKey(records[0]),
        total_sales_30d: 88
      },
      {
        snapshot_at: '2026-04-21T16:00:00.000Z',
        record_key: buildLeaderboardSnapshotKey(records[0]),
        total_sales_30d: 90
      }
    ],
    freshness
  );

  assert.deepEqual(enriched[0].trendData, [88, 95]);
});

test('enrichLeaderboardRecordsWithHistory matches legacy leaderboard rows by fields', () => {
  const records: MarketplaceLeaderboardRecord[] = [
    {
      templateName: 'Alture',
      category: 'Design',
      creatorEmail: 'hi@template.supply',
      totalSales30d: 34,
      totalRevenue30d: 3508.8,
      avgRevenuePerSale: 103.2,
      salesRank: 10,
      revenueRank: 8
    }
  ];

  const enriched = enrichLeaderboardRecordsWithHistory(
    records,
    [
      {
        snapshot_at: '2026-03-30T16:04:32.000Z',
        record_key: 'alture::design::hi@template.supply',
        template_name: 'Alture',
        category: 'Design',
        creator_email: 'hi@template.supply',
        total_sales_30d: 53
      },
      {
        snapshot_at: '2026-04-20T16:00:00.000Z',
        record_key: buildLeaderboardSnapshotKey(records[0]),
        template_name: 'Alture',
        category: 'Design',
        creator_email: 'hi@template.supply',
        total_sales_30d: 34
      }
    ],
    { timestamp: null, source: 'none' },
    { now: new Date('2026-04-22T12:00:00.000Z') }
  );

  assert.deepEqual(enriched[0].trendData, [53, 34]);
});

test('enrichCategoryRecordsWithHistory computes upward category trend and percent change', () => {
  const records: MarketplaceCategoryRecord[] = [
    {
      category: 'Business',
      subcategory: 'Consulting',
      templatesInSubcategory: 24,
      totalSales30d: 320,
      totalRevenue30d: 9600,
      avgRevenuePerTemplate: 400,
      revenueRank: 7
    }
  ];

  const enriched = enrichCategoryRecordsWithHistory(
    records,
    [
      {
        snapshot_at: '2026-04-14T16:00:00.000Z',
        record_key: buildCategorySnapshotKey(records[0]),
        avg_revenue_per_template: 320
      }
    ],
    freshness
  );

  assert.equal(enriched[0].trend, 'up');
  assert.equal(enriched[0].changePercent, 25);
});

test('enrichCategoryRecordsWithHistory returns neutral for unchanged values', () => {
  const records: MarketplaceCategoryRecord[] = [
    {
      category: 'Technology',
      subcategory: 'SaaS',
      templatesInSubcategory: 84,
      totalSales30d: 600,
      totalRevenue30d: 12000,
      avgRevenuePerTemplate: 250,
      revenueRank: 2
    }
  ];

  const enriched = enrichCategoryRecordsWithHistory(
    records,
    [
      {
        snapshot_at: '2026-04-14T16:00:00.000Z',
        record_key: buildCategorySnapshotKey(records[0]),
        avg_revenue_per_template: 250
      }
    ],
    freshness
  );

  assert.equal(enriched[0].trend, 'neutral');
  assert.equal(enriched[0].changePercent, 0);
});
