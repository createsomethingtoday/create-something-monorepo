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

type AgencyCanonicalServiceTier = 'mcp_only' | 'policy_os_trial' | 'policy_os_core';

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
	serviceTier?: AgencyCanonicalServiceTier;
	monthlyRecurringRevenueCents?: number;
	grossMarginFloorPercent?: number;
	ownerCompensationFit?: 'fits' | 'watch' | 'does_not_fit';
	operatorLoadBudget?: Record<string, unknown>;
	expansionTriggers?: string[];
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
	// Policy OS - margin-safe service retainers
	// Set these in Cloudflare secrets after creating the prices in Stripe.
	'policy-os-trial': {
		priceId: process.env.STRIPE_PRICE_POLICY_OS_TRIAL || 'placeholder_policy_os_trial',
		mode: 'subscription',
		name: 'Policy OS Trial',
		serviceTier: 'policy_os_trial',
		monthlyRecurringRevenueCents: 1250000,
		grossMarginFloorPercent: 70,
		ownerCompensationFit: 'fits',
		operatorLoadBudget: {
			max_live_review_meetings_per_month: 1,
			async_review_frequency: 'weekly',
			covered_workflow_count: 1,
			covered_downstream_systems: 3,
			monthly_policy_tuning_limit: 'bounded',
		},
		expansionTriggers: ['new workflow', 'extra downstream system', 'custom UI', 'higher meeting cadence'],
	},
	'policy-os-core': {
		priceId: process.env.STRIPE_PRICE_POLICY_OS_CORE || 'placeholder_policy_os_core',
		mode: 'subscription',
		name: 'Policy OS Core',
		serviceTier: 'policy_os_core',
		monthlyRecurringRevenueCents: 2200000,
		grossMarginFloorPercent: 70,
		ownerCompensationFit: 'fits',
		operatorLoadBudget: {
			max_live_review_meetings_per_month: 1,
			async_review_frequency: 'weekly',
			covered_workflow_count: 1,
			covered_downstream_systems: 3,
			monthly_policy_tuning_limit: 'monthly',
		},
		expansionTriggers: ['new workflow', 'extra downstream system', 'custom UI', 'higher meeting cadence'],
	},
	'policy-os-enterprise': {
		priceId: process.env.STRIPE_PRICE_POLICY_OS_ENTERPRISE || 'placeholder_policy_os_enterprise',
		mode: 'subscription',
		name: 'Policy OS Enterprise Extension',
		serviceTier: 'policy_os_core',
		monthlyRecurringRevenueCents: 3000000,
		grossMarginFloorPercent: 70,
		ownerCompensationFit: 'fits',
		operatorLoadBudget: {
			max_live_review_meetings_per_month: 2,
			async_review_frequency: 'weekly',
			covered_workflow_count: 2,
			covered_downstream_systems: 5,
			monthly_policy_tuning_limit: 'expanded',
		},
		expansionTriggers: ['third workflow', 'custom customer-facing UI', 'compliance audit package', 'weekly executive review'],
	},

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

export function getProductIdByStripePriceId(priceId: string): string | null {
	for (const [productId, config] of Object.entries(STRIPE_PRICES)) {
		if (config.priceId === priceId) {
			return productId;
		}
	}
	return null;
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
