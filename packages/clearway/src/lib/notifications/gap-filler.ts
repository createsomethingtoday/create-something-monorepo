/**
 * Gap Fill Notifications
 *
 * Proactively notify members about empty slots that match their booking history.
 * Limit: max 5 notifications per slot to avoid spam.
 *
 * The infrastructure disappears; courts get filled.
 */

import { generateId } from '$lib/types';

// ============================================================================
// Types
// ============================================================================

export interface MemberMatch {
	member_id: string;
	member_name: string;
	member_email: string;
	member_phone: string | null;
	match_score: number; // 0.0 to 1.0
	reasons: string[];
}

export interface GapNotification {
	id: string;
	gap_id: string;
	member_id: string;
	facility_id: string;
	match_score: number;
	notification_type: 'sms' | 'email';
	sent_at: string;
	converted: number;
	booking_id: string | null;
}

// ============================================================================
// Member Matching
// ============================================================================

/**
 * Find members whose booking history matches a gap
 */
export async function findMatchingMembers(
	db: D1Database,
	gapId: string,
	limit: number = 5
): Promise<MemberMatch[]> {
	// Get gap details
	const gap = await db
		.prepare('SELECT * FROM analytics_gaps WHERE id = ?')
		.bind(gapId)
		.first<{
			id: string;
			facility_id: string;
			court_id: string;
			slot_date: string;
			slot_hour: number;
			gap_type: string;
		}>();

	if (!gap) {
		throw new Error(`Gap ${gapId} not found`);
	}

	// Determine day of week from slot_date
	const slotDate = new Date(gap.slot_date);
	const dayOfWeek = slotDate.getDay();

	// Get court type
	const court = await db
		.prepare('SELECT court_type FROM courts WHERE id = ?')
		.bind(gap.court_id)
		.first<{ court_type: string }>();

	if (!court) {
		throw new Error(`Court ${gap.court_id} not found`);
	}

	// Find members with bookings at same hour and day of week
	const candidates = await db
		.prepare(
			`
      SELECT
        m.id as member_id,
        m.name as member_name,
        m.email as member_email,
        m.phone as member_phone,
        COUNT(*) as matching_bookings,
        MAX(r.start_time) as last_booking
      FROM members m
      JOIN reservations r ON r.member_id = m.id
      JOIN courts c ON c.id = r.court_id
      WHERE m.facility_id = ?
        AND m.status = 'active'
        AND c.court_type = ?
        AND CAST(strftime('%w', r.start_time) AS INTEGER) = ?
        AND CAST(strftime('%H', r.start_time) AS INTEGER) = ?
        AND r.status IN ('confirmed', 'completed')
        AND r.start_time < ?  -- Only past bookings
      GROUP BY m.id
      HAVING matching_bookings > 0
      ORDER BY matching_bookings DESC, last_booking DESC
      LIMIT ?
    `
		)
		.bind(gap.facility_id, court.court_type, dayOfWeek, gap.slot_hour, gap.slot_date, limit * 2) // Get 2x limit for scoring
		.all<{
			member_id: string;
			member_name: string;
			member_email: string;
			member_phone: string | null;
			matching_bookings: number;
			last_booking: string;
		}>();

	if (!candidates.results || candidates.results.length === 0) {
		return [];
	}

	// Score each candidate
	const matches: MemberMatch[] = [];

	for (const candidate of candidates.results) {
		const score = await calculateMatchScore(
			db,
			candidate.member_id,
			gap.facility_id,
			gap.court_id,
			dayOfWeek,
			gap.slot_hour,
			court.court_type,
			candidate.matching_bookings
		);

		if (score.score > 0.3) {
			// Minimum threshold
			matches.push({
				member_id: candidate.member_id,
				member_name: candidate.member_name,
				member_email: candidate.member_email,
				member_phone: candidate.member_phone,
				match_score: score.score,
				reasons: score.reasons
			});
		}
	}

	// Sort by score and return top N
	matches.sort((a, b) => b.match_score - a.match_score);
	return matches.slice(0, limit);
}

/**
 * Calculate match score for a member
 */
