/**
 * Stripe Webhook Handler
 *
 * Handles Stripe webhook events for payment processing.
 * Events are verified using webhook signature.
 */

import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import { createStripeClient, getProductIdByStripePriceId } from '$lib/services/stripe';
import { createPersistentLogger, createLogger, type Logger } from '@create-something/canon/utils';
import type Stripe from 'stripe';
import { normalizeAgencyServiceTier } from '$lib/server/mcp-entitlements';
import {
	buildMapEntitlementFromMetadata,
	updateMapEntitlementBillingBySubscription,
	upsertMapEntitlement
} from '$lib/server/map-commercial';

export const POST: RequestHandler = async ({ request, platform }) => {
	const waitUntil = platform?.context?.waitUntil?.bind(platform.context);
	// Create persistent logger for agent-queryable error tracking
	const logger: Logger = platform?.env?.DB
		? createPersistentLogger('StripeWebhook', {
				db: platform.env.DB,
				waitUntil,
				minPersistLevel: 'warn'
			}, {
				path: '/api/stripe/webhook',
				method: 'POST'
			})
		: createLogger('StripeWebhook');
	// Get Stripe configuration from environment
	const stripeSecretKey = platform?.env?.STRIPE_SECRET_KEY;
	const webhookSecret = platform?.env?.STRIPE_WEBHOOK_SECRET;

	if (!stripeSecretKey || !webhookSecret) {
		logger.error('Missing Stripe configuration');
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
		logger.error('Webhook signature verification failed', { error: err });
		throw error(400, 'Invalid webhook signature');
	}

	const db = platform?.env?.DB;
	if (!db) {
		logger.error('Missing D1 binding for Stripe webhook receipt', { eventType: event.type });
		throw error(500, 'Webhook receipt store unavailable');
	}

	try {
		const receipt = await recordStripeWebhookReceipt(db, event, body);
		logger.info('Webhook received', { eventType: event.type, eventId: event.id, status: receipt.status });

		if (receipt.status === 'processed' || receipt.status === 'processing' || receipt.status === 'ignored') {
			return json({ received: true, duplicate: true, status: receipt.status });
		}

		const processPromise = processStripeWebhookEvent({
			db,
			event,
			platform,
			logger,
			stripe
		});

		if (waitUntil) {
			waitUntil(processPromise);
		} else {
			void processPromise;
		}

		return json({ received: true, status: 'queued' });
	} catch (err) {
		logger.error('Failed to persist Stripe webhook receipt', { eventType: event.type, eventId: event.id, error: err });
		throw error(500, 'Webhook receipt failed');
	}
};

type StripeWebhookStatus = 'received' | 'processing' | 'processed' | 'failed' | 'ignored';

interface StripeWebhookReceipt {
	status: StripeWebhookStatus;
	processing_attempts: number;
}

interface StripeWebhookProcessInput {
	db: D1Database;
	event: Stripe.Event;
	platform: App.Platform | undefined;
	logger: Logger;
	stripe: Stripe;
}

function getEventObjectIdentity(event: Stripe.Event): { objectId: string | null; objectType: string | null } {
	const object = event.data.object as { id?: unknown; object?: unknown };
	return {
		objectId: typeof object.id === 'string' ? object.id : null,
		objectType: typeof object.object === 'string' ? object.object : null
	};
}

async function recordStripeWebhookReceipt(
	db: D1Database,
	event: Stripe.Event,
	rawBody: string
): Promise<StripeWebhookReceipt> {
	const { objectId, objectType } = getEventObjectIdentity(event);

	await db
		.prepare(
			`INSERT INTO stripe_webhook_events (
				event_id, event_type, api_version, livemode, object_id, object_type, payload_json
			) VALUES (?, ?, ?, ?, ?, ?, ?)
			ON CONFLICT(event_id) DO UPDATE SET
				delivery_count = delivery_count + 1,
				last_received_at = datetime('now'),
				payload_json = excluded.payload_json,
				status = CASE
					WHEN stripe_webhook_events.status = 'failed' THEN 'received'
					WHEN stripe_webhook_events.status = 'processing'
						AND stripe_webhook_events.last_attempt_at < datetime('now', '-15 minutes') THEN 'received'
					ELSE stripe_webhook_events.status
				END,
				updated_at = datetime('now')`
		)
		.bind(
			event.id,
			event.type,
			event.api_version ?? null,
			event.livemode ? 1 : 0,
			objectId,
			objectType,
			rawBody
		)
		.run();

	const receipt = await db
		.prepare(
			`SELECT status, processing_attempts
			 FROM stripe_webhook_events
			 WHERE event_id = ?`
		)
		.bind(event.id)
		.first<StripeWebhookReceipt>();

	if (!receipt) {
		throw new Error(`Stripe webhook receipt was not persisted for ${event.id}`);
	}

	return receipt;
}

