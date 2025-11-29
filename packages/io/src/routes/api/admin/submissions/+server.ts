import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

interface SubmissionRequest {
	id?: string;
	status?: 'unread' | 'read' | 'archived';
}

export const GET: RequestHandler = async ({ platform }) => {
	const db = platform?.env?.DB;

	if (!db) {
		return json({ error: 'Database not available' }, { status: 500 });
	}

	try {
		const submissions = await db
			.prepare(
				`SELECT * FROM contact_submissions
				ORDER BY submitted_at DESC`
			)
			.all();

		return json(submissions.results || []);
	} catch (error) {
		console.error('Failed to fetch submissions:', error);
		return json({ error: 'Failed to fetch submissions' }, { status: 500 });
	}
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

	try {
		const { id } = (await request.json()) as SubmissionRequest;

		if (!id) {
			return json({ error: 'Submission ID required' }, { status: 400 });
		}

		await db.prepare('DELETE FROM contact_submissions WHERE id = ?').bind(id).run();

		return json({ success: true });
	} catch (error) {
		console.error('Failed to delete submission:', error);
		return json({ error: 'Failed to delete submission' }, { status: 500 });
	}
};
