/**
 * Stripe Checkout Session API
 *
 * Creates a Stripe Checkout session for product purchases.
 * Currently unused as all products (Ground, Loom) are free.
 * Preserved for future premium offerings.
 */

import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import { createStripeClient, getStripePrice, hasStripePricing } from '$lib/services/stripe';
import { getOfferingBySlug } from '$lib/data/services';

interface CheckoutRequest {
	productId: string;
	successUrl?: string;
	cancelUrl?: string;
	customerEmail?: string;
}

export const POST: RequestHandler = async ({ request, platform, url }) => {
	// Get Stripe secret key from environment
	const stripeSecretKey = platform?.env?.STRIPE_SECRET_KEY;
	if (!stripeSecretKey) {
		throw error(500, 'Stripe is not configured');
	}

	// Parse request body
	let body: CheckoutRequest;
	try {
		body = await request.json();
	} catch {
		throw error(400, 'Invalid JSON body');
	}

	const { productId, successUrl, cancelUrl, customerEmail } = body;

	// Validate product exists
	const product = getOfferingBySlug(productId);
	const priceConfig = getStripePrice(productId);
	if (!product && !priceConfig) {
		throw error(404, 'Product not found');
	}

	// Check if product has a price (currently all are free)
	if (product?.pricing === 'Free' && !priceConfig) {
		throw error(400, 'This product is free and does not require checkout');
	}

	// Get Stripe price configuration
	if (!priceConfig) {
		throw error(400, 'No pricing configured for this product');
	}

	// Check if real Stripe prices are configured
	if (!hasStripePricing(productId)) {
		throw error(503, 'Payment system is being configured. Please contact us directly.');
	}

	// Create Stripe client
	const stripe = createStripeClient(stripeSecretKey);

	// Build checkout session
	const baseUrl = url.origin;
	const defaultProductUrl = product?.href?.startsWith('/') ? product.href : '/products';
	const defaultSuccessUrl = `${baseUrl}${defaultProductUrl}?success=true&session_id={CHECKOUT_SESSION_ID}`;
	const defaultCancelUrl = `${baseUrl}${defaultProductUrl}?canceled=true`;

	try {
		const session = await stripe.checkout.sessions.create({
			mode: priceConfig.mode,
			line_items: [
				{
					price: priceConfig.priceId,
					quantity: 1
				}
			],
			success_url: successUrl || defaultSuccessUrl,
			cancel_url: cancelUrl || defaultCancelUrl,
			customer_email: customerEmail,
			metadata: {
				product_id: productId,
				...(productId.startsWith('agent-in-a-box-') && {
					tier: productId.replace('agent-in-a-box-', '')
				})
			},
			// For subscriptions, allow promotion codes
			...(priceConfig.mode === 'subscription' && {
				allow_promotion_codes: true
			}),
			// Collect billing address for tax purposes
			billing_address_collection: 'required'
		});

		return json({
			sessionId: session.id,
			url: session.url
		});
	} catch (err) {
		console.error('Stripe checkout error:', err);
		throw error(500, 'Failed to create checkout session');
	}
};
