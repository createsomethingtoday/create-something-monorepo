import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import Stripe from 'stripe';
import { Resend } from 'resend';
import { generateWelcomeEmail } from '$lib/email/welcome-template';
import { createLogger } from '@create-something/components/utils';

const logger = createLogger('OuterfieldsStripeWebhook');

/**
 * POST /api/stripe/webhook
 * Handles Stripe webhook events, particularly checkout.session.completed
 * to grant lifetime membership access
 */
export const POST: RequestHandler = async ({ request, platform }) => {
	const stripeKey = platform?.env?.STRIPE_SECRET_KEY;
	const webhookSecret = platform?.env?.STRIPE_WEBHOOK_SECRET;

	if (!stripeKey || !webhookSecret) {
		logger.error('Stripe not configured');
		return json({ success: false, error: 'Stripe not configured' }, { status: 500 });
	}

	const stripe = new Stripe(stripeKey, {
		apiVersion: '2025-12-15.clover'
	});

	// Get raw body for signature verification
	const body = await request.text();
	const signature = request.headers.get('stripe-signature');

	if (!signature) {
		logger.error('No Stripe signature found in webhook request');
		return json({ success: false, error: 'No signature' }, { status: 400 });
	}

	let event: Stripe.Event;

	try {
		// Verify webhook signature
		event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
	} catch (err) {
		logger.error('Webhook signature verification failed', { error: err });
		return json(
			{
				success: false,
				error: err instanceof Error ? err.message : 'Signature verification failed'
			},
			{ status: 400 }
		);
	}

	// Handle the event
	try {
		switch (event.type) {
			case 'checkout.session.completed': {
				const session = event.data.object as Stripe.Checkout.Session;
				logger.info('Checkout completed', { sessionId: session.id });

				// Get user ID from metadata
				const userId = session.metadata?.userId;

				if (!userId || userId === 'guest') {
					// Guest checkout - need to create account or handle differently
					logger.warn('Guest checkout completed', { email: session.customer_email });
					// TODO: Create user account from email or send email with account creation link
					break;
				}

				// Update user membership in D1
				const db = platform?.env.DB;
				if (!db) {
					logger.error('Database not available');
					break;
				}

				await db
					.prepare('UPDATE users SET membership = 1 WHERE id = ?')
					.bind(userId)
					.run();

				logger.info('Granted membership', { userId });

				// Send welcome email with Calendly link for discovery call
				try {
					const resendApiKey = platform?.env?.RESEND_API_KEY;
					if (!resendApiKey) {
						logger.warn('RESEND_API_KEY not configured - skipping welcome email');
						break;
					}

					const resend = new Resend(resendApiKey);

					// Get user details
					const user = await db
						.prepare('SELECT email FROM users WHERE id = ?')
						.bind(userId)
						.first<{ email: string }>();

					if (user?.email) {
						// Calendly link for discovery calls (update with your actual Calendly URL)
						const calendlyLink =
							'https://calendly.com/outerfields/founding-member-discovery-call';

						const emailContent = generateWelcomeEmail({
							userName: '', // Could add name field to users table
							userEmail: user.email,
							calendlyLink
						});

						await resend.emails.send({
							from: 'Outerfields <noreply@outerfields.com>',
							to: user.email,
							subject: emailContent.subject,
							html: emailContent.html,
							text: emailContent.text
						});

						logger.info('Welcome email sent', { email: user.email });
					}
				} catch (emailErr) {
					// Log error but don't fail the webhook
					logger.error('Failed to send welcome email', { error: emailErr });
				}

				break;
			}

			case 'checkout.session.expired': {
				const session = event.data.object as Stripe.Checkout.Session;
				logger.info('Checkout session expired', { sessionId: session.id });
				// Could track abandoned checkouts here
				break;
			}

			default:
				logger.debug('Unhandled event type', { eventType: event.type });
		}

		return json({ success: true, received: true });
	} catch (err) {
		logger.error('Error processing webhook', { error: err });
		return json(
			{
				success: false,
				error: err instanceof Error ? err.message : 'Failed to process webhook'
			},
			{ status: 500 }
		);
	}
};
