import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getAirtableClient } from '$lib/server/airtable';

/**
 * API endpoint to fetch top templates leaderboard data
 * 
 * DATA UPDATE SCHEDULE:
 * - Source: Webflow's external data pipeline updates Airtable weekly
 * - Schedule: Every Monday at 16:00 UTC (4 PM UTC)
 * - Window: Rolling 30-day sales data (e.g., if updated Jan 13, shows Dec 14 - Jan 13)
 * - Frequency: The sales numbers remain static between weekly updates
 * 
 * IMPORTANT: The totalMarketplaceSales number will NOT change daily. It only updates
 * when Webflow's external system refreshes the Airtable data on Mondays at 4 PM UTC.
 * This is expected behavior - the data represents a weekly snapshot, not real-time data.
 */

/**
 * Calculate the next Monday at 16:00 UTC for data updates
 */
function getNextUpdateDate(): string {
	const now = new Date();
	const currentDay = now.getUTCDay();
	const currentHour = now.getUTCHours();
	
	// Calculate days until next Monday
	let daysUntilMonday: number;
	
	if (currentDay === 1) {
		// It's Monday - check if we're before or after 4 PM UTC
		if (currentHour < 16) {
			// Before 4 PM - update happens today
			daysUntilMonday = 0;
		} else {
			// After 4 PM - next update is next Monday
			daysUntilMonday = 7;
		}
	} else if (currentDay === 0) {
		// Sunday - next Monday is tomorrow
		daysUntilMonday = 1;
	} else {
		// Tuesday-Saturday - calculate days until next Monday
		daysUntilMonday = 8 - currentDay;
	}
	
	const nextMonday = new Date(now);
	nextMonday.setUTCDate(now.getUTCDate() + daysUntilMonday);
	nextMonday.setUTCHours(16, 0, 0, 0); // 4 PM UTC
	
	return nextMonday.toISOString();
}
export const GET: RequestHandler = async ({ locals, platform }) => {
	if (!locals.user?.email) {
		throw error(401, 'Unauthorized');
	}

	const userEmail = locals.user.email;

	try {
		const airtable = getAirtableClient(platform?.env);

		// Fetch leaderboard data from Airtable
		// The table ID tblcXLVLYobhNmrg6 contains Top Templates by Sales / 30 Days
		const records = await airtable.getLeaderboard();

		// Transform records and apply security redaction
		const leaderboard = records.map((record) => {
			const creatorEmail = record.creatorEmail || '';
			const isUserTemplate = creatorEmail.toLowerCase() === userEmail.toLowerCase();

			return {
				templateName: record.templateName || '',
				category: record.category || '',
				// Only show email for user's own templates
				creatorEmail: isUserTemplate ? creatorEmail : undefined,
				totalSales30d: record.totalSales30d || 0,
				// Redact competitor revenue data
				totalRevenue30d: isUserTemplate ? record.totalRevenue30d || 0 : undefined,
				avgRevenuePerSale: isUserTemplate ? record.avgRevenuePerSale || 0 : undefined,
				salesRank: record.salesRank || 0,
				revenueRank: record.revenueRank || 0,
				isUserTemplate
			};
		});

		// Get user's templates from the leaderboard
		const userTemplates = leaderboard.filter((t) => t.isUserTemplate);

		// Calculate summary stats
		const topTemplate = leaderboard[0] || null;
		const totalMarketplaceSales = leaderboard.reduce((sum, t) => sum + t.totalSales30d, 0);
		const userTotalRevenue = userTemplates.reduce((sum, t) => sum + (t.totalRevenue30d || 0), 0);

		return json({
			leaderboard,
			userTemplates,
			summary: {
				topTemplate: topTemplate
					? {
							name: topTemplate.templateName,
							revenue: topTemplate.isUserTemplate ? topTemplate.totalRevenue30d : undefined,
							sales: topTemplate.totalSales30d
						}
					: null,
				totalMarketplaceSales,
				userTotalRevenue,
				userBestRank:
					userTemplates.length > 0
						? Math.min(...userTemplates.map((t) => t.revenueRank))
						: null,
				userTemplateCount: userTemplates.length,
				lastUpdated: new Date().toISOString(),
				nextUpdateDate: getNextUpdateDate()
			}
		});
	} catch (err) {
		console.error('Leaderboard API Error:', err);
		throw error(500, 'Failed to fetch leaderboard data');
	}
};
