/**
 * Dynamic Pricing Suggestions
 *
 * Generate pricing recommendations based on utilization data.
 * Suggestions require human approval - never auto-applied.
 *
 * The infrastructure disappears; pricing adapts to demand.
 */

import { generateId } from '$lib/types';

// ============================================================================
// Types
// ============================================================================

export interface PricingSuggestion {
	id: string;
	facility_id: string;
	court_id: string | null;
	day_of_week: number | null;
	hour_start: number | null;
	hour_end: number | null;
	suggested_rate_cents: number;
	base_rate_cents: number;
	adjustment_percent: number;
	reason: string;
	confidence_score: number; // 0.0 to 1.0
	status: 'pending' | 'approved' | 'rejected' | 'expired';
	created_at: string;
	reviewed_at: string | null;
	reviewed_by: string | null;
}

export interface SuggestionConfig {
	peakThreshold: number; // Utilization > this = peak (e.g., 0.8)
	offPeakThreshold: number; // Utilization < this = off-peak (e.g., 0.3)
	peakAdjustment: number; // Percentage increase for peak (e.g., 50)
	offPeakAdjustment: number; // Percentage decrease for off-peak (e.g., -25)
	minDataPoints: number; // Minimum bookings to be confident (e.g., 10)
}

const DEFAULT_CONFIG: SuggestionConfig = {
	peakThreshold: 0.8,
	offPeakThreshold: 0.3,
	peakAdjustment: 50,
	offPeakAdjustment: -25,
	minDataPoints: 10
};

// ============================================================================
// Suggestion Generation
// ============================================================================

/**
 * Generate pricing suggestions for a facility based on utilization data
 */
export async function generatePricingSuggestions(
	db: D1Database,
	facilityId: string,
	config: Partial<SuggestionConfig> = {}
): Promise<number> {
	const cfg = { ...DEFAULT_CONFIG, ...config };

	// Get base rates for all courts
	const courts = await db
		.prepare(
			`
      SELECT id, name, price_per_slot_cents
      FROM courts
      WHERE facility_id = ?
        AND is_active = 1
        AND price_per_slot_cents IS NOT NULL
    `
		)
		.bind(facilityId)
		.all<{ id: string; name: string; price_per_slot_cents: number }>();

	if (!courts.results || courts.results.length === 0) {
		console.warn(`No courts with pricing found for facility ${facilityId}`);
		return 0;
	}

	// Get utilization data
	const utilization = await db
		.prepare(
			`
      SELECT day_of_week, hour, utilization_rate, booked_slots
      FROM analytics_hourly
      WHERE facility_id = ?
      ORDER BY day_of_week, hour
    `
		)
		.bind(facilityId)
		.all<{
			day_of_week: number;
			hour: number;
			utilization_rate: number;
			booked_slots: number;
		}>();

	if (!utilization.results || utilization.results.length === 0) {
		console.warn(`No utilization data for facility ${facilityId} - run analytics first`);
		return 0;
	}

	const created_at = new Date().toISOString();
	const insertStatements: D1PreparedStatement[] = [];

	// Average base rate across all courts (for facility-wide suggestions)
	const avgBaseRate =
		courts.results.reduce((sum, c) => sum + c.price_per_slot_cents, 0) / courts.results.length;

	// Group utilization into contiguous time blocks
	const timeBlocks = groupIntoTimeBlocks(utilization.results);

	for (const block of timeBlocks) {
		// Determine if this is peak or off-peak
		const avgUtilization =
			block.hours.reduce((sum, h) => sum + h.utilization_rate, 0) / block.hours.length;
		const totalBookings = block.hours.reduce((sum, h) => sum + h.booked_slots, 0);

		// Skip if insufficient data
		if (totalBookings < cfg.minDataPoints) {
			continue;
		}

		let adjustment: number;
		let reason: string;

		if (avgUtilization >= cfg.peakThreshold) {
			adjustment = cfg.peakAdjustment;
			reason = `Peak demand (${(avgUtilization * 100).toFixed(0)}% utilization) - increase price to ${adjustment}%`;
		} else if (avgUtilization <= cfg.offPeakThreshold) {
			adjustment = cfg.offPeakAdjustment;
			reason = `Low demand (${(avgUtilization * 100).toFixed(0)}% utilization) - decrease price by ${Math.abs(adjustment)}% to attract bookings`;
		} else {
			continue; // No suggestion for normal utilization
		}

		// Confidence score based on data quality
		// More bookings = higher confidence, capped at 1.0
		const confidence = Math.min(totalBookings / (cfg.minDataPoints * 5), 1.0);

		// Create facility-wide suggestion (court_id = NULL)
		const suggested_rate_cents = Math.round(avgBaseRate * (1 + adjustment / 100));

		insertStatements.push(
			db
				.prepare(
					`
          INSERT OR IGNORE INTO pricing_suggestions (
            id, facility_id, court_id, day_of_week, hour_start, hour_end,
            suggested_rate_cents, base_rate_cents, adjustment_percent,
            reason, confidence_score, status, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `
				)
				.bind(
					generateId('psg' as 'fac'), // pricing suggestion ID
					facilityId,
					null, // Applies to all courts
					block.day_of_week,
					block.hours[0].hour,
					block.hours[block.hours.length - 1].hour,
					suggested_rate_cents,
					Math.round(avgBaseRate),
					adjustment,
					reason,
					confidence,
					'pending',
					created_at
				)
		);
	}

	if (insertStatements.length > 0) {
		await db.batch(insertStatements);
	}

	return insertStatements.length;
}

