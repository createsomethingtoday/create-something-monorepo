/**
 * Booking API - High-level booking endpoint
 *
 * POST /api/book - Create a booking from widget parameters
 *
 * This endpoint bridges the gap between the widget (which uses slugs and emails)
 * and the reservations API (which uses IDs). It handles:
 * - Looking up facility_id from facility_slug
 * - Creating or finding member by email
 * - Calculating end_time from facility config
 * - Creating the reservation
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { generateId, type Facility, type Member } from '$lib/types';

interface BookingRequest {
	facility_slug: string;
	court_id: string;
	date: string; // YYYY-MM-DD
	start_time: string; // ISO timestamp
	member_email: string;
	member_name: string;
}

export const POST: RequestHandler = async ({ request, platform }) => {
	const db = platform?.env.DB;
	if (!db) {
		throw error(500, 'Database not available');
	}

	const body = (await request.json()) as BookingRequest;
	const { facility_slug, court_id, date, start_time, member_email, member_name } = body;

	// Validate required fields
	if (!facility_slug || !court_id || !start_time || !member_email || !member_name) {
		throw error(
			400,
			'facility_slug, court_id, start_time, member_email, and member_name are required'
		);
	}

	// 1. Look up facility by slug
	const facility = await db
		.prepare(
			`SELECT id, name, slug, slot_duration_minutes, config
       FROM facilities WHERE slug = ? AND status = 'active'`
		)
		.bind(facility_slug)
		.first<Facility>();

	if (!facility) {
		throw error(404, `Facility '${facility_slug}' not found`);
	}

	// 2. Verify court belongs to this facility
	const court = await db
		.prepare(`SELECT id, name, price_per_slot_cents FROM courts WHERE id = ? AND facility_id = ?`)
		.bind(court_id, facility.id)
		.first<{ id: string; name: string; price_per_slot_cents: number | null }>();

	if (!court) {
		throw error(404, 'Court not found');
	}

	// 3. Find or create member
	let member = await db
		.prepare(`SELECT id, email, name FROM members WHERE email = ? AND facility_id = ?`)
		.bind(member_email.toLowerCase(), facility.id)
		.first<Member>();

	if (!member) {
		// Create new member
		const memberId = generateId('mbr');
		const now = new Date().toISOString();

		await db
			.prepare(
				`INSERT INTO members (id, facility_id, email, name, status, membership_type, created_at, updated_at)
         VALUES (?, ?, ?, ?, 'active', 'guest', ?, ?)`
			)
			.bind(memberId, facility.id, member_email.toLowerCase(), member_name, now, now)
			.run();

		member = {
			id: memberId,
			email: member_email.toLowerCase(),
			name: member_name
		} as Member;
	}

	// 4. Calculate end_time from slot duration
	const slotDuration = facility.slot_duration_minutes || 60; // Default 1 hour
	const startDate = new Date(start_time);
	const endDate = new Date(startDate.getTime() + slotDuration * 60 * 1000);
	const end_time = endDate.toISOString();

	// 5. Create reservation via internal logic (similar to reservations API)
	const reservationId = generateId('rsv');
	const now = new Date().toISOString();
	const durationMinutes = slotDuration;

	// Check for conflicts
	const existingReservation = await db
		.prepare(
			`SELECT id FROM reservations
       WHERE court_id = ?
         AND status IN ('pending', 'confirmed')
         AND start_time < ?
         AND end_time > ?`
		)
		.bind(court_id, end_time, start_time)
		.first();

	if (existingReservation) {
		throw error(409, 'This time slot is no longer available');
	}

	// Determine if payment is required
	const requiresPayment = court.price_per_slot_cents && court.price_per_slot_cents > 0;
	const initialStatus = requiresPayment ? 'pending' : 'confirmed';

	await db
		.prepare(
			`INSERT INTO reservations (
        id, facility_id, court_id, member_id,
        start_time, end_time, duration_minutes,
        status, booking_type, booking_source,
        rate_cents, payment_status,
        created_at, updated_at, confirmed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
		)
		.bind(
			reservationId,
			facility.id,
			court_id,
			member.id,
			start_time,
			end_time,
			durationMinutes,
			initialStatus,
			'standard',
			'web',
			court.price_per_slot_cents || null,
			requiresPayment ? 'pending' : 'waived',
			now,
			now,
			initialStatus === 'confirmed' ? now : null
		)
		.run();

	return json(
		{
			success: true,
			id: reservationId,
			facility_id: facility.id,
			facility_name: facility.name,
			court_id: court_id,
			court_name: court.name,
			member_id: member.id,
			start_time,
			end_time,
			duration_minutes: durationMinutes,
			status: initialStatus,
			requires_payment: requiresPayment,
			rate_cents: court.price_per_slot_cents
		},
		{ status: 201 }
	);
};
