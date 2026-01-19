/**
 * Stripe Webhook Handler
 *
 * Handles Stripe webhook events for payment processing.
 * Events are verified using webhook signature.
 */

import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import { createStripeClient, HANDLED_WEBHOOK_EVENTS } from '$lib/services/stripe';
import { createPersistentLogger, createLogger, type Logger } from '@create-something/components/utils';
import type Stripe from 'stripe';

export const POST: RequestHandler = async ({ request, platform }) => {
	// Create persistent logger for agent-queryable error tracking
	const logger: Logger = platform?.env?.DB
		? createPersistentLogger('StripeWebhook', {
				db: platform.env.DB,
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

	// Log event for debugging
	logger.info('Webhook received', { eventType: event.type });

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
				logger.debug('Unhandled event type', { eventType: event.type });
		}

		return json({ received: true });
	} catch (err) {
		logger.error('Error handling webhook', { eventType: event.type, error: err });
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

	// Handle Vertical Templates provisioning
	if (productId === 'vertical-templates' && pendingId) {
		await provisionVerticalTemplate(session, platform);
		return;
	}

	// Handle Agent-in-a-Box provisioning
	if (productId === 'agent-in-a-box') {
		await provisionAgentInABox(session, tier, platform);
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
			await sendFulfillmentEmail(customerEmail, productId, downloadToken, platform);
		}
	}
}

/**
 * Provision a Vertical Template site after successful payment
 */
async function provisionVerticalTemplate(
	session: Stripe.Checkout.Session,
	platform: App.Platform | undefined
) {
	const pendingId = session.metadata?.pending_id;
	const subdomain = session.metadata?.subdomain;
	const customerEmail = session.customer_email || session.customer_details?.email;

	if (!pendingId) {
		// Note: This is logged as error but we don't have logger context here
		// The calling function should log this case
		return;
	}

	const templatesApiUrl =
		platform?.env?.TEMPLATES_PLATFORM_API_URL || 'https://templates.createsomething.space';
	const templatesApiSecret = platform?.env?.TEMPLATES_PLATFORM_API_SECRET;

	if (!templatesApiSecret) {
		// Note: This is logged as error but we don't have logger context here
		// The calling function should log this case
		return;
	}

	try {
		// Call provision API
		const response = await fetch(`${templatesApiUrl}/api/sites/provision`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'x-api-secret': templatesApiSecret
			},
			body: JSON.stringify({
				pendingId,
				stripeSubscriptionId: session.subscription as string,
				stripeCustomerId: session.customer as string
			})
		});

		const data = await response.json() as { success: boolean; tenant?: { id: string; subdomain: string; url: string } };

		if (!response.ok || !data.success) {
			logger.error('Provision API failed', { data });
			return;
		}

		logger.info('Vertical template provisioned', {
			tenantId: data.tenant?.id,
			subdomain: data.tenant?.subdomain,
			url: data.tenant?.url
		});

		// Send welcome email with site URL
		if (customerEmail && subdomain) {
			await sendVerticalTemplateWelcomeEmail(
				customerEmail,
				subdomain,
				`https://${subdomain}.createsomething.space`,
				platform
			);
		}
	} catch (err) {
		logger.error('Error provisioning vertical template', { error: err });
	}
}

/**
 * Send welcome email for Vertical Templates
 */
