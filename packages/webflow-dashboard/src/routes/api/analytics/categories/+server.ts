import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getAirtableClient } from '$lib/server/airtable';

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
		const airtable = getAirtableClient(platform?.env);

		// Fetch category performance data
		const categories = await airtable.getCategoryPerformance();

		// Calculate summary statistics
		const topCategories = categories.slice(0, 5);
		const totalSales = categories.reduce((sum, c) => sum + c.totalSales30d, 0);
		const avgRevenue =
			categories.length > 0
				? categories.reduce((sum, c) => sum + c.avgRevenuePerTemplate, 0) / categories.length
				: 0;

		// Find lowest competition categories with good revenue
		const lowestCompetition = categories
			.filter((c) => c.templatesInSubcategory < 10 && c.avgRevenuePerTemplate > 0)
			.sort((a, b) => a.templatesInSubcategory - b.templatesInSubcategory)
			.slice(0, 3)
			.map((c) => ({
				category: c.category,
				subcategory: c.subcategory,
				templateCount: c.templatesInSubcategory,
				avgRevenue: c.avgRevenuePerTemplate,
				competitionLevel: getCompetitionLevel(c.templatesInSubcategory)
			}));

		// Generate insights
		const insights: Array<{ type: 'opportunity' | 'trend' | 'warning'; message: string }> = [];

		if (lowestCompetition.length > 0) {
			insights.push({
				type: 'opportunity',
				message: `"${lowestCompetition[0].subcategory}" has low competition with ${lowestCompetition[0].templateCount} templates and $${Math.round(lowestCompetition[0].avgRevenue)} avg revenue.`
			});
		}

		if (topCategories.length > 0) {
			const topCategory = topCategories[0];
			insights.push({
				type: 'trend',
				message: `"${topCategory.subcategory}" leads with $${Math.round(topCategory.avgRevenuePerTemplate)} avg revenue per template.`
			});
		}

		return json({
			categories,
			topCategories,
			insights,
			summary: {
				totalCategories: categories.length,
				totalSales,
				avgRevenue: Math.round(avgRevenue),
				lowestCompetition,
				lastUpdated: new Date().toISOString()
			}
		});
	} catch (err) {
		console.error('Categories API Error:', err);
		throw error(500, 'Failed to fetch category data');
	}
};

function getCompetitionLevel(templateCount: number): string {
	if (templateCount < 10) return 'Low';
	if (templateCount < 30) return 'Medium';
	if (templateCount < 70) return 'High';
	return 'Very High';
}
