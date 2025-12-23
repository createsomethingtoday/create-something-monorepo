/**
 * Newsletter Subscribe Logic
 *
 * Shared server-side logic for processing newsletter subscriptions.
 * Used by property-specific API endpoints.
 *
 * @packageDocumentation
 */

import type { NewsletterRequest, NewsletterResult, TurnstileResponse, PropertyDomain } from './types.js';

/**
 * Environment bindings required for newsletter operations
 */
interface NewsletterEnv {
	DB: D1Database;
	CACHE?: KVNamespace;
	RESEND_API_KEY: string;
	TURNSTILE_SECRET_KEY?: string;
}

interface D1Database {
	prepare(query: string): D1PreparedStatement;
}

interface D1PreparedStatement {
	bind(...args: unknown[]): D1PreparedStatement;
	run(): Promise<D1Result>;
	first<T = unknown>(): Promise<T | null>;
}

interface D1Result {
	success: boolean;
}

interface ExistingSubscriber {
	email: string;
	confirmed_at: string | null;
	unsubscribed_at: string | null;
	status: string | null;
}

interface KVNamespace {
	get(key: string): Promise<string | null>;
	put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
}

const RATE_LIMIT_WINDOW = 60 * 60; // 1 hour in seconds
const RATE_LIMIT_MAX = 3; // Max signups per IP per hour

/**
 * Generate the confirmation email HTML template (double opt-in)
 */
