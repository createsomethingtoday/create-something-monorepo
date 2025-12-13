/**
 * Billing Portal API
 *
 * Creates Stripe Customer Portal sessions for subscription management.
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createStripeClient, createPortalSession } from '$lib/services/stripe';

export const POST: RequestHandler = async ({ platform, locals, url }) => {
	if (!locals.user) {
		throw error(401, 'Unauthorized');
	}

	const db = platform?.env.DB;
	const stripeSecretKey = platform?.env.STRIPE_SECRET_KEY;

	if (!db || !stripeSecretKey) {
		throw error(500, 'Database or Stripe not configured');
	}

	try {
		// Get user's Stripe customer ID
		const user = await db
			.prepare('SELECT stripe_customer_id FROM users WHERE id = ?')
			.bind(locals.user.id)
			.first<{ stripe_customer_id?: string }>();

		if (!user?.stripe_customer_id) {
			throw error(400, 'No active subscription found');
		}

		const stripe = createStripeClient(stripeSecretKey);

		// Create portal session
		const origin = url.origin;
		const session = await createPortalSession({
			stripe,
			customerId: user.stripe_customer_id,
			returnUrl: `${origin}/dashboard`
		});

		return json({
			success: true,
			url: session.url
		});
	} catch (e) {
		console.error('Portal error:', e);

		if (e && typeof e === 'object' && 'status' in e) {
			throw e;
		}

		throw error(500, e instanceof Error ? e.message : 'Failed to create portal session');
	}
};