async function claimStripeWebhookEvent(db: D1Database, eventId: string): Promise<boolean> {
	const result = await db
		.prepare(
			`UPDATE stripe_webhook_events
			 SET status = 'processing',
			     processing_attempts = processing_attempts + 1,
			     last_attempt_at = datetime('now'),
			     last_error = NULL,
			     updated_at = datetime('now')
			 WHERE event_id = ?
			   AND status IN ('received', 'failed')`
		)
		.bind(eventId)
		.run();

	return (result.meta?.changes ?? 0) > 0;
}

async function markStripeWebhookEventProcessed(db: D1Database, eventId: string): Promise<void> {
	await db
		.prepare(
			`UPDATE stripe_webhook_events
			 SET status = 'processed',
			     processed_at = datetime('now'),
			     updated_at = datetime('now'),
			     last_error = NULL
			 WHERE event_id = ?`
		)
		.bind(eventId)
		.run();
}

async function markStripeWebhookEventFailed(
	db: D1Database,
	eventId: string,
	err: unknown
): Promise<void> {
	const message = err instanceof Error ? err.message : String(err);
	await db
		.prepare(
			`UPDATE stripe_webhook_events
			 SET status = 'failed',
			     last_error = ?,
			     updated_at = datetime('now')
			 WHERE event_id = ?`
		)
		.bind(message, eventId)
		.run();
}

async function processStripeWebhookEvent(input: StripeWebhookProcessInput): Promise<void> {
	const { db, event, platform, logger, stripe } = input;
	const claimed = await claimStripeWebhookEvent(db, event.id);
	if (!claimed) {
		logger.debug('Stripe webhook event already claimed or processed', { eventId: event.id, eventType: event.type });
		return;
	}

	try {
		switch (event.type) {
			case 'checkout.session.completed':
				await handleCheckoutComplete(event.data.object as Stripe.Checkout.Session, platform, logger);
				break;

			case 'customer.subscription.created':
			case 'customer.subscription.updated':
				await handleSubscriptionUpdate(event.data.object as Stripe.Subscription, platform, logger, stripe);
				break;

			case 'customer.subscription.deleted':
				await handleSubscriptionCanceled(event.data.object as Stripe.Subscription, platform, logger, stripe);
				break;

			case 'invoice.paid':
				await handleInvoicePaid(event.data.object as Stripe.Invoice, platform, logger);
				break;

			case 'invoice.payment_failed':
				await handleInvoiceFailed(event.data.object as Stripe.Invoice, platform, logger);
				break;

			default:
				logger.debug('Unhandled event type', { eventType: event.type, eventId: event.id });
		}

		await markStripeWebhookEventProcessed(db, event.id);
	} catch (err) {
		logger.error('Error handling webhook', { eventType: event.type, eventId: event.id, error: err });
		try {
			await markStripeWebhookEventFailed(db, event.id, err);
		} catch (markErr) {
			logger.error('Failed to mark Stripe webhook event failed', {
				eventType: event.type,
				eventId: event.id,
				error: markErr
			});
		}
	}
}

/**
 * Handle successful checkout completion
 */
