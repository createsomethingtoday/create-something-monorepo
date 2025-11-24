import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ platform }) => {
	const db = platform?.env?.DB;

	if (!db) {
		return json({ error: 'Database not available' }, { status: 500 });
	}

	try {
		const subscribers = await db
			.prepare(
				`SELECT * FROM newsletter_subscribers
				ORDER BY created_at DESC`
			)
			.all();

		return json(subscribers.results || []);
	} catch (error) {
		console.error('Failed to fetch subscribers:', error);
		return json({ error: 'Failed to fetch subscribers' }, { status: 500 });
	}
};

export const PATCH: RequestHandler = async ({ request, platform }) => {
	const db = platform?.env?.DB;

	if (!db) {
		return json({ error: 'Database not available' }, { status: 500 });
	}

	try {
		const { id, status } = await request.json();

		if (!id || !status) {
			return json({ error: 'Subscriber ID and status required' }, { status: 400 });
		}

		if (!['active', 'unsubscribed'].includes(status)) {
			return json({ error: 'Invalid status' }, { status: 400 });
		}

		await db
			.prepare('UPDATE newsletter_subscribers SET status = ? WHERE id = ?')
			.bind(status, id)
			.run();

		return json({ success: true });
	} catch (error) {
		console.error('Failed to update subscriber:', error);
		return json({ error: 'Failed to update subscriber' }, { status: 500 });
	}
};

export const DELETE: RequestHandler = async ({ request, platform }) => {
	const db = platform?.env?.DB;

	if (!db) {
		return json({ error: 'Database not available' }, { status: 500 });
	}

	try {
		const { id } = await request.json();

		if (!id) {
			return json({ error: 'Subscriber ID required' }, { status: 400 });
		}

		await db.prepare('DELETE FROM newsletter_subscribers WHERE id = ?').bind(id).run();

		return json({ success: true });
	} catch (error) {
		console.error('Failed to delete subscriber:', error);
		return json({ error: 'Failed to delete subscriber' }, { status: 500 });
	}
};
