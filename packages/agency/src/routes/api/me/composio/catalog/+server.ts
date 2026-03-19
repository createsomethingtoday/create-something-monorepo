import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { ensureAgencyMcpEntitlement, requireAgencySessionUser } from '$lib/server/mcp-token';
import { buildComposioCatalogPayload } from '$lib/server/mcp-tools';

export const GET: RequestHandler = async ({ cookies, platform, url }) => {
	try {
		const user = await requireAgencySessionUser({ cookies, platform });
		// Keep catalog access inside the same entitlement guard used by MCP Access.
		await ensureAgencyMcpEntitlement({
			platform,
			user,
		});

		const payload = await buildComposioCatalogPayload({
			env: platform?.env,
			toolkit: url.searchParams.get('toolkit'),
			query: url.searchParams.get('q'),
			cursor: url.searchParams.get('cursor'),
			limit: Number(url.searchParams.get('limit') ?? 50),
		});

		return json(payload);
	} catch (error) {
		return json(
			{ error: 'internal_error', message: error instanceof Error ? error.message : 'Unexpected error' },
			{ status: 500 },
		);
	}
};
