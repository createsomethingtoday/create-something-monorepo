import { describe, expect, it } from 'vitest';
import {
	buildMarketplaceSummary,
	composeMarketplaceData,
	type CategoriesResponse,
	type LeaderboardResponse
} from './marketplace-insights';

const leaderboardData: LeaderboardResponse = {
	leaderboard: [
		{
			templateName: 'Alpha',
			category: 'SaaS',
			totalSales30d: 12,
			salesRank: 1,
			revenueRank: 1,
			isUserTemplate: false
		}
	],
	userTemplates: [],
	userCategories: ['SaaS'],
	summary: {
		totalMarketplaceSales: 12,
		userBestRank: null,
		lastUpdated: '2026-06-22T16:00:00.000Z'
	}
};

const categoriesData: CategoriesResponse = {
	categories: [
		{
			category: 'SaaS',
			subcategory: 'Analytics',
			templatesInSubcategory: 7,
			totalSales30d: 20,
			totalRevenue30d: 400,
			avgRevenuePerTemplate: 57,
			revenueRank: 2
		}
	],
	insights: [{ type: 'opportunity', message: 'Analytics has low competition.' }],
	summary: {
		totalCategories: 1,
		totalTemplates: 7,
		totalSales: 20,
		totalRevenue: 400,
		avgRevenue: 57,
		lastUpdated: '2026-06-23T16:00:00.000Z',
		nextUpdate: '2026-06-30T16:00:00.000Z',
		syncSchedule: 'Weekly',
		dataWindow: 'Rolling 30 days',
		timeUntilNextSync: 'in 7 days',
		freshnessSource: 'airtable-field',
		isFreshnessEstimated: false,
		isStale: false,
		staleSinceHours: null
	}
};

describe('marketplace insights composition', () => {
	it('prefers category sales totals and freshness when category data is available', () => {
		const summary = buildMarketplaceSummary(leaderboardData, categoriesData);

		expect(summary.totalMarketplaceSales).toBe(20);
		expect(summary.salesSource).toBe('category-performance');
		expect(summary.lastUpdated).toBe(categoriesData.summary.lastUpdated);
		expect(summary.nextUpdateDate).toBe(categoriesData.summary.nextUpdate);
		expect(summary.dataWarning).toBeNull();
	});

	it('falls back to leaderboard totals when category totals are empty', () => {
		const summary = buildMarketplaceSummary(leaderboardData, {
			...categoriesData,
			categories: [],
			summary: { ...categoriesData.summary, totalSales: 0 }
		});

		expect(summary.totalMarketplaceSales).toBe(12);
		expect(summary.salesSource).toBe('leaderboard-top-50');
		expect(summary.dataWarning).toContain('top-50 leaderboard total');
	});

	it('returns the composed payload used by the page and retry path', () => {
		const marketplaceData = composeMarketplaceData(leaderboardData, categoriesData);

		expect(marketplaceData.leaderboard).toBe(leaderboardData.leaderboard);
		expect(marketplaceData.userTemplates).toBe(leaderboardData.userTemplates);
		expect(marketplaceData.userCategories).toEqual(['SaaS']);
		expect(marketplaceData.categories).toBe(categoriesData.categories);
		expect(marketplaceData.insights).toBe(categoriesData.insights);
		expect(marketplaceData.summary.salesSource).toBe('category-performance');
	});
});
