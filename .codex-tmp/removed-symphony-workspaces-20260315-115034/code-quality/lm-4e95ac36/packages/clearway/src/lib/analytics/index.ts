/**
 * Analytics Pipeline
 *
 * Analyzes booking patterns to:
 * - Track hourly utilization (last 30 days)
 * - Identify peak/off-peak periods
 * - Calculate court popularity
 * - Detect upcoming gaps (next 7 days)
 *
 * The infrastructure disappears; demand becomes visible.
 */

import { generateId } from '$lib/types';

// ============================================================================
// Types
// ============================================================================

export interface HourlyUtilization {
	id: string;
	facility_id: string;
	day_of_week: number; // 0=Sunday, 6=Saturday
	hour: number; // 0-23
	total_slots: number;
	booked_slots: number;
	utilization_rate: number; // 0.0 to 1.0
	avg_revenue_cents: number | null;
	calculated_at: string;
}

export interface CourtPopularity {
	id: string;
	facility_id: string;
	court_id: string;
	period: 'weekly' | 'monthly';
	total_bookings: number;
	revenue_cents: number;
	avg_duration_minutes: number;
	calculated_at: string;
}

export interface Gap {
	id: string;
	facility_id: string;
	court_id: string;
	slot_date: string; // YYYY-MM-DD
	slot_hour: number;
	gap_type: 'prime_time_empty' | 'long_gap' | 'isolated_available';
	notified: number; // 0 or 1
	created_at: string;
}

export interface AnalyticsResult {
	utilizationRecords: number;
	popularityRecords: number;
	gapsDetected: number;
	peakHours: Array<{ day_of_week: number; hour: number; utilization_rate: number }>;
	offPeakHours: Array<{ day_of_week: number; hour: number; utilization_rate: number }>;
}

// ============================================================================
// Analytics Aggregation
// ============================================================================

/**
 * Calculate hourly utilization patterns for the last 30 days
 */
export async function aggregateHourlyUtilization(
	db: D1Database,
	facilityId: string
): Promise<number> {
	const now = new Date();
	const thirtyDaysAgo = new Date(now);
	thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

	// Get facility details (needed for slot calculation)
	const facility = await db
		.prepare('SELECT slot_duration_minutes, opening_time, closing_time FROM facilities WHERE id = ?')
		.bind(facilityId)
		.first<{ slot_duration_minutes: number; opening_time: string; closing_time: string }>();

	if (!facility) {
		throw new Error(`Facility ${facilityId} not found`);
	}

	// Parse opening hours (HH:MM format)
	const [openHour] = facility.opening_time.split(':').map(Number);
	const [closeHour] = facility.closing_time.split(':').map(Number);

	// Count total courts at facility
	const courtsResult = await db
		.prepare('SELECT COUNT(*) as count FROM courts WHERE facility_id = ? AND is_active = 1')
		.bind(facilityId)
		.first<{ count: number }>();

	const totalCourts = courtsResult?.count || 0;

	if (totalCourts === 0) {
		console.warn(`No active courts for facility ${facilityId}`);
		return 0;
	}

	// Slots per hour = courts * (60 / slot_duration_minutes)
	const slotsPerHourPerCourt = 60 / facility.slot_duration_minutes;
	const totalSlotsPerHour = totalCourts * slotsPerHourPerCourt;

	// Aggregate reservations by day of week and hour
	const results = await db
		.prepare(
			`
      SELECT
        CAST(strftime('%w', start_time) AS INTEGER) as day_of_week,
        CAST(strftime('%H', start_time) AS INTEGER) as hour,
        COUNT(*) as booked_slots,
        AVG(rate_cents) as avg_revenue_cents
      FROM reservations
      WHERE facility_id = ?
        AND start_time >= ?
        AND start_time < ?
        AND status IN ('confirmed', 'completed', 'in_progress')
      GROUP BY day_of_week, hour
    `
		)
		.bind(facilityId, thirtyDaysAgo.toISOString(), now.toISOString())
		.all<{
			day_of_week: number;
			hour: number;
			booked_slots: number;
			avg_revenue_cents: number | null;
		}>();

	const calculated_at = now.toISOString();
	const insertStatements: D1PreparedStatement[] = [];

	// Create records for all operating hours, even if 0 bookings
	for (let day = 0; day <= 6; day++) {
		for (let hour = openHour; hour < closeHour; hour++) {
			const data = results.results?.find((r) => r.day_of_week === day && r.hour === hour);
			const booked_slots = data?.booked_slots || 0;
			const utilization_rate = booked_slots / totalSlotsPerHour;

			const id = generateId('ana' as 'fac'); // Using 'ana' prefix for analytics

			insertStatements.push(
				db
					.prepare(
						`
          INSERT OR REPLACE INTO analytics_hourly (
            id, facility_id, day_of_week, hour, total_slots, booked_slots,
            utilization_rate, avg_revenue_cents, calculated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `
					)
					.bind(
						id,
						facilityId,
						day,
						hour,
						totalSlotsPerHour,
						booked_slots,
						utilization_rate,
						data?.avg_revenue_cents || null,
						calculated_at
					)
			);
		}
	}

	await db.batch(insertStatements);
	return insertStatements.length;
}

