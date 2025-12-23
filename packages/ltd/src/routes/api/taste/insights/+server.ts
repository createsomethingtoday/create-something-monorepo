/**
 * Taste Insights API
 *
 * Returns reading insights for a user's taste exploration.
 * GET: Fetch user's taste profile and reading stats
 *
 * Philosophy: Taste is cultivated, not consumed.
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { fetchTasteInsights } from '$lib/taste/insights';

export const GET: RequestHandler = async ({ platform, url }) => {
	const db = platform?.env?.DB;

	if (!db) {
		return json({ error: 'Database not available' }, { status: 500 });
	}

	// Get user ID from query param (in real implementation, from auth)
	const userId = url.searchParams.get('userId');

	if (!userId) {
		return json({ error: 'userId required' }, { status: 400 });
	}

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
