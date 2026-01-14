import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import Stripe from 'stripe';

/**
 * POST /api/stripe/checkout
 * Creates a Stripe Checkout Session for $99 lifetime membership
 */
export const POST: RequestHandler = async ({ request, url, locals, platform }) => {
	try {
		const stripeKey = platform?.env?.STRIPE_SECRET_KEY;
		if (!stripeKey) {
			return json({ success: false, error: 'Stripe not configured' }, { status: 500 });
		}

		const stripe = new Stripe(stripeKey, {
			apiVersion: '2025-12-15.clover'
		});

		// Get user from session (optional - allows anonymous checkout)
		const userId = locals.user?.id;

		// Create Stripe Checkout Session
		const session = await stripe.checkout.sessions.create({
			payment_method_types: ['card'],
			line_items: [
				{
					price_data: {
						currency: 'usd',
						product_data: {
							name: 'Outerfields Founding Member',
							description:
								'Lifetime access to all platform content, analytics, discovery call, and exclusive merchandise',
							images: [`${url.origin}/og-image.jpg`]
						},
						unit_amount: 9900 // $99.00 in cents
					},
					quantity: 1
				}
			],
			mode: 'payment', // One-time payment, not subscription
			success_url: `${url.origin}/welcome?session_id={CHECKOUT_SESSION_ID}`,
			cancel_url: `${url.origin}/#pricing`,
			metadata: {
				userId: userId || 'guest', // Track who purchased
				membershipType: 'founding_member'
			},
			// Allow promo codes
			allow_promotion_codes: true,
			// Collect billing address for tax purposes
			billing_address_collection: 'required'
		});

		return json({
			success: true,
			data: {
				sessionId: session.id,
				url: session.url
			}
		});
	} catch (err) {
		console.error('Stripe checkout error:', err);
		return json(
			{
				success: false,
				error: err instanceof Error ? err.message : 'Failed to create checkout session'
			},
			{ status: 500 }
		);
	}
};