/**
 * Calculate court popularity for weekly and monthly periods
 */
export async function aggregateCourtPopularity(
	db: D1Database,
	facilityId: string
): Promise<number> {
	const now = new Date();
	const weekAgo = new Date(now);
	weekAgo.setDate(weekAgo.getDate() - 7);

	const monthAgo = new Date(now);
	monthAgo.setDate(monthAgo.getDate() - 30);

	const calculated_at = now.toISOString();

	// Get all courts for facility
	const courts = await db
		.prepare('SELECT id FROM courts WHERE facility_id = ? AND is_active = 1')
		.bind(facilityId)
		.all<{ id: string }>();

	if (!courts.results || courts.results.length === 0) {
		return 0;
	}

	const insertStatements: D1PreparedStatement[] = [];

	for (const court of courts.results) {
		// Weekly stats
		const weeklyStats = await db
			.prepare(
				`
        SELECT
          COUNT(*) as total_bookings,
          COALESCE(SUM(rate_cents), 0) as revenue_cents,
          AVG(duration_minutes) as avg_duration_minutes
        FROM reservations
        WHERE facility_id = ?
          AND court_id = ?
          AND start_time >= ?
          AND status IN ('confirmed', 'completed', 'in_progress')
      `
			)
			.bind(facilityId, court.id, weekAgo.toISOString())
			.first<{
				total_bookings: number;
				revenue_cents: number;
				avg_duration_minutes: number;
			}>();

		if (weeklyStats && weeklyStats.total_bookings > 0) {
			insertStatements.push(
				db
					.prepare(
						`
          INSERT OR REPLACE INTO analytics_court_popularity (
            id, facility_id, court_id, period, total_bookings, revenue_cents,
            avg_duration_minutes, calculated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `
					)
					.bind(
						generateId('ana' as 'fac'),
						facilityId,
						court.id,
						'weekly',
						weeklyStats.total_bookings,
						weeklyStats.revenue_cents,
						Math.round(weeklyStats.avg_duration_minutes),
						calculated_at
					)
			);
		}

		// Monthly stats
		const monthlyStats = await db
			.prepare(
				`
        SELECT
          COUNT(*) as total_bookings,
          COALESCE(SUM(rate_cents), 0) as revenue_cents,
          AVG(duration_minutes) as avg_duration_minutes
        FROM reservations
        WHERE facility_id = ?
          AND court_id = ?
          AND start_time >= ?
          AND status IN ('confirmed', 'completed', 'in_progress')
      `
			)
			.bind(facilityId, court.id, monthAgo.toISOString())
			.first<{
				total_bookings: number;
				revenue_cents: number;
				avg_duration_minutes: number;
			}>();

		if (monthlyStats && monthlyStats.total_bookings > 0) {
			insertStatements.push(
				db
					.prepare(
						`
          INSERT OR REPLACE INTO analytics_court_popularity (
            id, facility_id, court_id, period, total_bookings, revenue_cents,
            avg_duration_minutes, calculated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `
					)
					.bind(
						generateId('ana' as 'fac'),
						facilityId,
						court.id,
						'monthly',
						monthlyStats.total_bookings,
						monthlyStats.revenue_cents,
						Math.round(monthlyStats.avg_duration_minutes),
						calculated_at
					)
			);
		}
	}

	if (insertStatements.length > 0) {
		await db.batch(insertStatements);
	}

	return insertStatements.length;
}

