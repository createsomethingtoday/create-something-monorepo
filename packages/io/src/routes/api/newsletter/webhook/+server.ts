/**
 * Resend Webhook Handler for Newsletter Bounce Handling
 *
 * Receives webhook events from Resend for email bounces and complaints.
 * Updates newsletter_subscribers status to prevent sending to invalid addresses.
 *
 * @see https://resend.com/docs/dashboard/webhooks/event-types
 * @see https://resend.com/docs/dashboard/webhooks/verify-webhooks-requests
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

/**
 * Resend webhook event types we handle
 */
type ResendEventType =
	| 'email.sent'
	| 'email.delivered'
	| 'email.delivery_delayed'
	| 'email.complained'
	| 'email.bounced'
	| 'email.opened'
	| 'email.clicked';

/**
 * Resend bounce information
 */
interface ResendBounce {
	message: string;
	subType: 'Suppressed' | 'General' | 'NoEmail' | 'Unknown';
	type: 'Permanent' | 'Transient';
}

/**
 * Resend webhook payload
 */
interface ResendWebhookPayload {
	type: ResendEventType;
	created_at: string;
	data: {
		broadcast_id?: string;
		created_at: string;
		email_id: string;
		from: string;
		to: string[];
		subject: string;
		template_id?: string;
		bounce?: ResendBounce;
		tags?: Record<string, string>;
	};
}

/**
 * Verify Resend webhook signature using Svix headers
 *
 * Uses HMAC-SHA256 to verify the signature.
 * The signed content is: `${svix-id}.${svix-timestamp}.${body}`
 *
 * @see https://docs.svix.com/receiving/verifying-payloads/how-manual
 */
async function verifyWebhookSignature(
	payload: string,
	svixId: string | null,
	svixTimestamp: string | null,
	svixSignature: string | null,
	webhookSecret: string | undefined
): Promise<boolean> {
	// If no secret configured, skip verification (development mode)
	if (!webhookSecret) {
		console.warn('RESEND_WEBHOOK_SECRET not configured - skipping signature verification');
		return true;
	}

	if (!svixId || !svixTimestamp || !svixSignature) {
		console.error('Missing required Svix headers for verification');
		return false;
	}

	// Check timestamp is within tolerance (5 minutes)
	const timestamp = parseInt(svixTimestamp, 10);
	const now = Math.floor(Date.now() / 1000);
	const tolerance = 5 * 60; // 5 minutes

	if (Math.abs(now - timestamp) > tolerance) {
		console.error('Webhook timestamp outside tolerance window');
		return false;
	}

	// Extract the base64 secret (remove 'whsec_' prefix if present)
	const secretKey = webhookSecret.startsWith('whsec_')
		? webhookSecret.slice(6)
		: webhookSecret;

	try {
		// Decode the base64 secret
		const secretBytes = Uint8Array.from(atob(secretKey), (c) => c.charCodeAt(0));

		// Create signed content: svix-id.svix-timestamp.body
		const signedContent = `${svixId}.${svixTimestamp}.${payload}`;
		const encoder = new TextEncoder();
		const data = encoder.encode(signedContent);

		// Import key for HMAC-SHA256
		const key = await crypto.subtle.importKey(
			'raw',
			secretBytes,
			{ name: 'HMAC', hash: 'SHA-256' },
			false,
			['sign']
		);

		// Calculate expected signature
		const signatureBuffer = await crypto.subtle.sign('HMAC', key, data);
		const expectedSignature = btoa(
			String.fromCharCode(...new Uint8Array(signatureBuffer))
		);

		// Parse the signature header (may contain multiple signatures)
		// Format: "v1,base64sig v1,base64sig2"
		const signatures = svixSignature.split(' ');
		for (const sig of signatures) {
			const [version, signature] = sig.split(',');
			if (version === 'v1' && signature === expectedSignature) {
				return true;
			}
		}

		console.error('No matching signature found');
		return false;
	} catch (err) {
		console.error('Error verifying webhook signature:', err);
		return false;
	}
}