async function handleCheckoutComplete(
	session: Stripe.Checkout.Session,
	platform: App.Platform | undefined,
	logger: Logger
) {
	const productId = session.metadata?.product_id;
	const tier = session.metadata?.tier;
	const assessmentId = session.metadata?.assessment_id;
	const customerEmail = session.customer_email || session.customer_details?.email;
	const pendingId = session.metadata?.pending_id;
	const subdomain = session.metadata?.subdomain;

	logger.info('Checkout completed', {
		sessionId: session.id,
		productId,
		tier,
		assessmentId,
		customerEmail,
		pendingId,
		subdomain,
		amountTotal: session.amount_total
	});

	// Handle Agent-in-a-Box provisioning
	const agentKitTier = deriveAgentKitTier(productId, tier);
	if (agentKitTier) {
		await provisionAgentInABox(session, agentKitTier, platform, logger);
		await upsertCommercialStateFromCheckout(session, platform, logger);
		return;
	}

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
			await sendFulfillmentEmail(customerEmail, productId, downloadToken, platform, logger);
		}
	}

	await upsertCommercialStateFromCheckout(session, platform, logger);
}

/**
 * Send fulfillment email with download link
 */
async function sendFulfillmentEmail(
	email: string,
	productId: string,
	downloadToken: string,
	platform: App.Platform | undefined,
	logger: Logger
) {
	const downloadUrl = `https://createsomething.agency/api/products/${productId}/download?token=${downloadToken}`;

	// Product names for email
	const productNames: Record<string, string> = {
		'automation-patterns': 'Automation Patterns Pack',
		'agent-in-a-box': 'Agent-in-a-Box Kit'
	};

	const productName = productNames[productId] || productId;

	// Try to send via Resend if API key is configured
	const resendApiKey = platform?.env?.RESEND_API_KEY;
	const emailFromProducts = platform?.env?.EMAIL_FROM_PRODUCTS ?? 'CREATE SOMETHING <products@createsomething.agency>';

	if (resendApiKey) {
		try {
			const response = await fetch('https://api.resend.com/emails', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${resendApiKey}`
				},
				body: JSON.stringify({
					from: emailFromProducts,
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
				logger.info('Fulfillment email sent', { email, productId });
			} else {
				const errorText = await response.text();
				logger.error('Failed to send fulfillment email via Resend', { error: errorText });
			}
		} catch (err) {
			logger.error('Error sending fulfillment email', { error: err });
		}
	} else {
		// Log for manual fulfillment if no email service configured
		logger.warn('Fulfillment email needed (no Resend configured)', {
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
	platform: App.Platform | undefined,
	logger: Logger,
	stripe: Stripe
) {
	logger.info('Subscription updated', {
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

	await upsertCommercialStateFromSubscription(subscription, platform, logger, stripe);
}

/**
 * Handle subscription cancellation
 */
async function handleSubscriptionCanceled(
	subscription: Stripe.Subscription,
	platform: App.Platform | undefined,
	logger: Logger,
	stripe: Stripe
) {
	logger.info('Subscription canceled', {
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

	await upsertCommercialStateFromSubscription(subscription, platform, logger, stripe, { forceCanceled: true });

}

/**
 * Provision Agent-in-a-Box after successful purchase
 */
async function provisionAgentInABox(
	session: Stripe.Checkout.Session,
	tier: string | undefined,
	platform: App.Platform | undefined,
	logger: Logger
) {
	const customerEmail = session.customer_email || session.customer_details?.email;
	const validTier = tier === 'solo' || tier === 'team' || tier === 'org' ? tier : 'solo';

	if (!customerEmail) {
		logger.error('Agent-in-a-Box provisioning failed: no customer email');
		return;
	}

	const db = platform?.env?.DB;
	if (!db) {
		throw new Error('Agent-in-a-Box provisioning failed: DB binding unavailable');
	}

	const existingPurchase = await db
		.prepare(
			`SELECT email, tier, license_key
			 FROM agent_kit_purchases
			 WHERE stripe_session_id = ?`
		)
		.bind(session.id)
		.first<{ email: string; tier: string; license_key: string }>();

	if (existingPurchase) {
		logger.info('Agent-in-a-Box purchase already recorded', {
			email: existingPurchase.email,
			tier: existingPurchase.tier,
			sessionId: session.id,
			licenseKey: `${existingPurchase.license_key.slice(0, 10)}...`
		});
		return;
	}

	// Generate license key (ak_ prefix for easy identification)
	const licenseKey = `ak_${crypto.randomUUID().replace(/-/g, '')}`;

	// Determine office hours based on tier
	const officeHoursMap: Record<string, number> = {
		solo: 4,
		team: 12,
		org: 24
	};
	const officeHoursRemaining = officeHoursMap[validTier] || 4;

	// Determine team seats based on tier
	const teamSeatsMap: Record<string, number> = {
		solo: 1,
		team: 5,
		org: 999 // Unlimited for org
	};
	const teamSeatsTotal = teamSeatsMap[validTier] || 1;

	try {
		// Store purchase in D1
		await db
			.prepare(
				`
				INSERT INTO agent_kit_purchases (
					id, email, tier, license_key, stripe_session_id, stripe_customer_id,
					office_hours_remaining, team_seats_total, team_seats_used, created_at, updated_at
				) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, datetime('now'), datetime('now'))
			`
			)
			.bind(
				crypto.randomUUID(),
				customerEmail,
				validTier,
				licenseKey,
				session.id,
				normalizeIdentifier(session.customer),
				officeHoursRemaining,
				teamSeatsTotal
			)
			.run();

		logger.info('Agent-in-a-Box purchase recorded', {
			email: customerEmail,
			tier: validTier,
			licenseKey: licenseKey.substring(0, 10) + '...',
			officeHoursRemaining,
			teamSeatsTotal
		});
	} catch (err) {
		logger.error('Failed to store Agent-in-a-Box purchase in D1', { error: err });
		throw err;
	}

	// Provision LMS account via identity worker
	await provisionLmsAccount(customerEmail, validTier, platform, logger);

	// Send fulfillment email with license key
	await sendAgentKitEmail(customerEmail, validTier, licenseKey, platform, logger);
}

/**
 * Provision LMS account for Agent-in-a-Box purchaser
 */
async function provisionLmsAccount(
	email: string,
	tier: string,
	platform: App.Platform | undefined,
	logger: Logger
) {
	const identityUrl = platform?.env?.IDENTITY_WORKER_URL || 'https://id.createsomething.space';
	const identitySecret = platform?.env?.IDENTITY_WORKER_SECRET;

	if (!identitySecret) {
		logger.warn('LMS provisioning needed (no identity secret configured)', { email, tier });
		return;
	}

	try {
		const response = await fetch(`${identityUrl}/api/provision`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'x-api-secret': identitySecret
			},
			body: JSON.stringify({
				email,
				tier: `agent-kit-${tier}`,
				source: 'agent-in-a-box'
			})
		});

		if (response.ok) {
			logger.info('LMS account provisioned', { email, tier });
		} else {
			const errorText = await response.text();
			logger.error('LMS provisioning failed', { error: errorText });
		}
	} catch (err) {
		logger.error('Error provisioning LMS account', { error: err });
	}
}

/**
 * Send fulfillment email for Agent-in-a-Box purchase
 */
async function sendAgentKitEmail(
	email: string,
	tier: string,
	licenseKey: string,
	platform: App.Platform | undefined,
	logger: Logger
) {
	const tierNames: Record<string, string> = {
		solo: 'Solo',
		team: 'Team',
		org: 'Organization'
	};
	const tierName = tierNames[tier] || 'Solo';

	const resendApiKey = platform?.env?.RESEND_API_KEY;
	const emailFromProducts = platform?.env?.EMAIL_FROM_PRODUCTS ?? 'CREATE SOMETHING <products@createsomething.agency>';

	if (resendApiKey) {
		try {
			const response = await fetch('https://api.resend.com/emails', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${resendApiKey}`
				},
				body: JSON.stringify({
					from: emailFromProducts,
					to: email,
					subject: `Your Agent-in-a-Box (${tierName}) License Key`,
					html: `
						<h1>Your Agent-in-a-Box is ready!</h1>
						<p>Thank you for your purchase. Here's everything you need to get started.</p>

						<h2>1. Install your kit</h2>
						<p>Run this command in your terminal:</p>
						<pre style="background: #1a1a1a; color: #fff; padding: 16px; border-radius: 8px; overflow-x: auto;">npx @createsomething/agent-kit --key=${licenseKey}</pre>

						<h2>2. Access learning materials</h2>
						<p><a href="https://learn.createsomething.space" style="display: inline-block; padding: 12px 24px; background: #000; color: #fff; text-decoration: none; border-radius: 6px;">Open LMS</a></p>

						<h2>3. Book office hours</h2>
						<p>You have access to weekly office hours sessions for live Q&A.</p>
						<p><a href="https://cal.com/createsomething/agent-kit" style="display: inline-block; padding: 12px 24px; background: #000; color: #fff; text-decoration: none; border-radius: 6px;">Schedule Office Hours</a></p>

						<hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />

						<h3>What's included:</h3>
						<ul>
							<li>Pre-configured WezTerm with Canon color scheme</li>
							<li>Claude Code settings and skill packs</li>
							<li>Beads agent-native task management</li>
							<li>6 MCP server starters (Slack, Linear, Stripe, GitHub, Notion, Cloudflare)</li>
							<li>Harness specifications for autonomous work</li>
						</ul>

						<p style="color: #666; font-size: 14px; margin-top: 24px;">
							Keep this email safe—your license key is required for installation and updates.
							<br />Questions? Reply to this email.
						</p>

						<hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
						<p style="color: #999; font-size: 12px;">CREATE SOMETHING<br/>createsomething.agency</p>
					`
				})
			});

			if (response.ok) {
				logger.info('Agent-in-a-Box fulfillment email sent', { email });
			} else {
				const errorText = await response.text();
				logger.error('Failed to send Agent-in-a-Box email via Resend', { error: errorText });
			}
		} catch (err) {
			logger.error('Error sending Agent-in-a-Box email', { error: err });
		}
	} else {
		// Log for manual fulfillment if no email service configured
		logger.warn('Agent-in-a-Box fulfillment email needed (no Resend configured)', {
			to: email,
			tier: tierName,
			licenseKey,
			installCommand: `npx @createsomething/agent-kit --key=${licenseKey}`,
			lmsUrl: 'https://learn.createsomething.space',
			officeHoursUrl: 'https://cal.com/createsomething/agent-kit'
		});
	}
}

