/**
 * Analytics: Utilization API
 *
 * GET /api/analytics/utilization?facility=:id
 *
 * Returns hourly utilization data with peak/off-peak identification.
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { HourlyUtilization } from '$lib/analytics';

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
		.prepare('SELECT id, name FROM facilities WHERE id = ?')
		.bind(facilityId)
		.first<{ id: string; name: string }>();

	if (!facility) {
		throw error(404, 'Facility not found');
	}

	// Get utilization data
	const utilization = await db
		.prepare(
			`
      SELECT *
      FROM analytics_hourly
      WHERE facility_id = ?
      ORDER BY day_of_week, hour
    `
		)
		.bind(facilityId)
		.all<HourlyUtilization>();

	if (!utilization.results || utilization.results.length === 0) {
		return json({
			facility: {
				id: facility.id,
				name: facility.name
			},
			utilization: [],
			peak_hours: [],
			off_peak_hours: [],
			summary: {
				avg_utilization: 0,
				peak_count: 0,
				off_peak_count: 0
			}
		});
	}

	// Identify peak and off-peak hours
	const peakThreshold = 0.8;
	const offPeakThreshold = 0.3;

	const peakHours = utilization.results.filter((u) => u.utilization_rate >= peakThreshold);
	const offPeakHours = utilization.results.filter((u) => u.utilization_rate <= offPeakThreshold);

	// Calculate summary statistics
	const avgUtilization =
		utilization.results.reduce((sum, u) => sum + u.utilization_rate, 0) /
		utilization.results.length;

	return json({
		facility: {
			id: facility.id,
			name: facility.name
		},
		utilization: utilization.results,
		peak_hours: peakHours.map((h) => ({
			day_of_week: h.day_of_week,
			hour: h.hour,
			utilization_rate: h.utilization_rate
		})),
		off_peak_hours: offPeakHours.map((h) => ({
			day_of_week: h.day_of_week,
			hour: h.hour,
			utilization_rate: h.utilization_rate
		})),
		summary: {
			avg_utilization: avgUtilization,
			peak_count: peakHours.length,
			off_peak_count: offPeakHours.length
		}
	});
};
