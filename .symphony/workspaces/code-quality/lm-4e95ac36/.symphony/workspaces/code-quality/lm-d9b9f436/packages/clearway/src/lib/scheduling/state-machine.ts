/**
 * Reservation State Machine
 *
 * Explicit state transitions with side effects.
 * The infrastructure disappears; reservations flow.
 *
 * State Graph:
 * pending → confirmed → in_progress → completed → archived
 *     ↓         ↓             ↓
 * cancelled   no_show     disputed → refunded
 */

import type { Reservation, ReservationStatus } from '$lib/types';

// Valid state transitions
const TRANSITIONS: Record<ReservationStatus, ReservationStatus[]> = {
	pending: ['confirmed', 'cancelled'],
	confirmed: ['in_progress', 'cancelled', 'no_show'],
	in_progress: ['completed', 'disputed'],
	completed: ['archived', 'disputed'],
	cancelled: ['archived'],
	no_show: ['archived'],
	disputed: ['refunded', 'completed'],
	refunded: ['archived'],
	archived: [] // Terminal state
};

// Transition side effects
export type TransitionEffect =
	| { type: 'send_confirmation'; memberId: string; reservationId: string }
	| { type: 'send_reminder'; memberId: string; reservationId: string; minutesBefore: number }
	| { type: 'send_cancellation'; memberId: string; reservationId: string }
	| { type: 'process_refund'; reservationId: string; amount: number }
	| { type: 'increment_no_show'; memberId: string }
	| { type: 'notify_waitlist'; facilityId: string; courtId: string; startTime: string }
	| { type: 'update_member_stats'; memberId: string; action: 'increment' | 'decrement' }
	| { type: 'release_hold'; courtId: string; startTime: string };

export interface TransitionResult {
	success: boolean;
	newStatus?: ReservationStatus;
	effects: TransitionEffect[];
	error?: string;
	timestamp: string;
}

export interface TransitionContext {
	reservation: Reservation;
	memberId: string;
	facilityId: string;
	reason?: string;
	refundAmount?: number;
	cancelledBy?: 'member' | 'staff' | 'system';
}

/**
 * Check if a transition is valid
 */
export function canTransition(from: ReservationStatus, to: ReservationStatus): boolean {
	return TRANSITIONS[from]?.includes(to) ?? false;
}

/**
 * Get valid next states for a reservation
 */
export function getValidTransitions(status: ReservationStatus): ReservationStatus[] {
	return TRANSITIONS[status] || [];
}

/**
 * Execute a state transition with side effects
 */
export function transition(
	ctx: TransitionContext,
	to: ReservationStatus
): TransitionResult {
	const { reservation, memberId, facilityId } = ctx;
	const from = reservation.status;
	const now = new Date().toISOString();

	// Validate transition
	if (!canTransition(from, to)) {
		return {
			success: false,
			effects: [],
			error: `Invalid transition: ${from} → ${to}`,
			timestamp: now
		};
	}

	// Collect side effects based on transition
	const effects: TransitionEffect[] = [];

	switch (to) {
		case 'confirmed':
			effects.push({
				type: 'send_confirmation',
				memberId,
				reservationId: reservation.id
			});
			effects.push({
				type: 'send_reminder',
				memberId,
				reservationId: reservation.id,
				minutesBefore: 120 // 2 hours before
			});
			effects.push({
				type: 'update_member_stats',
				memberId,
				action: 'increment'
			});
			break;

		case 'cancelled':
			effects.push({
				type: 'send_cancellation',
				memberId,
				reservationId: reservation.id
			});
			effects.push({
				type: 'release_hold',
				courtId: reservation.court_id,
				startTime: reservation.start_time
			});
			effects.push({
				type: 'notify_waitlist',
				facilityId,
				courtId: reservation.court_id,
				startTime: reservation.start_time
			});
			// Only decrement if was confirmed (not just pending)
			if (from === 'confirmed' || from === 'in_progress') {
				effects.push({
					type: 'update_member_stats',
					memberId,
					action: 'decrement'
				});
			}
			break;

		case 'no_show':
			effects.push({
				type: 'increment_no_show',
				memberId
			});
			effects.push({
				type: 'notify_waitlist',
				facilityId,
				courtId: reservation.court_id,
				startTime: reservation.start_time
			});
			break;

		case 'refunded':
			if (ctx.refundAmount) {
				effects.push({
					type: 'process_refund',
					reservationId: reservation.id,
					amount: ctx.refundAmount
				});
			}
			break;

		case 'in_progress':
			// No side effects - just status update
			break;

		case 'completed':
			// No side effects - just status update
			break;

		case 'disputed':
			// Disputes are handled externally (Stripe)
			break;

		case 'archived':
			// Final cleanup - no effects needed
			break;
	}

	return {
		success: true,
		newStatus: to,
		effects,
		timestamp: now
	};
}

