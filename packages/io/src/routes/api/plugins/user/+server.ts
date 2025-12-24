import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals, platform }) => {
	const user = locals.user;
	if (!user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const db = platform?.env?.DB;
	if (!db) {
		return json({ error: 'Database not available' }, { status: 500 });
	}

	try {
		const result = await db
			.prepare('SELECT plugin_slug, enabled, enabled_at, disabled_at, settings_json FROM user_plugins WHERE user_id = ? AND enabled = 1')
			.bind(user.id)
			.all();

		const plugins = (result?.results || []).map((row: any) => ({
			slug: row.plugin_slug,
			enabled: row.enabled === 1,
			enabledAt: row.enabled_at,
			disabledAt: row.disabled_at,
			settings: row.settings_json ? JSON.parse(row.settings_json) : undefined
		}));

		return json({ plugins });
	} catch (error) {
		console.error('Error fetching user plugins:', error);
		return json({ error: 'Failed to fetch plugins' }, { status: 500 });
	}
};
