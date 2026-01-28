/**
 * Taste Insights API
 *
 * Returns reading insights for a user's taste exploration.
 * GET: Fetch user's taste profile and reading stats
 *
 * Philosophy: Taste is cultivated, not consumed.
 * Canon: Privacy is not a feature—it's respect for the user's autonomy.
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { fetchTasteInsights } from '$lib/taste/insights';
import { getTokenFromRequest, validateToken, type AuthEnv } from '@create-something/canon/auth/server';

export const GET: RequestHandler = async ({ request, platform, url }) => {
	const db = platform?.env?.DB;

	if (!db) {
		return json({ error: 'Database not available' }, { status: 500 });
	}

	// Authenticate user - taste insights are private data
	const token = getTokenFromRequest(request);
	if (!token) {
		throw error(401, 'Authentication required');
	}

	const user = await validateToken(token, platform?.env as AuthEnv | undefined);
	if (!user) {
		throw error(401, 'Invalid or expired token');
	}

	// Use authenticated user's ID - no IDOR via query params
	const userId = user.id;

	// Time range for daily activity (default: last 30 days)
	const days = parseInt(url.searchParams.get('days') ?? '30', 10);

	try {
		const insights = await fetchTasteInsights(db, {
			userId,
			days,
			includeItemCounts: true, // API includes full item counts
		});

		return json(insights);
	} catch (error) {
		console.error('Taste insights error:', error);
		return json({ error: 'Failed to fetch insights' }, { status: 500 });
	}
};
