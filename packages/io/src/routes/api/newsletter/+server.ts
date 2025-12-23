import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

interface NewsletterRequest {
	email: string;
	website?: string; // Honeypot field - should be empty
	turnstileToken?: string;
}

interface TurnstileResponse {
	success: boolean;
	'error-codes'?: string[];
}

const RATE_LIMIT_WINDOW = 60 * 60; // 1 hour in seconds
const RATE_LIMIT_MAX = 3; // Max signups per IP per hour

export const POST: RequestHandler = async ({ request, platform, getClientAddress }) => {
	try {
		const body = (await request.json()) as NewsletterRequest;
		const { email, website, turnstileToken } = body;

		// Honeypot check - if filled, silently reject (bots fill hidden fields)
		if (website) {
			return json({
				success: true,
				message: 'Successfully subscribed!'
			});
		}

		// Validate email
		if (!email || !email.trim()) {
			return json(
				{
					success: false,
					message: 'Email is required'
				},
				{ status: 400 }
			);
		}

		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!emailRegex.test(email)) {
			return json(
				{
					success: false,
					message: 'Invalid email format'
				},
				{ status: 400 }
			);
		}

		// Access Cloudflare bindings via platform.env
		if (!platform?.env) {
			throw error(500, 'Platform environment not available');
		}

		const env = platform.env;

		// Verify Turnstile token if secret key is configured
		if (env.TURNSTILE_SECRET_KEY) {
			if (!turnstileToken) {
				return json(
					{
						success: false,
						message: 'Please complete the verification'
					},
					{ status: 400 }
				);
			}

			const turnstileResponse = await fetch(
				'https://challenges.cloudflare.com/turnstile/v0/siteverify',
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
					body: new URLSearchParams({
						secret: env.TURNSTILE_SECRET_KEY,
						response: turnstileToken,
						remoteip: getClientAddress()
					})
				}
			);

			const turnstileResult = (await turnstileResponse.json()) as TurnstileResponse;

			if (!turnstileResult.success) {
				console.warn('Turnstile verification failed:', turnstileResult['error-codes']);
				return json(
					{
						success: false,
						message: 'Verification failed. Please try again.'
					},
					{ status: 400 }
				);
			}
		}

		// Rate limiting via KV
		const clientIP = getClientAddress();
		const rateLimitKey = `newsletter_rate:${clientIP}`;

		try {
			const currentCount = await env.CACHE.get(rateLimitKey);
			const count = currentCount ? parseInt(currentCount, 10) : 0;

			if (count >= RATE_LIMIT_MAX) {
				return json(
					{
						success: false,
						message: 'Too many signup attempts. Please try again later.'
					},
					{ status: 429 }
				);
			}

			await env.CACHE.put(rateLimitKey, String(count + 1), {
				expirationTtl: RATE_LIMIT_WINDOW
			});
		} catch (kvError) {
			console.warn('Rate limiting unavailable:', kvError);
		}

		// Generate tokens for unsubscribe and confirmation
		const timestamp = Date.now();
		const unsubscribeToken = btoa(`${email}:${timestamp}`);
		const confirmationToken = btoa(`confirm:${email}:${timestamp}:${crypto.randomUUID()}`);

		// Check if subscriber already exists
		let existingSubscriber;
		try {
			existingSubscriber = await env.DB.prepare(
				`SELECT email, confirmed_at, unsubscribed_at FROM newsletter_subscribers WHERE email = ?`
			)
				.bind(email)
				.first();
		} catch (dbError) {
			console.warn('Could not check existing subscriber:', dbError);
		}

		// If already confirmed, no need to re-subscribe
		if (existingSubscriber?.confirmed_at && !existingSubscriber?.unsubscribed_at) {
			return json({
				success: true,
				message: 'You are already subscribed!'
			});
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
					     subscribed_at = datetime('now')
					 WHERE email = ?`
				)
					.bind(confirmationToken, unsubscribeToken, email)
					.run();
			} else {
				// Insert new subscriber
				await env.DB.prepare(
					`INSERT INTO newsletter_subscribers (email, subscribed_at, unsubscribe_token, confirmation_token, confirmed_at)
					 VALUES (?, datetime('now'), ?, ?, NULL)`
				)
					.bind(email, unsubscribeToken, confirmationToken)
					.run();
			}
		} catch (dbError) {
			console.error('Newsletter subscribers database error:', dbError);
			return json(
				{
					success: false,
					message: 'Failed to process subscription'
				},
				{ status: 500 }
			);
		}

		// Send confirmation email via Resend (double opt-in)
		const confirmUrl = `https://createsomething.io/confirm?token=${encodeURIComponent(confirmationToken)}`;
		const resendResponse = await fetch('https://api.resend.com/emails', {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${env.RESEND_API_KEY}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				from: 'CREATE SOMETHING <hello@createsomething.io>',
				to: email,
				subject: 'Confirm your subscription to CREATE SOMETHING',
				html: `<!DOCTYPE html>
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
</html>`
			})
		});

		if (!resendResponse.ok) {
			const errorData = await resendResponse.json();
			console.error('Resend API error:', errorData);
			return json(
				{
					success: false,
					message: 'Failed to send confirmation email'
				},
				{ status: 500 }
			);
		}

		const resendData = (await resendResponse.json()) as { id: string };

		return json({
			success: true,
			message: 'Please check your email to confirm your subscription.',
			emailId: resendData.id
		});
	} catch (err) {
		console.error('Newsletter signup error:', err);
		return json(
			{
				success: false,
				message: `Error processing newsletter signup: ${err instanceof Error ? err.message : 'Unknown error'}`
			},
			{ status: 500 }
		);
	}
};
