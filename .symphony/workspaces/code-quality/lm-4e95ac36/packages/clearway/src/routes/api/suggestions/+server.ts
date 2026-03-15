/**
 * Suggestions API
 *
 * GET /api/suggestions - Get personalized slot suggestions
 *
 * Query params:
 *   - facility: facility ID or slug (required)
 *   - date: YYYY-MM-DD (required)
 *   - email: member email (optional, for personalization)
 *   - member_id: member ID (optional, alternative to email)
 *
 * This endpoint is called in parallel with /api/availability.
 * Widget highlights suggested slots with subtle emphasis.
 *
 * Philosophy: "Your usual time? It's already highlighted."
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { Facility, Court } from '$lib/types';
import { getSuggestions, type AvailableSlot, type SuggestionResponse } from '$lib/agents';
import { findAvailableSlots } from '$lib/scheduling/conflict-resolver';

export const GET: RequestHandler = async ({ url, platform }) => {
	const db = platform?.env.DB;
	if (!db) {
		throw error(500, 'Database not available');
	}

	const facilityParam = url.searchParams.get('facility');
	const date = url.searchParams.get('date');
	const memberEmail = url.searchParams.get('email');
	const memberId = url.searchParams.get('member_id');

	if (!facilityParam || !date) {
		throw error(400, 'facility and date parameters are required');
	}

	// Validate date format
	if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
		throw error(400, 'Date must be in YYYY-MM-DD format');
	}

	// Look up facility by ID or slug
	let facility: Facility | null = null;

	if (facilityParam.startsWith('fac_')) {
		facility = await db
			.prepare('SELECT * FROM facilities WHERE id = ? AND status = ?')
			.bind(facilityParam, 'active')
			.first<Facility>();
	} else {
		facility = await db
			.prepare('SELECT * FROM facilities WHERE slug = ? AND status = ?')
			.bind(facilityParam, 'active')
			.first<Facility>();
	}

	if (!facility) {
		throw error(404, 'Facility not found');
	}

	// Parse config if string
	if (typeof facility.config === 'string') {
		facility.config = JSON.parse(facility.config);
	}

	// Get all active courts
	const courtsResult = await db
		.prepare('SELECT * FROM courts WHERE facility_id = ? AND is_active = 1 ORDER BY sort_order')
		.bind(facility.id)
		.all<Court>();

	const courts = courtsResult.results || [];

	// Get all available slots across all courts
	const allSlots: AvailableSlot[] = [];

	for (const court of courts) {
		const slots = await findAvailableSlots(db, facility.id, court.id, date, facility);

		for (const slot of slots) {
			if (slot.status === 'available') {
				allSlots.push({
					courtId: court.id,
					courtName: court.name,
					startTime: slot.startTime,
					endTime: slot.endTime,
					priceCents: court.price_per_slot_cents
				});
			}
		}
	}

	// Get suggestions from agent
	const result = await getSuggestions(
		{ db },
		{
			facilityId: facility.id,
			memberId: memberId || undefined,
			memberEmail: memberEmail || undefined,
			date,
			availableSlots: allSlots
		}
	);

	if (!result.success) {
		// Graceful degradation: return empty suggestions on error
		console.error('[suggestions] Agent error:', result.error);
		return json({
			suggestions: [],
			personalized: false,
			computeTimeMs: result.computeTimeMs
		} satisfies SuggestionResponse);
	}

	// Add compute time to response
	const response: SuggestionResponse = {
		...result.data!,
		computeTimeMs: result.computeTimeMs
	};

	return json(response);
};
