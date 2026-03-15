/**
 * Stripe Checkout API
 *
 * POST /api/stripe/checkout - Create checkout session for reservation payment
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { Reservation, Facility, Court, Member } from '$lib/types';
import { createStripeClient, createCheckoutSession } from '$lib/services/stripe-connect';

interface CreateCheckoutBody {
	reservation_id: string;
}

export const POST: RequestHandler = async ({ request, platform, url }) => {
	const db = platform?.env.DB;
	const stripeKey = platform?.env.STRIPE_SECRET_KEY;

	if (!db) {
		throw error(500, 'Database not available');
	}
	if (!stripeKey) {
		throw error(500, 'Stripe not configured');
	}

	const body = (await request.json()) as CreateCheckoutBody;
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
	const baseUrl = url.origin;

	// Calculate amount
	const amount = reservation.rate_cents || reservation.price_per_slot_cents || 0;
	if (amount <= 0) {
		throw error(400, 'No payment required for this reservation');
	}

	// Format reservation time for display
	const startTime = new Date(reservation.start_time);
	const endTime = new Date(reservation.end_time);
	const dateStr = startTime.toLocaleDateString('en-US', {
		weekday: 'short',
		month: 'short',
		day: 'numeric'
	});
	const timeStr = `${startTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} - ${endTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;

	// Create Checkout Session
	const session = await createCheckoutSession(stripe, {
		destinationAccountId: reservation.stripe_account_id,
		platformFeeBps: reservation.platform_fee_bps || 500,
		lineItems: [
			{
				name: `${reservation.court_name} - ${reservation.facility_name}`,
				description: `${dateStr}, ${timeStr}`,
				amount: amount,
				quantity: 1
			}
		],
		successUrl: `${baseUrl}/book/${reservation.facility_slug}/success?reservation=${reservation_id}&session_id={CHECKOUT_SESSION_ID}`,
		cancelUrl: `${baseUrl}/book/${reservation.facility_slug}/cancel?reservation=${reservation_id}`,
		customerEmail: reservation.member_email,
		metadata: {
			reservation_id: reservation_id,
			facility_id: reservation.facility_id,
			court_id: reservation.court_id,
			member_id: reservation.member_id
		}
	});

	// Store checkout session ID on reservation
	const now = new Date().toISOString();
	await db
		.prepare(
			`UPDATE reservations
       SET stripe_checkout_session_id = ?, updated_at = ?
       WHERE id = ?`
		)
		.bind(session.id, now, reservation_id)
		.run();

	return json({
		checkoutUrl: session.url,
		sessionId: session.id,
		expiresAt: session.expires_at
			? new Date(session.expires_at * 1000).toISOString()
			: null
	});
};