/**
 * Generate SQL update for a transition
 */
export function getTransitionSQL(
	reservationId: string,
	to: ReservationStatus,
	reason?: string
): { sql: string; bindings: unknown[] } {
	const now = new Date().toISOString();

	const updates: string[] = ['status = ?', 'updated_at = ?'];
	const bindings: unknown[] = [to, now];

	switch (to) {
		case 'confirmed':
			updates.push('confirmed_at = ?');
			bindings.push(now);
			break;
		case 'cancelled':
			updates.push('cancelled_at = ?');
			updates.push('cancellation_reason = ?');
			bindings.push(now, reason || null);
			break;
		case 'in_progress':
			updates.push('checked_in_at = ?');
			bindings.push(now);
			break;
		case 'completed':
			updates.push('completed_at = ?');
			bindings.push(now);
			break;
	}

	bindings.push(reservationId);

	return {
		sql: `UPDATE reservations SET ${updates.join(', ')} WHERE id = ?`,
		bindings
	};
}

/**
 * Check if a reservation can be cancelled based on policy
 */
export interface CancellationCheck {
	allowed: boolean;
	reason?: string;
	hoursBeforeStart: number;
	withinPolicy: boolean;
	penaltyCredits: number;
}

export function checkCancellationPolicy(
	reservation: Reservation,
	cancellationHours: number,
	penaltyCredits: number
): CancellationCheck {
	const now = new Date();
	const startTime = new Date(reservation.start_time);
	const hoursBeforeStart = (startTime.getTime() - now.getTime()) / (1000 * 60 * 60);

	// Can't cancel past reservations
	if (hoursBeforeStart < 0) {
		return {
			allowed: false,
			reason: 'Cannot cancel past reservations',
			hoursBeforeStart,
			withinPolicy: false,
			penaltyCredits: 0
		};
	}

	// Can't cancel in-progress or completed
	if (!canTransition(reservation.status, 'cancelled')) {
		return {
			allowed: false,
			reason: `Cannot cancel reservation in ${reservation.status} status`,
			hoursBeforeStart,
			withinPolicy: false,
			penaltyCredits: 0
		};
	}

	// Check if within policy window
	const withinPolicy = hoursBeforeStart >= cancellationHours;

	return {
		allowed: true,
		hoursBeforeStart,
		withinPolicy,
		penaltyCredits: withinPolicy ? 0 : penaltyCredits
	};
}

/**
 * Check if a member can check in to a reservation
 */
export function canCheckIn(reservation: Reservation): {
	allowed: boolean;
	reason?: string;
} {
	if (reservation.status !== 'confirmed') {
		return {
			allowed: false,
			reason: `Cannot check in to ${reservation.status} reservation`
		};
	}

	const now = new Date();
	const startTime = new Date(reservation.start_time);
	const endTime = new Date(reservation.end_time);

	// Allow check-in 15 minutes before start time
	const earliestCheckIn = new Date(startTime.getTime() - 15 * 60 * 1000);

	if (now < earliestCheckIn) {
		return {
			allowed: false,
			reason: 'Too early to check in (available 15 minutes before)'
		};
	}

	if (now > endTime) {
		return {
			allowed: false,
			reason: 'Reservation has already ended'
		};
	}

	return { allowed: true };
}

/**
 * Determine if a no-show should be recorded
 * Called after reservation end time
 */
export function shouldMarkNoShow(reservation: Reservation): boolean {
	if (reservation.status !== 'confirmed') {
		return false;
	}

	const now = new Date();
	const endTime = new Date(reservation.end_time);

	// Mark as no-show if confirmed reservation has ended without check-in
	return now > endTime && !reservation.checked_in_at;
}
