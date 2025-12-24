import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { getPlugin } from '$lib/config/plugins';

export const load: PageServerLoad = async ({ params, locals, platform }) => {
	const { slug } = params;

	// Get plugin from config
	const plugin = getPlugin(slug);

	if (!plugin) {
		throw error(404, 'Plugin not found');
	}

	// Check if user is authenticated and has this plugin enabled
	let userPlugin = null;
	const user = locals.user;
	const db = platform?.env?.DB;

	if (user && db) {
		try {
			const result = await db
				.prepare('SELECT * FROM user_plugins WHERE user_id = ? AND plugin_slug = ?')
				.bind(user.id, slug)
				.first();

			userPlugin = result;
		} catch (err) {
			console.error('Error fetching user plugin:', err);
		}
	}

	return {
		plugin,
		isAuthenticated: !!user,
		isEnabled: userPlugin?.enabled === 1 || false
	};
};