export const POST: RequestHandler = async ({ request, platform }) => {
	try {
		// Get the raw body as text (required for signature verification)
		const payload = await request.text();

		// Get Svix headers for signature verification
		const svixId = request.headers.get('svix-id');
		const svixTimestamp = request.headers.get('svix-timestamp');
		const svixSignature = request.headers.get('svix-signature');

		// Verify webhook signature
		const webhookSecret = platform?.env?.RESEND_WEBHOOK_SECRET;
		const isValid = await verifyWebhookSignature(
			payload,
			svixId,
			svixTimestamp,
			svixSignature,
			webhookSecret
		);

		if (!isValid) {
			return json({ success: false, message: 'Invalid webhook signature' }, { status: 401 });
		}

		// Parse the verified payload
		const event = JSON.parse(payload) as ResendWebhookPayload;

		// Only process bounce and complaint events
		if (event.type !== 'email.bounced' && event.type !== 'email.complained') {
			// Acknowledge other events but don't process them
			return json({ success: true, message: `Event ${event.type} acknowledged` });
		}

		if (!platform?.env?.DB) {
			console.error('Database not available');
			return json({ success: false, message: 'Database not available' }, { status: 500 });
		}

		const db = platform.env.DB;
		const recipients = event.data.to;

		// Determine status based on event type
		const status = event.type === 'email.bounced' ? 'bounced' : 'complained';

		// Build bounce reason
		let bounceReason = `${event.type} at ${event.created_at}`;
		if (event.data.bounce) {
			bounceReason = `${event.data.bounce.type} bounce (${event.data.bounce.subType}): ${event.data.bounce.message}`;
		}

		// Update each recipient's status
		const updatePromises = recipients.map(async (email) => {
			try {
				// Check if this is a hard bounce (Permanent) that should count toward auto-unsubscribe
				const isHardBounce = event.data.bounce?.type === 'Permanent';

				if (isHardBounce) {
					// Get current bounce count
					const subscriber = await db
						.prepare('SELECT bounce_count FROM newsletter_subscribers WHERE email = ?')
						.bind(email)
						.first<{ bounce_count: number }>();

					const currentBounceCount = subscriber?.bounce_count || 0;
					const newBounceCount = currentBounceCount + 1;

					// Auto-unsubscribe if this is the 3rd hard bounce
					const newStatus = newBounceCount >= 3 ? 'unsubscribed' : status;
					const autoUnsubscribeReason =
						newBounceCount >= 3
							? `Auto-unsubscribed after 3 hard bounces. ${bounceReason}`
							: bounceReason;

					await db
						.prepare(
							`UPDATE newsletter_subscribers
               SET status = ?,
                   bounce_reason = ?,
                   bounce_count = ?,
                   bounced_at = COALESCE(bounced_at, datetime('now')),
                   last_bounce_at = datetime('now')
               WHERE email = ?`
						)
						.bind(newStatus, autoUnsubscribeReason, newBounceCount, email)
						.run();

					console.log(
						`Marked ${email} as ${newStatus} (bounce ${newBounceCount}/3): ${autoUnsubscribeReason}`
					);
					return { email, success: true, bounceCount: newBounceCount, autoUnsubscribed: newBounceCount >= 3 };
				} else {
					// Soft bounce or complaint - don't increment bounce count
					await db
						.prepare(
							`UPDATE newsletter_subscribers
               SET status = ?,
                   bounce_reason = ?,
                   bounced_at = COALESCE(bounced_at, datetime('now')),
                   last_bounce_at = datetime('now')
               WHERE email = ?`
						)
						.bind(status, bounceReason, email)
						.run();

					console.log(`Marked ${email} as ${status}: ${bounceReason}`);
					return { email, success: true };
				}
			} catch (err) {
				console.error(`Failed to update ${email}:`, err);
				return { email, success: false, error: err };
			}
		});

		const results = await Promise.all(updatePromises);
		const successCount = results.filter((r) => r.success).length;

		return json({
			success: true,
			message: `Processed ${event.type} event`,
			updated: successCount,
			total: recipients.length
		});
	} catch (err) {
		console.error('Webhook processing error:', err);
		return json(
			{
				success: false,
				message: `Error processing webhook: ${err instanceof Error ? err.message : 'Unknown error'}`
			},
			{ status: 500 }
		);
	}
};
