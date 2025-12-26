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
	tier?: 'solo' | 'team' | 'org'; // For agent-in-a-box and vertical-templates tiers
	successUrl?: string;
	cancelUrl?: string;
	customerEmail?: string;
	assessmentId?: string; // Link to assessment session if applicable
	// Vertical Templates specific
	subdomain?: string;
	templateId?: string;
	config?: Record<string, unknown>;
}

interface ReserveResponse {
	success: boolean;
	pendingId?: string;
	expiresAt?: string;
	error?: string;
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

	const { productId, tier, successUrl, cancelUrl, customerEmail, assessmentId, subdomain, templateId, config } = body;

	// Validate product exists
	const product = getOfferingBySlug(productId);

	// For vertical-templates, reserve subdomain before checkout
	let pendingId: string | undefined;
	if (productId === 'vertical-templates') {
		if (!subdomain || !templateId || !config || !customerEmail) {
			throw error(400, 'Vertical templates require subdomain, templateId, config, and customerEmail');
		}

		// Call templates-platform reserve API
		const templatesApiUrl = platform?.env?.TEMPLATES_PLATFORM_API_URL || 'https://templates.createsomething.space';
		const templatesApiSecret = platform?.env?.TEMPLATES_PLATFORM_API_SECRET;

		if (!templatesApiSecret) {
			throw error(500, 'Templates platform not configured');
		}

		try {
			const reserveResponse = await fetch(`${templatesApiUrl}/api/sites/reserve`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'x-api-secret': templatesApiSecret
				},
				body: JSON.stringify({
					subdomain,
					templateId,
					tier: tier || 'solo',
					config,
					customerEmail
				})
			});

			// Handle non-success HTTP responses
			if (!reserveResponse.ok) {
				const errorData = await reserveResponse.json().catch(() => ({})) as { message?: string; error?: string };
				const errorMessage = errorData.message || errorData.error || `Reserve API returned ${reserveResponse.status}`;
				console.error('Reserve API error response:', reserveResponse.status, errorMessage);
				throw error(reserveResponse.status, errorMessage);
			}

			const reserveData: ReserveResponse = await reserveResponse.json();

			if (!reserveData.success) {
				throw error(409, reserveData.error || 'Failed to reserve subdomain');
			}

			pendingId = reserveData.pendingId;
		} catch (err) {
			// SvelteKit HttpError has status property but isn't an Error instance
			if (err && typeof err === 'object' && 'status' in err) throw err;
			console.error('Reserve API error:', err);
			throw error(500, 'Failed to reserve site');
		}
	}
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
	// Include {CHECKOUT_SESSION_ID} - Stripe replaces this with actual session ID
	const defaultSuccessUrl = `${baseUrl}/products/${productId}?success=true&session_id={CHECKOUT_SESSION_ID}${assessmentId ? `&assessment=${assessmentId}` : ''}`;
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
				assessment_id: assessmentId || '',
				// Vertical Templates provisioning
				pending_id: pendingId || '',
				subdomain: subdomain || '',
				template_id: templateId || ''
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
