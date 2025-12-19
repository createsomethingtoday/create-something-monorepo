import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import { getAirtableClient } from '$lib/server/airtable';

export const GET: RequestHandler = async ({ locals, platform }) => {
	if (!locals.user?.email) {
		throw error(401, 'Unauthorized');
	}

	if (!platform?.env) {
		throw error(500, 'Server configuration error');
	}

	try {
		const airtable = getAirtableClient(platform.env);
		const categories = await airtable.getCategoryPerformance();

		// Calculate summary stats
		const totalRevenue = categories.reduce((sum, c) => sum + c.revenue, 0);
		const totalTemplates = categories.reduce((sum, c) => sum + c.count, 0);

		return json({
			categories,
			summary: {
				totalCategories: categories.length,
				totalRevenue,
				totalTemplates,
				avgRevenuePerCategory: categories.length > 0 ? Math.round(totalRevenue / categories.length) : 0
			}
		});
	} catch (err) {
		console.error('Failed to fetch category analytics:', err);
		throw error(500, 'Failed to fetch category analytics');
	}
};
