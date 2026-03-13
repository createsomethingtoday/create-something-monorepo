/**
 * Reservation Detail API
 *
 * GET /api/reservations/:id - Get reservation details
 * PATCH /api/reservations/:id - Update reservation (status transitions)
 * DELETE /api/reservations/:id - Cancel reservation
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { Reservation, Facility, CourtType } from '$lib/types';
import {
	transition,
	canTransition,
	checkCancellationPolicy,
	canCheckIn,
	getTransitionSQL,
	type TransitionContext
} from '$lib/scheduling/state-machine';
import { processSlotOpening } from '$lib/scheduling/waitlist';

interface ReservationActionBody {
	action: 'confirm' | 'check_in' | 'complete' | 'no_show';
}

interface CancelReservationBody {
	reason?: string;
}

export const GET: RequestHandler = async ({ params, platform }) => {
	const db = platform?.env.DB;
	if (!db) {
		throw error(500, 'Database not available');
	}

	const reservation = await db
		.prepare(
			`
      SELECT r.*, c.name as court_name, c.court_type,
             m.name as member_name, m.email as member_email,
             f.name as facility_name, f.timezone
      FROM reservations r
      LEFT JOIN courts c ON c.id = r.court_id
      LEFT JOIN members m ON m.id = r.member_id
      LEFT JOIN facilities f ON f.id = r.facility_id
      WHERE r.id = ?
    `
		)
		.bind(params.id)
		.first();

	if (!reservation) {
		throw error(404, 'Reservation not found');
	}

	return json(reservation);
};

export const PATCH: RequestHandler = async ({ params, request, platform }) => {
	const db = platform?.env.DB;
	if (!db) {
		throw error(500, 'Database not available');
	}

	const body = (await request.json()) as ReservationActionBody;
	const { action } = body;

	// Get current reservation
	const reservation = await db
		.prepare('SELECT * FROM reservations WHERE id = ?')
		.bind(params.id)
		.first<Reservation>();

	if (!reservation) {
		throw error(404, 'Reservation not found');
	}

	// Get facility for policy checks
	const facility = await db
		.prepare('SELECT * FROM facilities WHERE id = ?')
		.bind(reservation.facility_id)
		.first<Facility>();

	if (!facility) {
		throw error(500, 'Facility not found');
	}

	const now = new Date().toISOString();

	switch (action) {
		case 'confirm': {
			if (!canTransition(reservation.status, 'confirmed')) {
				throw error(400, `Cannot confirm reservation in ${reservation.status} status`);
			}

			const ctx: TransitionContext = {
				reservation,
				memberId: reservation.member_id,
				facilityId: reservation.facility_id
			};

			const result = transition(ctx, 'confirmed');
			if (!result.success) {
				throw error(400, result.error || 'Transition failed');
			}

			const { sql, bindings } = getTransitionSQL(params.id, 'confirmed');
			await db.prepare(sql).bind(...bindings).run();

			// Update member stats
			await db
				.prepare(
					'UPDATE members SET total_bookings = total_bookings + 1, updated_at = ? WHERE id = ?'
				)
				.bind(now, reservation.member_id)
				.run();

			return json({ success: true, status: 'confirmed', effects: result.effects });
		}

		case 'check_in': {
			const checkInResult = canCheckIn(reservation);
			if (!checkInResult.allowed) {
				throw error(400, checkInResult.reason || 'Cannot check in');
			}

			const { sql, bindings } = getTransitionSQL(params.id, 'in_progress');
			await db.prepare(sql).bind(...bindings).run();

			return json({ success: true, status: 'in_progress' });
		}

		case 'complete': {
			if (!canTransition(reservation.status, 'completed')) {
				throw error(400, `Cannot complete reservation in ${reservation.status} status`);
			}

			const { sql, bindings } = getTransitionSQL(params.id, 'completed');
			await db.prepare(sql).bind(...bindings).run();

			return json({ success: true, status: 'completed' });
		}

		case 'no_show': {
			if (!canTransition(reservation.status, 'no_show')) {
				throw error(400, `Cannot mark no-show for reservation in ${reservation.status} status`);
			}

			const ctx: TransitionContext = {
				reservation,
				memberId: reservation.member_id,
				facilityId: reservation.facility_id
			};

			const result = transition(ctx, 'no_show');

			// Update reservation
			await db
				.prepare(
					'UPDATE reservations SET status = ?, updated_at = ? WHERE id = ?'
				)
				.bind('no_show', now, params.id)
				.run();

			// Increment member no-show count
			await db
				.prepare(
					'UPDATE members SET no_show_count = no_show_count + 1, updated_at = ? WHERE id = ?'
				)
				.bind(now, reservation.member_id)
				.run();

			// Log the no-show
			await db
				.prepare(
					`
          INSERT INTO no_show_log (id, reservation_id, member_id, recorded_at, penalty_credits, created_at)
          VALUES (?, ?, ?, ?, ?, ?)
        `
				)
				.bind(
					`ns_${Date.now()}`,
					params.id,
					reservation.member_id,
					now,
					facility.no_show_penalty_credits || 0,
					now
				)
				.run();

			// Process waitlist for the freed slot
			const court = await db
				.prepare('SELECT court_type FROM courts WHERE id = ?')
				.bind(reservation.court_id)
				.first<{ court_type: string }>();

			if (court) {
				await processSlotOpening(db, {
					facilityId: reservation.facility_id,
					courtId: reservation.court_id,
					courtType: court.court_type as any,
					startTime: reservation.start_time,
					endTime: reservation.end_time,
					durationMinutes: reservation.duration_minutes
				});
			}

			return json({ success: true, status: 'no_show', effects: result.effects });
		}

		default:
			throw error(400, `Unknown action: ${action}`);
	}
};

export const DELETE: RequestHandler = async ({ params, request, platform }) => {
	const db = platform?.env.DB;
	if (!db) {
		throw error(500, 'Database not available');
	}

	const body = (await request.json().catch(() => ({}))) as CancelReservationBody;
	const reason = body.reason || null;

	// Get current reservation
	const reservation = await db
		.prepare('SELECT * FROM reservations WHERE id = ?')
		.bind(params.id)
		.first<Reservation>();

	if (!reservation) {
		throw error(404, 'Reservation not found');
	}

	// Get facility for policy checks
	const facility = await db
		.prepare('SELECT * FROM facilities WHERE id = ?')
		.bind(reservation.facility_id)
		.first<Facility>();

	if (!facility) {
		throw error(500, 'Facility not found');
	}

	// Check cancellation policy
	const policyCheck = checkCancellationPolicy(
		reservation,
		facility.cancellation_hours,
		facility.no_show_penalty_credits || 0
	);

	if (!policyCheck.allowed) {
		throw error(400, policyCheck.reason || 'Cannot cancel this reservation');
	}

	const now = new Date().toISOString();

	// Cancel the reservation
	const { sql, bindings } = getTransitionSQL(params.id, 'cancelled', reason ?? undefined);
	await db.prepare(sql).bind(...bindings).run();

	// Log the cancellation
	await db
		.prepare(
			`
      INSERT INTO cancellation_log (
        id, reservation_id, member_id, cancelled_at,
        hours_before_start, reason, penalty_applied, penalty_credits, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
		)
		.bind(
			`cl_${Date.now()}`,
			params.id,
			reservation.member_id,
			now,
			policyCheck.hoursBeforeStart,
			reason,
			!policyCheck.withinPolicy ? 1 : 0,
			policyCheck.penaltyCredits,
			now
		)
		.run();

	// Apply penalty if outside policy window
	if (!policyCheck.withinPolicy && policyCheck.penaltyCredits > 0) {
		await db
			.prepare(
				'UPDATE members SET credits_balance = credits_balance - ?, updated_at = ? WHERE id = ?'
			)
			.bind(policyCheck.penaltyCredits, now, reservation.member_id)
			.run();
	}

	// Release hold in Durable Object
	if (platform?.env.COURT_STATE) {
		const id = platform.env.COURT_STATE.idFromName(reservation.facility_id);
		const stub = platform.env.COURT_STATE.get(id);

		await stub.fetch(
			new Request('https://dummy/cancel', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					courtId: reservation.court_id,
					startTime: reservation.start_time,
					reservationId: params.id
				})
			})
		);
	}

	// Send cancellation notification
	if (platform?.env.NOTIFICATION_QUEUE) {
		const courtInfo = await db
			.prepare('SELECT c.name as court_name, f.name as facility_name FROM courts c JOIN facilities f ON f.id = c.facility_id WHERE c.id = ?')
			.bind(reservation.court_id)
			.first<{ court_name: string; facility_name: string }>();

		const member = await db
			.prepare('SELECT email, phone FROM members WHERE id = ?')
			.bind(reservation.member_id)
			.first<{ email: string; phone: string | null }>();

		if (courtInfo && member) {
			await platform.env.NOTIFICATION_QUEUE.send({
				type: 'cancellation',
				reservationId: params.id,
				memberId: reservation.member_id,
				facilityId: reservation.facility_id,
				data: {
					courtName: courtInfo.court_name,
					startTime: reservation.start_time,
					facilityName: courtInfo.facility_name,
					penaltyApplied: !policyCheck.withinPolicy,
					email: member.email,
					phone: member.phone
				}
			});
		}
	}

	// Process waitlist for the freed slot
	const court = await db
		.prepare('SELECT court_type, name FROM courts WHERE id = ?')
		.bind(reservation.court_id)
		.first<{ court_type: string; name: string }>();

	const facilityInfo = await db
		.prepare('SELECT name FROM facilities WHERE id = ?')
		.bind(reservation.facility_id)
		.first<{ name: string }>();

	if (court && facilityInfo) {
		const waitlistResult = await processSlotOpening(
			db,
			{
				facilityId: reservation.facility_id,
				courtId: reservation.court_id,
				courtType: court.court_type as CourtType,
				startTime: reservation.start_time,
				endTime: reservation.end_time,
				durationMinutes: reservation.duration_minutes
			},
			{
				db,
				notificationQueue: platform?.env.NOTIFICATION_QUEUE,
				courtName: court.name,
				facilityName: facilityInfo.name
			}
		);

		return json({
			success: true,
			status: 'cancelled',
			policyCheck,
			waitlistPromotion: waitlistResult.promoted
				? {
						action: waitlistResult.action,
						memberId: waitlistResult.entry?.member_id
					}
				: null
		});
	}

	return json({
		success: true,
		status: 'cancelled',
		policyCheck
	});
};