/**
 * Handle successful invoice payment
 */
async function handleInvoicePaid(invoice: Stripe.Invoice, platform: App.Platform | undefined, logger: Logger) {
	logger.info('Invoice paid', {
		invoiceId: invoice.id,
		amountPaid: invoice.amount_paid,
		customerId: invoice.customer
	});

	await upsertCommercialStateFromInvoice(invoice, platform, logger, { billingActive: true, lastInvoiceStatus: 'paid' });
}

/**
 * Handle failed invoice payment
 */
async function handleInvoiceFailed(invoice: Stripe.Invoice, platform: App.Platform | undefined, logger: Logger) {
	logger.warn('Invoice payment failed', {
		invoiceId: invoice.id,
		amountDue: invoice.amount_due,
		customerId: invoice.customer
	});

	// Get customer email from invoice
	const customerEmail = invoice.customer_email;
	if (!customerEmail) {
		logger.debug('No customer email on invoice, skipping dunning email');
		return;
	}

	// Format amount for display
	const amountDue = (invoice.amount_due / 100).toFixed(2);
	const currency = (invoice.currency || 'usd').toUpperCase();

	// Stripe's hosted invoice URL allows customer to retry payment
	const paymentUrl = invoice.hosted_invoice_url ?? null;

	await upsertCommercialStateFromInvoice(invoice, platform, logger, {
		billingActive: false,
		lastInvoiceStatus: 'payment_failed',
	});

	await sendDunningEmail(customerEmail, amountDue, currency, paymentUrl, platform, logger);
}

