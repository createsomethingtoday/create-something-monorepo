/**
 * CLEARWAY Workflow Definitions
 *
 * These are WORKWAY workflow definitions for CLEARWAY automation.
 * They define what happens after notification events trigger.
 */

export { bookingConfirmedWorkflow } from './booking-confirmed';

/**
 * Workflow IDs used in CLEARWAY
 *
 * These IDs must match the workflow IDs configured in WORKWAY platform.
 */
export const CLEARWAY_WORKFLOWS = {
	BOOKING_CONFIRMED: 'clearway-booking-confirmed',
	BOOKING_REMINDER: 'clearway-booking-reminder',
	BOOKING_CANCELLED: 'clearway-booking-cancelled',
	PAYMENT_RECEIVED: 'clearway-payment-received'
} as const;
