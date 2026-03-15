import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { adminDelete, adminList } from '$lib/admin/index.js';

interface SubmissionRequest {
	id?: string;
	status?: 'unread' | 'read' | 'archived';
}

export const GET: RequestHandler = async ({ platform }) => {
	const db = platform?.env?.DB;

	if (!db) {
		return json({ error: 'Database not available' }, { status: 500 });
	}

	return adminList({
		db,
		table: 'contact_submissions',
		orderBy: 'submitted_at DESC',
		entityName: 'submission'
	});
};

export const PATCH: RequestHandler = async ({ request, platform }) => {
	const db = platform?.env?.DB;

	if (!db) {
		return json({ error: 'Database not available' }, { status: 500 });
	}

	try {
		const { id, status } = (await request.json()) as SubmissionRequest;

		if (!id || !status) {
			return json({ error: 'Submission ID and status required' }, { status: 400 });
		}

		if (!['unread', 'read', 'archived'].includes(status)) {
			return json({ error: 'Invalid status' }, { status: 400 });
		}

		await db
			.prepare('UPDATE contact_submissions SET status = ? WHERE id = ?')
			.bind(status, id)
			.run();

		return json({ success: true });
	} catch (error) {
		console.error('Failed to update submission:', error);
		return json({ error: 'Failed to update submission' }, { status: 500 });
	}
};

export const DELETE: RequestHandler = async ({ request, platform }) => {
	const db = platform?.env?.DB;

	if (!db) {
		return json({ error: 'Database not available' }, { status: 500 });
	}

	const body = (await request.json()) as SubmissionRequest;
	return adminDelete({ db, body, table: 'contact_submissions', entityName: 'submission' });
};
