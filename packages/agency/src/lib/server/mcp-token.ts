import { error } from '@sveltejs/kit';
import {
	authenticateClerkRequest,
	getClerkClient,
	getPrimaryEmail,
	resolveClerkEnv,
} from '$lib/server/clerk';
import {
	buildAgencyEntitlementSnapshot,
	evaluateAgencyMcpEntitlement,
	findAgencyMcpEntitlementByAuthSubject,
	normalizeAgencyServiceTier,
	reconcileAgencyMcpEntitlement,
	upsertAgencyMcpEntitlement,
	type AgencyMcpEntitlementDecision,
	type AgencyEntitlementSnapshot,
	type AgencyMcpEntitlementRow,
} from '$lib/server/mcp-entitlements';
import { canonicalizeAgencyEntitlementIdentity, resolveCanonicalAgencyIdentity } from '$lib/server/agency-identity';

type AgencyPlatform = App.Platform | undefined;

export interface AgencySessionUser {
	id: string;
	email: string;
	tier?: 'free' | 'pro' | 'agency';
	source?: string;
}

/**
 * Require an authenticated Clerk user from the request context.
 *
 * Accepts either:
 * - `locals` from a SvelteKit event (preferred — avoids redundant Clerk call)
 * - `request` + `platform` for API routes that need standalone auth
 */
export async function requireAgencySessionUser(input: {
	locals?: App.Locals;
	request?: Request;
	cookies?: unknown;
	platform?: AgencyPlatform;
}): Promise<AgencySessionUser> {
	// Fast path: user already hydrated by hooks.server.ts
	if (input.locals?.user?.id && input.locals.user.email) {
		return input.locals.user as AgencySessionUser;
	}

	// Fallback: authenticate the raw request via Clerk
	if (input.request && input.platform) {
		const clerkEnv = resolveClerkEnv(
			input.platform.env as Record<string, unknown>,
		);
		const auth = await authenticateClerkRequest(input.request, clerkEnv);

		if (!auth.userId) {
			throw error(401, 'Authentication required');
		}

		const clerkClient = getClerkClient(clerkEnv);
		const clerkUser = await clerkClient.users.getUser(auth.userId);
		const email = getPrimaryEmail(clerkUser);

		if (!email) {
			throw error(401, 'Authentication required');
		}

		return {
			id: auth.userId,
			email,
			tier: 'free',
			source: 'clerk',
		};
	}

	if (input.cookies && input.platform) {
		const cookieHeader = serializeCookieHeader(input.cookies);
		if (cookieHeader) {
			return requireAgencySessionUser({
				request: new Request('https://createsomething.agency/', {
					headers: { Cookie: cookieHeader },
				}),
				platform: input.platform,
			});
		}
	}

	throw error(401, 'Authentication required');
}

function serializeCookieHeader(cookies: unknown): string | null {
	if (!cookies || typeof cookies !== 'object' || !('getAll' in cookies)) {
		return null;
	}

	const getAll = (cookies as { getAll?: () => Array<{ name: string; value: string }> }).getAll;
	if (typeof getAll !== 'function') {
		return null;
	}

	return getAll
		.call(cookies)
		.map(({ name, value }) => `${encodeURIComponent(name)}=${encodeURIComponent(value)}`)
		.join('; ');
}

export async function ensureAgencyMcpEntitlement(input: {
	platform: AgencyPlatform;
	user: AgencySessionUser;
	accountId?: string | null;
	tenantId?: string | null;
	metadata?: Record<string, unknown>;
}): Promise<{ row: AgencyMcpEntitlementRow; decision: AgencyMcpEntitlementDecision; snapshot: AgencyEntitlementSnapshot }> {
	const db = input.platform?.env?.DB;
	if (!db) {
		throw error(503, 'Database is unavailable');
	}

	const canonicalIdentity = resolveCanonicalAgencyIdentity(input.user);

	const row =
		(await reconcileAgencyMcpEntitlement(db, {
			authSubject: input.user.id,
			authEmail: input.user.email,
			accountId: input.accountId ?? canonicalIdentity.accountId,
			tenantId: input.tenantId ?? canonicalIdentity.tenantId,
			workspaceAccountId: input.accountId ?? canonicalIdentity.workspaceAccountId,
			serviceTier: normalizeAgencyServiceTier(input.user.tier),
		})) ??
		(await upsertAgencyMcpEntitlement(db, {
			authSubject: input.user.id,
			authEmail: input.user.email,
			accountId: input.accountId ?? canonicalIdentity.accountId,
			tenantId: input.tenantId ?? canonicalIdentity.tenantId,
			workspaceAccountId: input.accountId ?? canonicalIdentity.workspaceAccountId,
			serviceTier: normalizeAgencyServiceTier(input.user.tier),
			metadata: {
				session_source: 'clerk',
				user_source: input.user.source ?? 'clerk',
				...(input.metadata ?? {}),
			},
		}));

	const canonicalRow = await canonicalizeAgencyEntitlementIdentity(db, input.user, row);

	const decision = evaluateAgencyMcpEntitlement(canonicalRow, {
		accountId: input.accountId ?? canonicalIdentity.accountId,
		tenantId: input.tenantId ?? canonicalIdentity.tenantId,
	});

	return {
		row: canonicalRow,
		decision,
		snapshot: buildAgencyEntitlementSnapshot(canonicalRow, decision),
	};
}

export async function getAgencyMcpEntitlementDecision(input: {
	platform: AgencyPlatform;
	authSubject: string;
	accountId?: string | null;
	tenantId?: string | null;
}): Promise<AgencyMcpEntitlementDecision> {
	const db = input.platform?.env?.DB;
	if (!db) {
		throw error(503, 'Database is unavailable');
	}

	const row =
		(await reconcileAgencyMcpEntitlement(db, {
			authSubject: input.authSubject,
			accountId: input.accountId ?? null,
			tenantId: input.tenantId ?? null,
		})) ??
		(await findAgencyMcpEntitlementByAuthSubject(db, input.authSubject));
	return evaluateAgencyMcpEntitlement(row, {
		accountId: input.accountId ?? null,
		tenantId: input.tenantId ?? null,
	});
}
