/**
 * Stripe Webhook Handler
 *
 * POST /api/stripe/webhook - Handle Stripe webhook events
 *
 * Events handled:
 * - account.updated: Connect account status changes
 * - checkout.session.completed: Successful payment
 * - payment_intent.succeeded: Payment confirmation
 * - payment_intent.payment_failed: Payment failure
 * - invoice.paid: SaaS subscription payment
 * - invoice.payment_failed: SaaS subscription failure
 * - customer.subscription.updated: Subscription status change
 * - customer.subscription.deleted: Subscription cancelled
 * - charge.dispute.created: Dispute opened
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createStripeClient, constructWebhookEvent } from '$lib/services/stripe-connect';
import { createLogger } from '@create-something/components/utils';
import type Stripe from 'stripe';

const logger = createLogger('ClearwayStripeWebhook');

export const POST: RequestHandler = async ({ request, platform }) => {
	const db = platform?.env.DB;
	const stripeKey = platform?.env.STRIPE_SECRET_KEY;
	const webhookSecret = platform?.env.STRIPE_WEBHOOK_SECRET;

	if (!db) {
		throw error(500, 'Database not available');
	}
	if (!stripeKey || !webhookSecret) {
		throw error(500, 'Stripe not configured');
	}

	const stripe = createStripeClient(stripeKey);
	const signature = request.headers.get('stripe-signature');

	if (!signature) {
		throw error(400, 'Missing stripe-signature header');
	}

	const payload = await request.text();
	let event: Stripe.Event;

	try {
		event = constructWebhookEvent(stripe, payload, signature, webhookSecret);
	} catch (err) {
		logger.error('Webhook signature verification failed', { error: err });
		throw error(400, 'Webhook signature verification failed');
	}

	const now = new Date().toISOString();

	try {
		switch (event.type) {
			// ==========================================================================
			// CONNECT ACCOUNT EVENTS
			// ==========================================================================
			case 'account.updated': {
				const account = event.data.object as Stripe.Account;
				await handleAccountUpdated(db, account, now);
				break;
			}

			// ==========================================================================
			// CHECKOUT & PAYMENT EVENTS
			// ==========================================================================
			case 'checkout.session.completed': {
				const session = event.data.object as Stripe.Checkout.Session;
				await handleCheckoutCompleted(db, session, now);
				break;
			}

			case 'payment_intent.succeeded': {
				const paymentIntent = event.data.object as Stripe.PaymentIntent;
				await handlePaymentSucceeded(db, paymentIntent, now);
				break;
			}

			case 'payment_intent.payment_failed': {
				const paymentIntent = event.data.object as Stripe.PaymentIntent;
				await handlePaymentFailed(db, paymentIntent, now);
				break;
			}

			// ==========================================================================
			// SUBSCRIPTION EVENTS (SaaS)
			// ==========================================================================
			case 'invoice.paid': {
				const invoice = event.data.object as Stripe.Invoice;
				await handleInvoicePaid(db, invoice, now);
				break;
			}

			case 'invoice.payment_failed': {
				const invoice = event.data.object as Stripe.Invoice;
				await handleInvoicePaymentFailed(db, invoice, now);
				break;
			}

			case 'customer.subscription.updated': {
				const subscription = event.data.object as Stripe.Subscription;
				await handleSubscriptionUpdated(db, subscription, now);
				break;
			}

			case 'customer.subscription.deleted': {
				const subscription = event.data.object as Stripe.Subscription;
				await handleSubscriptionDeleted(db, subscription, now);
				break;
			}

			// ==========================================================================
			// DISPUTE EVENTS
			// ==========================================================================
			case 'charge.dispute.created': {
				const dispute = event.data.object as Stripe.Dispute;
				await handleDisputeCreated(db, dispute, now);
				break;
			}

			default:
				logger.debug('Unhandled event type', { eventType: event.type });
		}
	} catch (err) {
		logger.error('Error handling webhook', { eventType: event.type, error: err });
		// Return 200 to acknowledge receipt (Stripe will retry otherwise)
		// Log the error for investigation
	}

	return json({ received: true });
};

// ==========================================================================
// HANDLER IMPLEMENTATIONS
// ==========================================================================

async function handleAccountUpdated(
	db: D1Database,
	account: Stripe.Account,
	now: string
): Promise<void> {
	const chargesEnabled = account.charges_enabled ? 1 : 0;
	const payoutsEnabled = account.payouts_enabled ? 1 : 0;

	let status = 'pending';
	if (chargesEnabled && payoutsEnabled) {
		status = 'active';
	} else if (account.details_submitted) {
		status = 'onboarding';
	}
	if (account.requirements?.disabled_reason) {
		status = 'restricted';
	}

	await db
		.prepare(
			`UPDATE facilities
       SET stripe_account_status = ?,
           stripe_charges_enabled = ?,
           stripe_payouts_enabled = ?,
           updated_at = ?
       WHERE stripe_account_id = ?`
		)
		.bind(status, chargesEnabled, payoutsEnabled, now, account.id)
		.run();

	logger.info('Account updated', { accountId: account.id, status });
}

async function handleCheckoutCompleted(
	db: D1Database,
	session: Stripe.Checkout.Session,
	now: string
): Promise<void> {
	const reservationId = session.metadata?.reservation_id;
	if (!reservationId) {
		logger.debug('Checkout completed without reservation_id');
		return;
	}

	// Update reservation status
	await db
		.prepare(
			`UPDATE reservations
       SET status = 'confirmed',
           payment_status = 'paid',
           stripe_payment_intent_id = ?,
           confirmed_at = ?,
           updated_at = ?
       WHERE id = ? AND status = 'pending'`
		)
		.bind(session.payment_intent, now, now, reservationId)
		.run();

	// Get reservation details for payment record
	const reservation = await db
		.prepare('SELECT facility_id, member_id, rate_cents FROM reservations WHERE id = ?')
		.bind(reservationId)
		.first<{ facility_id: string; member_id: string; rate_cents: number }>();

	if (!reservation) {
		logger.error('Reservation not found', { reservationId });
		return;
	}

	// Get member email
	const member = await db
		.prepare('SELECT email FROM members WHERE id = ?')
		.bind(reservation.member_id)
		.first<{ email: string }>();

	// Get facility platform fee
	const facility = await db
		.prepare('SELECT platform_fee_bps FROM facilities WHERE id = ?')
		.bind(reservation.facility_id)
		.first<{ platform_fee_bps: number }>();

	const totalAmount = session.amount_total || 0;
	const platformFee = Math.round(
		(totalAmount * (facility?.platform_fee_bps || 500)) / 10000
	);
	const facilityAmount = totalAmount - platformFee;

	// Create payment record
	await db
		.prepare(
			`INSERT INTO reservation_payments (
        id, facility_id, reservation_id, member_email,
        stripe_payment_intent_id, amount_total, platform_fee, facility_amount,
        status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'succeeded', ?, ?)`
		)
		.bind(
			`rp_${Date.now()}`,
			reservation.facility_id,
			reservationId,
			member?.email || session.customer_email || '',
			session.payment_intent,
			totalAmount,
			platformFee,
			facilityAmount,
			now,
			now
		)
		.run();

	// Update member booking stats
	await db
		.prepare(
			'UPDATE members SET total_bookings = total_bookings + 1, updated_at = ? WHERE id = ?'
		)
		.bind(now, reservation.member_id)
		.run();

	logger.info('Checkout completed', { reservationId });
}

async function handlePaymentSucceeded(
	db: D1Database,
	paymentIntent: Stripe.PaymentIntent,
	now: string
): Promise<void> {
	const reservationId = paymentIntent.metadata?.reservation_id;

	// If this is for a reservation, confirm it
	if (reservationId) {
		// First check if reservation exists and is pending
		const reservation = await db
			.prepare('SELECT id, status, payment_status FROM reservations WHERE id = ?')
			.bind(reservationId)
			.first<{ id: string; status: string; payment_status: string }>();

		if (reservation && reservation.status === 'pending') {
			// Update reservation to confirmed
			await db
				.prepare(
					`UPDATE reservations
           SET status = 'confirmed',
               payment_status = 'paid',
               stripe_payment_intent_id = ?,
               confirmed_at = ?,
               updated_at = ?
           WHERE id = ? AND status = 'pending'`
				)
				.bind(paymentIntent.id, now, now, reservationId)
				.run();

			// Get reservation details for payment record
			const fullReservation = await db
				.prepare(
					'SELECT facility_id, member_id, rate_cents FROM reservations WHERE id = ?'
				)
				.bind(reservationId)
				.first<{ facility_id: string; member_id: string; rate_cents: number }>();

			if (fullReservation) {
				// Get member email
				const member = await db
					.prepare('SELECT email FROM members WHERE id = ?')
					.bind(fullReservation.member_id)
					.first<{ email: string }>();

				// Get facility platform fee
				const facility = await db
					.prepare('SELECT platform_fee_bps FROM facilities WHERE id = ?')
					.bind(fullReservation.facility_id)
					.first<{ platform_fee_bps: number }>();

				const totalAmount = paymentIntent.amount || 0;
				const platformFee = Math.round(
					(totalAmount * (facility?.platform_fee_bps || 500)) / 10000
				);
				const facilityAmount = totalAmount - platformFee;

				// Create payment record
				await db
					.prepare(
						`INSERT INTO reservation_payments (
              id, facility_id, reservation_id, member_email,
              stripe_payment_intent_id, amount_total, platform_fee, facility_amount,
              status, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'succeeded', ?, ?)`
					)
					.bind(
						`rp_${Date.now()}`,
						fullReservation.facility_id,
						reservationId,
						member?.email || '',
						paymentIntent.id,
						totalAmount,
						platformFee,
						facilityAmount,
						now,
						now
					)
					.run();

				// Update member booking stats
				await db
					.prepare(
						'UPDATE members SET total_bookings = total_bookings + 1, updated_at = ? WHERE id = ?'
					)
					.bind(now, fullReservation.member_id)
					.run();

				logger.info('Payment succeeded', { reservationId });
			}
		}
	}

	// Update payment record status (if exists)
	await db
		.prepare(
			`UPDATE reservation_payments
       SET status = 'succeeded',
           stripe_charge_id = ?,
           updated_at = ?
       WHERE stripe_payment_intent_id = ?`
		)
		.bind(paymentIntent.latest_charge, now, paymentIntent.id)
		.run();
}

async function handlePaymentFailed(
	db: D1Database,
	paymentIntent: Stripe.PaymentIntent,
	now: string
): Promise<void> {
	const reservationId = paymentIntent.metadata?.reservation_id;

	// Update reservation if linked
	if (reservationId) {
		await db
			.prepare(
				`UPDATE reservations
         SET payment_status = 'pending',
             updated_at = ?
         WHERE id = ?`
			)
			.bind(now, reservationId)
			.run();
	}

	// Update payment record
	await db
		.prepare(
			`UPDATE reservation_payments
       SET status = 'failed',
           updated_at = ?
       WHERE stripe_payment_intent_id = ?`
		)
		.bind(now, paymentIntent.id)
		.run();

	logger.warn('Payment failed', { paymentIntentId: paymentIntent.id });
}

async function handleInvoicePaid(
	db: D1Database,
	invoice: Stripe.Invoice,
	now: string
): Promise<void> {
	const subscriptionId =
		typeof invoice.subscription === 'string'
			? invoice.subscription
			: invoice.subscription?.id;

	if (!subscriptionId) return;

	// Update subscription status
	await db
		.prepare(
			`UPDATE facility_subscriptions
       SET status = 'active',
           updated_at = ?
       WHERE stripe_subscription_id = ?`
		)
		.bind(now, subscriptionId)
		.run();

	logger.info('Invoice paid', { subscriptionId });
}

async function handleInvoicePaymentFailed(
	db: D1Database,
	invoice: Stripe.Invoice,
	now: string
): Promise<void> {
	const subscriptionId =
		typeof invoice.subscription === 'string'
			? invoice.subscription
			: invoice.subscription?.id;

	if (!subscriptionId) return;

	// Update subscription status
	await db
		.prepare(
			`UPDATE facility_subscriptions
       SET status = 'past_due',
           updated_at = ?
       WHERE stripe_subscription_id = ?`
		)
		.bind(now, subscriptionId)
		.run();

	logger.warn('Invoice payment failed', { subscriptionId });
}

async function handleSubscriptionUpdated(
	db: D1Database,
	subscription: Stripe.Subscription,
	now: string
): Promise<void> {
	const status = subscription.status;
	const cancelAtPeriodEnd = subscription.cancel_at_period_end ? 1 : 0;

	await db
		.prepare(
			`UPDATE facility_subscriptions
       SET status = ?,
           cancel_at_period_end = ?,
           current_period_start = ?,
           current_period_end = ?,
           updated_at = ?
       WHERE stripe_subscription_id = ?`
		)
		.bind(
			status,
			cancelAtPeriodEnd,
			new Date(subscription.current_period_start * 1000).toISOString(),
			new Date(subscription.current_period_end * 1000).toISOString(),
			now,
			subscription.id
		)
		.run();

	logger.info('Subscription updated', { subscriptionId: subscription.id, status });
}

async function handleSubscriptionDeleted(
	db: D1Database,
	subscription: Stripe.Subscription,
	now: string
): Promise<void> {
	await db
		.prepare(
			`UPDATE facility_subscriptions
       SET status = 'canceled',
           updated_at = ?
       WHERE stripe_subscription_id = ?`
		)
		.bind(now, subscription.id)
		.run();

	logger.info('Subscription deleted', { subscriptionId: subscription.id });
}

async function handleDisputeCreated(
	db: D1Database,
	dispute: Stripe.Dispute,
	now: string
): Promise<void> {
	const paymentIntentId =
		typeof dispute.payment_intent === 'string'
			? dispute.payment_intent
			: dispute.payment_intent?.id;

	if (!paymentIntentId) return;

	// Update payment record
	await db
		.prepare(
			`UPDATE reservation_payments
       SET status = 'disputed',
           updated_at = ?
       WHERE stripe_payment_intent_id = ?`
		)
		.bind(now, paymentIntentId)
		.run();

	// Update reservation status
	await db
		.prepare(
			`UPDATE reservations
       SET status = 'disputed',
           updated_at = ?
       WHERE stripe_payment_intent_id = ?`
		)
		.bind(now, paymentIntentId)
		.run();

	logger.warn('Dispute created', { paymentIntentId });
}
