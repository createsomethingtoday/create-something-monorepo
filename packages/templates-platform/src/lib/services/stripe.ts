/**
 * Stripe Service
 *
 * Handles Stripe checkout, customer portal, and webhook processing.
 * Follows Canon principle: minimal ceremony, transparent use.
 */

import Stripe from 'stripe';
import type { Subscription } from '$lib/types';

// ═══════════════════════════════════════════════════════════════════════════
// STRIPE CLIENT
// ═══════════════════════════════════════════════════════════════════════════

export function createStripeClient(secretKey: string): Stripe {
	return new Stripe(secretKey, {
		httpClient: Stripe.createFetchHttpClient()
	});
}

// ═══════════════════════════════════════════════════════════════════════════
// PRICING CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

export const STRIPE_PRICE_IDS = {
	pro: 'price_pro', // Replace with actual Stripe Price ID
	agency: 'price_agency' // Replace with actual Stripe Price ID
} as const;

export const PLAN_FEATURES = {
	free: {
		sites: 1,
		customDomain: false,
		analytics: false,
		support: 'community'
	},
	pro: {
		sites: 10,
		customDomain: true,
		analytics: true,
		support: 'email'
	},
	agency: {
		sites: 100,
		customDomain: true,
		analytics: true,
		support: 'priority'
	}
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// CHECKOUT
// ═══════════════════════════════════════════════════════════════════════════

export interface CreateCheckoutSessionParams {
	stripe: Stripe;
	userId: string;
	userEmail: string;
	priceId: string;
	successUrl: string;
	cancelUrl: string;
	customerId?: string;
}

export async function createCheckoutSession(
	params: CreateCheckoutSessionParams
): Promise<Stripe.Checkout.Session> {
	const { stripe, userId, userEmail, priceId, successUrl, cancelUrl, customerId } = params;

	const sessionParams: Stripe.Checkout.SessionCreateParams = {
		mode: 'subscription',
		payment_method_types: ['card'],
		line_items: [
			{
				price: priceId,
				quantity: 1
			}
		],
		success_url: successUrl,
		cancel_url: cancelUrl,
		client_reference_id: userId,
		metadata: {
			userId
		}
	};

	// Use existing customer if available
	if (customerId) {
		sessionParams.customer = customerId;
	} else {
		sessionParams.customer_email = userEmail;
	}

	return await stripe.checkout.sessions.create(sessionParams);
}

// ═══════════════════════════════════════════════════════════════════════════
// CUSTOMER PORTAL
// ═══════════════════════════════════════════════════════════════════════════

export interface CreatePortalSessionParams {
	stripe: Stripe;
	customerId: string;
	returnUrl: string;
}

export async function createPortalSession(
	params: CreatePortalSessionParams
): Promise<Stripe.BillingPortal.Session> {
	const { stripe, customerId, returnUrl } = params;

	return await stripe.billingPortal.sessions.create({
		customer: customerId,
		return_url: returnUrl
	});
}

// ═══════════════════════════════════════════════════════════════════════════
// WEBHOOK HANDLING
// ═══════════════════════════════════════════════════════════════════════════

export interface WebhookEvent {
	type: string;
	data: unknown;
}

export async function constructWebhookEvent(
	payload: string,
	signature: string,
	webhookSecret: string,
	stripe: Stripe
): Promise<Stripe.Event> {
	return stripe.webhooks.constructEvent(payload, signature, webhookSecret);
}

export interface SubscriptionEventData {
	subscriptionId: string;
	customerId: string;
	userId?: string;
	plan: 'pro' | 'agency';
	status: Subscription['status'];
	currentPeriodStart: number;
	currentPeriodEnd: number;
	cancelAtPeriodEnd: boolean;
	canceledAt?: number;
}

export function parseSubscriptionEvent(
	subscription: Stripe.Subscription
): SubscriptionEventData {
	// Determine plan from price ID
	let plan: 'pro' | 'agency' = 'pro';
	const priceId = subscription.items.data[0]?.price.id;
	if (priceId === STRIPE_PRICE_IDS.agency) {
		plan = 'agency';
	}

	// Access period timestamps from subscription items
	const periodStart = subscription.items.data[0]?.current_period_start ?? Math.floor(Date.now() / 1000);
	const periodEnd = subscription.items.data[0]?.current_period_end ?? Math.floor(Date.now() / 1000);

	return {
		subscriptionId: subscription.id,
		customerId: subscription.customer as string,
		userId: subscription.metadata.userId,
		plan,
		status: subscription.status as Subscription['status'],
		currentPeriodStart: periodStart,
		currentPeriodEnd: periodEnd,
		cancelAtPeriodEnd: subscription.cancel_at_period_end,
		canceledAt: subscription.canceled_at ?? undefined
	};
}

export interface PaymentEventData {
	paymentIntentId: string;
	customerId: string;
	userId?: string;
	amount: number;
	currency: string;
	status: 'succeeded' | 'pending' | 'failed' | 'canceled';
	description?: string;
}

export function parsePaymentEvent(paymentIntent: Stripe.PaymentIntent): PaymentEventData {
	let status: PaymentEventData['status'] = 'pending';
	switch (paymentIntent.status) {
		case 'succeeded':
			status = 'succeeded';
			break;
		case 'processing':
		case 'requires_action':
		case 'requires_capture':
		case 'requires_confirmation':
		case 'requires_payment_method':
			status = 'pending';
			break;
		case 'canceled':
			status = 'canceled';
			break;
		default:
			status = 'failed';
	}

	return {
		paymentIntentId: paymentIntent.id,
		customerId: paymentIntent.customer as string,
		userId: paymentIntent.metadata?.userId,
		amount: paymentIntent.amount,
		currency: paymentIntent.currency,
		status,
		description: paymentIntent.description ?? undefined
	};
}

// ═══════════════════════════════════════════════════════════════════════════
// CUSTOMER MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════

export async function createCustomer(
	stripe: Stripe,
	email: string,
	userId: string,
	name?: string
): Promise<Stripe.Customer> {
	return await stripe.customers.create({
		email,
		metadata: { userId },
		name
	});
}

export async function getCustomer(
	stripe: Stripe,
	customerId: string
): Promise<Stripe.Customer | null> {
	try {
		const customer = await stripe.customers.retrieve(customerId);
		if (customer.deleted) {
			return null;
		}
		return customer as Stripe.Customer;
	} catch {
		return null;
	}
}
