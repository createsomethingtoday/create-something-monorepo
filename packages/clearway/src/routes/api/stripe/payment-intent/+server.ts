/**
 * Stripe Payment Intent API
 *
 * POST /api/stripe/payment-intent - Create payment intent for in-widget checkout
 *
 * This endpoint creates a Payment Intent that can be confirmed client-side
 * using Stripe Elements, enabling in-widget payment without redirect.
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { Reservation } from '$lib/types';
import { createStripeClient, createDestinationCharge } from '$lib/services/stripe-connect';

interface CreatePaymentIntentBody {
	reservation_id: string;
}

export const POST: RequestHandler = async ({ request, platform }) => {
	const db = platform?.env.DB;
	const stripeKey = platform?.env.STRIPE_SECRET_KEY;

	if (!db) {
		throw error(500, 'Database not available');
	}
	if (!stripeKey) {
		throw error(500, 'Stripe not configured');
	}

	const body = (await request.json()) as CreatePaymentIntentBody;
	const { reservation_id } = body;

	if (!reservation_id) {
		throw error(400, 'reservation_id is required');
	}

	// Get reservation with related data
	const reservation = await db
		.prepare(
			`SELECT r.*, c.name as court_name, c.price_per_slot_cents,
              f.name as facility_name, f.slug as facility_slug,
              f.stripe_account_id, f.stripe_account_status, f.platform_fee_bps,
              m.email as member_email, m.name as member_name
       FROM reservations r
       JOIN courts c ON c.id = r.court_id
       JOIN facilities f ON f.id = r.facility_id
       JOIN members m ON m.id = r.member_id
       WHERE r.id = ?`
		)
		.bind(reservation_id)
		.first<
			Reservation & {
				court_name: string;
				price_per_slot_cents: number;
				facility_name: string;
				facility_slug: string;
				stripe_account_id: string | null;
				stripe_account_status: string;
				platform_fee_bps: number;
				member_email: string;
				member_name: string;
			}
		>();

	if (!reservation) {
		throw error(404, 'Reservation not found');
	}

	// Verify reservation is pending payment
	if (reservation.status !== 'pending') {
		throw error(400, `Reservation is ${reservation.status}, not pending payment`);
	}

	if (reservation.payment_status !== 'pending') {
		throw error(400, `Payment is ${reservation.payment_status}, not pending`);
	}

	// Verify facility has connected Stripe account
	if (!reservation.stripe_account_id) {
		throw error(400, 'Facility has not connected Stripe');
	}

	if (reservation.stripe_account_status !== 'active') {
		throw error(400, 'Facility Stripe account is not active');
	}

	const stripe = createStripeClient(stripeKey);

	// Calculate amount
	const amount = reservation.rate_cents || reservation.price_per_slot_cents || 0;
	if (amount <= 0) {
		throw error(400, 'No payment required for this reservation');
	}

	// Format reservation time for description
	const startTime = new Date(reservation.start_time);
	const endTime = new Date(reservation.end_time);
	const dateStr = startTime.toLocaleDateString('en-US', {
		weekday: 'short',
		month: 'short',
		day: 'numeric'
	});
	const timeStr = `${startTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} - ${endTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;

	// Create Payment Intent (without confirming)
	const paymentIntent = await createDestinationCharge(stripe, {
		destinationAccountId: reservation.stripe_account_id,
		platformFeeBps: reservation.platform_fee_bps || 500,
		amount: amount,
		currency: 'usd',
		description: `${reservation.court_name} - ${reservation.facility_name} - ${dateStr}, ${timeStr}`,
		statementDescriptor: reservation.facility_name.substring(0, 22), // Max 22 chars
		metadata: {
			reservation_id: reservation_id,
			facility_id: reservation.facility_id,
			court_id: reservation.court_id,
			member_id: reservation.member_id,
			court_name: reservation.court_name,
			date: dateStr,
			time: timeStr
		}
	});

	// Store payment intent ID on reservation
	const now = new Date().toISOString();
	await db
		.prepare(
			`UPDATE reservations
       SET stripe_payment_intent_id = ?, updated_at = ?
       WHERE id = ?`
		)
		.bind(paymentIntent.id, now, reservation_id)
		.run();

	return json({
		clientSecret: paymentIntent.client_secret,
		amount: amount,
		currency: 'usd',
		reservationId: reservation_id,
		paymentIntentId: paymentIntent.id
	});
};
