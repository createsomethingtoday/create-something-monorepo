import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { resolveMapCommercialConfig } from '$lib/server/map-commercial';

const REQUIRED_CUSTOMER_TABLES = ['customer_maps', 'customer_map_versions'] as const;

export const GET: RequestHandler = async ({ platform }) => {
	const env = platform?.env;
	let availableTables = new Set<string>();
	let databaseReachable = false;
	if (env?.DB) {
		try {
			const result = await env.DB
				.prepare(`SELECT name FROM sqlite_master WHERE type = 'table' AND name IN (?, ?)`)
				.bind(...REQUIRED_CUSTOMER_TABLES)
				.all<{ name: string }>();
			availableTables = new Set(result.results.map((row) => row.name));
			databaseReachable = true;
		} catch {
			databaseReachable = false;
		}
	}

	const customerWorkspaceReady = REQUIRED_CUSTOMER_TABLES.every((table) => availableTables.has(table));
	const mappingAgentConfigured = Boolean(env?.OPENAI_API_KEY);
	const commercial = resolveMapCommercialConfig(env);
	const checkoutEnabled = commercial.checkoutEnabled;
	const ready = databaseReachable && customerWorkspaceReady && mappingAgentConfigured;

	return json(
		{
			schema_version: 1,
			checked_at: new Date().toISOString(),
			status: ready ? 'ready' : 'degraded',
			public_map: { path: '/map', synthetic_safe: true },
			mapping_agent: {
				path: '/api/atlas/public-agent',
				configured: mappingAgentConfigured,
				credential_free_boundary: 'GET is non-mutating; malformed POST is rejected before execution'
			},
			customer_workspace: {
				path: '/map/workspace',
				database_reachable: databaseReachable,
				schema_ready: customerWorkspaceReady
			},
			commercial: {
				checkout_enabled: checkoutEnabled,
				configuration: checkoutEnabled ? 'approved_and_configured' : 'fail_closed',
				commercial_approval_recorded: commercial.approved
			}
		},
		{
			status: ready ? 200 : 503,
			headers: { 'cache-control': 'no-store' }
		}
	);
};
