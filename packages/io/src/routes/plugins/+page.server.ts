import type { PageServerLoad } from './$types';
import { PLUGINS, getPluginsByCategory } from '$lib/config/plugins';

export const load: PageServerLoad = async ({ locals, platform }) => {
	// Get all plugins
	const plugins = PLUGINS;

	// Get unique categories
	const categories = Array.from(new Set(plugins.map(p => p.category))).sort();

	// Check if user is authenticated and get their enabled plugins
	let enabledPlugins: Set<string> = new Set();
	const user = locals.user;
	const db = platform?.env?.DB;

	if (user && db) {
		try {
			const result = await db
				.prepare('SELECT plugin_slug FROM user_plugins WHERE user_id = ? AND enabled = 1')
				.bind(user.id)
				.all();

			enabledPlugins = new Set((result?.results || []).map((row: any) => row.plugin_slug));
		} catch (err) {
			console.error('Error fetching user plugins:', err);
		}
	}

	return {
		plugins,
		categories,
		isAuthenticated: !!user,
		enabledPlugins: Array.from(enabledPlugins)
	};
};
