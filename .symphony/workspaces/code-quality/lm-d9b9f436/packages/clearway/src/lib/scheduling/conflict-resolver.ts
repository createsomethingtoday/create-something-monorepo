/**
 * Conflict Resolver
 *
 * Validates booking requests and detects conflicts.
 * The infrastructure disappears; valid bookings succeed.
 */

import type { Reservation, Court, Facility, Member, AvailabilityBlock } from '$lib/types';

export interface BookingRequest {
	facilityId: string;
	courtId: string;
	memberId: string;
	startTime: string; // ISO 8601
	endTime: string; // ISO 8601
	bookingType?: 'standard' | 'recurring' | 'lesson' | 'event';
}

export interface ConflictCheckResult {
	valid: boolean;
	conflicts: Conflict[];
	warnings: Warning[];
}

export interface Conflict {
	type: ConflictType;
	message: string;
	details?: Record<string, unknown>;
}

export type ConflictType =
	| 'court_unavailable'
	| 'time_overlap'
	| 'outside_hours'
	| 'blocked_period'
	| 'member_limit'
	| 'advance_booking'
	| 'invalid_duration'
	| 'past_time'
	| 'court_inactive';

export interface Warning {
	type: 'peak_pricing' | 'waitlist_available' | 'near_closing';
	message: string;
}

/**
 * Check for all potential conflicts with a booking request
 */
