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
import { resolveCustomerMapScope } from '$lib/server/customer-map-context';
import {
	buildMapCheckoutMetadata,
	isMapPlanId,
	resolveMapPlan
} from '$lib/server/map-commercial';

interface CheckoutRequest {
	productId: string;
	successUrl?: string;
	cancelUrl?: string;
	customerEmail?: string;
}

export const POST: RequestHandler = async ({ request, platform, url, locals }) => {
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
	let priceConfig = getStripePrice(productId);
	let mapMetadata: Record<string, string> | null = null;
	if (isMapPlanId(productId)) {
		const plan = resolveMapPlan(productId, platform?.env);
		if (!plan.checkoutEnabled || !plan.priceId) {
			throw error(503, 'Map checkout is not commercially approved and configured.');
		}
		if (!locals.user?.id || !locals.user.email) throw error(401, 'Sign in before starting Map checkout.');
		const scope = await resolveCustomerMapScope({
			platform,
			user: locals.user,
			requireCommercialEntitlement: false
		});
		mapMetadata = buildMapCheckoutMetadata({ scope, email: locals.user.email, planId: productId });
		priceConfig = {
			priceId: plan.priceId,
			mode: 'subscription',
			name: productId === 'map-monthly' ? 'CREATE SOMETHING Map (Monthly)' : 'CREATE SOMETHING Map (Yearly)'
		};
	}
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
	if (!isMapPlanId(productId) && !hasStripePricing(productId)) {
		throw error(503, 'Payment system is being configured. Please contact us directly.');
	}

	// Create Stripe client
	const stripe = createStripeClient(stripeSecretKey);

	// Build checkout session
	const baseUrl = url.origin;
	const defaultProductUrl = isMapPlanId(productId)
		? '/map/workspace'
		: product?.href?.startsWith('/') ? product.href : '/products';
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
			success_url: isMapPlanId(productId) ? defaultSuccessUrl : successUrl || defaultSuccessUrl,
			cancel_url: isMapPlanId(productId) ? defaultCancelUrl : cancelUrl || defaultCancelUrl,
			customer_email: mapMetadata?.customer_email ?? customerEmail,
			metadata: {
				product_id: productId,
				...(mapMetadata ?? {}),
				...(productId.startsWith('agent-in-a-box-') && {
					tier: productId.replace('agent-in-a-box-', '')
				})
			},
			// For subscriptions, allow promotion codes
			...(priceConfig.mode === 'subscription' && {
				allow_promotion_codes: true,
				...(mapMetadata ? { subscription_data: { metadata: mapMetadata } } : {})
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
