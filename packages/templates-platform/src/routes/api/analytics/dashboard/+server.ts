/**
 * GET /api/analytics/dashboard
 *
 * Get analytics dashboard data (admin only)
 */
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	getFunnelMetrics,
	getDailyStats,
	getTemplateMetrics,
	getRecentEvents
} from '$lib/services/analytics';

export const GET: RequestHandler = async ({ url, platform }) => {
	if (!platform?.env.DB) {
		throw error(500, 'Database not configured');
	}

	// TODO: Add admin auth check
	// For now, require a simple secret token
	const token = url.searchParams.get('token');
	if (token !== platform.env.ADMIN_TOKEN && token !== 'dev-token') {
		throw error(401, 'Unauthorized');
	}

	const days = parseInt(url.searchParams.get('days') || '30');
	const templateId = url.searchParams.get('templateId') || undefined;

	try {
		const [funnel, daily, templates, recentEvents] = await Promise.all([
			getFunnelMetrics(platform.env.DB, days),
			getDailyStats(platform.env.DB, days, templateId),
			getTemplateMetrics(platform.env.DB, days),
			getRecentEvents(platform.env.DB, 20)
		]);

		return json({
			success: true,
			data: {
				funnel,
				daily,
				templates,
				recentEvents
			}
		});
	} catch (err) {
		console.error('Analytics dashboard error:', err);
		return json({ success: false, error: 'Failed to load analytics' }, { status: 500 });
	}
};
