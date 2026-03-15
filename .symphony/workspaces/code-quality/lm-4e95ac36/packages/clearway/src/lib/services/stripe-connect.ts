/**
 * Stripe Connect Service
 *
 * Handles Express account creation, onboarding, and destination charges
 * for facility payments. Platform fee: 5% (configurable per facility).
 */

import Stripe from 'stripe';

// Types for Connect operations
export interface CreateExpressAccountParams {
	email: string;
	businessName: string;
	facilityId: string;
	country?: string;
}

export interface CreateAccountLinkParams {
	accountId: string;
	refreshUrl: string;
	returnUrl: string;
}

export interface CreateDestinationChargeParams {
	amount: number; // In cents
	currency: string;
	destinationAccountId: string;
	platformFeeBps: number; // Basis points (500 = 5%)
	customerId?: string;
	paymentMethodId?: string;
	metadata?: Record<string, string>;
	description?: string;
	statementDescriptor?: string;
}

export interface RefundParams {
	paymentIntentId: string;
	amount?: number; // Partial refund amount in cents
	reason?: 'duplicate' | 'fraudulent' | 'requested_by_customer';
	reverseTransfer?: boolean;
	refundApplicationFee?: boolean;
}

export interface ConnectAccountStatus {
	accountId: string;
	chargesEnabled: boolean;
	payoutsEnabled: boolean;
	detailsSubmitted: boolean;
	requirements: {
		currentlyDue: string[];
		eventuallyDue: string[];
		pastDue: string[];
		disabledReason: string | null;
	};
}

/**
 * Create a Stripe client instance
 */
export function createStripeClient(secretKey: string): Stripe {
	return new Stripe(secretKey, {
		apiVersion: '2025-02-24.acacia'
	});
}

/**
 * Create an Express connected account for a facility
 *
 * Express accounts let Stripe handle onboarding, identity verification,
 * and ongoing compliance. The facility owner completes setup via Stripe's UI.
 */
export async function createExpressAccount(
	stripe: Stripe,
	params: CreateExpressAccountParams
): Promise<Stripe.Account> {
	const account = await stripe.accounts.create({
		type: 'express',
		country: params.country || 'US',
		email: params.email,
		capabilities: {
			card_payments: { requested: true },
			transfers: { requested: true }
		},
		business_type: 'company',
		business_profile: {
			name: params.businessName,
			mcc: '7941', // Sports clubs, fields, pools
			url: `https://${params.facilityId}.courtreserve.createsomething.space`
		},
		metadata: {
			facility_id: params.facilityId,
			platform: 'court-reserve'
		}
	});

	return account;
}

/**
 * Create an Account Link for Express onboarding
 *
 * This generates a URL that redirects the facility owner to Stripe's
 * hosted onboarding flow. Links expire after a few minutes.
 */
export async function createAccountLink(
	stripe: Stripe,
	params: CreateAccountLinkParams
): Promise<Stripe.AccountLink> {
	const accountLink = await stripe.accountLinks.create({
		account: params.accountId,
		refresh_url: params.refreshUrl,
		return_url: params.returnUrl,
		type: 'account_onboarding',
		collect: 'eventually_due' // Collect all info upfront
	});

	return accountLink;
}

/**
 * Create a login link for the Express dashboard
 *
 * Allows facility owners to access their Stripe Express dashboard
 * to view payouts, manage bank accounts, etc.
 */
export async function createLoginLink(
	stripe: Stripe,
	accountId: string
): Promise<Stripe.LoginLink> {
	return stripe.accounts.createLoginLink(accountId);
}

/**
 * Get Connect account status and requirements
 */
export async function getAccountStatus(
	stripe: Stripe,
	accountId: string
): Promise<ConnectAccountStatus> {
	const account = await stripe.accounts.retrieve(accountId);

	return {
		accountId: account.id,
		chargesEnabled: account.charges_enabled ?? false,
		payoutsEnabled: account.payouts_enabled ?? false,
		detailsSubmitted: account.details_submitted ?? false,
		requirements: {
			currentlyDue: account.requirements?.currently_due || [],
			eventuallyDue: account.requirements?.eventually_due || [],
			pastDue: account.requirements?.past_due || [],
			disabledReason: account.requirements?.disabled_reason || null
		}
	};
}

/**
 * Create a destination charge with platform fee
 *
 * The full amount is charged to the customer, transferred to the connected
 * account, then the application_fee_amount is transferred back to the platform.
 *
 * Example: $100 charge, 5% fee (500 bps)
 * - Customer pays: $100
 * - Facility receives: $95
 * - Platform receives: $5
 */
export async function createDestinationCharge(
	stripe: Stripe,
	params: CreateDestinationChargeParams
): Promise<Stripe.PaymentIntent> {
	// Calculate platform fee from basis points
	const platformFee = Math.round((params.amount * params.platformFeeBps) / 10000);

	const paymentIntentParams: Stripe.PaymentIntentCreateParams = {
		amount: params.amount,
		currency: params.currency,
		application_fee_amount: platformFee,
		transfer_data: {
			destination: params.destinationAccountId
		},
		// on_behalf_of makes the connected account the settlement merchant
		// This means:
		// - Their business name appears on customer statements
		// - They're responsible for disputes
		// - Better for facility branding
		on_behalf_of: params.destinationAccountId,
		metadata: {
			platform: 'court-reserve',
			platform_fee_bps: params.platformFeeBps.toString(),
			...params.metadata
		}
	};

	// Add optional fields
	if (params.customerId) {
		paymentIntentParams.customer = params.customerId;
	}
	if (params.paymentMethodId) {
		paymentIntentParams.payment_method = params.paymentMethodId;
		paymentIntentParams.confirm = true;
	}
	if (params.description) {
		paymentIntentParams.description = params.description;
	}
	if (params.statementDescriptor) {
		paymentIntentParams.statement_descriptor = params.statementDescriptor;
	}

	return stripe.paymentIntents.create(paymentIntentParams);
}