export function generateConfirmationEmailHtml(confirmUrl: string): string {
	return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #000000; color: #ffffff; }
    .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
    .header { margin-bottom: 40px; }
    .logo { font-size: 14px; font-weight: 500; color: rgba(255, 255, 255, 0.5); letter-spacing: 0.1em; text-transform: uppercase; }
    .content { line-height: 1.8; }
    .content p { color: rgba(255, 255, 255, 0.7); margin-bottom: 20px; }
    .quote { font-style: italic; color: #ffffff; font-size: 20px; margin: 30px 0; }
    .cta { display: inline-block; margin-top: 20px; padding: 12px 24px; background: #ffffff; color: #000000; text-decoration: none; font-weight: 500; }
    .footer { margin-top: 60px; padding-top: 30px; border-top: 1px solid rgba(255, 255, 255, 0.1); color: rgba(255, 255, 255, 0.3); font-size: 13px; }
    .footer a { color: rgba(255, 255, 255, 0.4); }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">CREATE SOMETHING</div>
    </div>

    <div class="content">
      <p class="quote">"Weniger, aber besser."</p>
      <p>Less, but better. This guides everything we build.</p>
      <p>Please confirm your subscription to receive occasional updates on experiments in AI-native development—what works, what doesn't, why it matters.</p>
      <a href="${confirmUrl}" class="cta">Confirm Subscription</a>
      <p style="margin-top: 30px; font-size: 14px; color: rgba(255, 255, 255, 0.5);">If you didn't request this subscription, you can safely ignore this email.</p>
    </div>

    <div class="footer">
      <p>CREATE SOMETHING</p>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Generate the welcome email HTML template
 */
export function generateWelcomeEmailHtml(unsubscribeToken: string, property: PropertyDomain): string {
	const unsubscribeDomain = `createsomething.${property}`;

	return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #000000; color: #ffffff; }
    .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
    .header { margin-bottom: 40px; }
    .logo { font-size: 14px; font-weight: 500; color: rgba(255, 255, 255, 0.5); letter-spacing: 0.1em; text-transform: uppercase; }
    .content { line-height: 1.8; }
    .content p { color: rgba(255, 255, 255, 0.7); margin-bottom: 20px; }
    .quote { font-style: italic; color: #ffffff; font-size: 20px; margin: 30px 0; }
    .cta { display: inline-block; margin-top: 20px; padding: 12px 24px; background: #ffffff; color: #000000; text-decoration: none; font-weight: 500; }
    .footer { margin-top: 60px; padding-top: 30px; border-top: 1px solid rgba(255, 255, 255, 0.1); color: rgba(255, 255, 255, 0.3); font-size: 13px; }
    .footer a { color: rgba(255, 255, 255, 0.4); }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">CREATE SOMETHING</div>
    </div>

    <div class="content">
      <p class="quote">"Weniger, aber besser."</p>
      <p>Less, but better. This guides everything we build.</p>
      <p>You'll receive occasional updates on experiments in AI-native development—what works, what doesn't, why it matters.</p>
      <a href="https://createsomething.ltd/ethos" class="cta">Read the Ethos</a>
    </div>

    <div class="footer">
      <p>CREATE SOMETHING</p>
      <p><a href="https://${unsubscribeDomain}/unsubscribe?token=${unsubscribeToken}">Unsubscribe</a></p>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Process a newsletter subscription request.
 *
 * @example
 * ```typescript
 * // In +server.ts
 * import { processSubscription } from '@create-something/components/newsletter';
 *
 * export const POST: RequestHandler = async ({ request, platform, getClientAddress }) => {
 *   const body = await request.json();
 *   return processSubscription(body, platform?.env, getClientAddress(), 'io');
 * };
 * ```
 */
export async function processSubscription(
	body: NewsletterRequest,
	env: NewsletterEnv | undefined,
	clientIP: string,
	property: PropertyDomain
): Promise<{ result: NewsletterResult; status: number }> {
	const { email, website, turnstileToken, source } = body;
	// Default source to property, allow override
	const subscriberSource = source || property;

	// Honeypot check - if filled, silently reject (bots fill hidden fields)
	if (website) {
		return {
			result: { success: true, message: 'Successfully subscribed!' },
			status: 200,
		};
	}

	// Validate email
	if (!email || !email.trim()) {
		return {
			result: { success: false, message: 'Email is required' },
			status: 400,
		};
	}

	const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	if (!emailRegex.test(email)) {
		return {
			result: { success: false, message: 'Invalid email format' },
			status: 400,
		};
	}

	if (!env) {
		return {
			result: { success: false, message: 'Platform environment not available' },
			status: 500,
		};
	}

	// Verify Turnstile token if secret key is configured
	if (env.TURNSTILE_SECRET_KEY) {
		if (!turnstileToken) {
			return {
				result: { success: false, message: 'Please complete the verification' },
				status: 400,
			};
		}

		const turnstileResponse = await fetch(
			'https://challenges.cloudflare.com/turnstile/v0/siteverify',
			{
				method: 'POST',
				headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
				body: new URLSearchParams({
					secret: env.TURNSTILE_SECRET_KEY,
					response: turnstileToken,
					remoteip: clientIP,
				}),
			}
		);

		const turnstileResult = (await turnstileResponse.json()) as TurnstileResponse;

		if (!turnstileResult.success) {
			console.warn('Turnstile verification failed:', turnstileResult['error-codes']);
			return {
				result: { success: false, message: 'Verification failed. Please try again.' },
				status: 400,
			};
		}
	}

	// Rate limiting via KV
	if (env.CACHE) {
		const rateLimitKey = `newsletter_rate:${clientIP}`;

		try {
			const currentCount = await env.CACHE.get(rateLimitKey);
			const count = currentCount ? parseInt(currentCount, 10) : 0;

			if (count >= RATE_LIMIT_MAX) {
				return {
					result: { success: false, message: 'Too many signup attempts. Please try again later.' },
					status: 429,
				};
			}

			await env.CACHE.put(rateLimitKey, String(count + 1), {
				expirationTtl: RATE_LIMIT_WINDOW,
			});
		} catch (kvError) {
			console.warn('Rate limiting unavailable:', kvError);
		}
	}

	// Generate tokens for unsubscribe and confirmation
	const timestamp = Date.now();
	const unsubscribeToken = btoa(`${email}:${timestamp}`);
	const confirmationToken = btoa(`confirm:${email}:${timestamp}:${crypto.randomUUID()}`);

	// Check if subscriber already exists
	let existingSubscriber: ExistingSubscriber | null = null;
	try {
		existingSubscriber = await env.DB.prepare(
			`SELECT email, confirmed_at, unsubscribed_at, status FROM newsletter_subscribers WHERE email = ?`
		)
			.bind(email)
			.first<ExistingSubscriber>();
	} catch (dbError) {
		console.warn('Could not check existing subscriber:', dbError);
	}

	// If email was previously bounced or complained, reject re-subscription
	if (existingSubscriber?.status === 'bounced' || existingSubscriber?.status === 'complained') {
		return {
			result: { success: false, message: 'This email address cannot receive our newsletters.' },
			status: 400,
		};
	}

	// If already confirmed, no need to re-subscribe
	if (existingSubscriber?.confirmed_at && !existingSubscriber?.unsubscribed_at) {
		return {
			result: { success: true, message: 'You are already subscribed!' },
			status: 200,
		};
	}

	// Store subscriber in D1 database with confirmed_at = NULL (requires confirmation)
	try {
		if (existingSubscriber) {
			// Update existing subscriber (may have unsubscribed before)
			await env.DB.prepare(
				`UPDATE newsletter_subscribers
				 SET confirmation_token = ?,
				     unsubscribe_token = ?,
				     unsubscribed_at = NULL,
				     confirmed_at = NULL,
				     subscribed_at = datetime('now'),
				     source = ?
				 WHERE email = ?`
			)
				.bind(confirmationToken, unsubscribeToken, subscriberSource, email)
				.run();
		} else {
			// Insert new subscriber
			await env.DB.prepare(
				`INSERT INTO newsletter_subscribers (email, subscribed_at, unsubscribe_token, confirmation_token, confirmed_at, source)
				 VALUES (?, datetime('now'), ?, ?, NULL, ?)`
			)
				.bind(email, unsubscribeToken, confirmationToken, subscriberSource)
				.run();
		}
	} catch (dbError) {
		console.error('Newsletter subscribers database error:', dbError);
		return {
			result: { success: false, message: 'Failed to process subscription' },
			status: 500,
		};
	}

	// Send confirmation email via Resend (double opt-in)
	const confirmUrl = `https://createsomething.io/confirm?token=${encodeURIComponent(confirmationToken)}`;
	const resendResponse = await fetch('https://api.resend.com/emails', {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${env.RESEND_API_KEY}`,
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({
			from: 'CREATE SOMETHING <hello@createsomething.io>',
			to: email,
			subject: 'Confirm your subscription to CREATE SOMETHING',
			html: generateConfirmationEmailHtml(confirmUrl),
		}),
	});

	const resendData = (await resendResponse.json()) as { id?: string; message?: string };

	if (!resendResponse.ok) {
		console.error('Resend API error:', resendData);
		return {
			result: { success: false, message: 'Failed to send confirmation email' },
			status: 500,
		};
	}

	return {
		result: {
			success: true,
			message: 'Please check your email to confirm your subscription.',
			emailId: resendData.id,
		},
		status: 200,
	};
}
