import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { ensureAgencyMcpEntitlement } from '$lib/server/mcp-token';
import { listMcpAccessAssignments } from '$lib/server/mcp-access-assignments';
import { buildComposioCatalogPayload, buildHubToolAvailabilityPayload, listScopedToolkits } from '$lib/server/mcp-tools';

export const load: PageServerLoad = async ({ parent, platform, url }) => {
	const { user } = await parent();

	if (!user) {
		throw redirect(303, '/login?redirect=/mcp-access/tools');
	}

	const db = platform?.env?.DB;
	if (!db) {
		throw redirect(303, '/mcp-access?error=database_unavailable');
	}

	const { row, decision } = await ensureAgencyMcpEntitlement({
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

	const selectedHub = url.searchParams.get('hub')?.trim() || hubs[0]?.laneKey || null;
	const assignment = selectedHub ? hubs.find((hub) => hub.laneKey === selectedHub) ?? null : null;
	const scopedToolkits = assignment ? listScopedToolkits(assignment) : [];
	const requestedToolkit = url.searchParams.get('toolkit')?.trim() || null;
	const query = url.searchParams.get('q')?.trim() || null;

	const catalog = await buildComposioCatalogPayload({
		env: platform?.env,
		toolkit: requestedToolkit,
		query,
		cursor: url.searchParams.get('cursor'),
		limit: Number(url.searchParams.get('limit') ?? 50),
		scopedToolkits,
	});
	const selectedToolkit = catalog.selectedToolkit?.slug ?? null;

	const availability = assignment
		? await buildHubToolAvailabilityPayload({
				db,
				env: platform?.env,
				assignment,
				toolkit: requestedToolkit,
				query,
				cursor: url.searchParams.get('tool_cursor'),
				limit: Number(url.searchParams.get('tool_limit') ?? 100),
			})
		: null;

	return {
		user,
		entitlement: {
			accountId: row.account_id,
			tenantId: row.tenant_id,
			decision,
			updatedAt: row.updated_at,
		},
		hubs,
		selectedHub,
		selectedToolkit,
		query,
		catalog,
		availability,
	};
};
