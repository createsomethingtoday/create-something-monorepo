import { error } from '@sveltejs/kit';
import { createSessionManager, getDomainConfig } from '@create-something/canon/auth';
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
import {
	verifyAgencyIdentitySession,
	type AgencySessionUser,
} from '$lib/server/agency-identity-session';

export type { AgencySessionUser } from '$lib/server/agency-identity-session';

type AgencyPlatform = App.Platform | undefined;

export async function requireAgencySessionUser(input: {
	cookies: Parameters<typeof createSessionManager>[0];
	platform: AgencyPlatform;
}): Promise<AgencySessionUser> {
	const domainConfig = getDomainConfig(input.platform?.env?.ENVIRONMENT);
	const sessionManager = createSessionManager(input.cookies, {
		isProduction: input.platform?.env?.ENVIRONMENT === 'production',
		domain: domainConfig.domain,
		authProvider: { type: 'identity-worker' },
	});
	await sessionManager.getUser();
	const user = await verifyAgencyIdentitySession(input);
	if (!user?.id || !user.email) {
		throw error(401, 'Authentication required');
	}

	return user as AgencySessionUser;
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
				session_source: 'identity',
				user_source: input.user.source ?? 'identity',
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
