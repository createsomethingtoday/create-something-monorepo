/**
 * Checkout API
 *
 * Creates Stripe Checkout sessions for subscription upgrades.
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createStripeClient, createCheckoutSession, createCustomer } from '$lib/services/stripe';

export const POST: RequestHandler = async ({ request, platform, locals, url }) => {
	if (!locals.user) {
		throw error(401, 'Unauthorized');
	}

	const db = platform?.env.DB;
	const stripeSecretKey = platform?.env.STRIPE_SECRET_KEY;

	if (!db || !stripeSecretKey) {
		throw error(500, 'Database or Stripe not configured');
	}

	try {
		const body = (await request.json()) as { priceId?: string };
		const { priceId } = body;

		if (!priceId) {
			throw error(400, 'Missing priceId');
		}

		// Get user details
		const user = await db
			.prepare('SELECT id, email, name, stripe_customer_id FROM users WHERE id = ?')
			.bind(locals.user.id)
			.first<{
				id: string;
				email: string;
				name?: string;
				stripe_customer_id?: string;
			}>();

		if (!user) {
			throw error(404, 'User not found');
		}

		const stripe = createStripeClient(stripeSecretKey);

		// Create or retrieve Stripe customer
		let customerId = user.stripe_customer_id;

		if (!customerId) {
			const customer = await createCustomer(stripe, user.email, user.id, user.name);
			customerId = customer.id;

			// Update user with Stripe customer ID
			await db
				.prepare('UPDATE users SET stripe_customer_id = ? WHERE id = ?')
				.bind(customerId, user.id)
				.run();
		}

		// Create checkout session
		const origin = url.origin;
		const session = await createCheckoutSession({
			stripe,
			userId: user.id,
			userEmail: user.email,
			priceId,
			customerId,
			successUrl: `${origin}/dashboard?checkout=success`,
			cancelUrl: `${origin}/pricing?checkout=canceled`
		});

		return json({
			success: true,
			sessionId: session.id,
			url: session.url
		});
	} catch (e) {
		console.error('Checkout error:', e);

		if (e && typeof e === 'object' && 'status' in e) {
			throw e;
		}

		throw error(500, e instanceof Error ? e.message : 'Failed to create checkout session');
	}
};
