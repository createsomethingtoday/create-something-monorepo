import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import { getAirtableClient } from '$lib/server/airtable';

export const GET: RequestHandler = async ({ url, locals, platform }) => {
	if (!locals.user?.email) {
		throw error(401, 'Unauthorized');
	}

	if (!platform?.env) {
		throw error(500, 'Server configuration error');
	}

	// Parse limit from query params (default 20, max 100)
	const limitParam = url.searchParams.get('limit');
	let limit = 20;
	if (limitParam) {
		const parsed = parseInt(limitParam, 10);
		if (!isNaN(parsed) && parsed > 0) {
			limit = Math.min(parsed, 100);
		}
	}

	try {
		const airtable = getAirtableClient(platform.env);
		const templates = await airtable.getLeaderboard(limit);

		// Calculate summary stats
		const totalRevenue = templates.reduce((sum, t) => sum + t.revenue, 0);
		const totalPurchases = templates.reduce((sum, t) => sum + t.purchases, 0);

		return json({
			templates,
			summary: {
				count: templates.length,
				totalRevenue,
				totalPurchases,
				avgRevenue: templates.length > 0 ? Math.round(totalRevenue / templates.length) : 0
			}
		});
	} catch (err) {
		console.error('Failed to fetch leaderboard:', err);
		throw error(500, 'Failed to fetch leaderboard');
	}
};