async function upsertCommercialStateFromCheckout(
	session: Stripe.Checkout.Session,
	platform: App.Platform | undefined,
	logger: Logger
) {
	const db = platform?.env?.DB;
	if (!db) return;

	const customerEmail = normalizeEmail(session.customer_email || session.customer_details?.email);
	const stripeCustomerId = normalizeIdentifier(session.customer);
	const productId = normalizeProductId(session.metadata?.product_id);
	if (!customerEmail && !stripeCustomerId) {
		return;
	}

	const mode = session.mode;
	const billingActive = mode === 'subscription';
	const contractActive = mode === 'subscription';

	await upsertAgencyCommercialAccount(db, {
		normalizedEmail: customerEmail,
		stripeCustomerId,
		productId,
		serviceTier: deriveServiceTier(productId),
		subscriptionStatus: mode === 'subscription' ? 'checkout_completed' : 'one_time_purchase',
		contractActive,
		billingActive,
		lastInvoiceStatus: null,
		metadata: {
			source: 'stripe_checkout_session',
			checkout_session_id: session.id,
			mode,
		},
	});

	const mapEntitlement = buildMapEntitlementFromMetadata({
		metadata: session.metadata,
		subscriptionStatus: 'checkout_completed',
		stripeCustomerId,
		stripeSubscriptionId: normalizeIdentifier(session.subscription)
	});
	if (mapEntitlement) await upsertMapEntitlement(db, mapEntitlement);

	logger.info('Commercial state updated from checkout', {
		customerEmail,
		stripeCustomerId,
		productId,
		mode,
	});
}

