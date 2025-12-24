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

		const enabledPluginSlugs = (result?.results || []).map((row: any) => row.plugin_slug);

		// Build settings.json format for Claude Code
		// Per docs: extraKnownMarketplaces defines marketplace, enabledPlugins uses "plugin@marketplace": true
		const settings: {
			extraKnownMarketplaces: Record<string, { source: { source: string; repo: string } }>;
			enabledPlugins: Record<string, boolean>;
		} = {
			extraKnownMarketplaces: {
				'create-something': {
					source: {
						source: 'github',
						repo: 'createsomethingtoday/claude-plugins'
					}
				}
			},
			enabledPlugins: {}
		};

		// Add enabled plugins with correct format: "plugin-name@marketplace-name": true
		// Slugs match marketplace.json in createsomethingtoday/claude-plugins
		enabledPluginSlugs.forEach((slug: string) => {
			const plugin = PLUGINS.find((p) => p.slug === slug);
			if (plugin) {
				settings.enabledPlugins[`${slug}@create-something`] = true;
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
