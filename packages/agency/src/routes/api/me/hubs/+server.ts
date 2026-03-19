import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { ensureAgencyMcpEntitlement, requireAgencySessionUser } from '$lib/server/mcp-token';
import { listMcpAccessAssignments } from '$lib/server/mcp-access-assignments';

export const GET: RequestHandler = async ({ cookies, platform }) => {
	try {
		const user = await requireAgencySessionUser({ cookies, platform });
		const { row } = await ensureAgencyMcpEntitlement({
			platform,
			user,
		});

		const hubs = await listMcpAccessAssignments(platform?.env?.DB, {
			email: user.email,
			accountId: row.account_id,
			tenantId: row.tenant_id,
			workspaceAccountId: row.workspace_account_id,
			authSubject: user.id,
		});

		return json({
			hubs,
			selectedHub: hubs[0]?.laneKey ?? null,
			checkedAt: new Date().toISOString(),
		});
	} catch (error) {
		return json(
			{ error: 'internal_error', message: error instanceof Error ? error.message : 'Unexpected error' },
			{ status: 500 },
		);
	}
};
