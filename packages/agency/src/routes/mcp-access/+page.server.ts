import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { ensureAgencyMcpEntitlement } from '$lib/server/mcp-token';
import { getSettledValue, loadManagedTokenSnapshot, loadPasswordSnapshot } from '$lib/server/access-state';
import { resolveMcpAccessAssignment } from '$lib/server/mcp-access-assignments';

export const load: PageServerLoad = async ({ parent, platform }) => {
	const { user } = await parent();

	if (!user) {
		throw redirect(303, '/login?redirect=/mcp-access');
	}

	const { row: entitlement, decision } = await ensureAgencyMcpEntitlement({
		platform,
		user,
	});

	const [tokenSnapshotResult, passwordSnapshotResult] = await Promise.allSettled([
		loadManagedTokenSnapshot(platform, user.id),
		loadPasswordSnapshot(platform, user.email),
	]);

	const tokenSnapshot = getSettledValue(tokenSnapshotResult, {
		token: null,
		available: false,
		error: 'Token state is temporarily unavailable',
	});
	const passwordSnapshot = getSettledValue(passwordSnapshotResult, {
		hasPassword: false,
		email: user.email,
		emailVerified: false,
		identityUserExists: false,
		available: false,
		error: 'Password state is temporarily unavailable',
	});
	const assignment = resolveMcpAccessAssignment({
		email: user.email,
		accountId: entitlement.account_id,
		tenantId: entitlement.tenant_id,
		workspaceAccountId: entitlement.workspace_account_id,
	});

	return {
		user,
		entitlement: {
			accountId: entitlement.account_id,
			tenantId: entitlement.tenant_id,
			decision,
			updatedAt: entitlement.updated_at,
		},
		access: {
			token: tokenSnapshot.token,
			tokenAvailable: tokenSnapshot.available,
			tokenError: tokenSnapshot.error,
			password: passwordSnapshot,
		},
		assignment,
	};
};
