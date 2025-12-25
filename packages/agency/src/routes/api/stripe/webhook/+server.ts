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
	const customerEmail = session.customer_email || session.customer_details?.email;

	console.log('Checkout completed:', {
		sessionId: session.id,
		productId,
		tier,
		assessmentId,
		customerEmail,
		amountTotal: session.amount_total
	});

	const cache = platform?.env?.CACHE;

	// Store purchase record in KV for quick lookups
	if (cache && customerEmail && productId) {
		const purchaseKey = `purchase:${customerEmail}:${productId}`;
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

		// Create download token for email link (valid 7 days)
		const downloadToken = crypto.randomUUID();
		await cache.put(
			`download:${downloadToken}`,
			JSON.stringify({
				productId,
				email: customerEmail,
				sessionId: session.id,
				createdAt: Date.now(),
				expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000 // 7 days
			}),
			{ expirationTtl: 60 * 60 * 24 * 7 } // 7 days
		);

		// Send fulfillment email
		if (session.mode === 'payment') {
			await sendFulfillmentEmail(customerEmail, productId, downloadToken, platform);
		}
	}
}

/**
 * Send fulfillment email with download link
 */
async function sendFulfillmentEmail(
	email: string,
	productId: string,
	downloadToken: string,
	platform: App.Platform | undefined
) {
	const downloadUrl = `https://createsomething.agency/api/products/${productId}/download?token=${downloadToken}`;

	// Product names for email
	const productNames: Record<string, string> = {
		'automation-patterns': 'Automation Patterns Pack',
		'vertical-templates': 'Vertical Templates',
		'agent-in-a-box': 'Agent-in-a-Box Kit'
	};

	const productName = productNames[productId] || productId;

	// Try to send via Resend if API key is configured
	const resendApiKey = platform?.env?.RESEND_API_KEY;
	if (resendApiKey) {
		try {
			const response = await fetch('https://api.resend.com/emails', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${resendApiKey}`
				},
				body: JSON.stringify({
					from: 'CREATE SOMETHING <products@createsomething.agency>',
					to: email,
					subject: `Your ${productName} is ready`,
					html: `
						<h1>Thank you for your purchase!</h1>
						<p>Your ${productName} is ready to download.</p>
						<p><a href="${downloadUrl}" style="display: inline-block; padding: 12px 24px; background: #000; color: #fff; text-decoration: none; border-radius: 6px;">Download Now</a></p>
						<p style="color: #666; font-size: 14px;">This link is valid for 7 days. If you have any questions, reply to this email.</p>
						<hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
						<p style="color: #999; font-size: 12px;">CREATE SOMETHING<br/>createsomething.agency</p>
					`
				})
			});

			if (response.ok) {
				console.log(`Fulfillment email sent to ${email} for ${productId}`);
			} else {
				const error = await response.text();
				console.error('Failed to send email via Resend:', error);
			}
		} catch (err) {
			console.error('Error sending fulfillment email:', err);
		}
	} else {
		// Log for manual fulfillment if no email service configured
		console.log('FULFILLMENT EMAIL NEEDED:', {
			to: email,
			product: productName,
			downloadUrl
		});
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
		// Get current period end from first subscription item
		const currentPeriodEnd = subscription.items?.data?.[0]?.current_period_end;
		await cache.put(
			subKey,
			JSON.stringify({
				id: subscription.id,
				status: subscription.status,
				customerId: subscription.customer,
				currentPeriodEnd: currentPeriodEnd
					? new Date(currentPeriodEnd * 1000).toISOString()
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
