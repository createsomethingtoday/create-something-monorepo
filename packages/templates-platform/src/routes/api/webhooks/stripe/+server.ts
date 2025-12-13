/**
 * Stripe Webhook Handler
 *
 * Processes Stripe webhook events for subscription lifecycle management.
 * Events: checkout.session.completed, customer.subscription.*, payment_intent.*
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	createStripeClient,
	constructWebhookEvent,
	parseSubscriptionEvent,
	parsePaymentEvent,
	PLAN_FEATURES
} from '$lib/services/stripe';
import type { Subscription } from '$lib/types';

// ═══════════════════════════════════════════════════════════════════════════
// WEBHOOK ENDPOINT
// ═══════════════════════════════════════════════════════════════════════════

export const POST: RequestHandler = async ({ request, platform }) => {
	const db = platform?.env.DB;
	const stripeSecretKey = platform?.env.STRIPE_SECRET_KEY;
	const webhookSecret = platform?.env.STRIPE_WEBHOOK_SECRET;

	if (!db || !stripeSecretKey || !webhookSecret) {
		throw error(500, 'Database or Stripe not configured');
	}

	try {
		// Get raw body and signature
		const payload = await request.text();
		const signature = request.headers.get('stripe-signature');

		if (!signature) {
			throw error(400, 'Missing stripe-signature header');
		}

		// Verify webhook signature
		const stripe = createStripeClient(stripeSecretKey);
		const event = await constructWebhookEvent(payload, signature, webhookSecret, stripe);

		// Process event
		switch (event.type) {
			case 'checkout.session.completed':
				await handleCheckoutCompleted(event, db);
				break;

			case 'customer.subscription.created':
			case 'customer.subscription.updated':
				await handleSubscriptionUpdated(event, db);
				break;

			case 'customer.subscription.deleted':
				await handleSubscriptionDeleted(event, db);
				break;

			case 'payment_intent.succeeded':
				await handlePaymentSucceeded(event, db);
				break;

			case 'payment_intent.payment_failed':
				await handlePaymentFailed(event, db);
				break;

			default:
				console.log(`Unhandled event type: ${event.type}`);
		}

		return json({ received: true });
	} catch (e) {
		console.error('Webhook error:', e);

		if (e && typeof e === 'object' && 'status' in e) {
			throw e;
		}

		// Return 400 for webhook signature errors
		if (e instanceof Error && e.message.includes('signature')) {
			throw error(400, 'Invalid signature');
		}

		throw error(500, e instanceof Error ? e.message : 'Webhook processing failed');
	}
};

// ═══════════════════════════════════════════════════════════════════════════
// EVENT HANDLERS
// ═══════════════════════════════════════════════════════════════════════════

async function handleCheckoutCompleted(event: any, db: D1Database) {
	const session = event.data.object;
	const userId = session.client_reference_id || session.metadata?.userId;
	const customerId = session.customer;

	if (!userId || !customerId) {
		console.error('Missing userId or customerId in checkout session');
		return;
	}

	// Update user with Stripe customer ID
	await db
		.prepare('UPDATE users SET stripe_customer_id = ? WHERE id = ?')
		.bind(customerId, userId)
		.run();

	console.log(`Checkout completed for user ${userId}, customer ${customerId}`);
}

async function handleSubscriptionUpdated(event: any, db: D1Database) {
	const subscription = event.data.object;
	const eventData = parseSubscriptionEvent(subscription);

	if (!eventData.userId) {
		console.error('Missing userId in subscription metadata');
		return;
	}

	// Upsert subscription
	const existingSubscription = await db
		.prepare('SELECT id FROM subscriptions WHERE stripe_subscription_id = ?')
		.bind(eventData.subscriptionId)
		.first<{ id: string }>();

	const now = new Date().toISOString();

	if (existingSubscription) {
		// Update existing subscription
		await db
			.prepare(
				`UPDATE subscriptions
				SET status = ?,
					plan = ?,
					current_period_start = ?,
					current_period_end = ?,
					cancel_at_period_end = ?,
					canceled_at = ?,
					updated_at = ?
				WHERE id = ?`
			)
			.bind(
				eventData.status,
				eventData.plan,
				new Date(eventData.currentPeriodStart * 1000).toISOString(),
				new Date(eventData.currentPeriodEnd * 1000).toISOString(),
				eventData.cancelAtPeriodEnd ? 1 : 0,
				eventData.canceledAt ? new Date(eventData.canceledAt * 1000).toISOString() : null,
				now,
				existingSubscription.id
			)
			.run();
	} else {
		// Create new subscription
		const subscriptionId = `sub_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
		await db
			.prepare(
				`INSERT INTO subscriptions (
					id, user_id, stripe_subscription_id, stripe_customer_id,
					plan, status, current_period_start, current_period_end,
					cancel_at_period_end, canceled_at, created_at, updated_at
				) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
			)
			.bind(
				subscriptionId,
				eventData.userId,
				eventData.subscriptionId,
				eventData.customerId,
				eventData.plan,
				eventData.status,
				new Date(eventData.currentPeriodStart * 1000).toISOString(),
				new Date(eventData.currentPeriodEnd * 1000).toISOString(),
				eventData.cancelAtPeriodEnd ? 1 : 0,
				eventData.canceledAt ? new Date(eventData.canceledAt * 1000).toISOString() : null,
				now,
				now
			)
			.run();
	}

	// Update user plan and site limit
	const features = PLAN_FEATURES[eventData.plan];
	await db
		.prepare('UPDATE users SET plan = ?, site_limit = ? WHERE id = ?')
		.bind(eventData.plan, features.sites, eventData.userId)
		.run();

	console.log(`Subscription ${eventData.status} for user ${eventData.userId}`);
}

async function handleSubscriptionDeleted(event: any, db: D1Database) {
	const subscription = event.data.object;
	const eventData = parseSubscriptionEvent(subscription);

	if (!eventData.userId) {
		console.error('Missing userId in subscription metadata');
		return;
	}

	// Update subscription status
	const now = new Date().toISOString();
	await db
		.prepare(
			`UPDATE subscriptions
			SET status = 'canceled',
				canceled_at = ?,
				updated_at = ?
			WHERE stripe_subscription_id = ?`
		)
		.bind(now, now, eventData.subscriptionId)
		.run();

	// Downgrade user to free plan
	const freeFeatures = PLAN_FEATURES.free;
	await db
		.prepare('UPDATE users SET plan = ?, site_limit = ? WHERE id = ?')
		.bind('free', freeFeatures.sites, eventData.userId)
		.run();

	console.log(`Subscription canceled for user ${eventData.userId}`);
}

async function handlePaymentSucceeded(event: any, db: D1Database) {
	const paymentIntent = event.data.object;
	const eventData = parsePaymentEvent(paymentIntent);

	if (!eventData.userId) {
		// Try to get userId from customer
		const subscription = await db
			.prepare('SELECT user_id FROM subscriptions WHERE stripe_customer_id = ?')
			.bind(eventData.customerId)
			.first<{ user_id: string }>();

		if (!subscription) {
			console.error('Cannot find user for payment');
			return;
		}

		eventData.userId = subscription.user_id;
	}

	// Record payment
	const paymentId = `pmt_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
	await db
		.prepare(
			`INSERT INTO payment_history (
				id, user_id, stripe_payment_intent_id, amount, currency,
				status, description, created_at
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
		)
		.bind(
			paymentId,
			eventData.userId,
			eventData.paymentIntentId,
			eventData.amount,
			eventData.currency,
			eventData.status,
			eventData.description,
			new Date().toISOString()
		)
		.run();

	console.log(`Payment succeeded: $${eventData.amount / 100} for user ${eventData.userId}`);
}

async function handlePaymentFailed(event: any, db: D1Database) {
	const paymentIntent = event.data.object;
	const eventData = parsePaymentEvent(paymentIntent);

	if (!eventData.userId) {
		// Try to get userId from customer
		const subscription = await db
			.prepare('SELECT user_id FROM subscriptions WHERE stripe_customer_id = ?')
			.bind(eventData.customerId)
			.first<{ user_id: string }>();

		if (!subscription) {
			console.error('Cannot find user for payment');
			return;
		}

		eventData.userId = subscription.user_id;
	}

	// Record failed payment
	const paymentId = `pmt_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
	await db
		.prepare(
			`INSERT INTO payment_history (
				id, user_id, stripe_payment_intent_id, amount, currency,
				status, description, created_at
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
		)
		.bind(
			paymentId,
			eventData.userId,
			eventData.paymentIntentId,
			eventData.amount,
			eventData.currency,
			'failed',
			eventData.description,
			new Date().toISOString()
		)
		.run();

	console.log(`Payment failed for user ${eventData.userId}`);
}
