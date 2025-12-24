import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ params, locals, platform }) => {
	const { slug } = params;
	const user = locals.user;

	if (!user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const db = platform?.env?.DB;
	if (!db) {
		return json({ error: 'Database not available' }, { status: 500 });
	}

	try {
		// Check if plugin exists for this user
		const existing = await db
			.prepare('SELECT id, enabled FROM user_plugins WHERE user_id = ? AND plugin_slug = ?')
			.bind(user.id, slug)
			.first();

		if (existing) {
			// Update existing record to enabled
			await db
				.prepare('UPDATE user_plugins SET enabled = 1, enabled_at = CURRENT_TIMESTAMP, disabled_at = NULL WHERE user_id = ? AND plugin_slug = ?')
				.bind(user.id, slug)
				.run();
		} else {
			// Insert new record
			await db
				.prepare('INSERT INTO user_plugins (user_id, plugin_slug, enabled, enabled_at) VALUES (?, ?, 1, CURRENT_TIMESTAMP)')
				.bind(user.id, slug)
				.run();
		}

		return json({ success: true, enabled: true });
	} catch (error) {
		console.error('Error enabling plugin:', error);
		return json({ error: 'Failed to enable plugin' }, { status: 500 });
	}
};

export const DELETE: RequestHandler = async ({ params, locals, platform }) => {
	const { slug } = params;
	const user = locals.user;

	if (!user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const db = platform?.env?.DB;
	if (!db) {
		return json({ error: 'Database not available' }, { status: 500 });
	}

	try {
		// Update record to disabled (don't actually delete)
		await db
			.prepare('UPDATE user_plugins SET enabled = 0, disabled_at = CURRENT_TIMESTAMP WHERE user_id = ? AND plugin_slug = ?')
			.bind(user.id, slug)
			.run();

		return json({ success: true, enabled: false });
	} catch (error) {
		console.error('Error disabling plugin:', error);
		return json({ error: 'Failed to disable plugin' }, { status: 500 });
	}
};
