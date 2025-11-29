import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

interface NewsletterRequest {
	email: string;
	website?: string; // Honeypot field - should be empty
}

const RATE_LIMIT_WINDOW = 60 * 60; // 1 hour in seconds
const RATE_LIMIT_MAX = 3; // Max signups per IP per hour

export const POST: RequestHandler = async ({ request, platform, getClientAddress }) => {
	try {
		const body = (await request.json()) as NewsletterRequest;
		const { email, website } = body;

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

		// Generate unsubscribe token
		const unsubscribeToken = btoa(`${email}:${Date.now()}`);

		// Store subscriber in D1 database (optional - create table if needed)
		try {
			await env.DB.prepare(
				`
        INSERT OR IGNORE INTO newsletter_subscribers (email, subscribed_at, unsubscribe_token)
        VALUES (?, datetime('now'), ?)
      `
			)
				.bind(email, unsubscribeToken)
				.run();
		} catch (dbError) {
			// Table might not exist - that's okay, we'll still send the welcome email
			console.warn('Newsletter subscribers table not found - skipping DB insert');
		}

		// Send welcome email via Resend
		const resendResponse = await fetch('https://api.resend.com/emails', {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${env.RESEND_API_KEY}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				from: 'CREATE SOMETHING <hello@createsomething.io>',
				to: email,
				subject: 'Welcome to CREATE SOMETHING',
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
      <p>You'll receive occasional updates on experiments in AI-native development—what works, what doesn't, why it matters.</p>
      <a href="https://createsomething.ltd/ethos" class="cta">Read the Ethos</a>
    </div>

    <div class="footer">
      <p>CREATE SOMETHING</p>
      <p><a href="https://createsomething.io/unsubscribe?token=${unsubscribeToken}">Unsubscribe</a></p>
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
					message: 'Failed to send welcome email'
				},
				{ status: 500 }
			);
		}

		const resendData = (await resendResponse.json()) as { id: string };

		return json({
			success: true,
			message: 'Successfully subscribed! Check your email for a welcome message.',
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
