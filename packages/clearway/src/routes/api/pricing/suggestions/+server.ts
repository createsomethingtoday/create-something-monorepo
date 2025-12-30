/**
 * Pricing Suggestions API
 *
 * GET /api/pricing/suggestions?facility=:id - List suggestions
 * POST /api/pricing/suggestions - Generate new suggestions
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { generatePricingSuggestions, getPendingSuggestions } from '$lib/pricing/dynamic';
import type { PricingSuggestion } from '$lib/pricing/dynamic';

export const GET: RequestHandler = async ({ url, platform }) => {
	const db = platform?.env.DB;
	if (!db) {
		throw error(500, 'Database not available');
	}

	const facilityId = url.searchParams.get('facility');
	if (!facilityId) {
		throw error(400, 'facility parameter required');
	}

	// Validate facility exists
	const facility = await db
		.prepare('SELECT id, name FROM facilities WHERE id = ?')
		.bind(facilityId)
		.first<{ id: string; name: string }>();

	if (!facility) {
		throw error(404, 'Facility not found');
	}

	// Get suggestions (optionally filter by status)
	const status = url.searchParams.get('status');
	const conditions: string[] = ['facility_id = ?'];
	const params: unknown[] = [facilityId];

	if (status) {
		conditions.push('status = ?');
		params.push(status);
	}

	const suggestions = await db
		.prepare(
			`
      SELECT *
      FROM pricing_suggestions
      WHERE ${conditions.join(' AND ')}
      ORDER BY confidence_score DESC, created_at DESC
    `
		)
		.bind(...params)
		.all<PricingSuggestion>();

	return json({
		facility: {
			id: facility.id,
			name: facility.name
		},
		suggestions: suggestions.results || [],
		summary: {
			total: suggestions.results?.length || 0,
			pending: suggestions.results?.filter((s) => s.status === 'pending').length || 0,
			approved: suggestions.results?.filter((s) => s.status === 'approved').length || 0,
			rejected: suggestions.results?.filter((s) => s.status === 'rejected').length || 0
		}
	});
};

export const POST: RequestHandler = async ({ request, platform }) => {
	const db = platform?.env.DB;
	if (!db) {
		throw error(500, 'Database not available');
	}

	const body = (await request.json()) as {
		facility_id: string;
		config?: {
			peakThreshold?: number;
			offPeakThreshold?: number;
			peakAdjustment?: number;
			offPeakAdjustment?: number;
			minDataPoints?: number;
		};
	};

	const { facility_id, config } = body;

	if (!facility_id) {
		throw error(400, 'facility_id is required');
	}

	// Validate facility exists
	const facility = await db
		.prepare('SELECT id, name FROM facilities WHERE id = ?')
		.bind(facility_id)
		.first<{ id: string; name: string }>();

	if (!facility) {
		throw error(404, 'Facility not found');
	}

	// Generate suggestions
	try {
		const count = await generatePricingSuggestions(db, facility_id, config);

		// Get the newly created suggestions
		const suggestions = await getPendingSuggestions(db, facility_id);

		return json(
			{
				success: true,
				facility: {
					id: facility.id,
					name: facility.name
				},
				suggestions_generated: count,
				suggestions
			},
			{ status: 201 }
		);
	} catch (err) {
		console.error('Error generating pricing suggestions:', err);
		throw error(500, err instanceof Error ? err.message : 'Failed to generate suggestions');
	}
};
