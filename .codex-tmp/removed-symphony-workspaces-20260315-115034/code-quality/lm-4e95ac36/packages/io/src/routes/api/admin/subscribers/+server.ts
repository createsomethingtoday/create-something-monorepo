import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { adminDelete, adminList } from '$lib/admin/index.js';

interface SubscriberRequest {
	id?: string;
	status?: 'active' | 'unsubscribed';
}

export const GET: RequestHandler = async ({ platform }) => {
	const db = platform?.env?.DB;

	if (!db) {
		return json({ error: 'Database not available' }, { status: 500 });
	}

	return adminList({
		db,
		table: 'newsletter_subscribers',
		orderBy: 'created_at DESC',
		entityName: 'subscriber'
	});
};

export const PATCH: RequestHandler = async ({ request, platform }) => {
	const db = platform?.env?.DB;

	if (!db) {
		return json({ error: 'Database not available' }, { status: 500 });
	}

	try {
		const { id, status } = (await request.json()) as SubscriberRequest;

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

	const body = (await request.json()) as SubscriberRequest;
	return adminDelete({ db, body, table: 'newsletter_subscribers', entityName: 'subscriber' });
};
