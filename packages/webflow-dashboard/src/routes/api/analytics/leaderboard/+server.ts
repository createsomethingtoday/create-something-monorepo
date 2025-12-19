import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getAirtableClient } from '$lib/server/airtable';

/**
 * API endpoint to fetch top templates leaderboard data
 * Data Sync: Weekly on Mondays at 16:00 UTC
 * Shows: Rolling 30-day window of performance data
 */
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
				lastUpdated: new Date().toISOString()
			}
		});
	} catch (err) {
		console.error('Leaderboard API Error:', err);
		throw error(500, 'Failed to fetch leaderboard data');
	}
};
