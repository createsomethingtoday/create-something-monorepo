/**
 * Pricing Suggestion Rejection API
 *
 * POST /api/pricing/suggestions/:id/reject
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { rejectSuggestion } from '$lib/pricing/dynamic';

export const POST: RequestHandler = async ({ params, request, platform }) => {
	const db = platform?.env.DB;
	if (!db) {
		throw error(500, 'Database not available');
	}

	const { id } = params;

	const body = (await request.json()) as {
		reviewed_by: string; // Admin/staff ID or email
	};

	if (!body.reviewed_by) {
		throw error(400, 'reviewed_by is required');
	}

	// Get suggestion details before rejecting
	const suggestion = await db
		.prepare('SELECT * FROM pricing_suggestions WHERE id = ?')
		.bind(id)
		.first<{
			id: string;
			facility_id: string;
			status: string;
		}>();

	if (!suggestion) {
		throw error(404, 'Suggestion not found');
	}

	if (suggestion.status !== 'pending') {
		throw error(400, `Cannot reject suggestion with status: ${suggestion.status}`);
	}

	// Reject the suggestion
	const rejected = await rejectSuggestion(db, id, body.reviewed_by);

	if (!rejected) {
		throw error(500, 'Failed to reject suggestion');
	}

	// Get updated suggestion
	const updated = await db
		.prepare('SELECT * FROM pricing_suggestions WHERE id = ?')
		.bind(id)
		.first();

	return json({
		success: true,
		message: 'Suggestion rejected',
		suggestion: updated
	});
};
