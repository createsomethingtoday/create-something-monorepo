import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDb } from '$lib/server/db';

export const DELETE: RequestHandler = async ({ params, locals, platform }) => {
	if (!locals.admin) {
		return json({ success: false, error: 'Admin login required.' }, { status: 401 });
	}

	try {
		const db = getDb(platform);
		await db.prepare('DELETE FROM contacts WHERE id = ?').bind(params.id).run();
		return json({ success: true });
	} catch (error) {
		console.error('Contact delete failed:', error);
		return json({ success: false, error: 'Delete failed.' }, { status: 500 });
	}
};
