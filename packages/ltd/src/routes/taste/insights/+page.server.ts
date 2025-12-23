/**
 * Taste Insights Dashboard Server
 *
 * Fetches user's reading insights for display.
 * Philosophy: Taste is cultivated through reflection.
 */

import type { PageServerLoad } from './$types';
import {
	fetchTasteInsights,
	EMPTY_INSIGHTS,
	type InsightsData,
} from '$lib/taste/insights';

export const load: PageServerLoad = async ({ platform, cookies }) => {
	const db = platform?.env?.DB;

	// Get user ID from session cookie (placeholder - integrate with identity system)
	const userId = cookies.get('userId');

	if (!db) {
		return {
			...EMPTY_INSIGHTS,
			error: 'Database not available',
		} satisfies InsightsData;
	}

	if (!userId) {
		return {
			...EMPTY_INSIGHTS,
			error: 'Sign in to view your reading insights',
		} satisfies InsightsData;
	}

	try {
		const insights = await fetchTasteInsights(db, {
			userId,
			days: 30,
			includeItemCounts: false, // Page uses simplified collection counts
		});

		return insights satisfies InsightsData;
	} catch (error) {
		console.error('Taste insights error:', error);
		return {
			...EMPTY_INSIGHTS,
			userId,
			error: 'Failed to load insights',
		} satisfies InsightsData;
	}
};
