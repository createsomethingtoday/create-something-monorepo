import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

interface ContactRequest {
	name: string;
	email: string;
	message: string;
}

export const POST: RequestHandler = async ({ request, platform }) => {
	try {
		const body = (await request.json()) as ContactRequest;
		const { name, email, message } = body;

		// Validate inputs
		if (!name || !name.trim()) {
			return json(
				{
					success: false,
					message: 'Name is required'
				},
				{ status: 400 }
			);
		}

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

		if (!message || !message.trim()) {
			return json(
				{
					success: false,
					message: 'Message is required'
				},
				{ status: 400 }
			);
		}

		// Access Cloudflare bindings via platform.env
		if (!platform?.env) {
			throw error(500, 'Platform environment not available');
		}

		const env = platform.env;

		// Store contact submission in D1 database (optional)
		try {
			await env.DB.prepare(
				`
        INSERT INTO contact_submissions (name, email, message, submitted_at)
        VALUES (?, ?, ?, datetime('now'))
      `
			)
				.bind(name, email, message)
				.run();
		} catch (dbError) {
			console.warn('Contact submissions table not found - skipping DB insert');
		}

		// Send auto-response to the person who contacted us
		const autoResponsePromise = fetch('https://api.resend.com/emails', {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${env.RESEND_API_KEY}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				from: 'Micah Johnson <hello@createsomething.io>',
				to: email,
				subject: 'Thanks for reaching out',
				html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #000000; color: #ffffff; }
    .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
    .content { line-height: 1.8; }
    .message-box { background-color: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 8px; padding: 20px; margin: 30px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="content">
      <h1>Thanks for reaching out</h1>
      <p>Hi ${name},</p>
      <p>I've received your message and will get back to you as soon as possible — typically within 24-48 hours.</p>
      <div class="message-box">
        <p style="color: rgba(255, 255, 255, 0.4); font-size: 14px; margin-bottom: 10px;">Your Message:</p>
        <p style="color: rgba(255, 255, 255, 0.9);">${message.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>
      </div>
      <p>— Micah Johnson</p>
    </div>
  </div>
</body>
</html>`
			})
		});

		// Send notification to site owner
		const notificationPromise = fetch('https://api.resend.com/emails', {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${env.RESEND_API_KEY}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				from: 'CREATE SOMETHING <hello@createsomething.io>',
				to: 'hello@createsomething.io',
				replyTo: email,
				subject: `New Contact Form Submission from ${name}`,
				html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #000; color: #fff; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
    .content { background: #f5f5f5; padding: 20px; border-radius: 8px; }
  </style>
</head>
<body>
  <div class="header">
    <h2>New Contact Form Submission</h2>
  </div>
  <div class="content">
    <p><strong>From:</strong> ${name} (${email})</p>
    <p><strong>Message:</strong><br>${message.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>')}</p>
    <p><strong>Submitted:</strong> ${new Date().toUTCString()}</p>
  </div>
</body>
</html>`
			})
		});

		// Wait for both emails to send
		const [autoResponse, notification] = await Promise.all([
			autoResponsePromise,
			notificationPromise
		]);

		if (!autoResponse.ok) {
			const errorData = await autoResponse.json();
			console.error('Resend auto-response error:', errorData);
			return json(
				{
					success: false,
					message: 'Failed to send confirmation email'
				},
				{ status: 500 }
			);
		}

		if (!notification.ok) {
			const errorData = await notification.json();
			console.error('Resend notification error:', errorData);
		}

		return json({
			success: true,
			message: 'Message sent successfully! You should receive a confirmation email shortly.'
		});
	} catch (err) {
		console.error('Contact form error:', err);
		return json(
			{
				success: false,
				message: `Error processing contact form: ${err instanceof Error ? err.message : 'Unknown error'}`
			},
			{ status: 500 }
		);
	}
};
