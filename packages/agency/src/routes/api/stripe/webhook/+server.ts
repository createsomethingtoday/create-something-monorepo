/**
 * Stripe Webhook Handler
 *
 * Handles Stripe webhook events for payment processing.
 * Events are verified using webhook signature.
 */

import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import { createStripeClient, HANDLED_WEBHOOK_EVENTS } from '$lib/services/stripe';
import type Stripe from 'stripe';

export const POST: RequestHandler = async ({ request, platform }) => {
	// Get Stripe configuration from environment
	const stripeSecretKey = platform?.env?.STRIPE_SECRET_KEY;
	const webhookSecret = platform?.env?.STRIPE_WEBHOOK_SECRET;

	if (!stripeSecretKey || !webhookSecret) {
		console.error('Stripe webhook: Missing configuration');
		throw error(500, 'Webhook not configured');
	}

	// Get the raw body for signature verification
	const body = await request.text();
	const signature = request.headers.get('stripe-signature');

	if (!signature) {
		throw error(400, 'Missing stripe-signature header');
	}

	const stripe = createStripeClient(stripeSecretKey);

	// Verify webhook signature
	let event: Stripe.Event;
	try {
		event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
	} catch (err) {
		console.error('Webhook signature verification failed:', err);
		throw error(400, 'Invalid webhook signature');
	}

	// Log event for debugging
	console.log(`Stripe webhook received: ${event.type}`);

	// Handle specific events
	try {
		switch (event.type) {
			case 'checkout.session.completed':
				await handleCheckoutComplete(event.data.object as Stripe.Checkout.Session, platform);
				break;

			case 'customer.subscription.created':
			case 'customer.subscription.updated':
				await handleSubscriptionUpdate(event.data.object as Stripe.Subscription, platform);
				break;

			case 'customer.subscription.deleted':
				await handleSubscriptionCanceled(event.data.object as Stripe.Subscription, platform);
				break;

			case 'invoice.paid':
				await handleInvoicePaid(event.data.object as Stripe.Invoice, platform);
				break;

			case 'invoice.payment_failed':
				await handleInvoiceFailed(event.data.object as Stripe.Invoice, platform);
				break;

			default:
				console.log(`Unhandled event type: ${event.type}`);
		}

		return json({ received: true });
	} catch (err) {
		console.error(`Error handling webhook ${event.type}:`, err);
		throw error(500, 'Webhook handler failed');
	}
};

/**
 * Handle successful checkout completion
 */
async function handleCheckoutComplete(
	session: Stripe.Checkout.Session,
	platform: App.Platform | undefined
) {
	const productId = session.metadata?.product_id;
	const tier = session.metadata?.tier;
	const assessmentId = session.metadata?.assessment_id;

	console.log('Checkout completed:', {
		sessionId: session.id,
		productId,
		tier,
		assessmentId,
		customerEmail: session.customer_email,
		amountTotal: session.amount_total
	});

	// Store purchase record in KV for quick lookups
	const cache = platform?.env?.CACHE;
	if (cache && session.customer_email) {
		const purchaseKey = `purchase:${session.customer_email}:${productId}`;
		await cache.put(
			purchaseKey,
			JSON.stringify({
				sessionId: session.id,
				productId,
				tier,
				purchasedAt: new Date().toISOString(),
				amount: session.amount_total,
				currency: session.currency
			}),
			{ expirationTtl: 60 * 60 * 24 * 365 } // 1 year
		);
	}

	// For one-time purchases, send fulfillment email
	if (session.mode === 'payment') {
		// TODO: Integrate with email service (Resend, etc.)
		console.log(`One-time purchase fulfillment needed for ${productId}`);
	}
}

/**
 * Handle subscription creation or update
 */
async function handleSubscriptionUpdate(
	subscription: Stripe.Subscription,
	platform: App.Platform | undefined
) {
	console.log('Subscription updated:', {
		subscriptionId: subscription.id,
		status: subscription.status,
		customerId: subscription.customer
	});

	// Store subscription status in KV
	const cache = platform?.env?.CACHE;
	if (cache) {
		const subKey = `subscription:${subscription.id}`;
		await cache.put(
			subKey,
			JSON.stringify({
				id: subscription.id,
				status: subscription.status,
				customerId: subscription.customer,
				currentPeriodEnd: subscription.current_period_end
					? new Date(subscription.current_period_end * 1000).toISOString()
					: null,
				cancelAtPeriodEnd: subscription.cancel_at_period_end
			}),
			{ expirationTtl: 60 * 60 * 24 * 30 } // 30 days
		);
	}
}

/**
 * Handle subscription cancellation
 */
async function handleSubscriptionCanceled(
	subscription: Stripe.Subscription,
	platform: App.Platform | undefined
) {
	console.log('Subscription canceled:', {
		subscriptionId: subscription.id,
		customerId: subscription.customer
	});

	// Update subscription status in KV
	const cache = platform?.env?.CACHE;
	if (cache) {
		const subKey = `subscription:${subscription.id}`;
		await cache.put(
			subKey,
			JSON.stringify({
				id: subscription.id,
				status: 'canceled',
				customerId: subscription.customer,
				canceledAt: new Date().toISOString()
			}),
			{ expirationTtl: 60 * 60 * 24 * 30 } // Keep for 30 days for reference
		);
	}
}

/**
 * Handle successful invoice payment
 */
async function handleInvoicePaid(invoice: Stripe.Invoice, platform: App.Platform | undefined) {
	console.log('Invoice paid:', {
		invoiceId: invoice.id,
		amountPaid: invoice.amount_paid,
		customerId: invoice.customer
	});

	// Could log to analytics or trigger fulfillment
}

/**
 * Handle failed invoice payment
 */
async function handleInvoiceFailed(invoice: Stripe.Invoice, platform: App.Platform | undefined) {
	console.log('Invoice payment failed:', {
		invoiceId: invoice.id,
		amountDue: invoice.amount_due,
		customerId: invoice.customer
	});

	// TODO: Send dunning email or notification
}
