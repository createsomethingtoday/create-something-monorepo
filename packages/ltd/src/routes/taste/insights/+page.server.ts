/**
 * Taste Insights Dashboard Server
 *
 * Fetches user's reading insights for display.
 * Philosophy: Taste is cultivated through reflection.
 * Canon: Privacy is not a feature—it's respect for the user's autonomy.
 */

import type { PageServerLoad } from './$types';
import {
	fetchTasteInsights,
	EMPTY_INSIGHTS,
	type InsightsData,
} from '$lib/taste/insights';
import { getTokenFromRequest, validateToken, type AuthEnv } from '@create-something/components/auth/server';

export const load: PageServerLoad = async ({ request, platform }) => {
	const db = platform?.env?.DB;

	if (!db) {
		return {
			...EMPTY_INSIGHTS,
			error: 'Database not available',
		} satisfies InsightsData;
	}

	// Authenticate user from session token
	const token = getTokenFromRequest(request);
	if (!token) {
		return {
			...EMPTY_INSIGHTS,
			error: 'Sign in to view your reading insights',
		} satisfies InsightsData;
	}

	const user = await validateToken(token, platform?.env as AuthEnv | undefined);
	if (!user) {
		return {
			...EMPTY_INSIGHTS,
			error: 'Sign in to view your reading insights',
		} satisfies InsightsData;
	}

	const userId = user.id;

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