async function calculateMatchScore(
	db: D1Database,
	memberId: string,
	facilityId: string,
	courtId: string,
	dayOfWeek: number,
	hour: number,
	courtType: string,
	matchingBookings: number
): Promise<{ score: number; reasons: string[] }> {
	let score = 0;
	const reasons: string[] = [];

	// Factor 1: Same hour bookings (weighted 40%)
	const hourWeight = 0.4;
	const hourScore = Math.min(matchingBookings / 5, 1.0); // 5+ bookings = max score
	score += hourScore * hourWeight;
	if (matchingBookings > 0) {
		reasons.push(`Booked this time ${matchingBookings}x before`);
	}

	// Factor 2: Same court bookings (weighted 30%)
	const courtBookings = await db
		.prepare(
			`
      SELECT COUNT(*) as count
      FROM reservations
      WHERE member_id = ?
        AND court_id = ?
        AND status IN ('confirmed', 'completed')
    `
		)
		.bind(memberId, courtId)
		.first<{ count: number }>();

	const courtWeight = 0.3;
	const courtScore = Math.min((courtBookings?.count || 0) / 3, 1.0); // 3+ bookings = max score
	score += courtScore * courtWeight;
	if ((courtBookings?.count || 0) > 0) {
		reasons.push(`Prefers this court (${courtBookings?.count} past bookings)`);
	}

	// Factor 3: Recent activity (weighted 20%)
	const recentBookings = await db
		.prepare(
			`
      SELECT COUNT(*) as count
      FROM reservations
      WHERE member_id = ?
        AND facility_id = ?
        AND start_time >= datetime('now', '-30 days')
        AND status IN ('confirmed', 'completed')
    `
		)
		.bind(memberId, facilityId)
		.first<{ count: number }>();

	const activityWeight = 0.2;
	const activityScore = Math.min((recentBookings?.count || 0) / 4, 1.0); // 4+ recent bookings = max score
	score += activityScore * activityWeight;
	if ((recentBookings?.count || 0) > 0) {
		reasons.push(`Active member (${recentBookings?.count} bookings this month)`);
	}

	// Factor 4: Same day of week (weighted 10%)
	const dayBookings = await db
		.prepare(
			`
      SELECT COUNT(*) as count
      FROM reservations r
      JOIN courts c ON c.id = r.court_id
      WHERE r.member_id = ?
        AND c.court_type = ?
        AND CAST(strftime('%w', r.start_time) AS INTEGER) = ?
        AND r.status IN ('confirmed', 'completed')
    `
		)
		.bind(memberId, courtType, dayOfWeek)
		.first<{ count: number }>();

	const dayWeight = 0.1;
	const dayScore = Math.min((dayBookings?.count || 0) / 3, 1.0); // 3+ bookings = max score
	score += dayScore * dayWeight;
	if ((dayBookings?.count || 0) > 0) {
		const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
		reasons.push(`Often plays on ${dayNames[dayOfWeek]}s`);
	}

	return { score, reasons };
}

/**
 * Send gap-fill notifications to matched members
 */
export async function sendGapFillNotifications(
	db: D1Database,
	queue: Queue,
	gapId: string
): Promise<number> {
	// Check if notifications already sent for this gap
	const existingNotifications = await db
		.prepare('SELECT COUNT(*) as count FROM gap_notifications WHERE gap_id = ?')
		.bind(gapId)
		.first<{ count: number }>();

	if ((existingNotifications?.count || 0) >= 5) {
		console.log(`Gap ${gapId} already has max notifications (5)`);
		return 0;
	}

	// Find matching members
	const remainingSlots = 5 - (existingNotifications?.count || 0);
	const matches = await findMatchingMembers(db, gapId, remainingSlots);

	if (matches.length === 0) {
		console.log(`No matching members found for gap ${gapId}`);
		return 0;
	}

	// Get gap details for notification content
	const gap = await db
		.prepare(
			`
      SELECT g.*, c.name as court_name, f.name as facility_name
      FROM analytics_gaps g
      JOIN courts c ON c.id = g.court_id
      JOIN facilities f ON f.id = g.facility_id
      WHERE g.id = ?
    `
		)
		.bind(gapId)
		.first<{
			facility_id: string;
			court_id: string;
			slot_date: string;
			slot_hour: number;
			court_name: string;
			facility_name: string;
		}>();

	if (!gap) {
		throw new Error(`Gap ${gapId} not found`);
	}

	const sent_at = new Date().toISOString();
	const insertStatements: D1PreparedStatement[] = [];
	let notificationCount = 0;

	for (const match of matches) {
		// Determine notification type (prefer SMS if phone available and score high)
		const notificationType: 'sms' | 'email' = match.member_phone && match.match_score > 0.7 ? 'sms' : 'email';

		// Create notification record
		const notificationId = generateId('gnf' as 'fac'); // gap notification ID
		insertStatements.push(
			db
				.prepare(
					`
          INSERT INTO gap_notifications (
            id, gap_id, member_id, facility_id, match_score,
            notification_type, sent_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `
				)
				.bind(
					notificationId,
					gapId,
					match.member_id,
					gap.facility_id,
					match.match_score,
					notificationType,
					sent_at
				)
		);

		// Queue notification
		const slotTime = new Date(`${gap.slot_date}T${gap.slot_hour.toString().padStart(2, '0')}:00:00`);
		const message = `${gap.court_name} available at ${gap.facility_name} on ${slotTime.toLocaleDateString()} at ${slotTime.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}. ${match.reasons.join('. ')}. Book now!`;

		await queue.send({
			type: 'gap_fill',
			gapId,
			notificationId,
			memberId: match.member_id,
			facilityId: gap.facility_id,
			data: {
				email: match.member_email,
				phone: match.member_phone,
				courtName: gap.court_name,
				facilityName: gap.facility_name,
				slotDate: gap.slot_date,
				slotHour: gap.slot_hour,
				matchScore: match.match_score,
				reasons: match.reasons,
				message,
				notificationType
			}
		});

		notificationCount++;
	}

	// Save notification records
	if (insertStatements.length > 0) {
		await db.batch(insertStatements);
	}

	// Mark gap as notified
	await db
		.prepare('UPDATE analytics_gaps SET notified = 1 WHERE id = ?')
		.bind(gapId)
		.run();

	return notificationCount;
}

