import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

interface SendRequest {
	subject: string;
	html: string;
	preview?: string; // Preview text for email clients
}

export const POST: RequestHandler = async ({ request, platform }) => {
	try {
		// Verify API key for security
		const authHeader = request.headers.get('Authorization');
		if (!authHeader || !authHeader.startsWith('Bearer ')) {
			return json({ success: false, message: 'Unauthorized' }, { status: 401 });
		}

		if (!platform?.env) {
			throw error(500, 'Platform environment not available');
		}

		const env = platform.env;
		const apiKey = authHeader.replace('Bearer ', '');

		// Validate against stored API key
		if (apiKey !== env.NEWSLETTER_API_KEY) {
			return json({ success: false, message: 'Invalid API key' }, { status: 401 });
		}

		const body = (await request.json()) as SendRequest;
		const { subject, html, preview } = body;

		if (!subject || !html) {
			return json(
				{ success: false, message: 'Subject and HTML content are required' },
				{ status: 400 }
			);
		}

		// Fetch all confirmed and active subscribers (double opt-in)
		const subscribers = await env.DB.prepare(
			`SELECT email, unsubscribe_token FROM newsletter_subscribers
			 WHERE unsubscribed_at IS NULL AND confirmed_at IS NOT NULL`
		).all();

		if (!subscribers.results || subscribers.results.length === 0) {
			return json({ success: false, message: 'No active subscribers found' }, { status: 404 });
		}

		const results: { email: string; success: boolean; error?: string }[] = [];

		// Send email to each subscriber
		for (const subscriber of subscribers.results) {
			const email = subscriber.email as string;
			const unsubscribeToken = subscriber.unsubscribe_token as string;

			// Replace placeholder with actual unsubscribe link
			const personalizedHtml = html.replace(
				'{{UNSUBSCRIBE_URL}}',
				`https://createsomething.io/unsubscribe?token=${unsubscribeToken}`
			);

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
						subject,
						html: personalizedHtml,
						...(preview && { text: preview })
					})
				});

				if (resendResponse.ok) {
					results.push({ email, success: true });
				} else {
					const errorData = await resendResponse.json();
					results.push({ email, success: false, error: JSON.stringify(errorData) });
				}
			} catch (sendError) {
				results.push({
					email,
					success: false,
					error: sendError instanceof Error ? sendError.message : 'Unknown error'
				});
			}
		}

		const successful = results.filter((r) => r.success).length;
		const failed = results.filter((r) => !r.success).length;

		// Log the campaign send
		try {
			await env.DB.prepare(
				`INSERT INTO newsletter_campaigns (subject, sent_at, total_recipients, successful, failed)
				 VALUES (?, datetime('now'), ?, ?, ?)`
			)
				.bind(subject, results.length, successful, failed)
				.run();
		} catch (dbError) {
			console.warn('Could not log campaign - table may not exist');
		}

		return json({
			success: true,
			message: `Newsletter sent to ${successful} subscribers`,
			total: results.length,
			successful,
			failed,
			details: results
		});
	} catch (err) {
		console.error('Newsletter send error:', err);
		return json(
			{
				success: false,
				message: `Error sending newsletter: ${err instanceof Error ? err.message : 'Unknown error'}`
			},
			{ status: 500 }
		);
	}
};

// GET endpoint to preview subscribers count
export const GET: RequestHandler = async ({ request, platform }) => {
	const authHeader = request.headers.get('Authorization');
	if (!authHeader || !authHeader.startsWith('Bearer ')) {
		return json({ success: false, message: 'Unauthorized' }, { status: 401 });
	}

	if (!platform?.env) {
		throw error(500, 'Platform environment not available');
	}

	const env = platform.env;
	const apiKey = authHeader.replace('Bearer ', '');

	if (apiKey !== env.NEWSLETTER_API_KEY) {
		return json({ success: false, message: 'Invalid API key' }, { status: 401 });
	}

	try {
		const count = await env.DB.prepare(
			`SELECT COUNT(*) as count FROM newsletter_subscribers
			 WHERE unsubscribed_at IS NULL AND confirmed_at IS NOT NULL`
		).first();

		return json({
			success: true,
			activeSubscribers: count?.count || 0
		});
	} catch (err) {
		return json(
			{
				success: false,
				message: 'Could not fetch subscriber count'
			},
			{ status: 500 }
		);
	}
};
