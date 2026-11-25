import { json, error, isHttpError } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getAirtableClient } from '$lib/server/airtable';
import { marketplaceAnalyticsCacheHeaders } from '$lib/server/marketplace-cache';
import { enrichCategoriesWithHistory } from '$lib/server/marketplace-history';
import { requireTemplateAssetAccess } from '$lib/server/template-access';
import { getSyncMetadata } from '$lib/utils/sync-schedule';
import { getCategoryCompetition } from '$lib/utils/marketplace-insights-filters';

/**
 * API endpoint to fetch category performance data
 * 
 * DATA UPDATE SCHEDULE:
 * - Source: Webflow's external data pipeline updates Airtable weekly
 * - Schedule: Every Monday at 16:00 UTC (4 PM UTC)
 * - Window: Rolling 30-day performance data
 * - Frequency: Category data remains static between weekly updates
 * 
 * IMPORTANT: The category sales numbers will NOT change daily. They only update
 * when Webflow's external system refreshes the Airtable data on Mondays at 4 PM UTC.
 */
export const GET: RequestHandler = async ({ locals, platform }) => {
	if (!locals.user?.email) {
		throw error(401, 'Unauthorized');
	}

	try {
		await requireTemplateAssetAccess(locals.user.email, platform?.env);

		const airtable = getAirtableClient(platform?.env);

		// Fetch category performance data
		const categoryResult = await airtable.getCategoryPerformance();
		const categories = await enrichCategoriesWithHistory(
			platform?.env?.DB,
			categoryResult.records,
			categoryResult.freshness
		);

		// Calculate summary statistics
		const topCategories = categories.slice(0, 5);
		// A multi-tag template is counted in every category it carries, so the
		// category rows overlap and must never be summed into a marketplace total.
		// Only the unique snapshot summary can supply these; otherwise they are null.
		const totalSales = categoryResult.marketplaceSummary?.totalSales ?? null;
		const avgRevenue =
			categories.length > 0
				? categories.reduce((sum, c) => sum + c.avgRevenuePerTemplate, 0) / categories.length
				: 0;

		// Lowest competition with revenue. With listed supply this counts the
		// templates a new one sits beside; older snapshots only know the
		// templates that sold.
		const hasSupply = categories.some((c) => c.listedTemplates !== undefined);
		const competitors = (c: (typeof categories)[number]) => c.listedTemplates ?? c.templatesInSubcategory;
		const lowestCompetition = categories
			.filter((c) => getCategoryCompetition(c).key === 'low' && c.avgRevenuePerTemplate > 0)
			.sort((a, b) => competitors(a) - competitors(b))
			.slice(0, 3)
			.map((c) => ({
				category: c.category,
				subcategory: c.subcategory,
				templateCount: competitors(c),
				avgRevenue: c.avgRevenuePerTemplate,
				competitionLevel: getCategoryCompetition(c).level
			}));

		// Generate insights
		const insights: Array<{ type: 'opportunity' | 'trend' | 'warning'; message: string }> = [];

		if (lowestCompetition.length > 0) {
			const lowest = lowestCompetition[0];
			insights.push({
				type: 'opportunity',
				message: `"${lowest.subcategory}" has low competition with ${lowest.templateCount} ${hasSupply ? 'listed templates' : 'templates'} and $${Math.round(lowest.avgRevenue)} avg revenue.`
			});
		}

		if (topCategories.length > 0) {
			const topCategory = topCategories[0];
			insights.push({
				type: 'trend',
				message: `"${topCategory.subcategory}" leads with $${Math.round(topCategory.avgRevenuePerTemplate)} avg revenue per template.`
			});
		}

		// Get actual sync schedule metadata (not current time)
		const syncMetadata = getSyncMetadata({
			actualLastSyncTime: categoryResult.freshness.timestamp,
			actualSource: categoryResult.freshness.source
		});

		const totalRevenue = categoryResult.marketplaceSummary?.totalRevenue ?? null;
		const totalTemplates = categoryResult.marketplaceSummary?.sellingTemplates ?? null;
		const snapshotSummary = categoryResult.marketplaceSummary;
		const segments = {
			listedTemplates: snapshotSummary?.listedTemplates ?? null,
			sellingTemplates: snapshotSummary?.sellingTemplates ?? null,
			fulfillmentSales: snapshotSummary?.fulfillmentSales ?? null,
			totalSales: snapshotSummary?.totalSales ?? null,
			totalRevenue: snapshotSummary?.totalRevenue ?? null,
			totalSales90d: snapshotSummary?.totalSales90d ?? null,
			totalRevenue90d: snapshotSummary?.totalRevenue90d ?? null,
			sellingTemplates90d: snapshotSummary?.sellingTemplates90d ?? null
		};

			return json(
				{
					categories,
					topCategories,
					insights,
					summary: {
						totalCategories: categories.length,
						totalTemplates,
						totalSales,
            snapshotVersion: categoryResult.snapshotVersion,
        salesSource: categoryResult.marketplaceSummary ? 'marketplace-snapshot' : 'category-performance',
						totalRevenue,
						avgRevenue: Math.round(avgRevenue),
						lowestCompetition,
						lastUpdated: syncMetadata.lastSyncTime,
						nextUpdate: syncMetadata.nextSyncTime,
						expectedLastSyncTime: syncMetadata.expectedLastSyncTime,
						syncSchedule: syncMetadata.syncSchedule,
						dataWindow: syncMetadata.dataWindow,
						timeUntilNextSync: syncMetadata.timeUntilNextSync,
						freshnessSource: syncMetadata.freshnessSource,
						isFreshnessEstimated: syncMetadata.isEstimated,
						isStale: syncMetadata.isStale,
						staleSinceHours: syncMetadata.staleSinceHours,
						segments
					}
				},
				{ headers: marketplaceAnalyticsCacheHeaders }
			);
	} catch (err) {
		// requireTemplateAssetAccess throws 401/403/503 from inside this try. Those
		// carry the real reason (not entitled vs. upstream outage) and must reach the
		// client instead of being flattened into a generic 500.
		if (isHttpError(err)) {
			throw err;
		}
		console.error('Categories API Error:', err);
		throw error(500, 'Failed to fetch category data');
	}
};
