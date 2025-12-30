/**
 * Reservations API
 *
 * POST /api/reservations - Create a new reservation
 * GET /api/reservations - List reservations (with filters)
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { generateId, type Facility, type Court, type Member, type Reservation, type BookingType, type BookingSource } from '$lib/types';
import { checkConflicts, type BookingRequest } from '$lib/scheduling/conflict-resolver';

interface CreateReservationBody {
	facility_id: string;
	court_id: string;
	member_id: string;
	start_time: string;
	end_time: string;
	booking_type?: BookingType;
	booking_source?: BookingSource;
	participants?: string[];
	notes?: string;
}

export const POST: RequestHandler = async ({ request, platform }) => {
	const db = platform?.env.DB;
	if (!db) {
		throw error(500, 'Database not available');
	}

	const body = (await request.json()) as CreateReservationBody;

	// Validate required fields
	const { facility_id, court_id, member_id, start_time, end_time } = body;
	if (!facility_id || !court_id || !member_id || !start_time || !end_time) {
		throw error(400, 'facility_id, court_id, member_id, start_time, and end_time are required');
	}

	// Fetch facility, court, and member
	const [facility, court, member] = await Promise.all([
		db
			.prepare('SELECT * FROM facilities WHERE id = ?')
			.bind(facility_id)
			.first<Facility>(),
		db
			.prepare('SELECT * FROM courts WHERE id = ? AND facility_id = ?')
			.bind(court_id, facility_id)
			.first<Court>(),
		db
			.prepare('SELECT * FROM members WHERE id = ? AND facility_id = ?')
			.bind(member_id, facility_id)
			.first<Member>()
	]);

	if (!facility) {
		throw error(404, 'Facility not found');
	}
	if (!court) {
		throw error(404, 'Court not found');
	}
	if (!member) {
		throw error(404, 'Member not found');
	}

	// Parse config if it's a string
	if (typeof facility.config === 'string') {
		facility.config = JSON.parse(facility.config);
	}

	// Calculate duration
	const startDate = new Date(start_time);
	const endDate = new Date(end_time);
	const durationMinutes = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60));

	// Build booking request
	const bookingRequest: BookingRequest = {
		facilityId: facility_id,
		courtId: court_id,
		memberId: member_id,
		startTime: start_time,
		endTime: end_time,
		bookingType: body.booking_type || 'standard'
	};

	// Check for conflicts
	const conflictResult = await checkConflicts(db, bookingRequest, facility, court, member);

	if (!conflictResult.valid) {
		return json(
			{
				success: false,
				conflicts: conflictResult.conflicts,
				warnings: conflictResult.warnings
			},
			{ status: 409 }
		);
	}

	// Create the reservation
	const id = generateId('rsv');
	const now = new Date().toISOString();

	// Determine initial status - if payment required, start as pending
	const requiresPayment = court.price_per_slot_cents && court.price_per_slot_cents > 0;
	const initialStatus = requiresPayment ? 'pending' : 'confirmed';

	await db
		.prepare(
			`
      INSERT INTO reservations (
        id, facility_id, court_id, member_id,
        start_time, end_time, duration_minutes,
        status, booking_type, participants, notes,
        rate_cents, payment_status, booking_source,
        created_at, updated_at, confirmed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
		)
		.bind(
			id,
			facility_id,
			court_id,
			member_id,
			start_time,
			end_time,
			durationMinutes,
			initialStatus,
			body.booking_type || 'standard',
			body.participants ? JSON.stringify(body.participants) : null,
			body.notes || null,
			court.price_per_slot_cents || null,
			requiresPayment ? 'pending' : 'waived',
			body.booking_source || 'web',
			now,
			now,
			initialStatus === 'confirmed' ? now : null
		)
		.run();

	// If confirmed, update member stats
	if (initialStatus === 'confirmed') {
		await db
			.prepare(
				'UPDATE members SET total_bookings = total_bookings + 1, updated_at = ? WHERE id = ?'
			)
			.bind(now, member_id)
			.run();
	}

	return json(
		{
			success: true,
			reservation: {
				id,
				facility_id,
				court_id,
				member_id,
				start_time,
				end_time,
				duration_minutes: durationMinutes,
				status: initialStatus,
				requires_payment: requiresPayment,
				rate_cents: court.price_per_slot_cents
			},
			warnings: conflictResult.warnings
		},
		{ status: 201 }
	);
};

export const GET: RequestHandler = async ({ url, platform }) => {
	const db = platform?.env.DB;
	if (!db) {
		throw error(500, 'Database not available');
	}

	const facilityId = url.searchParams.get('facility');
	const memberId = url.searchParams.get('member');
	const courtId = url.searchParams.get('court');
	const status = url.searchParams.get('status');
	const date = url.searchParams.get('date'); // YYYY-MM-DD
	const limit = parseInt(url.searchParams.get('limit') || '50');
	const offset = parseInt(url.searchParams.get('offset') || '0');

	// Build query dynamically
	const conditions: string[] = [];
	const params: unknown[] = [];

	if (facilityId) {
		conditions.push('facility_id = ?');
		params.push(facilityId);
	}

	if (memberId) {
		conditions.push('member_id = ?');
		params.push(memberId);
	}

	if (courtId) {
		conditions.push('court_id = ?');
		params.push(courtId);
	}

	if (status) {
		conditions.push('status = ?');
		params.push(status);
	}

	if (date) {
		conditions.push("date(start_time) = ?");
		params.push(date);
	}

	const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

	params.push(limit, offset);

	const reservations = await db
		.prepare(
			`
      SELECT r.*, c.name as court_name, m.name as member_name
      FROM reservations r
      LEFT JOIN courts c ON c.id = r.court_id
      LEFT JOIN members m ON m.id = r.member_id
      ${whereClause}
      ORDER BY r.start_time DESC
      LIMIT ? OFFSET ?
    `
		)
		.bind(...params)
		.all<Reservation & { court_name: string; member_name: string }>();

	return json({
		reservations: reservations.results || [],
		pagination: {
			limit,
			offset,
			hasMore: (reservations.results?.length || 0) === limit
		}
	});
};
