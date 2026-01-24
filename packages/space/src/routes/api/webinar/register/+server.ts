/**
 * Webinar Registration API
 *
 * Handles registration for CREATE SOMETHING workshops.
 * Stores registrations and sends confirmation emails via Resend.
 */

import { json, type RequestEvent } from '@sveltejs/kit';

interface WebinarRegistration {
	name: string;
	email: string;
	experience_level: string;
	webinar_slug: string;
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

interface WebinarEnv {
	DB: D1Database;
	RESEND_API_KEY: string;
}

// Generate registration confirmation email
function generateConfirmationEmailHtml(name: string, webinarTitle: string): string {
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
    .title { font-size: 24px; color: #ffffff; margin-bottom: 20px; font-weight: 600; }
    .checklist { margin: 30px 0; padding: 20px; background: rgba(255, 255, 255, 0.05); border-radius: 8px; }
    .checklist-title { font-size: 14px; color: rgba(255, 255, 255, 0.5); margin-bottom: 15px; text-transform: uppercase; letter-spacing: 0.05em; }
    .checklist-item { color: rgba(255, 255, 255, 0.8); margin-bottom: 10px; padding-left: 20px; position: relative; }
    .checklist-item:before { content: "✓"; position: absolute; left: 0; color: rgba(255, 255, 255, 0.4); }
    .footer { margin-top: 60px; padding-top: 30px; border-top: 1px solid rgba(255, 255, 255, 0.1); color: rgba(255, 255, 255, 0.3); font-size: 13px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">CREATE SOMETHING</div>
    </div>

    <div class="content">
      <p class="title">You're in, ${name}.</p>
      <p>You're registered for <strong>${webinarTitle}</strong>.</p>
      <p>We'll send the meeting link and final details 24 hours before the workshop.</p>
      
      <div class="checklist">
        <div class="checklist-title">What to have ready</div>
        <div class="checklist-item">A laptop with VS Code or Cursor installed</div>
        <div class="checklist-item">A credit card (for Cloudflare account — it's free tier)</div>
        <div class="checklist-item">30 minutes of focused time</div>
      </div>

      <p style="font-size: 14px; color: rgba(255, 255, 255, 0.5);">Questions? Reply to this email.</p>
    </div>

    <div class="footer">
      <p>CREATE SOMETHING</p>
      <p>Building toward WORKWAY — the automation layer.</p>
    </div>
  </div>
</body>
</html>`;
}

export const POST = async ({ request, platform }: RequestEvent) => {
	const body = (await request.json()) as WebinarRegistration;
	const { name, email, experience_level, webinar_slug } = body;

	// Validate required fields
	if (!name?.trim() || !email?.trim() || !experience_level || !webinar_slug) {
		return json(
			{ success: false, message: 'All fields are required' },
			{ status: 400 }
		);
	}

	// Validate email format
	const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	if (!emailRegex.test(email)) {
		return json(
			{ success: false, message: 'Invalid email format' },
			{ status: 400 }
		);
	}

	const env = platform?.env as WebinarEnv | undefined;
	if (!env?.DB) {
		console.error('Database not available');
		return json(
			{ success: false, message: 'Service temporarily unavailable' },
			{ status: 500 }
		);
	}

	// Check if already registered for this webinar
	try {
		const existing = await env.DB.prepare(
			`SELECT email FROM webinar_registrations WHERE email = ? AND webinar_slug = ?`
		)
			.bind(email, webinar_slug)
			.first();

		if (existing) {
			return json(
				{ success: true, message: 'You are already registered!' },
				{ status: 200 }
			);
		}
	} catch (err) {
		console.warn('Could not check existing registration:', err);
	}

	// Generate unique ID
	const id = crypto.randomUUID();

	// Store registration
	try {
		await env.DB.prepare(
			`INSERT INTO webinar_registrations (id, email, name, experience_level, webinar_slug, registered_at)
			 VALUES (?, ?, ?, ?, ?, datetime('now'))`
		)
			.bind(id, email, name, experience_level, webinar_slug)
			.run();
	} catch (dbError) {
		console.error('Failed to store registration:', dbError);
		return json(
			{ success: false, message: 'Failed to complete registration' },
			{ status: 500 }
		);
	}

	// Send confirmation email via Resend
	if (env.RESEND_API_KEY) {
		const webinarTitle = 'Zero to Cloudflare in 30 Minutes';
		
		try {
			const resendResponse = await fetch('https://api.resend.com/emails', {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${env.RESEND_API_KEY}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					from: 'CREATE SOMETHING <hello@createsomething.io>',
					to: email,
					subject: `You're in: ${webinarTitle}`,
					html: generateConfirmationEmailHtml(name, webinarTitle)
				})
			});

			if (!resendResponse.ok) {
				const errorData = await resendResponse.json();
				console.error('Resend API error:', errorData);
				// Don't fail registration if email fails
			}
		} catch (emailError) {
			console.error('Failed to send confirmation email:', emailError);
			// Don't fail registration if email fails
		}
	}

	console.log(`[WebinarAPI] Registration successful`, { email, webinar_slug, experience_level });

	return json({
		success: true,
		message: 'Registration successful! Check your email for confirmation.'
	});
};
