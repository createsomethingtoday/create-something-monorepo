import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { adminDelete, adminList } from '$lib/admin/index.js';
import { requestNewsletterDoubleOptIn } from '$lib/server/newsletter-confirmation-request.js';

interface SubscriberRequest {
	id?: string;
	status?: 'active' | 'unsubscribed';
	action?: 'request_confirmation';
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
		const { id, status, action } = (await request.json()) as SubscriberRequest;

		if (!id) {
			return json({ error: 'Subscriber ID required' }, { status: 400 });
		}

		if (action === 'request_confirmation') {
			const apiKey = platform?.env?.RESEND_API_KEY;
			if (!apiKey) {
				return json({ error: 'Email delivery is not available' }, { status: 503 });
			}
			const subscriberId = Number(id);
			if (!Number.isInteger(subscriberId) || subscriberId <= 0) {
				return json({ error: 'Valid subscriber ID required' }, { status: 400 });
			}
			try {
				const receipt = await requestNewsletterDoubleOptIn(db, { subscriberId }, { apiKey, fetch });
				return json({ success: true, receipt });
			} catch (error) {
				return json(
					{ error: error instanceof Error ? error.message : 'Confirmation request failed' },
					{ status: 400 }
				);
			}
		}

		if (!status) {
			return json({ error: 'Subscriber status required' }, { status: 400 });
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
