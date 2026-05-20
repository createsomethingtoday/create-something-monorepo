import { describe, expect, it } from 'vitest';
import {
	buildCategorySnapshotKey,
	buildLeaderboardSnapshotKey,
	enrichCategoryRecordsWithHistory,
	enrichLeaderboardRecordsWithHistory,
	type MarketplaceCategoryRecord,
	type MarketplaceLeaderboardRecord
} from './marketplace-history';

const freshness = {
	timestamp: '2026-04-21T16:00:00.000Z',
	source: 'field' as const
};

describe('snapshot keys', () => {
	it('normalizes leaderboard keys for stable matching', () => {
		const key = buildLeaderboardSnapshotKey({
			templateName: '  Agency  Portfolio ',
			category: ' Design ',
			creatorEmail: 'Creator@Example.com '
		});

		expect(key).toBe('agency portfolio::creator@example.com::design');
	});

	it('normalizes category keys for stable matching', () => {
		const key = buildCategorySnapshotKey({
			category: ' Business ',
			subcategory: ' Consulting  & Coaching '
		});

		expect(key).toBe('business::consulting & coaching');
	});
});

describe('enrichLeaderboardRecordsWithHistory', () => {
	it('appends the current Airtable snapshot to historical series', () => {
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

		expect(enriched[0].trendData).toEqual([120, 150, 180]);
	});

	it('replaces the latest point instead of duplicating the same snapshot timestamp', () => {
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

		expect(enriched[0].trendData).toEqual([88, 95]);
	});

	it('matches legacy leaderboard rows even when the stored key order differs', () => {
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

		expect(enriched[0].trendData).toEqual([53, 34]);
	});
});

describe('enrichCategoryRecordsWithHistory', () => {
	it('computes an upward category trend and percentage change', () => {
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

		expect(enriched[0].trend).toBe('up');
		expect(enriched[0].changePercent).toBe(25);
	});

	it('returns neutral when historical and current values are unchanged', () => {
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

		expect(enriched[0].trend).toBe('neutral');
		expect(enriched[0].changePercent).toBe(0);
	});
});
