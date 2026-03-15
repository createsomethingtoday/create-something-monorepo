import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import Stripe from 'stripe';
import { Resend } from 'resend';
import { generateWelcomeEmail } from '$lib/email/welcome-template';
import { getDBFromPlatform } from '$lib/server/d1-compat';
import { resolveRuntimeEnv } from '$lib/server/env';

const logger = { info: console.log, warn: console.warn, error: console.error, debug: console.debug };
type RuntimeEnv = Record<string, string | undefined>;

function getSessionString(
	value: string | Stripe.Customer | Stripe.PaymentIntent | Stripe.DeletedCustomer | null | undefined
): string | null {
	return typeof value === 'string' ? value : null;
}

async function upsertPresaleOrder(
	db: ReturnType<typeof getDBFromPlatform>,
	session: Stripe.Checkout.Session,
	eventId: string
): Promise<void> {
	const now = Date.now();
	const userId =
		session.metadata?.userId && session.metadata.userId !== 'guest' ? session.metadata.userId : null;
	const email = session.customer_details?.email || session.customer_email || null;
	const name = session.customer_details?.name || null;
	const paymentIntentId = getSessionString(session.payment_intent);
	const customerId = getSessionString(session.customer);
	const membershipType = session.metadata?.membershipType || null;
	const metadataJson = session.metadata ? JSON.stringify(session.metadata) : null;
	const customerDetailsJson = session.customer_details ? JSON.stringify(session.customer_details) : null;
	const rawSessionJson = JSON.stringify(session);

	await db
		.prepare(
			`INSERT INTO presale_orders (
				stripe_session_id,
				stripe_event_id,
				user_id,
				email,
				name,
				amount_total,
				currency,
				payment_status,
				membership_type,
				stripe_customer_id,
				stripe_payment_intent_id,
				metadata_json,
				customer_details_json,
				raw_session_json,
				created_at,
				updated_at
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
			ON CONFLICT(stripe_session_id) DO UPDATE SET
				stripe_event_id = excluded.stripe_event_id,
				user_id = excluded.user_id,
				email = excluded.email,
				name = excluded.name,
				amount_total = excluded.amount_total,
				currency = excluded.currency,
				payment_status = excluded.payment_status,
				membership_type = excluded.membership_type,
				stripe_customer_id = excluded.stripe_customer_id,
				stripe_payment_intent_id = excluded.stripe_payment_intent_id,
				metadata_json = excluded.metadata_json,
				customer_details_json = excluded.customer_details_json,
				raw_session_json = excluded.raw_session_json,
				updated_at = excluded.updated_at`
		)
		.bind(
			session.id,
			eventId,
			userId,
			email,
			name,
			session.amount_total ?? null,
			session.currency ?? null,
			session.payment_status ?? null,
			membershipType,
			customerId,
			paymentIntentId,
			metadataJson,
			customerDetailsJson,
			rawSessionJson,
			now,
			now
		)
		.run();
}

/**
 * POST /api/stripe/webhook
 * Handles Stripe webhook events, particularly checkout.session.completed
 * to grant lifetime membership access
 */
export const POST: RequestHandler = async ({ request, platform }) => {
	const runtimeEnv = resolveRuntimeEnv(
		(platform as { env?: Record<string, string | undefined> } | undefined)?.env
	) as RuntimeEnv;
	const stripeKey = runtimeEnv.STRIPE_SECRET_KEY;
	const webhookSecret = runtimeEnv.STRIPE_WEBHOOK_SECRET;

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
				const db = getDBFromPlatform(platform);

				try {
					await upsertPresaleOrder(db, session, event.id);
				} catch (persistErr) {
					logger.error('Failed to persist checkout session', { error: persistErr, sessionId: session.id });
				}

				// Get user ID from metadata
				const userId = session.metadata?.userId;

				if (!userId || userId === 'guest') {
					// Guest checkout - need to create account or handle differently
					logger.warn('Guest checkout completed', { email: session.customer_email });
					break;
				}

				// Update user membership in D1
				await db
					.prepare('UPDATE users SET membership = 1 WHERE id = ?')
					.bind(userId)
					.run();

				logger.info('Granted membership', { userId });

				// Send welcome email with Calendly link for discovery call
				try {
					const resendApiKey = runtimeEnv.RESEND_API_KEY;
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