/**
 * Track conversion when a gap notification leads to a booking
 */
export async function trackGapConversion(
	db: D1Database,
	memberId: string,
	reservationId: string
): Promise<void> {
	// Find recent gap notifications for this member
	const recentNotifications = await db
		.prepare(
			`
      SELECT gn.id, gn.gap_id, g.court_id, g.slot_date, g.slot_hour
      FROM gap_notifications gn
      JOIN analytics_gaps g ON g.id = gn.gap_id
      WHERE gn.member_id = ?
        AND gn.sent_at >= datetime('now', '-24 hours')
        AND gn.converted = 0
    `
		)
		.bind(memberId)
		.all<{ id: string; gap_id: string; court_id: string; slot_date: string; slot_hour: number }>();

	if (!recentNotifications.results || recentNotifications.results.length === 0) {
		return; // No recent notifications to attribute
	}

	// Get reservation details
	const reservation = await db
		.prepare('SELECT court_id, start_time FROM reservations WHERE id = ?')
		.bind(reservationId)
		.first<{ court_id: string; start_time: string }>();

	if (!reservation) {
		return;
	}

	const reservationDate = new Date(reservation.start_time);
	const reservationDateStr = reservationDate.toISOString().split('T')[0];
	const reservationHour = reservationDate.getHours();

	// Find matching notification (same court, date, and hour)
	const matchingNotification = recentNotifications.results.find(
		(n) =>
			n.court_id === reservation.court_id &&
			n.slot_date === reservationDateStr &&
			n.slot_hour === reservationHour
	);

	if (matchingNotification) {
		// Mark as converted
		await db
			.prepare(
				`
        UPDATE gap_notifications
        SET converted = 1, booking_id = ?
        WHERE id = ?
      `
			)
			.bind(reservationId, matchingNotification.id)
			.run();

		console.log(
			`Gap notification ${matchingNotification.id} converted to booking ${reservationId}`
		);
	}
}

/**
 * Get conversion rate statistics
 */
export async function getGapFillStats(
	db: D1Database,
	facilityId: string
): Promise<{
	total_notifications: number;
	conversions: number;
	conversion_rate: number;
	avg_match_score: number;
}> {
	const stats = await db
		.prepare(
			`
      SELECT
        COUNT(*) as total_notifications,
        SUM(converted) as conversions,
        AVG(match_score) as avg_match_score
      FROM gap_notifications
      WHERE facility_id = ?
    `
		)
		.bind(facilityId)
		.first<{ total_notifications: number; conversions: number; avg_match_score: number }>();

	const total = stats?.total_notifications || 0;
	const conversions = stats?.conversions || 0;

	return {
		total_notifications: total,
		conversions,
		conversion_rate: total > 0 ? conversions / total : 0,
		avg_match_score: stats?.avg_match_score || 0
	};
}