/**
 * Detect gaps in the next 7 days
 */
export async function detectGaps(db: D1Database, facilityId: string): Promise<number> {
	const now = new Date();
	const sevenDaysLater = new Date(now);
	sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);

	// Get facility operating hours
	const facility = await db
		.prepare('SELECT opening_time, closing_time, slot_duration_minutes FROM facilities WHERE id = ?')
		.bind(facilityId)
		.first<{ opening_time: string; closing_time: string; slot_duration_minutes: number }>();

	if (!facility) {
		throw new Error(`Facility ${facilityId} not found`);
	}

	const [openHour] = facility.opening_time.split(':').map(Number);
	const [closeHour] = facility.closing_time.split(':').map(Number);

	// Get peak hours (utilization > 80%) from analytics
	const peakHours = await db
		.prepare(
			`
      SELECT DISTINCT day_of_week, hour
      FROM analytics_hourly
      WHERE facility_id = ?
        AND utilization_rate > 0.8
    `
		)
		.bind(facilityId)
		.all<{ day_of_week: number; hour: number }>();

	const peakHourSet = new Set(
		peakHours.results?.map((p) => `${p.day_of_week}-${p.hour}`) || []
	);

	// Get all courts
	const courts = await db
		.prepare('SELECT id FROM courts WHERE facility_id = ? AND is_active = 1')
		.bind(facilityId)
		.all<{ id: string }>();

	if (!courts.results || courts.results.length === 0) {
		return 0;
	}

	const insertStatements: D1PreparedStatement[] = [];
	const created_at = now.toISOString();

	// Check each day in the next 7 days
	for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
		const checkDate = new Date(now);
		checkDate.setDate(checkDate.getDate() + dayOffset);
		const dateStr = checkDate.toISOString().split('T')[0]; // YYYY-MM-DD
		const dayOfWeek = checkDate.getDay();

		for (const court of courts.results) {
			for (let hour = openHour; hour < closeHour; hour++) {
				const slotStart = new Date(checkDate);
				slotStart.setHours(hour, 0, 0, 0);
				const slotEnd = new Date(slotStart);
				slotEnd.setMinutes(facility.slot_duration_minutes);

				// Check if any reservations exist for this slot
				const existingReservation = await db
					.prepare(
						`
            SELECT id FROM reservations
            WHERE court_id = ?
              AND start_time >= ?
              AND start_time < ?
              AND status IN ('pending', 'confirmed', 'in_progress')
            LIMIT 1
          `
					)
					.bind(court.id, slotStart.toISOString(), slotEnd.toISOString())
					.first<{ id: string }>();

				if (existingReservation) {
					continue; // Slot is booked, no gap
				}

				// Determine gap type
				let gapType: Gap['gap_type'] | null = null;

				// Check if this is a peak hour with no booking
				if (peakHourSet.has(`${dayOfWeek}-${hour}`)) {
					gapType = 'prime_time_empty';
				} else {
					// Check for long gap (3+ consecutive hours available)
					let consecutiveHours = 1;
					for (let h = hour + 1; h < Math.min(hour + 4, closeHour); h++) {
						const nextSlotStart = new Date(checkDate);
						nextSlotStart.setHours(h, 0, 0, 0);
						const nextSlotEnd = new Date(nextSlotStart);
						nextSlotEnd.setMinutes(facility.slot_duration_minutes);

						const nextReservation = await db
							.prepare(
								`
                  SELECT id FROM reservations
                  WHERE court_id = ?
                    AND start_time >= ?
                    AND start_time < ?
                    AND status IN ('pending', 'confirmed', 'in_progress')
                  LIMIT 1
                `
							)
							.bind(court.id, nextSlotStart.toISOString(), nextSlotEnd.toISOString())
							.first<{ id: string }>();

						if (nextReservation) break;
						consecutiveHours++;
					}

					if (consecutiveHours >= 3) {
						gapType = 'long_gap';
					} else {
						// Check for isolated availability (booked before and after)
						const beforeSlot = new Date(slotStart);
						beforeSlot.setHours(beforeSlot.getHours() - 1);
						const afterSlot = new Date(slotEnd);

						const [beforeReservation, afterReservation] = await Promise.all([
							db
								.prepare(
									`
                    SELECT id FROM reservations
                    WHERE court_id = ?
                      AND start_time >= ?
                      AND start_time < ?
                      AND status IN ('pending', 'confirmed', 'in_progress')
                    LIMIT 1
                  `
								)
								.bind(court.id, beforeSlot.toISOString(), slotStart.toISOString())
								.first<{ id: string }>(),
							db
								.prepare(
									`
                    SELECT id FROM reservations
                    WHERE court_id = ?
                      AND start_time >= ?
                      AND start_time < ?
                      AND status IN ('pending', 'confirmed', 'in_progress')
                    LIMIT 1
                  `
								)
								.bind(court.id, slotEnd.toISOString(), afterSlot.toISOString())
								.first<{ id: string }>()
						]);

						if (beforeReservation && afterReservation) {
							gapType = 'isolated_available';
						}
					}
				}

				if (gapType) {
					insertStatements.push(
						db
							.prepare(
								`
              INSERT OR IGNORE INTO analytics_gaps (
                id, facility_id, court_id, slot_date, slot_hour, gap_type, created_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?)
            `
							)
							.bind(generateId('gap' as 'fac'), facilityId, court.id, dateStr, hour, gapType, created_at)
					);
				}
			}
		}
	}

	if (insertStatements.length > 0) {
		await db.batch(insertStatements);
	}

	return insertStatements.length;
}

