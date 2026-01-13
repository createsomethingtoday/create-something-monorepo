import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import Stripe from 'stripe';
import { Resend } from 'resend';
import { STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET } from '$env/static/private';
import { generateWelcomeEmail } from '$lib/email/welcome-template';
import { env } from '$env/dynamic/private';

/**
 * POST /api/stripe/webhook
 * Handles Stripe webhook events, particularly checkout.session.completed
 * to grant lifetime membership access
 */
export const POST: RequestHandler = async ({ request, platform }) => {
	const stripe = new Stripe(STRIPE_SECRET_KEY, {
		apiVersion: '2025-12-15.clover'
	});

	// Get raw body for signature verification
	const body = await request.text();
	const signature = request.headers.get('stripe-signature');

	if (!signature) {
		console.error('No Stripe signature found in webhook request');
		return json({ success: false, error: 'No signature' }, { status: 400 });
	}

	let event: Stripe.Event;

	try {
		// Verify webhook signature
		event = stripe.webhooks.constructEvent(body, signature, STRIPE_WEBHOOK_SECRET);
	} catch (err) {
		console.error('Webhook signature verification failed:', err);
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
				console.log('Checkout completed:', session.id);

				// Get user ID from metadata
				const userId = session.metadata?.userId;

				if (!userId || userId === 'guest') {
					// Guest checkout - need to create account or handle differently
					console.warn('Guest checkout completed - email:', session.customer_email);
					// TODO: Create user account from email or send email with account creation link
					break;
				}

				// Update user membership in D1
				const db = platform?.env.DB;
				if (!db) {
					console.error('Database not available');
					break;
				}

				await db
					.prepare('UPDATE users SET membership = 1 WHERE id = ?')
					.bind(userId)
					.run();

				console.log(`Granted membership to user ${userId}`);

				// Send welcome email with Calendly link for discovery call
				try {
					const resendApiKey = env.RESEND_API_KEY;
					if (!resendApiKey) {
						console.warn('RESEND_API_KEY not configured - skipping welcome email');
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

						console.log(`Welcome email sent to ${user.email}`);
					}
				} catch (emailErr) {
					// Log error but don't fail the webhook
					console.error('Failed to send welcome email:', emailErr);
				}

				break;
			}

			case 'checkout.session.expired': {
				const session = event.data.object as Stripe.Checkout.Session;
				console.log('Checkout session expired:', session.id);
				// Could track abandoned checkouts here
				break;
			}

			default:
				console.log(`Unhandled event type: ${event.type}`);
		}

		return json({ success: true, received: true });
	} catch (err) {
		console.error('Error processing webhook:', err);
		return json(
			{
				success: false,
				error: err instanceof Error ? err.message : 'Failed to process webhook'
			},
			{ status: 500 }
		);
	}
};
