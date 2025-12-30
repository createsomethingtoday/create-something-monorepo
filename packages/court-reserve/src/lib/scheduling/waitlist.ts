/**
 * Waitlist Management
 *
 * Autonomous slot promotion when cancellations occur.
 * The infrastructure disappears; players get courts.
 */

import type { WaitlistEntry, WaitlistStatus, CourtType } from '$lib/types';
import { generateId } from '$lib/types';

export interface WaitlistMatch {
	entry: WaitlistEntry;
	score: number;
	matchReason: string;
}

export interface SlotOpening {
	facilityId: string;
	courtId: string;
	courtType: CourtType;
	startTime: string;
	endTime: string;
	durationMinutes: number;
}

export interface PromotionResult {
	promoted: boolean;
	entry?: WaitlistEntry;
	action: 'auto_booked' | 'offer_sent' | 'no_match';
	reservationId?: string;
	offerExpiresAt?: string;
}

/**
 * Find waitlist entries that match an opened slot
 * Sorted by priority and match quality
 */
export async function findMatchingWaitlistEntries(
	db: D1Database,
	slot: SlotOpening
): Promise<WaitlistMatch[]> {
	const slotDate = slot.startTime.split('T')[0];
	const slotTime = slot.startTime.split('T')[1].substring(0, 5); // HH:MM

	// Query waitlist entries that could match this slot
	const entries = await db
		.prepare(
			`
      SELECT *
      FROM waitlist
      WHERE facility_id = ?
        AND status = 'active'
        AND preferred_date = ?
        AND duration_minutes <= ?
        AND (
          court_id IS NULL
          OR court_id = ?
          OR court_type = ?
          OR court_type IS NULL
        )
      ORDER BY priority DESC, created_at ASC
    `
		)
		.bind(slot.facilityId, slotDate, slot.durationMinutes, slot.courtId, slot.courtType)
		.all<WaitlistEntry>();

	if (!entries.results || entries.results.length === 0) {
		return [];
	}

	// Score and filter matches
	const matches: WaitlistMatch[] = [];

	for (const entry of entries.results) {
		const score = calculateMatchScore(entry, slot, slotTime);
		if (score > 0) {
			matches.push({
				entry,
				score,
				matchReason: getMatchReason(entry, slot)
			});
		}
	}

	// Sort by score descending
	matches.sort((a, b) => b.score - a.score);

	return matches;
}

/**
 * Calculate how well a waitlist entry matches a slot
 */
function calculateMatchScore(
	entry: WaitlistEntry,
	slot: SlotOpening,
	slotTime: string
): number {
	let score = entry.priority * 10; // Base score from priority

	// Exact court match
	if (entry.court_id === slot.courtId) {
		score += 50;
	}
	// Court type match
	else if (entry.court_type === slot.courtType) {
		score += 30;
	}
	// Any court (no preference)
	else if (!entry.court_id && !entry.court_type) {
		score += 10;
	}

	// Time preference matching
	if (entry.preferred_start_time && entry.preferred_end_time) {
		const prefStart = timeToMinutes(entry.preferred_start_time);
		const prefEnd = timeToMinutes(entry.preferred_end_time);
		const slotStart = timeToMinutes(slotTime);

		if (slotStart >= prefStart && slotStart < prefEnd) {
			score += 40; // Within preferred window
		} else {
			// Penalize if outside preferred window
			const distance = Math.min(
				Math.abs(slotStart - prefStart),
				Math.abs(slotStart - prefEnd)
			);
			score -= distance / 30; // Lose points for each 30-min difference
		}
	} else {
		// No time preference - small bonus
		score += 20;
	}

	// Duration match
	if (entry.duration_minutes === slot.durationMinutes) {
		score += 15;
	}

	return Math.max(0, score);
}

/**
 * Get human-readable match reason
 */
function getMatchReason(entry: WaitlistEntry, slot: SlotOpening): string {
	if (entry.court_id === slot.courtId) {
		return 'Exact court match';
	}
	if (entry.court_type === slot.courtType) {
		return `${slot.courtType} court match`;
	}
	return 'Any court preference';
}

/**
 * Convert HH:MM to minutes since midnight
 */
function timeToMinutes(time: string): number {
	const [hours, minutes] = time.split(':').map(Number);
	return hours * 60 + minutes;
}

/**
 * Process a slot opening - find matches and either auto-book or send offers
 */
