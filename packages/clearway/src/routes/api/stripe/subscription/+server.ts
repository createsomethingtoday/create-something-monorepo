/**
 * Stripe Subscription API
 *
 * POST /api/stripe/subscription - Create subscription for facility
 * GET /api/stripe/subscription?facility=:id - Get subscription status
 * DELETE /api/stripe/subscription - Cancel subscription
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	createStripeClient,
	createPlatformCustomer,
	createSubscription,
	cancelSubscription
} from '$lib/services/stripe-connect';

// Price IDs for Court Reserve plans (set in wrangler.toml)
type PlanType = 'basic' | 'pro' | 'enterprise';

interface CreateSubscriptionBody {
	facility_id: string;
	plan: PlanType;
	trial_days?: number;
}

interface CancelSubscriptionBody {
	facility_id: string;
	cancel_immediately?: boolean;
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

	const body = (await request.json()) as CreateSubscriptionBody;
	const { facility_id, plan, trial_days } = body;

	if (!facility_id || !plan) {
		throw error(400, 'facility_id and plan are required');
	}

	// Get price ID for plan
	const priceIds: Record<PlanType, string | undefined> = {
		basic: platform?.env.STRIPE_PRICE_BASIC,
		pro: platform?.env.STRIPE_PRICE_PRO,
		enterprise: platform?.env.STRIPE_PRICE_ENTERPRISE
	};

	const priceId = priceIds[plan];
	if (!priceId) {
		throw error(400, `Invalid plan: ${plan}`);
	}

	// Get facility
	const facility = await db
		.prepare('SELECT id, name, email, slug, stripe_customer_id FROM facilities WHERE id = ?')
		.bind(facility_id)
		.first<{
			id: string;
			name: string;
			email: string;
			slug: string;
			stripe_customer_id: string | null;
		}>();

	if (!facility) {
		throw error(404, 'Facility not found');
	}

	if (!facility.email) {
		throw error(400, 'Facility must have an email address');
	}

	const stripe = createStripeClient(stripeKey);
	const now = new Date().toISOString();

	// Create or retrieve customer
	let customerId = facility.stripe_customer_id;

	if (!customerId) {
		const customer = await createPlatformCustomer(stripe, {
			email: facility.email,
			name: facility.name,
			facilityId: facility_id
		});
		customerId = customer.id;

		// Update facility with customer ID
		await db
			.prepare('UPDATE facilities SET stripe_customer_id = ?, updated_at = ? WHERE id = ?')
			.bind(customerId, now, facility_id)
			.run();
	}

	// Check for existing active subscription
	const existingSub = await db
		.prepare(
			`SELECT id, status FROM facility_subscriptions
       WHERE facility_id = ? AND status IN ('active', 'trialing')`
		)
		.bind(facility_id)
		.first<{ id: string; status: string }>();

	if (existingSub) {
		throw error(400, `Facility already has an ${existingSub.status} subscription`);
	}

	// Create subscription
	const subscription = await createSubscription(stripe, {
		customerId,
		priceId,
		trialDays: trial_days,
		metadata: {
			facility_id,
			plan
		}
	});

	// Store subscription
	await db
		.prepare(
			`INSERT INTO facility_subscriptions (
        id, facility_id, stripe_subscription_id, stripe_customer_id,
        plan, status, current_period_start, current_period_end,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
		)
		.bind(
			`fs_${Date.now()}`,
			facility_id,
			subscription.id,
			customerId,
			plan,
			subscription.status,
			new Date(subscription.current_period_start * 1000).toISOString(),
			new Date(subscription.current_period_end * 1000).toISOString(),
			now,
			now
		)
		.run();

	// Get client secret for payment if needed
	const latestInvoice = subscription.latest_invoice as { payment_intent?: { client_secret: string } } | null;
	const clientSecret = latestInvoice?.payment_intent?.client_secret;

	return json(
		{
			subscriptionId: subscription.id,
			status: subscription.status,
			plan,
			clientSecret, // For completing payment with Stripe.js
			currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString()
		},
		{ status: 201 }
	);
};

export const GET: RequestHandler = async ({ url, platform }) => {
	const db = platform?.env.DB;

	if (!db) {
		throw error(500, 'Database not available');
	}

	const facilityId = url.searchParams.get('facility');
	if (!facilityId) {
		throw error(400, 'facility parameter is required');
	}

	const subscription = await db
		.prepare(
			`SELECT fs.*, f.name as facility_name
       FROM facility_subscriptions fs
       JOIN facilities f ON f.id = fs.facility_id
       WHERE fs.facility_id = ?
       ORDER BY fs.created_at DESC
       LIMIT 1`
		)
		.bind(facilityId)
		.first();

	if (!subscription) {
		return json({
			status: 'none',
			facilityId
		});
	}

	return json(subscription);
};

export const DELETE: RequestHandler = async ({ request, platform }) => {
	const db = platform?.env.DB;
	const stripeKey = platform?.env.STRIPE_SECRET_KEY;

	if (!db) {
		throw error(500, 'Database not available');
	}
	if (!stripeKey) {
		throw error(500, 'Stripe not configured');
	}

	const body = (await request.json()) as CancelSubscriptionBody;
	const { facility_id, cancel_immediately } = body;

	if (!facility_id) {
		throw error(400, 'facility_id is required');
	}

	// Get active subscription
	const subscription = await db
		.prepare(
			`SELECT stripe_subscription_id FROM facility_subscriptions
       WHERE facility_id = ? AND status IN ('active', 'trialing')`
		)
		.bind(facility_id)
		.first<{ stripe_subscription_id: string }>();

	if (!subscription) {
		throw error(404, 'No active subscription found');
	}

	const stripe = createStripeClient(stripeKey);
	const now = new Date().toISOString();

	// Cancel subscription
	const cancelled = await cancelSubscription(
		stripe,
		subscription.stripe_subscription_id,
		cancel_immediately
	);

	// Update local record
	await db
		.prepare(
			`UPDATE facility_subscriptions
       SET status = ?,
           cancel_at_period_end = ?,
           updated_at = ?
       WHERE stripe_subscription_id = ?`
		)
		.bind(
			cancel_immediately ? 'canceled' : cancelled.status,
			cancelled.cancel_at_period_end ? 1 : 0,
			now,
			subscription.stripe_subscription_id
		)
		.run();

	return json({
		success: true,
		cancelledImmediately: cancel_immediately,
		cancelAtPeriodEnd: cancelled.cancel_at_period_end,
		status: cancelled.status
	});
};
