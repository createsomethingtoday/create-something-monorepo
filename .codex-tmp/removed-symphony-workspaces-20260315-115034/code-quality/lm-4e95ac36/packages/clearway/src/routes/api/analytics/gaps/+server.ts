/**
 * Analytics: Gaps API
 *
 * GET /api/analytics/gaps?facility=:id
 *
 * Returns detected gaps in the schedule for the next 7 days.
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { Gap } from '$lib/analytics';

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
		.prepare('SELECT id, name, timezone FROM facilities WHERE id = ?')
		.bind(facilityId)
		.first<{ id: string; name: string; timezone: string }>();

	if (!facility) {
		throw error(404, 'Facility not found');
	}

	// Get gaps with court details
	const gaps = await db
		.prepare(
			`
      SELECT
        g.*,
        c.name as court_name,
        c.court_type
      FROM analytics_gaps g
      JOIN courts c ON c.id = g.court_id
      WHERE g.facility_id = ?
      ORDER BY g.slot_date, g.slot_hour, c.name
    `
		)
		.bind(facilityId)
		.all<Gap & { court_name: string; court_type: string }>();

	// Group by gap type
	const groupedByType: Record<string, Array<Gap & { court_name: string; court_type: string }>> = {
		prime_time_empty: [],
		long_gap: [],
		isolated_available: []
	};

	for (const gap of gaps.results || []) {
		if (groupedByType[gap.gap_type]) {
			groupedByType[gap.gap_type].push(gap);
		}
	}

	// Count notified vs not notified
	const notifiedCount = (gaps.results || []).filter((g) => g.notified === 1).length;
	const unnotifiedCount = (gaps.results || []).filter((g) => g.notified === 0).length;

	return json({
		facility: {
			id: facility.id,
			name: facility.name,
			timezone: facility.timezone
		},
		gaps: gaps.results || [],
		summary: {
			total_gaps: gaps.results?.length || 0,
			prime_time_empty: groupedByType.prime_time_empty.length,
			long_gap: groupedByType.long_gap.length,
			isolated_available: groupedByType.isolated_available.length,
			notified: notifiedCount,
			pending_notification: unnotifiedCount
		},
		by_type: groupedByType
	});
};
