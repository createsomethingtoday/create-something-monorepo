export interface LeaderboardEntry {
  templateId?: string;
	templateName: string;
	category: string;
	totalSales30d: number;
	totalRevenue30d?: number;
	salesRank: number;
	revenueRank: number;
	isUserTemplate: boolean;
	trendData?: number[];
}

export interface CategoryEntry {
	category: string;
	subcategory: string;
	templatesInSubcategory: number;
	totalSales30d: number;
	totalRevenue30d: number;
	avgRevenuePerTemplate: number;
	revenueRank: number;
	trend?: 'up' | 'down' | 'neutral';
	changePercent?: number;
}

export interface Insight {
	type: 'opportunity' | 'trend' | 'warning';
	message: string;
	priority?: number;
}

export interface LeaderboardResponse {
	leaderboard: LeaderboardEntry[];
	userTemplates: LeaderboardEntry[];
	userCategories?: string[];
	summary: {
		totalMarketplaceSales: number;
    snapshotVersion?: string;
    salesSource?: 'marketplace-snapshot' | 'leaderboard-top-50';
		userBestRank: number | null;
		lastUpdated: string;
		nextUpdateDate?: string;
		expectedLastSyncTime?: string;
		syncSchedule?: string;
		dataWindow?: string;
		timeUntilNextSync?: string;
		freshnessSource?: 'schedule-estimate' | 'airtable-field' | 'airtable-record-created-time';
		isFreshnessEstimated?: boolean;
		isStale?: boolean;
		staleSinceHours?: number | null;
	};
}

export type MarketplaceSalesSource =
  | 'marketplace-snapshot'
	| 'category-performance'
	| 'leaderboard-top-50'
	| 'unavailable';

export type MarketplaceSummary = Omit<LeaderboardResponse['summary'], 'totalMarketplaceSales' | 'salesSource'> & {
	totalMarketplaceSales: number | null;
	salesSource: MarketplaceSalesSource;
	dataWarning?: string | null;
};

export interface CategoriesResponse {
	categories: CategoryEntry[];
	insights: Insight[];
	summary: {
		totalCategories: number;
		totalTemplates: number;
		totalSales: number;
    snapshotVersion?: string;
    salesSource?: 'marketplace-snapshot' | 'category-performance';
		totalRevenue: number;
		avgRevenue: number;
		lastUpdated: string;
		nextUpdate: string;
		expectedLastSyncTime?: string;
		syncSchedule: string;
		dataWindow: string;
		timeUntilNextSync: string;
		freshnessSource?: 'schedule-estimate' | 'airtable-field' | 'airtable-record-created-time';
		isFreshnessEstimated?: boolean;
		isStale?: boolean;
		staleSinceHours?: number | null;
	};
}

export interface MarketplaceData {
	leaderboard: LeaderboardEntry[];
	categories: CategoryEntry[];
	insights: Insight[];
	userTemplates: LeaderboardEntry[];
	userCategories: string[];
	summary: MarketplaceSummary;
}

export const EMPTY_MARKETPLACE_SUMMARY: MarketplaceSummary = {
	totalMarketplaceSales: null,
	userBestRank: null,
	lastUpdated: '',
	nextUpdateDate: undefined,
	isFreshnessEstimated: true,
	salesSource: 'unavailable',
	dataWarning: null
};

export function buildMarketplaceSummary(
	leaderboardData: LeaderboardResponse,
	categoriesData: CategoriesResponse
): MarketplaceSummary {
	const categorySummary = categoriesData.summary;
	const categoryRows = categoriesData.categories.length;
	const leaderboardRows = leaderboardData.leaderboard.length;
	const categoryTotal = categorySummary?.totalSales ?? 0;
	const leaderboardTotal = leaderboardData.summary.totalMarketplaceSales ?? 0;

	const categoryFreshness = categorySummary
		? {
				lastUpdated: categorySummary.lastUpdated,
				nextUpdateDate: categorySummary.nextUpdate,
				expectedLastSyncTime: categorySummary.expectedLastSyncTime,
				syncSchedule: categorySummary.syncSchedule,
				dataWindow: categorySummary.dataWindow,
				timeUntilNextSync: categorySummary.timeUntilNextSync,
				freshnessSource: categorySummary.freshnessSource,
				isFreshnessEstimated: categorySummary.isFreshnessEstimated,
				isStale: categorySummary.isStale,
				staleSinceHours: categorySummary.staleSinceHours
			}
		: {};

	const freshness =
		categoryRows > 0 || categorySummary?.freshnessSource === 'airtable-field'
			? categoryFreshness
			: {};

	const baseSummary: MarketplaceSummary = {
		...leaderboardData.summary,
		...freshness,
		totalMarketplaceSales: null,
		salesSource: 'unavailable',
		dataWarning:
			'Marketplace sales snapshot is unavailable; zero is not shown because the source snapshot is empty.'
	};

  if (categorySummary.salesSource === 'marketplace-snapshot' || leaderboardData.summary.salesSource === 'marketplace-snapshot') {
    if (categorySummary.salesSource !== 'marketplace-snapshot' || leaderboardData.summary.salesSource !== 'marketplace-snapshot' || categorySummary.lastUpdated !== leaderboardData.summary.lastUpdated || categoryTotal !== leaderboardTotal || !categorySummary.snapshotVersion || categorySummary.snapshotVersion !== leaderboardData.summary.snapshotVersion) {
      return { ...baseSummary, dataWarning: 'Marketplace snapshots differ; refresh to load a consistent snapshot.' };
    }
    return { ...baseSummary, totalMarketplaceSales: categoryTotal, salesSource: 'marketplace-snapshot', dataWarning: null };
  }

	if (categoryRows > 0 && categoryTotal > 0) {
		return {
			...baseSummary,
			totalMarketplaceSales: categoryTotal,
			salesSource: 'category-performance',
			dataWarning: null
		};
	}

	if (leaderboardRows > 0 && leaderboardTotal > 0) {
		return {
			...baseSummary,
			totalMarketplaceSales: leaderboardTotal,
			salesSource: 'leaderboard-top-50',
			dataWarning:
				categoryRows > 0
					? 'Category performance snapshot has no sales total; showing top-50 leaderboard total until the category feed is repaired.'
					: 'Category performance snapshot is empty; showing top-50 leaderboard total until the category feed refreshes.'
		};
	}

	return baseSummary;
}

export function composeMarketplaceData(
	leaderboardData: LeaderboardResponse,
	categoriesData: CategoriesResponse
): MarketplaceData {
  const summary = buildMarketplaceSummary(leaderboardData, categoriesData);
  if ((leaderboardData.summary.salesSource === 'marketplace-snapshot' || categoriesData.summary.salesSource === 'marketplace-snapshot') && summary.salesSource !== 'marketplace-snapshot') {
    throw new Error('Marketplace snapshots differ; refresh to load a consistent snapshot.');
  }
	return {
		leaderboard: leaderboardData.leaderboard,
		userTemplates: leaderboardData.userTemplates,
		userCategories: leaderboardData.userCategories ?? [],
		categories: categoriesData.categories,
		insights: categoriesData.insights,
		summary
	};
}
