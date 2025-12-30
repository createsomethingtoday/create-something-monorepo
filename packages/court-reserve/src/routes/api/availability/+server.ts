/**
 * Availability API
 *
 * GET /api/availability - Get available time slots
 *
 * Query params:
 *   - facility: facility ID or slug (required)
 *   - date: YYYY-MM-DD (required)
 *   - court: court ID (optional, filters to specific court)
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { Facility, Court, CourtType } from '$lib/types';
import { findAvailableSlots } from '$lib/scheduling/conflict-resolver';

export interface AvailabilityResponse {
	facility: {
		id: string;
		name: string;
		slug: string;
		timezone: string;
	};
	date: string;
	courts: CourtAvailability[];
}

export interface CourtAvailability {
	id: string;
	name: string;
	type: CourtType;
	surfaceType: string | null;
	slots: TimeSlot[];
}

export interface TimeSlot {
	startTime: string;
	endTime: string;
	status: 'available' | 'reserved' | 'pending' | 'maintenance';
	priceCents: number | null;
}

export const GET: RequestHandler = async ({ url, platform }) => {
	const db = platform?.env.DB;
	if (!db) {
		throw error(500, 'Database not available');
	}

	const facilityParam = url.searchParams.get('facility');
	const date = url.searchParams.get('date');
	const courtId = url.searchParams.get('court');

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

	// Get courts
	let courts: Court[];
	if (courtId) {
		const court = await db
			.prepare('SELECT * FROM courts WHERE id = ? AND facility_id = ? AND is_active = 1')
			.bind(courtId, facility.id)
			.first<Court>();

		if (!court) {
			throw error(404, 'Court not found');
		}
		courts = [court];
	} else {
		const result = await db
			.prepare(
				'SELECT * FROM courts WHERE facility_id = ? AND is_active = 1 ORDER BY sort_order'
			)
			.bind(facility.id)
			.all<Court>();
		courts = result.results || [];
	}

	// Get availability for each court
	const courtAvailability: CourtAvailability[] = await Promise.all(
		courts.map(async (court) => {
			const slots = await findAvailableSlots(db, facility!.id, court.id, date, facility!);

			// Add pricing to slots
			const pricedSlots: TimeSlot[] = slots.map((slot) => ({
				startTime: slot.startTime,
				endTime: slot.endTime,
				status: slot.status,
				priceCents: calculatePrice(slot, court, facility!)
			}));

			return {
				id: court.id,
				name: court.name,
				type: court.court_type,
				surfaceType: court.surface_type,
				slots: pricedSlots
			};
		})
	);

	const response: AvailabilityResponse = {
		facility: {
			id: facility.id,
			name: facility.name,
			slug: facility.slug,
			timezone: facility.timezone
		},
		date,
		courts: courtAvailability
	};

	return json(response);
};

/**
 * Calculate price for a time slot
 */
function calculatePrice(
	slot: { startTime: string; status: string },
	court: Court,
	facility: Facility
): number | null {
	// Only available slots have prices
	if (slot.status !== 'available') {
		return null;
	}

	// Use court-specific pricing if set, otherwise use default
	const basePrice = court.price_per_slot_cents;

	if (!basePrice) {
		return null; // Free court
	}

	// Check if peak hours (simple implementation - could be enhanced with pricing_rules table)
	const slotTime = new Date(slot.startTime);
	const hour = slotTime.getHours();
	const dayOfWeek = slotTime.getDay();
	const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;

	// Peak hours: weekdays 5-8pm
	const isPeak = isWeekday && hour >= 17 && hour < 20;

	if (isPeak && court.peak_price_cents) {
		return court.peak_price_cents;
	}

	return basePrice;
}