/**
 * Create a Checkout Session for reservation payment
 *
 * Uses Stripe Checkout for a hosted payment page. The connected account
 * receives the payment minus the platform fee.
 */
export async function createCheckoutSession(
	stripe: Stripe,
	params: {
		destinationAccountId: string;
		platformFeeBps: number;
		lineItems: Array<{
			name: string;
			description?: string;
			amount: number; // cents
			quantity: number;
		}>;
		successUrl: string;
		cancelUrl: string;
		customerEmail?: string;
		metadata?: Record<string, string>;
	}
): Promise<Stripe.Checkout.Session> {
	// Calculate total amount for fee calculation
	const totalAmount = params.lineItems.reduce(
		(sum, item) => sum + item.amount * item.quantity,
		0
	);
	const platformFee = Math.round((totalAmount * params.platformFeeBps) / 10000);

	const session = await stripe.checkout.sessions.create({
		mode: 'payment',
		line_items: params.lineItems.map((item) => ({
			price_data: {
				currency: 'usd',
				product_data: {
					name: item.name,
					description: item.description
				},
				unit_amount: item.amount
			},
			quantity: item.quantity
		})),
		payment_intent_data: {
			application_fee_amount: platformFee,
			transfer_data: {
				destination: params.destinationAccountId
			},
			on_behalf_of: params.destinationAccountId,
			metadata: {
				platform: 'court-reserve',
				...params.metadata
			}
		},
		success_url: params.successUrl,
		cancel_url: params.cancelUrl,
		customer_email: params.customerEmail,
		metadata: {
			platform: 'court-reserve',
			...params.metadata
		}
	});

	return session;
}

/**
 * Create a refund for a payment
 *
 * By default, refunds the full amount and reverses the transfer to the
 * connected account. Platform fee is NOT refunded unless explicitly requested.
 *
 * For cancellations within policy: full refund, reverse transfer, refund app fee
 * For late cancellations: partial refund or keep platform fee
 */
export async function createRefund(
	stripe: Stripe,
	params: RefundParams
): Promise<Stripe.Refund> {
	const refundParams: Stripe.RefundCreateParams = {
		payment_intent: params.paymentIntentId,
		reason: params.reason
	};

	// Partial refund
	if (params.amount) {
		refundParams.amount = params.amount;
	}

	// Reverse the transfer to connected account (default: true)
	if (params.reverseTransfer !== false) {
		refundParams.reverse_transfer = true;
	}

	// Refund the application fee (default: false for late cancels)
	if (params.refundApplicationFee) {
		refundParams.refund_application_fee = true;
	}

	return stripe.refunds.create(refundParams);
}

/**
 * Create a customer on the platform account for SaaS subscriptions
 *
 * Used when a facility signs up for a Court Reserve subscription plan.
 */
export async function createPlatformCustomer(
	stripe: Stripe,
	params: {
		email: string;
		name: string;
		facilityId: string;
		metadata?: Record<string, string>;
	}
): Promise<Stripe.Customer> {
	return stripe.customers.create({
		email: params.email,
		name: params.name,
		metadata: {
			facility_id: params.facilityId,
			platform: 'court-reserve',
			...params.metadata
		}
	});
}

/**
 * Create a subscription for a facility's SaaS plan
 *
 * Subscriptions are on the platform account (Court Reserve), not the
 * connected account. This is separate from reservation payments.
 */
export async function createSubscription(
	stripe: Stripe,
	params: {
		customerId: string;
		priceId: string;
		trialDays?: number;
		metadata?: Record<string, string>;
	}
): Promise<Stripe.Subscription> {
	const subscriptionParams: Stripe.SubscriptionCreateParams = {
		customer: params.customerId,
		items: [{ price: params.priceId }],
		payment_behavior: 'default_incomplete',
		payment_settings: {
			save_default_payment_method: 'on_subscription'
		},
		expand: ['latest_invoice.payment_intent'],
		metadata: {
			platform: 'court-reserve',
			...params.metadata
		}
	};

	if (params.trialDays) {
		subscriptionParams.trial_period_days = params.trialDays;
	}

	return stripe.subscriptions.create(subscriptionParams);
}

/**
 * Cancel a subscription
 */
export async function cancelSubscription(
	stripe: Stripe,
	subscriptionId: string,
	cancelImmediately = false
): Promise<Stripe.Subscription> {
	if (cancelImmediately) {
		return stripe.subscriptions.cancel(subscriptionId);
	}

	// Cancel at period end (most common)
	return stripe.subscriptions.update(subscriptionId, {
		cancel_at_period_end: true
	});
}

/**
 * Construct and verify a webhook event
 */
export function constructWebhookEvent(
	stripe: Stripe,
	payload: string | Buffer,
	signature: string,
	webhookSecret: string
): Stripe.Event {
	return stripe.webhooks.constructEvent(payload, signature, webhookSecret);
}