async function sendVerticalTemplateWelcomeEmail(
	email: string,
	subdomain: string,
	siteUrl: string,
	platform: App.Platform | undefined
) {
	const resendApiKey = platform?.env?.RESEND_API_KEY;
	const emailFromSites = platform?.env?.EMAIL_FROM_SITES ?? 'CREATE SOMETHING <sites@createsomething.agency>';

	if (resendApiKey) {
		try {
			const response = await fetch('https://api.resend.com/emails', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${resendApiKey}`
				},
				body: JSON.stringify({
					from: emailFromSites,
					to: email,
					subject: `Your site ${subdomain}.createsomething.space is live!`,
					html: `
						<h1>Your site is live!</h1>
						<p>Great news—your site is now active and ready for the world.</p>
						<p><strong>Your site URL:</strong></p>
						<p><a href="${siteUrl}" style="display: inline-block; padding: 12px 24px; background: #000; color: #fff; text-decoration: none; border-radius: 6px;">Visit ${subdomain}.createsomething.space</a></p>
						<h2>What's next?</h2>
						<ul>
							<li>Share your new site with clients and colleagues</li>
							<li>Content management dashboard coming soon</li>
							<li>Custom domain support available on Team tier</li>
						</ul>
						<p style="color: #666; font-size: 14px;">Questions? Reply to this email and we'll help you out.</p>
						<hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
						<p style="color: #999; font-size: 12px;">CREATE SOMETHING<br/>createsomething.agency</p>
					`
				})
			});

			if (response.ok) {
				logger.info('Welcome email sent', { email, subdomain });
			} else {
				const errorText = await response.text();
				logger.error('Failed to send welcome email via Resend', { error: errorText });
			}
		} catch (err) {
			logger.error('Error sending welcome email', { error: err });
		}
	} else {
		logger.warn('Welcome email needed (no Resend configured)', {
			to: email,
			subdomain,
			siteUrl
		});
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
	platform: App.Platform | undefined
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
}

/**
 * Handle subscription cancellation
 */
async function handleSubscriptionCanceled(
	subscription: Stripe.Subscription,
	platform: App.Platform | undefined
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

	// Suspend vertical template site if applicable
	await suspendVerticalTemplateSite(subscription, platform);
}

/**
 * Suspend a Vertical Template site when subscription is canceled
 */
async function suspendVerticalTemplateSite(
	subscription: Stripe.Subscription,
	platform: App.Platform | undefined
) {
	const templatesApiUrl =
		platform?.env?.TEMPLATES_PLATFORM_API_URL || 'https://templates.createsomething.space';
	const templatesApiSecret = platform?.env?.TEMPLATES_PLATFORM_API_SECRET;

	if (!templatesApiSecret) {
		return; // Not configured for vertical templates
	}

	try {
		const response = await fetch(`${templatesApiUrl}/api/subscriptions/update`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'x-api-secret': templatesApiSecret
			},
			body: JSON.stringify({
				stripeSubscriptionId: subscription.id,
				status: 'canceled'
			})
		});

		if (response.ok) {
			logger.info('Vertical template site suspended', { subscriptionId: subscription.id });
		}
	} catch (err) {
		logger.error('Error suspending vertical template site', { error: err });
	}
}

/**
 * Provision Agent-in-a-Box after successful purchase
 */
async function provisionAgentInABox(
	session: Stripe.Checkout.Session,
	tier: string | undefined,
	platform: App.Platform | undefined
) {
	const customerEmail = session.customer_email || session.customer_details?.email;
	const validTier = tier === 'solo' || tier === 'team' || tier === 'org' ? tier : 'solo';

	if (!customerEmail) {
		logger.error('Agent-in-a-Box provisioning failed: no customer email');
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

	const db = platform?.env?.DB;

	if (db) {
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
					session.customer as string | null,
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
			// Continue to send email even if D1 fails - support can manually fix
		}
	}

	// Provision LMS account via identity worker
	await provisionLmsAccount(customerEmail, validTier, platform);

	// Send fulfillment email with license key
	await sendAgentKitEmail(customerEmail, validTier, licenseKey, platform);
}

/**
 * Provision LMS account for Agent-in-a-Box purchaser
 */
async function provisionLmsAccount(
	email: string,
	tier: string,
	platform: App.Platform | undefined
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
	platform: App.Platform | undefined
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
							<li>Claude Code settings and skill templates</li>
							<li>Beads agent-native task management</li>
							<li>6 MCP server templates (Slack, Linear, Stripe, GitHub, Notion, Cloudflare)</li>
							<li>Harness specification templates for autonomous work</li>
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
async function handleInvoicePaid(invoice: Stripe.Invoice, platform: App.Platform | undefined) {
	logger.info('Invoice paid', {
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

	await sendDunningEmail(customerEmail, amountDue, currency, paymentUrl, platform);
}

/**
 * Send dunning email for failed payment
 */
async function sendDunningEmail(
	email: string,
	amountDue: string,
	currency: string,
	paymentUrl: string | null,
	platform: App.Platform | undefined
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