async function upsertCommercialStateFromSubscription(
	subscription: Stripe.Subscription,
	platform: App.Platform | undefined,
	logger: Logger,
	stripe: Stripe,
	options: { forceCanceled?: boolean } = {}
) {
	const db = platform?.env?.DB;
	if (!db) return;

	const stripeCustomerId = normalizeIdentifier(subscription.customer);
	const customerEmail = await resolveStripeCustomerEmail(subscription.customer, stripe);
	const priceId = subscription.items?.data?.[0]?.price?.id ?? null;
	const productId = normalizeProductId(subscription.metadata?.product_id) ?? (priceId ? getProductIdByStripePriceId(priceId) : null);
	const active =
		!options.forceCanceled &&
		['trialing', 'active'].includes(subscription.status);
	const currentPeriodEnd = subscription.items?.data?.[0]?.current_period_end
		? new Date(subscription.items.data[0]!.current_period_end * 1000).toISOString()
		: null;

	await upsertAgencyCommercialAccount(db, {
		normalizedEmail: customerEmail,
		stripeCustomerId,
		stripeSubscriptionId: subscription.id,
		productId,
		serviceTier: deriveServiceTier(productId),
		subscriptionStatus: options.forceCanceled ? 'canceled' : subscription.status,
		contractActive: active,
		billingActive: active,
		currentPeriodEnd,
		lastInvoiceStatus: null,
		metadata: {
			source: 'stripe_subscription',
			cancel_at_period_end: subscription.cancel_at_period_end,
		},
	});

	const mapEntitlement = buildMapEntitlementFromMetadata({
		metadata: subscription.metadata,
		subscriptionStatus: options.forceCanceled ? 'canceled' : subscription.status,
		stripeCustomerId,
		stripeSubscriptionId: subscription.id,
		currentPeriodEnd
	});
	if (mapEntitlement) await upsertMapEntitlement(db, mapEntitlement);

	logger.info('Commercial state updated from subscription', {
		stripeCustomerId,
		customerEmail,
		subscriptionId: subscription.id,
		status: options.forceCanceled ? 'canceled' : subscription.status,
		productId,
	});
}