export async function checkConflicts(
	db: D1Database,
	request: BookingRequest,
	facility: Facility,
	court: Court,
	member: Member
): Promise<ConflictCheckResult> {
	const conflicts: Conflict[] = [];
	const warnings: Warning[] = [];

	const startTime = new Date(request.startTime);
	const endTime = new Date(request.endTime);
	const now = new Date();

	// 1. Check if booking is in the past
	if (startTime < now) {
		conflicts.push({
			type: 'past_time',
			message: 'Cannot book time slots in the past'
		});
	}

	// 2. Check if court is active
	if (!court.is_active) {
		conflicts.push({
			type: 'court_inactive',
			message: `${court.name} is not available for booking`
		});
	}

	// 3. Check advance booking limit
	const daysInAdvance = (startTime.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
	const maxAdvanceDays = member.max_advance_hours
		? member.max_advance_hours / 24
		: facility.advance_booking_days;

	if (daysInAdvance > maxAdvanceDays) {
		conflicts.push({
			type: 'advance_booking',
			message: `Cannot book more than ${maxAdvanceDays} days in advance`,
			details: { maxAdvanceDays, requestedDays: Math.ceil(daysInAdvance) }
		});
	}

	// 4. Check duration validity
	const durationMinutes = (endTime.getTime() - startTime.getTime()) / (1000 * 60);
	if (durationMinutes < facility.slot_duration_minutes) {
		conflicts.push({
			type: 'invalid_duration',
			message: `Minimum booking duration is ${facility.slot_duration_minutes} minutes`
		});
	}

	// 5. Check if within operating hours
	const outsideHours = checkOperatingHours(startTime, endTime, facility);
	if (outsideHours) {
		conflicts.push(outsideHours);
	}

	// 6. Check for overlapping reservations
	const overlap = await checkTimeOverlap(db, request);
	if (overlap) {
		conflicts.push(overlap);
	}

	// 7. Check for blocked periods (maintenance, events, etc.)
	const blocked = await checkBlockedPeriods(db, request);
	if (blocked) {
		conflicts.push(blocked);
	}

	// 8. Check member's active reservation limit
	const memberLimit = await checkMemberLimit(db, member, request.facilityId);
	if (memberLimit) {
		conflicts.push(memberLimit);
	}

	// Add warnings for peak pricing, near closing, etc.
	const peakWarning = checkPeakHours(startTime, facility);
	if (peakWarning) {
		warnings.push(peakWarning);
	}

	const closingWarning = checkNearClosing(endTime, facility);
	if (closingWarning) {
		warnings.push(closingWarning);
	}

	return {
		valid: conflicts.length === 0,
		conflicts,
		warnings
	};
}

/**
 * Check if times are within facility operating hours
 */
function checkOperatingHours(
	startTime: Date,
	endTime: Date,
	facility: Facility
): Conflict | null {
	const [openHour, openMin] = facility.opening_time.split(':').map(Number);
	const [closeHour, closeMin] = facility.closing_time.split(':').map(Number);

	const startHour = startTime.getHours();
	const startMin = startTime.getMinutes();
	const endHour = endTime.getHours();
	const endMin = endTime.getMinutes();

	// Convert to minutes for easier comparison
	const openMinutes = openHour * 60 + openMin;
	const closeMinutes = closeHour * 60 + closeMin;
	const startMinutes = startHour * 60 + startMin;
	const endMinutes = endHour * 60 + endMin;

	if (startMinutes < openMinutes || endMinutes > closeMinutes) {
		return {
			type: 'outside_hours',
			message: `Facility operates from ${facility.opening_time} to ${facility.closing_time}`,
			details: {
				openingTime: facility.opening_time,
				closingTime: facility.closing_time
			}
		};
	}

	return null;
}

/**
 * Check for overlapping reservations on the same court
 */
async function checkTimeOverlap(
	db: D1Database,
	request: BookingRequest
): Promise<Conflict | null> {
	const result = await db
		.prepare(
			`
      SELECT id, start_time, end_time
      FROM reservations
      WHERE court_id = ?
        AND status NOT IN ('cancelled', 'no_show', 'refunded', 'archived')
        AND (
          (start_time < ? AND end_time > ?)
          OR (start_time < ? AND end_time > ?)
          OR (start_time >= ? AND end_time <= ?)
        )
      LIMIT 1
    `
		)
		.bind(
			request.courtId,
			request.endTime,
			request.startTime,
			request.endTime,
			request.startTime,
			request.startTime,
			request.endTime
		)
		.first<{ id: string; start_time: string; end_time: string }>();

	if (result) {
		return {
			type: 'time_overlap',
			message: 'This time slot is already booked',
			details: {
				conflictingReservation: result.id,
				conflictStart: result.start_time,
				conflictEnd: result.end_time
			}
		};
	}

	return null;
}

/**
 * Check for blocked periods (maintenance, events, blackouts)
 */
async function checkBlockedPeriods(
	db: D1Database,
	request: BookingRequest
): Promise<Conflict | null> {
	const result = await db
		.prepare(
			`
      SELECT id, block_type, title
      FROM availability_blocks
      WHERE facility_id = ?
        AND (court_id IS NULL OR court_id = ?)
        AND block_type IN ('blackout', 'maintenance', 'event')
        AND (
          (start_time < ? AND end_time > ?)
          OR (start_time < ? AND end_time > ?)
          OR (start_time >= ? AND end_time <= ?)
        )
      LIMIT 1
    `
		)
		.bind(
			request.facilityId,
			request.courtId,
			request.endTime,
			request.startTime,
			request.endTime,
			request.startTime,
			request.startTime,
			request.endTime
		)
		.first<{ id: string; block_type: string; title: string | null }>();

	if (result) {
		const messages: Record<string, string> = {
			blackout: 'Court is unavailable during this time',
			maintenance: 'Court is under maintenance',
			event: result.title || 'Court is reserved for an event'
		};

		return {
			type: 'blocked_period',
			message: messages[result.block_type] || 'Court is unavailable',
			details: {
				blockType: result.block_type,
				blockTitle: result.title
			}
		};
	}

	return null;
}

/**
 * Check member's active reservation limit
 */
async function checkMemberLimit(
	db: D1Database,
	member: Member,
	facilityId: string
): Promise<Conflict | null> {
	const result = await db
		.prepare(
			`
      SELECT COUNT(*) as count
      FROM reservations
      WHERE member_id = ?
        AND facility_id = ?
        AND status IN ('pending', 'confirmed')
        AND start_time > datetime('now')
    `
		)
		.bind(member.id, facilityId)
		.first<{ count: number }>();

	const activeCount = result?.count || 0;
	const maxActive = member.max_active_reservations;

	if (activeCount >= maxActive) {
		return {
			type: 'member_limit',
			message: `You have reached your limit of ${maxActive} active reservations`,
			details: {
				currentCount: activeCount,
				limit: maxActive
			}
		};
	}

	return null;
}

/**
 * Check if booking is during peak hours (for pricing warning)
 */
function checkPeakHours(startTime: Date, facility: Facility): Warning | null {
	// Peak hours: typically 5-8 PM weekdays, varies by facility
	const hour = startTime.getHours();
	const dayOfWeek = startTime.getDay();
	const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;

	if (isWeekday && hour >= 17 && hour < 20) {
		return {
			type: 'peak_pricing',
			message: 'This is a peak hour - pricing may be higher'
		};
	}

	return null;
}

/**
 * Check if booking ends close to closing time
 */
function checkNearClosing(endTime: Date, facility: Facility): Warning | null {
	const [closeHour, closeMin] = facility.closing_time.split(':').map(Number);
	const closeMinutes = closeHour * 60 + closeMin;
	const endMinutes = endTime.getHours() * 60 + endTime.getMinutes();

	// Warn if ending within 30 minutes of closing
	if (closeMinutes - endMinutes <= 30 && closeMinutes - endMinutes > 0) {
		return {
			type: 'near_closing',
			message: 'Your booking ends close to closing time'
		};
	}

	return null;
}

/**
 * Find available slots for a given court and date
 */
export async function findAvailableSlots(
	db: D1Database,
	facilityId: string,
	courtId: string,
	date: string, // YYYY-MM-DD
	facility: Facility
): Promise<TimeSlotInfo[]> {
	const slots: TimeSlotInfo[] = [];

	const [openHour, openMin] = facility.opening_time.split(':').map(Number);
	const [closeHour, closeMin] = facility.closing_time.split(':').map(Number);
	const slotDuration = facility.slot_duration_minutes;

	// Get existing reservations for the day
	const startOfDay = `${date}T00:00:00`;
	const endOfDay = `${date}T23:59:59`;

	const reservations = await db
		.prepare(
			`
      SELECT start_time, end_time, status
      FROM reservations
      WHERE court_id = ?
        AND start_time >= ?
        AND start_time < ?
        AND status NOT IN ('cancelled', 'no_show', 'refunded', 'archived')
      ORDER BY start_time
    `
		)
		.bind(courtId, startOfDay, endOfDay)
		.all<{ start_time: string; end_time: string; status: string }>();

	// Get blocked periods
	const blocks = await db
		.prepare(
			`
      SELECT start_time, end_time, block_type
      FROM availability_blocks
      WHERE facility_id = ?
        AND (court_id IS NULL OR court_id = ?)
        AND start_time < ?
        AND end_time > ?
    `
		)
		.bind(facilityId, courtId, endOfDay, startOfDay)
		.all<{ start_time: string; end_time: string; block_type: string }>();

	// Generate time slots
	let currentMinutes = openHour * 60 + openMin;
	const closeMinutes = closeHour * 60 + closeMin;

	while (currentMinutes + slotDuration <= closeMinutes) {
		const slotStart = new Date(`${date}T${formatTime(currentMinutes)}:00`);
		const slotEnd = new Date(slotStart.getTime() + slotDuration * 60 * 1000);

		const slotStartStr = slotStart.toISOString();
		const slotEndStr = slotEnd.toISOString();

		// Check if slot overlaps with any reservation
		const hasReservation = reservations.results?.some((r) =>
			timesOverlap(slotStartStr, slotEndStr, r.start_time, r.end_time)
		);

		// Check if slot overlaps with any block
		const hasBlock = blocks.results?.some(
			(b) =>
				timesOverlap(slotStartStr, slotEndStr, b.start_time, b.end_time) &&
				b.block_type !== 'extended'
		);

		let status: 'available' | 'reserved' | 'pending' | 'maintenance' = 'available';
		if (hasBlock) {
			status = 'maintenance';
		} else if (hasReservation) {
			const reservation = reservations.results?.find((r) =>
				timesOverlap(slotStartStr, slotEndStr, r.start_time, r.end_time)
			);
			status = reservation?.status === 'pending' ? 'pending' : 'reserved';
		}

		slots.push({
			startTime: slotStartStr,
			endTime: slotEndStr,
			status,
			priceCents: null // Price calculated separately
		});

		currentMinutes += slotDuration;
	}

	return slots;
}

interface TimeSlotInfo {
	startTime: string;
	endTime: string;
	status: 'available' | 'reserved' | 'pending' | 'maintenance';
	priceCents: number | null;
}

/**
 * Check if two time ranges overlap
 */
function timesOverlap(
	start1: string,
	end1: string,
	start2: string,
	end2: string
): boolean {
	return start1 < end2 && end1 > start2;
}

/**
 * Format minutes since midnight as HH:MM
 */
function formatTime(minutes: number): string {
	const hours = Math.floor(minutes / 60);
	const mins = minutes % 60;
	return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}
