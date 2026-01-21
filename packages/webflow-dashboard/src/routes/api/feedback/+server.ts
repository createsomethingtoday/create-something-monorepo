import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, platform, locals }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const db = platform?.env?.DB;
	if (!db) {
		return json({ error: 'Database not available' }, { status: 500 });
	}

	try {
		const body = await request.json();
		const { type, message, pageUrl } = body as {
			type: 'bug' | 'feature' | 'general';
			message: string;
			pageUrl?: string;
		};

		// Validate input
		if (!type || !['bug', 'feature', 'general'].includes(type)) {
			return json({ error: 'Invalid feedback type' }, { status: 400 });
		}

		if (!message || message.trim().length === 0) {
			return json({ error: 'Message is required' }, { status: 400 });
		}

		if (message.length > 5000) {
			return json({ error: 'Message too long (max 5000 characters)' }, { status: 400 });
		}

		// Insert feedback
		await db
			.prepare(
				`INSERT INTO feedback (user_email, feedback_type, message, page_url)
				 VALUES (?, ?, ?, ?)`
			)
			.bind(locals.user.email, type, message.trim(), pageUrl || null)
			.run();

		return json({ success: true });
	} catch (error) {
		console.error('Feedback submission error:', error);
		return json({ error: 'Failed to submit feedback' }, { status: 500 });
	}
};

// GET endpoint to retrieve feedback (for admin purposes)
export const GET: RequestHandler = async ({ platform, locals, url }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const db = platform?.env?.DB;
	if (!db) {
		return json({ error: 'Database not available' }, { status: 500 });
	}

	try {
		const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100);
		const type = url.searchParams.get('type');

		let query = 'SELECT * FROM feedback';
		const params: string[] = [];

		if (type && ['bug', 'feature', 'general'].includes(type)) {
			query += ' WHERE feedback_type = ?';
			params.push(type);
		}

		query += ' ORDER BY created_at DESC LIMIT ?';
		params.push(limit.toString());

		const result = await db
			.prepare(query)
			.bind(...params)
			.all();

		return json({ feedback: result.results });
	} catch (error) {
		console.error('Feedback fetch error:', error);
		return json({ error: 'Failed to fetch feedback' }, { status: 500 });
	}
};
