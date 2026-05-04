import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { ensureAgencyMcpEntitlement, requireAgencySessionUser } from '$lib/server/mcp-token';
import { listMcpAccessAssignments } from '$lib/server/mcp-access-assignments';
import { buildHubToolAvailabilityPayload } from '$lib/server/mcp-tools';

export const GET: RequestHandler = async ({ request, locals, params, platform, url }) => {
	try {
		const db = platform?.env?.DB;
		if (!db) {
			return json({ error: 'unavailable', message: 'Database is unavailable' }, { status: 503 });
		}

		const user = await requireAgencySessionUser({ locals, request, platform });
		const { row } = await ensureAgencyMcpEntitlement({
			platform,
			user,
		});

		const hubs = await listMcpAccessAssignments(db, {
			email: user.email,
			accountId: row.account_id,
			tenantId: row.tenant_id,
			workspaceAccountId: row.workspace_account_id,
			authSubject: user.id,
		});

		const assignment = hubs.find((hub) => hub.laneKey === params.laneKey) ?? null;
		if (!assignment) {
			return json({ error: 'not_found', message: 'Hub assignment not found' }, { status: 404 });
		}

		const payload = await buildHubToolAvailabilityPayload({
			db,
			env: platform?.env,
			assignment,
			toolkit: url.searchParams.get('toolkit'),
			query: url.searchParams.get('q'),
			cursor: url.searchParams.get('cursor'),
			limit: Number(url.searchParams.get('limit') ?? 100),
		});

		return json(payload);
	} catch (error) {
		return json(
			{ error: 'internal_error', message: error instanceof Error ? error.message : 'Unexpected error' },
			{ status: 500 },
		);
	}
};