async function upsertCommercialStateFromInvoice(
	invoice: Stripe.Invoice,
	platform: App.Platform | undefined,
	logger: Logger,
	input: { billingActive: boolean; lastInvoiceStatus: string }
) {
	const db = platform?.env?.DB;
	if (!db) return;

	const customerEmail = normalizeEmail(invoice.customer_email);
	const stripeCustomerId = normalizeIdentifier(invoice.customer);
	const stripeSubscriptionId = normalizeIdentifier(
		typeof invoice.parent === 'object' && invoice.parent && 'subscription_details' in invoice.parent
			? invoice.parent.subscription_details?.subscription
			: null
	);

	await upsertAgencyCommercialAccount(db, {
		normalizedEmail: customerEmail,
		stripeCustomerId,
		stripeSubscriptionId,
		contractActive: input.billingActive,
		billingActive: input.billingActive,
		lastInvoiceStatus: input.lastInvoiceStatus,
		metadata: {
			source: 'stripe_invoice',
			invoice_id: invoice.id,
			hosted_invoice_url: invoice.hosted_invoice_url ?? null,
		},
	});

	if (stripeSubscriptionId) {
		await updateMapEntitlementBillingBySubscription(db, stripeSubscriptionId, {
			billingActive: input.billingActive,
			subscriptionStatus: input.lastInvoiceStatus,
			entitlementStatus: input.billingActive ? 'active' : 'payment_failed'
		});
	}

	logger.info('Commercial state updated from invoice', {
		customerEmail,
		stripeCustomerId,
		subscriptionId: stripeSubscriptionId,
		lastInvoiceStatus: input.lastInvoiceStatus,
	});
}

