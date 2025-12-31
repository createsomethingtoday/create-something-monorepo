/**
 * Admin Calendar - Server Load
 *
 * Fetches courts and reservations for the timeline view.
 * Shows all bookings across courts for a selected date.
 */

import type { PageServerLoad } from './$types';

interface Court {
	id: string;
	name: string;
	court_type: string;
	sort_order: number;
}

interface Reservation {
	id: string;
	court_id: string;
	member_name: string;
	member_email: string;
	start_time: string;
	end_time: string;
	status: string;
	booking_source: string;
	rate_cents: number | null;
}

export const load: PageServerLoad = async ({ platform, url }) => {
	const db = platform?.env.DB;

	// Get date from query param, default to today
	const dateParam = url.searchParams.get('date');
	const selectedDate = dateParam || new Date().toISOString().split('T')[0];

	// Calculate next/prev dates for navigation
	const prevDate = new Date(selectedDate + 'T12:00:00');
	prevDate.setDate(prevDate.getDate() - 1);

	const nextDate = new Date(selectedDate + 'T12:00:00');
	nextDate.setDate(nextDate.getDate() + 1);

	// If no database, return empty data (graceful degradation)
	if (!db) {
		return {
			selectedDate,
			courts: [],
			reservations: [],
			prevDate: prevDate.toISOString().split('T')[0],
			nextDate: nextDate.toISOString().split('T')[0],
			error: 'Database not available'
		};
	}

	const facilityId = 'fac_thestack';

	try {
		// Fetch courts
		const courtsResult = await db
			.prepare(
				`
				SELECT id, name, court_type, sort_order
				FROM courts
				WHERE facility_id = ?
				ORDER BY sort_order
			`
			)
			.bind(facilityId)
			.all<Court>();

		// Fetch reservations for the selected date
		const reservationsResult = await db
			.prepare(
				`
				SELECT
					r.id,
					r.court_id,
					m.name as member_name,
					m.email as member_email,
					r.start_time,
					r.end_time,
					r.status,
					r.booking_source,
					r.rate_cents
				FROM reservations r
				JOIN members m ON r.member_id = m.id
				WHERE r.facility_id = ?
				AND date(r.start_time) = ?
				ORDER BY r.start_time
			`
			)
			.bind(facilityId, selectedDate)
			.all<Reservation>();

		return {
			selectedDate,
			courts: courtsResult.results || [],
			reservations: reservationsResult.results || [],
			prevDate: prevDate.toISOString().split('T')[0],
			nextDate: nextDate.toISOString().split('T')[0],
			error: null
		};
	} catch (err) {
		console.error('Calendar load error:', err);

		return {
			selectedDate,
			courts: [],
			reservations: [],
			prevDate: prevDate.toISOString().split('T')[0],
			nextDate: nextDate.toISOString().split('T')[0],
			error: err instanceof Error ? err.message : 'Failed to load calendar data'
		};
	}
};