export async function processSlotOpening(
	db: D1Database,
	slot: SlotOpening
): Promise<PromotionResult> {
	const matches = await findMatchingWaitlistEntries(db, slot);

	if (matches.length === 0) {
		return { promoted: false, action: 'no_match' };
	}

	// Get the best match
	const bestMatch = matches[0];
	const entry = bestMatch.entry;

	// Check if auto-book is enabled
	if (entry.auto_book) {
		// Create reservation automatically
		const reservationId = generateId('rsv');
		const now = new Date().toISOString();

		await db.batch([
			// Create the reservation
			db
				.prepare(
					`
          INSERT INTO reservations (
            id, facility_id, court_id, member_id,
            start_time, end_time, duration_minutes,
            status, booking_type, booking_source, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, 'confirmed', 'standard', 'waitlist', ?, ?)
        `
				)
				.bind(
					reservationId,
					slot.facilityId,
					slot.courtId,
					entry.member_id,
					slot.startTime,
					slot.endTime,
					slot.durationMinutes,
					now,
					now
				),
			// Update waitlist entry
			db
				.prepare(
					`
          UPDATE waitlist
          SET status = 'converted', offered_reservation_id = ?, updated_at = ?
          WHERE id = ?
        `
				)
				.bind(reservationId, now, entry.id)
		]);

		return {
			promoted: true,
			entry,
			action: 'auto_booked',
			reservationId
		};
	}

	// Send offer with 30-minute expiry
	const offerExpiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
	const now = new Date().toISOString();

	// Create pending reservation
	const reservationId = generateId('rsv');

	await db.batch([
		// Create pending reservation (held for the offer)
		db
			.prepare(
				`
        INSERT INTO reservations (
          id, facility_id, court_id, member_id,
          start_time, end_time, duration_minutes,
          status, booking_type, booking_source, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', 'standard', 'waitlist', ?, ?)
      `
			)
			.bind(
				reservationId,
				slot.facilityId,
				slot.courtId,
				entry.member_id,
				slot.startTime,
				slot.endTime,
				slot.durationMinutes,
				now,
				now
			),
		// Update waitlist entry to offered status
		db
			.prepare(
				`
        UPDATE waitlist
        SET status = 'offered', offered_reservation_id = ?, offer_expires_at = ?, updated_at = ?
        WHERE id = ?
      `
			)
			.bind(reservationId, offerExpiresAt, now, entry.id)
	]);

	return {
		promoted: true,
		entry,
		action: 'offer_sent',
		reservationId,
		offerExpiresAt
	};
}

/**
 * Accept a waitlist offer
 */
export async function acceptOffer(
	db: D1Database,
	waitlistId: string,
	memberId: string
): Promise<{ success: boolean; error?: string; reservationId?: string }> {
	// Get the waitlist entry
	const entry = await db
		.prepare('SELECT * FROM waitlist WHERE id = ? AND member_id = ?')
		.bind(waitlistId, memberId)
		.first<WaitlistEntry>();

	if (!entry) {
		return { success: false, error: 'Waitlist entry not found' };
	}

	if (entry.status !== 'offered') {
		return { success: false, error: 'No active offer for this entry' };
	}

	// Check if offer has expired
	if (entry.offer_expires_at && new Date(entry.offer_expires_at) < new Date()) {
		// Expire the offer and release the reservation
		await expireOffer(db, entry);
		return { success: false, error: 'Offer has expired' };
	}

	const now = new Date().toISOString();

	// Confirm the reservation
	await db.batch([
		db
			.prepare(
				`
        UPDATE reservations
        SET status = 'confirmed', confirmed_at = ?, updated_at = ?
        WHERE id = ?
      `
			)
			.bind(now, now, entry.offered_reservation_id),
		db
			.prepare(
				`
        UPDATE waitlist
        SET status = 'converted', updated_at = ?
        WHERE id = ?
      `
			)
			.bind(now, waitlistId)
	]);

	return { success: true, reservationId: entry.offered_reservation_id! };
}

/**
 * Decline a waitlist offer
 */
export async function declineOffer(
	db: D1Database,
	waitlistId: string,
	memberId: string
): Promise<{ success: boolean; error?: string }> {
	const entry = await db
		.prepare('SELECT * FROM waitlist WHERE id = ? AND member_id = ?')
		.bind(waitlistId, memberId)
		.first<WaitlistEntry>();

	if (!entry) {
		return { success: false, error: 'Waitlist entry not found' };
	}

	if (entry.status !== 'offered') {
		return { success: false, error: 'No active offer for this entry' };
	}

	// Release the held reservation and expire the waitlist entry
	await expireOffer(db, entry);

	return { success: true };
}

/**
 * Expire an offer and release the held reservation
 */
async function expireOffer(db: D1Database, entry: WaitlistEntry): Promise<void> {
	const now = new Date().toISOString();

	await db.batch([
		// Cancel the pending reservation
		db
			.prepare(
				`
        UPDATE reservations
        SET status = 'cancelled', cancelled_at = ?, cancellation_reason = 'Waitlist offer expired', updated_at = ?
        WHERE id = ? AND status = 'pending'
      `
			)
			.bind(now, now, entry.offered_reservation_id),
		// Mark waitlist entry as expired
		db
			.prepare(
				`
        UPDATE waitlist
        SET status = 'expired', updated_at = ?
        WHERE id = ?
      `
			)
			.bind(now, entry.id)
	]);
}

/**
 * Clean up expired offers - called by cron
 */
export async function cleanupExpiredOffers(db: D1Database): Promise<number> {
	const now = new Date().toISOString();

	// Find expired offers
	const expired = await db
		.prepare(
			`
      SELECT id, offered_reservation_id
      FROM waitlist
      WHERE status = 'offered'
        AND offer_expires_at < ?
    `
		)
		.bind(now)
		.all<{ id: string; offered_reservation_id: string }>();

	if (!expired.results || expired.results.length === 0) {
		return 0;
	}

	// Batch expire all of them
	const statements = expired.results.flatMap((e) => [
		db
			.prepare(
				`
        UPDATE reservations
        SET status = 'cancelled', cancelled_at = ?, cancellation_reason = 'Waitlist offer expired', updated_at = ?
        WHERE id = ? AND status = 'pending'
      `
			)
			.bind(now, now, e.offered_reservation_id),
		db
			.prepare(
				`
        UPDATE waitlist
        SET status = 'expired', updated_at = ?
        WHERE id = ?
      `
			)
			.bind(now, e.id)
	]);

	await db.batch(statements);

	return expired.results.length;
}
