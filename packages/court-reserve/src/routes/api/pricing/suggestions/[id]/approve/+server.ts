/**
 * Pricing Suggestion Approval API
 *
 * POST /api/pricing/suggestions/:id/approve
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { approveSuggestion } from '$lib/pricing/dynamic';

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

	// Get suggestion details before approving
	const suggestion = await db
		.prepare('SELECT * FROM pricing_suggestions WHERE id = ?')
		.bind(id)
		.first<{
			id: string;
			facility_id: string;
			status: string;
			suggested_rate_cents: number;
		}>();

	if (!suggestion) {
		throw error(404, 'Suggestion not found');
	}

	if (suggestion.status !== 'pending') {
		throw error(400, `Cannot approve suggestion with status: ${suggestion.status}`);
	}

	// Approve the suggestion
	const approved = await approveSuggestion(db, id, body.reviewed_by);

	if (!approved) {
		throw error(500, 'Failed to approve suggestion');
	}

	// Get updated suggestion
	const updated = await db
		.prepare('SELECT * FROM pricing_suggestions WHERE id = ?')
		.bind(id)
		.first();

	return json({
		success: true,
		message: 'Suggestion approved',
		suggestion: updated
	});
};
