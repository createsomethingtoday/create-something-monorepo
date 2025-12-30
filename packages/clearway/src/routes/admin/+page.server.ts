/**
 * Admin Dashboard - Server Load
 *
 * Heideggerian principle: The interface recedes; only the data remains.
 * Show what matters for facility management without overwhelming.
 */

import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';

interface DashboardStats {
	today: {
		reservations: number;
		revenue: number;
		utilization: number;
	};
	week: {
		reservations: number;
		revenue: number;
		utilization: number;
	};
	month: {
		reservations: number;
		revenue: number;
	};
}

interface RecentReservation {
	id: string;
	court_name: string;
	member_name: string;
	member_email: string;
	start_time: string;
	end_time: string;
	status: string;
	booking_source: string;
	rate_cents: number | null;
}

interface TopMember {
	id: string;
	name: string;
	email: string;
	total_bookings: number;
	membership_type: string;
}

interface CourtUtilization {
	id: string;
	name: string;
	bookings_today: number;
	bookings_week: number;
	revenue_week: number;
}

export const load: PageServerLoad = async ({ platform }) => {
	const db = platform?.env.DB;
	if (!db) {
		throw error(500, 'Database not available');
	}

	const facilityId = 'fac_thestack';
	const now = new Date();
	const today = now.toISOString().split('T')[0];

	// Calculate date ranges
	const weekAgo = new Date(now);
	weekAgo.setDate(weekAgo.getDate() - 7);
	const weekAgoStr = weekAgo.toISOString();

	const monthAgo = new Date(now);
	monthAgo.setMonth(monthAgo.getMonth() - 1);
	const monthAgoStr = monthAgo.toISOString();

	// Today's stats
	const todayStats = await db
		.prepare(
			`
			SELECT
				COUNT(*) as count,
				SUM(COALESCE(rate_cents, 0)) as revenue
			FROM reservations
			WHERE facility_id = ?
			AND date(start_time) = ?
			AND status NOT IN ('cancelled', 'refunded')
		`
		)
		.bind(facilityId, today)
		.first<{ count: number; revenue: number }>();

	// Week stats
	const weekStats = await db
		.prepare(
			`
			SELECT
				COUNT(*) as count,
				SUM(COALESCE(rate_cents, 0)) as revenue
			FROM reservations
			WHERE facility_id = ?
			AND start_time >= ?
			AND status NOT IN ('cancelled', 'refunded')
		`
		)
		.bind(facilityId, weekAgoStr)
		.first<{ count: number; revenue: number }>();

	// Month stats
	const monthStats = await db
		.prepare(
			`
			SELECT
				COUNT(*) as count,
				SUM(COALESCE(rate_cents, 0)) as revenue
			FROM reservations
			WHERE facility_id = ?
			AND start_time >= ?
			AND status NOT IN ('cancelled', 'refunded')
		`
		)
		.bind(facilityId, monthAgoStr)
		.first<{ count: number; revenue: number }>();

	// Calculate utilization (slots booked / total available slots)
	const totalCourts = 8; // 8 courts at The Stack
	const hoursPerDay = 16; // 6am-10pm
	const todayUtilization = (todayStats?.count || 0) / (totalCourts * hoursPerDay);
	const weekUtilization = (weekStats?.count || 0) / (totalCourts * hoursPerDay * 7);

	const stats: DashboardStats = {
		today: {
			reservations: todayStats?.count || 0,
			revenue: todayStats?.revenue || 0,
			utilization: Math.round(todayUtilization * 100)
		},
		week: {
			reservations: weekStats?.count || 0,
			revenue: weekStats?.revenue || 0,
			utilization: Math.round(weekUtilization * 100)
		},
		month: {
			reservations: monthStats?.count || 0,
			revenue: monthStats?.revenue || 0
		}
	};

	// Recent reservations (last 20)
	const recentResult = await db
		.prepare(
			`
			SELECT
				r.id,
				c.name as court_name,
				m.name as member_name,
				m.email as member_email,
				r.start_time,
				r.end_time,
				r.status,
				r.booking_source,
				r.rate_cents
			FROM reservations r
			JOIN courts c ON r.court_id = c.id
			JOIN members m ON r.member_id = m.id
			WHERE r.facility_id = ?
			ORDER BY r.created_at DESC
			LIMIT 20
		`
		)
		.bind(facilityId)
		.all<RecentReservation>();

	// Top members by bookings
	const topMembersResult = await db
		.prepare(
			`
			SELECT
				id,
				name,
				email,
				total_bookings,
				membership_type
			FROM members
			WHERE facility_id = ?
			ORDER BY total_bookings DESC
			LIMIT 10
		`
		)
		.bind(facilityId)
		.all<TopMember>();

	// Court utilization
	const courtUtilResult = await db
		.prepare(
			`
			SELECT
				c.id,
				c.name,
				(SELECT COUNT(*) FROM reservations r
				 WHERE r.court_id = c.id AND date(r.start_time) = ?
				 AND r.status NOT IN ('cancelled', 'refunded')) as bookings_today,
				(SELECT COUNT(*) FROM reservations r
				 WHERE r.court_id = c.id AND r.start_time >= ?
				 AND r.status NOT IN ('cancelled', 'refunded')) as bookings_week,
				(SELECT SUM(COALESCE(r.rate_cents, 0)) FROM reservations r
				 WHERE r.court_id = c.id AND r.start_time >= ?
				 AND r.status NOT IN ('cancelled', 'refunded')) as revenue_week
			FROM courts c
			WHERE c.facility_id = ?
			ORDER BY c.sort_order
		`
		)
		.bind(today, weekAgoStr, weekAgoStr, facilityId)
		.all<CourtUtilization>();

	return {
		stats,
		recentReservations: recentResult.results || [],
		topMembers: topMembersResult.results || [],
		courtUtilization: courtUtilResult.results || []
	};
};
