import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { renderContactResponse, renderContactNotification } from './email';
import { isValidEmail, createLogger } from '@create-something/canon/utils';

const logger = createLogger('ContactAPI');

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

		if (!isValidEmail(email)) {
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
			logger.warn('Contact submissions table not found - skipping DB insert', { error: dbError });
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
				html: renderContactResponse({ name, message })
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
				html: renderContactNotification({ name, email, message, submittedAt: new Date().toUTCString() })
			})
		});

		// Wait for both emails to send
		const [autoResponse, notification] = await Promise.all([
			autoResponsePromise,
			notificationPromise
		]);

		if (!autoResponse.ok) {
			const errorData = await autoResponse.json();
			logger.error('Failed to send auto-response email', { email, error: errorData });
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
			logger.error('Failed to send notification email', { email, error: errorData });
		}

		logger.info('Contact form submitted successfully', { email, name });

		return json({
			success: true,
			message: 'Message sent successfully! You should receive a confirmation email shortly.'
		});
	} catch (err) {
		logger.error('Contact form error', { error: err });
		return json(
			{
				success: false,
				message: `Error processing contact form: ${err instanceof Error ? err.message : 'Unknown error'}`
			},
			{ status: 500 }
		);
	}
};
