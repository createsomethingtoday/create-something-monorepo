import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ url, platform }) => {
	const token = url.searchParams.get('token');

	if (!token) {
		throw error(400, 'Missing confirmation token');
	}

	if (!platform?.env?.DB) {
		throw error(500, 'Database not available');
	}

	const db = platform.env.DB;

	try {
		// Find subscriber by confirmation token
		const subscriber = await db
			.prepare(
				`SELECT id, email, confirmed_at, unsubscribed_at FROM newsletter_subscribers
				 WHERE confirmation_token = ?`
			)
			.bind(token)
			.first();

		if (!subscriber) {
			return {
				success: false,
				message: 'Invalid or expired confirmation link',
				email: null
			};
		}

		// Check if already confirmed
		if (subscriber.confirmed_at) {
			return {
				success: true,
				message: 'Your subscription is already confirmed!',
				email: subscriber.email as string,
				alreadyConfirmed: true
			};
		}

		// Confirm the subscription
		await db
			.prepare(
				`UPDATE newsletter_subscribers
				 SET confirmed_at = datetime('now'),
				     confirmation_token = NULL
				 WHERE id = ?`
			)
			.bind(subscriber.id)
			.run();

		// Send welcome email now that subscription is confirmed
		const email = subscriber.email as string;

		// Get unsubscribe token from the subscriber record
		const subscriberData = await db
			.prepare(`SELECT unsubscribe_token FROM newsletter_subscribers WHERE id = ?`)
			.bind(subscriber.id)
			.first();

		const unsubscribeToken = subscriberData?.unsubscribe_token as string;

		if (platform.env.RESEND_API_KEY && unsubscribeToken) {
			try {
				await fetch('https://api.resend.com/emails', {
					method: 'POST',
					headers: {
						Authorization: `Bearer ${platform.env.RESEND_API_KEY}`,
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
      <p>Your subscription is confirmed. You'll receive occasional updates on experiments in AI-native development—what works, what doesn't, why it matters.</p>
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
			} catch (emailError) {
				console.error('Failed to send welcome email:', emailError);
			}
		}

		return {
			success: true,
			message: 'Your subscription has been confirmed!',
			email: email,
			alreadyConfirmed: false
		};
	} catch (err) {
		console.error('Confirmation error:', err);
		throw error(500, 'Failed to process confirmation');
	}
};