/**
 * Group hourly utilization into contiguous time blocks (same day, consecutive hours)
 */
function groupIntoTimeBlocks(
	hours: Array<{ day_of_week: number; hour: number; utilization_rate: number; booked_slots: number }>
): Array<{
	day_of_week: number;
	hours: Array<{ hour: number; utilization_rate: number; booked_slots: number }>;
}> {
	const blocks: Array<{
		day_of_week: number;
		hours: Array<{ hour: number; utilization_rate: number; booked_slots: number }>;
	}> = [];

	let currentBlock: {
		day_of_week: number;
		hours: Array<{ hour: number; utilization_rate: number; booked_slots: number }>;
	} | null = null;

	for (const h of hours) {
		if (!currentBlock || currentBlock.day_of_week !== h.day_of_week) {
			// Start new block
			if (currentBlock) {
				blocks.push(currentBlock);
			}
			currentBlock = {
				day_of_week: h.day_of_week,
				hours: [{ hour: h.hour, utilization_rate: h.utilization_rate, booked_slots: h.booked_slots }]
			};
		} else {
			// Add to current block
			currentBlock.hours.push({
				hour: h.hour,
				utilization_rate: h.utilization_rate,
				booked_slots: h.booked_slots
			});
		}
	}

	if (currentBlock) {
		blocks.push(currentBlock);
	}

	return blocks;
}

/**
 * Approve a pricing suggestion
 */
export async function approveSuggestion(
	db: D1Database,
	suggestionId: string,
	reviewedBy: string
): Promise<boolean> {
	const reviewed_at = new Date().toISOString();

	const result = await db
		.prepare(
			`
      UPDATE pricing_suggestions
      SET status = 'approved', reviewed_at = ?, reviewed_by = ?
      WHERE id = ? AND status = 'pending'
    `
		)
		.bind(reviewed_at, reviewedBy, suggestionId)
		.run();

	return result.meta.changes > 0;
}

/**
 * Reject a pricing suggestion
 */
export async function rejectSuggestion(
	db: D1Database,
	suggestionId: string,
	reviewedBy: string
): Promise<boolean> {
	const reviewed_at = new Date().toISOString();

	const result = await db
		.prepare(
			`
      UPDATE pricing_suggestions
      SET status = 'rejected', reviewed_at = ?, reviewed_by = ?
      WHERE id = ? AND status = 'pending'
    `
		)
		.bind(reviewed_at, reviewedBy, suggestionId)
		.run();

	return result.meta.changes > 0;
}

/**
 * Get pending suggestions for a facility
 */
export async function getPendingSuggestions(
	db: D1Database,
	facilityId: string
): Promise<PricingSuggestion[]> {
	const results = await db
		.prepare(
			`
      SELECT *
      FROM pricing_suggestions
      WHERE facility_id = ?
        AND status = 'pending'
      ORDER BY confidence_score DESC, created_at DESC
    `
		)
		.bind(facilityId)
		.all<PricingSuggestion>();

	return results.results || [];
}

/**
 * Expire old pending suggestions (older than 7 days)
 */
export async function expireOldSuggestions(db: D1Database): Promise<number> {
	const sevenDaysAgo = new Date();
	sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

	const result = await db
		.prepare(
			`
      UPDATE pricing_suggestions
      SET status = 'expired'
      WHERE status = 'pending'
        AND created_at < ?
    `
		)
		.bind(sevenDaysAgo.toISOString())
		.run();

	return result.meta.changes;
}
