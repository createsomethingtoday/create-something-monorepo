import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { PLUGINS } from '$lib/config/plugins';

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
		// Fetch user's enabled plugins from database
		const result = await db
			.prepare('SELECT plugin_slug FROM user_plugins WHERE user_id = ? AND enabled = 1')
			.bind(user.id)
			.all();

		const enabledPlugins = (result?.results || []).map((row: any) => row.plugin_slug);

		// Build settings.json format for Claude Code
		// Match Claude Code settings structure with skills/plugins
		const settings = {
			skills: {} as Record<string, unknown>
		};

		// Add enabled plugins to settings
		enabledPlugins.forEach((slug: string) => {
			const plugin = PLUGINS.find(p => p.slug === slug);
			if (plugin) {
				settings.skills[slug] = {
					enabled: true,
					name: plugin.name,
					description: plugin.description
				};
			}
		});

		// Generate JSON string
		const jsonContent = JSON.stringify(settings, null, 2);

		// Return as downloadable file with appropriate headers
		return new Response(jsonContent, {
			status: 200,
			headers: {
				'Content-Type': 'application/json',
				'Content-Disposition': 'attachment; filename="settings.json"',
				'Cache-Control': 'no-cache, no-store, must-revalidate'
			}
		});
	} catch (error) {
		console.error('Error generating settings export:', error);
		return json({ error: 'Failed to generate settings export' }, { status: 500 });
	}
};
