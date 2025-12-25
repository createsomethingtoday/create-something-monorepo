/**
 * Stripe Checkout Session API
 *
 * Creates a Stripe Checkout session for product purchases.
 * Supports both one-time payments and subscriptions.
 */

import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import { createStripeClient, getStripePrice, hasStripePricing } from '$lib/services/stripe';
import { getOfferingBySlug } from '$lib/data/services';

interface CheckoutRequest {
	productId: string;
	tier?: 'solo' | 'team' | 'org'; // For agent-in-a-box tiers
	successUrl?: string;
	cancelUrl?: string;
	customerEmail?: string;
	assessmentId?: string; // Link to assessment session if applicable
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

	const { productId, tier, successUrl, cancelUrl, customerEmail, assessmentId } = body;

	// Validate product exists
	const product = getOfferingBySlug(productId);
	if (!product) {
		throw error(404, 'Product not found');
	}

	// Check if product is purchasable (paid + productized)
	if (!product.isProductized || product.pricing === 'Free') {
		throw error(400, 'This product cannot be purchased through checkout');
	}

	// Determine the Stripe price ID
	let stripePriceKey = productId;

	// Handle agent-in-a-box tiers
	if (productId === 'agent-in-a-box' && tier) {
		stripePriceKey = `agent-in-a-box-${tier}`;
	}

	// Get Stripe price configuration
	const priceConfig = getStripePrice(stripePriceKey);
	if (!priceConfig) {
		throw error(400, 'No pricing configured for this product');
	}

	// Check if real Stripe prices are configured
	if (!hasStripePricing(stripePriceKey)) {
		throw error(503, 'Payment system is being configured. Please contact us directly.');
	}

	// Create Stripe client
	const stripe = createStripeClient(stripeSecretKey);

	// Build checkout session
	const baseUrl = url.origin;
	const defaultSuccessUrl = `${baseUrl}/products/${productId}?success=true${assessmentId ? `&assessment=${assessmentId}` : ''}`;
	const defaultCancelUrl = `${baseUrl}/products/${productId}?canceled=true`;

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
				tier: tier || 'default',
				assessment_id: assessmentId || ''
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