async function upsertAgencyCommercialAccount(
	db: D1Database,
	input: {
		normalizedEmail?: string | null;
		stripeCustomerId?: string | null;
		stripeSubscriptionId?: string | null;
		productId?: string | null;
		serviceTier?: string | null;
		subscriptionStatus?: string | null;
		contractActive: boolean;
		billingActive: boolean;
		currentPeriodEnd?: string | null;
		lastInvoiceStatus?: string | null;
		metadata?: Record<string, unknown>;
	}
) {
	const identity = input.stripeCustomerId ?? input.normalizedEmail;
	if (!identity) return;

	await db
		.prepare(
			`INSERT INTO agency_commercial_accounts (
         id, normalized_email, stripe_customer_id, stripe_subscription_id, product_id, service_tier,
         subscription_status, contract_active, billing_active, current_period_end, last_invoice_status, metadata_json
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(stripe_customer_id) DO UPDATE SET
         normalized_email = COALESCE(excluded.normalized_email, agency_commercial_accounts.normalized_email),
         stripe_subscription_id = COALESCE(excluded.stripe_subscription_id, agency_commercial_accounts.stripe_subscription_id),
         product_id = COALESCE(excluded.product_id, agency_commercial_accounts.product_id),
         service_tier = COALESCE(excluded.service_tier, agency_commercial_accounts.service_tier),
         subscription_status = COALESCE(excluded.subscription_status, agency_commercial_accounts.subscription_status),
         contract_active = excluded.contract_active,
         billing_active = excluded.billing_active,
         current_period_end = COALESCE(excluded.current_period_end, agency_commercial_accounts.current_period_end),
         last_invoice_status = COALESCE(excluded.last_invoice_status, agency_commercial_accounts.last_invoice_status),
         metadata_json = excluded.metadata_json,
         updated_at = datetime('now')`
		)
		.bind(
			`comm_${crypto.randomUUID().replace(/-/g, '')}`,
			input.normalizedEmail ?? null,
			input.stripeCustomerId ?? null,
			input.stripeSubscriptionId ?? null,
			input.productId ?? null,
			input.serviceTier ?? null,
			input.subscriptionStatus ?? null,
			input.contractActive ? 1 : 0,
			input.billingActive ? 1 : 0,
			input.currentPeriodEnd ?? null,
			input.lastInvoiceStatus ?? null,
			JSON.stringify(input.metadata ?? {})
		)
		.run()
		.catch(async (error) => {
			if (!input.normalizedEmail || input.stripeCustomerId) {
				throw error;
			}

			await db
				.prepare(
					`INSERT INTO agency_commercial_accounts (
             id, normalized_email, stripe_subscription_id, product_id, service_tier,
             subscription_status, contract_active, billing_active, current_period_end, last_invoice_status, metadata_json
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
				)
				.bind(
					`comm_${crypto.randomUUID().replace(/-/g, '')}`,
					input.normalizedEmail,
					input.stripeSubscriptionId ?? null,
					input.productId ?? null,
					input.serviceTier ?? null,
					input.subscriptionStatus ?? null,
					input.contractActive ? 1 : 0,
					input.billingActive ? 1 : 0,
					input.currentPeriodEnd ?? null,
					input.lastInvoiceStatus ?? null,
					JSON.stringify(input.metadata ?? {})
				)
				.run();
		});
}

async function resolveStripeCustomerEmail(customer: string | Stripe.Customer | Stripe.DeletedCustomer | null, stripe: Stripe) {
	if (!customer) return null;
	if (typeof customer !== 'string') {
		return normalizeEmail('email' in customer ? customer.email : null);
	}

	try {
		const resolved = await stripe.customers.retrieve(customer);
		if (typeof resolved === 'string' || ('deleted' in resolved && resolved.deleted)) {
			return null;
		}
		return normalizeEmail(resolved.email);
	} catch {
		return null;
	}
}

function normalizeEmail(raw: string | null | undefined): string | null {
	if (!raw) return null;
	const value = raw.trim().toLowerCase();
	return value.length > 0 ? value : null;
}

function normalizeIdentifier(raw: string | Stripe.Customer | Stripe.Subscription | Stripe.DeletedCustomer | null | undefined): string | null {
	if (typeof raw !== 'string') return null;
	const value = raw.trim();
	return value.length > 0 ? value : null;
}

function normalizeProductId(raw: string | undefined): string | null {
	if (!raw) return null;
	const value = raw.trim();
	return value.length > 0 ? value : null;
}

function deriveAgentKitTier(productId: string | undefined, tier: string | undefined): 'solo' | 'team' | 'org' | null {
	if (tier === 'solo' || tier === 'team' || tier === 'org') {
		return tier;
	}

	if (productId === 'agent-in-a-box') {
		return 'solo';
	}

	const match = productId?.match(/^agent-in-a-box-(solo|team|org)$/);
	return match ? (match[1] as 'solo' | 'team' | 'org') : null;
}

function deriveServiceTier(productId: string | null): string | null {
	if (!productId) return null;
	return normalizeAgencyServiceTier(productId);
}

/**
 * Send dunning email for failed payment
 */
async function sendDunningEmail(
	email: string,
	amountDue: string,
	currency: string,
	paymentUrl: string | null,
	platform: App.Platform | undefined,
	logger: Logger
) {
	const resendApiKey = platform?.env?.RESEND_API_KEY;
	const emailFromBilling = platform?.env?.EMAIL_FROM_BILLING ?? 'CREATE SOMETHING <billing@createsomething.agency>';

	if (resendApiKey) {
		try {
			const response = await fetch('https://api.resend.com/emails', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${resendApiKey}`
				},
				body: JSON.stringify({
					from: emailFromBilling,
					to: email,
					subject: 'Action required: Payment failed',
					html: `
						<h1>Your payment couldn't be processed</h1>
						<p>We tried to charge your payment method for <strong>$${amountDue} ${currency}</strong>, but the payment failed.</p>
						<p>This can happen if your card expired, has insufficient funds, or was declined by your bank.</p>
						${paymentUrl ? `
						<h2>Update your payment</h2>
						<p><a href="${paymentUrl}" style="display: inline-block; padding: 12px 24px; background: #000; color: #fff; text-decoration: none; border-radius: 6px;">Pay Now</a></p>
						<p style="color: #666; font-size: 14px;">This link will take you to a secure Stripe page to complete your payment.</p>
						` : ''}
						<h2>Need help?</h2>
						<p>If you believe this is an error or need assistance, reply to this email and we'll help sort it out.</p>
						<hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
						<p style="color: #999; font-size: 12px;">CREATE SOMETHING<br/>createsomething.agency</p>
					`
				})
			});

			if (response.ok) {
				logger.info('Dunning email sent', { email });
			} else {
				const errorText = await response.text();
				logger.error('Failed to send dunning email via Resend', { error: errorText });
			}
		} catch (err) {
			logger.error('Error sending dunning email', { error: err });
		}
	} else {
		// Log for manual follow-up if no email service configured
		logger.warn('Dunning email needed (no Resend configured)', {
			to: email,
			amountDue: `$${amountDue} ${currency}`,
			paymentUrl
		});
	}
}
