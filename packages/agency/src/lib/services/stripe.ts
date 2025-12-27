/**
 * Stripe Configuration
 *
 * Product and price mappings for CREATE SOMETHING offerings.
 * Stripe price IDs are configured in Stripe Dashboard and referenced here.
 *
 * Environment Variables Required (set as Cloudflare secrets):
 * - STRIPE_SECRET_KEY: Stripe API secret key
 * - STRIPE_WEBHOOK_SECRET: Webhook endpoint signing secret
 */

import Stripe from 'stripe';

/**
 * Stripe Price Configuration
 *
 * Maps our product IDs to Stripe price IDs.
 * Create these products in Stripe Dashboard first, then add price IDs here.
 */
export interface StripePriceConfig {
	priceId: string;
	mode: 'payment' | 'subscription';
	name: string;
}

/**
 * Product to Stripe Price mapping
 *
 * These price IDs must be created in Stripe Dashboard:
 * 1. Go to Products → Add Product
 * 2. Create each product with appropriate pricing
 * 3. Copy the price ID (starts with price_)
 * 4. Add to this configuration
 */
export const STRIPE_PRICES: Record<string, StripePriceConfig> = {
	// Vertical Templates - Subscription tiers ($29/mo Solo, $79/mo Team)
	// Set STRIPE_PRICE_VERTICAL_SOLO and STRIPE_PRICE_VERTICAL_TEAM in Cloudflare secrets
	'vertical-templates-solo': {
		priceId: process.env.STRIPE_PRICE_VERTICAL_SOLO || 'price_1SiduGAzstI6Ecr5scme24uj',
		mode: 'subscription',
		name: 'Vertical Templates (Solo)'
	},
	'vertical-templates-team': {
		priceId: process.env.STRIPE_PRICE_VERTICAL_TEAM || 'price_1SidvJAzstI6Ecr5ZWWsHRD5',
		mode: 'subscription',
		name: 'Vertical Templates (Team)'
	},

	// One-time payment products
	'automation-patterns': {
		priceId: 'price_1SiK3PAzstI6Ecr5y2k8VGsr',
		mode: 'payment',
		name: 'Automation Patterns Pack'
	},

	// Agent-in-a-Box has multiple tiers
	'agent-in-a-box-solo': {
		priceId: 'price_1SioU0AzstI6Ecr5NjnMDBxq',
		mode: 'payment',
		name: 'Agent-in-a-Box Kit (Solo)'
	},
	'agent-in-a-box-team': {
		priceId: 'price_1SioV2AzstI6Ecr5uZ2Qt7Ok',
		mode: 'payment',
		name: 'Agent-in-a-Box Kit (Team)'
	},
	'agent-in-a-box-org': {
		priceId: 'price_1SioW9AzstI6Ecr5fzecFIWO',
		mode: 'payment',
		name: 'Agent-in-a-Box Kit (Organization)'
	}
};

/**
 * Get Stripe price configuration for a product
 */
export function getStripePrice(productId: string): StripePriceConfig | undefined {
	return STRIPE_PRICES[productId];
}

/**
 * Check if a product has Stripe pricing configured
 */
export function hasStripePricing(productId: string): boolean {
	const config = STRIPE_PRICES[productId];
	return config !== undefined && !config.priceId.includes('placeholder');
}

/**
 * Create a Stripe client instance
 */
export function createStripeClient(secretKey: string): Stripe {
	return new Stripe(secretKey, {
		apiVersion: '2025-08-27.basil'
	});
}

/**
 * Stripe webhook event types we handle
 */
export const HANDLED_WEBHOOK_EVENTS = [
	'checkout.session.completed',
	'customer.subscription.created',
	'customer.subscription.updated',
	'customer.subscription.deleted',
	'invoice.paid',
	'invoice.payment_failed'
] as const;

export type HandledWebhookEvent = (typeof HANDLED_WEBHOOK_EVENTS)[number];
