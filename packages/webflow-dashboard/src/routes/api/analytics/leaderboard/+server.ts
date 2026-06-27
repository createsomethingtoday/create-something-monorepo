import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getAirtableClient } from '$lib/server/airtable';
import { marketplaceAnalyticsCacheHeaders } from '$lib/server/marketplace-cache';
import { enrichLeaderboardWithHistory } from '$lib/server/marketplace-history';
import { requireTemplateAssetAccess } from '$lib/server/template-access';
import { getSyncMetadata } from '$lib/utils/sync-schedule';

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
export const GET: RequestHandler = async ({ locals, platform }) => {
	if (!locals.user?.email) {
		throw error(401, 'Unauthorized');
	}

	const userEmail = locals.user.email.toLowerCase();

	try {
		await requireTemplateAssetAccess(locals.user.email, platform?.env);

		const airtable = getAirtableClient(platform?.env);

		// Fetch leaderboard data, creator profile, and owned assets in parallel.
		const [leaderboardResult, creator, assets] = await Promise.all([
			airtable.getLeaderboard(),
			airtable.getCreatorByEmail(userEmail),
			airtable.getAssetsByEmail(locals.user.email)
		]);
		const records = leaderboardResult.records;
		const enrichedRecords = await enrichLeaderboardWithHistory(
			platform?.env?.DB,
			records,
			leaderboardResult.freshness
		);

		// Collect all known emails for this user (login email + creator record emails)
		// The leaderboard CREATOR_EMAIL comes from Snowflake (workspace owner email)
		// which may differ from the dashboard login email. Creators often have multiple
		// emails across 📧Email, 📧WF Account Email, and 📧Emails fields.
		const userEmails = new Set<string>([userEmail]);
		if (creator?.email) userEmails.add(creator.email.toLowerCase());
		if (creator?.emails) {
			for (const e of creator.emails) {
				if (e) userEmails.add(e.toLowerCase());
			}
		}

		// Transform records and apply security redaction
		const leaderboard = enrichedRecords.map((record) => {
			const creatorEmail = record.creatorEmail || '';
			const isUserTemplate = userEmails.has(creatorEmail.toLowerCase());

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
				isUserTemplate,
				trendData: record.trendData
			};
		});

		// Get user's templates from the leaderboard
		const userTemplates = leaderboard.filter((t) => t.isUserTemplate);
		const userCategories = Array.from(
			new Set(
				assets
					.filter((asset) => asset.type === 'Template' && asset.category)
					.map((asset) => asset.category as string)
			)
		).sort((a, b) => a.localeCompare(b));

		// Calculate summary stats
		const topTemplate = leaderboard[0] || null;
		const totalMarketplaceSales = leaderboard.reduce((sum, t) => sum + t.totalSales30d, 0);
		const userTotalRevenue = userTemplates.reduce((sum, t) => sum + (t.totalRevenue30d || 0), 0);

		// Get actual sync schedule metadata (not current time)
		const syncMetadata = getSyncMetadata({
			actualLastSyncTime: leaderboardResult.freshness.timestamp,
			actualSource: leaderboardResult.freshness.source
		});

			return json(
				{
					leaderboard,
					userTemplates,
					userCategories,
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
						lastUpdated: syncMetadata.lastSyncTime,
						nextUpdateDate: syncMetadata.nextSyncTime,
						expectedLastSyncTime: syncMetadata.expectedLastSyncTime,
						syncSchedule: syncMetadata.syncSchedule,
						dataWindow: syncMetadata.dataWindow,
						timeUntilNextSync: syncMetadata.timeUntilNextSync,
						freshnessSource: syncMetadata.freshnessSource,
						isFreshnessEstimated: syncMetadata.isEstimated,
						isStale: syncMetadata.isStale,
						staleSinceHours: syncMetadata.staleSinceHours
					}
				},
				{ headers: marketplaceAnalyticsCacheHeaders }
			);
	} catch (err) {
		console.error('Leaderboard API Error:', err);
		throw error(500, 'Failed to fetch leaderboard data');
	}
};