/**
 * Run full analytics pipeline for a facility
 */
export async function runAnalytics(db: D1Database, facilityId: string): Promise<AnalyticsResult> {
	const [utilizationRecords, popularityRecords, gapsDetected] = await Promise.all([
		aggregateHourlyUtilization(db, facilityId),
		aggregateCourtPopularity(db, facilityId),
		detectGaps(db, facilityId)
	]);

	// Get peak and off-peak hours
	const peakHours = await db
		.prepare(
			`
      SELECT day_of_week, hour, utilization_rate
      FROM analytics_hourly
      WHERE facility_id = ?
        AND utilization_rate > 0.8
      ORDER BY utilization_rate DESC
      LIMIT 10
    `
		)
		.bind(facilityId)
		.all<{ day_of_week: number; hour: number; utilization_rate: number }>();

	const offPeakHours = await db
		.prepare(
			`
      SELECT day_of_week, hour, utilization_rate
      FROM analytics_hourly
      WHERE facility_id = ?
        AND utilization_rate < 0.3
      ORDER BY utilization_rate ASC
      LIMIT 10
    `
		)
		.bind(facilityId)
		.all<{ day_of_week: number; hour: number; utilization_rate: number }>();

	return {
		utilizationRecords,
		popularityRecords,
		gapsDetected,
		peakHours: peakHours.results || [],
		offPeakHours: offPeakHours.results || []
	};
}
