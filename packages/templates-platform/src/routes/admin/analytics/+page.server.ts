import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import {
	getFunnelMetrics,
	getDailyStats,
	getTemplateMetrics,
	getRecentEvents,
	getFeedback
} from '$lib/services/analytics';

export const load: PageServerLoad = async ({ url, platform }) => {
	if (!platform?.env.DB) {
		throw error(500, 'Database not configured');
	}

	// TODO: Add proper admin auth
	const token = url.searchParams.get('token');
	if (token !== platform.env.ADMIN_TOKEN && token !== 'dev-token') {
		throw error(401, 'Unauthorized - add ?token=dev-token to access');
	}

	const days = parseInt(url.searchParams.get('days') || '30');

	try {
		const [funnel, daily, templates, recentEvents, feedback] = await Promise.all([
			getFunnelMetrics(platform.env.DB, days),
			getDailyStats(platform.env.DB, days),
			getTemplateMetrics(platform.env.DB, days),
			getRecentEvents(platform.env.DB, 20),
			getFeedback(platform.env.DB, { limit: 10 })
		]);

		return {
			funnel,
			daily,
			templates,
			recentEvents,
			feedback,
			days
		};
	} catch (err) {
		console.error('Analytics load error:', err);
		throw error(500, 'Failed to load analytics');
	}
};
