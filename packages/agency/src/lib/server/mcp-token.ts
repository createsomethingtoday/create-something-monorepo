import { error } from '@sveltejs/kit';
import { createSessionManager, getAuth0Config, getDomainConfig } from '@create-something/canon/auth';
import type { SessionManagerOptions } from '@create-something/canon/auth';
import {
	evaluateAgencyMcpEntitlement,
	findAgencyMcpEntitlementByAuthSubject,
	reconcileAgencyMcpEntitlement,
	upsertAgencyMcpEntitlement,
	type AgencyMcpEntitlementDecision,
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

export async function requireAgencySessionUser(input: {
	cookies: Parameters<typeof createSessionManager>[0];
	platform: AgencyPlatform;
}): Promise<AgencySessionUser> {
	const domainConfig = getDomainConfig(input.platform?.env?.ENVIRONMENT);
	const auth0Config = getAuth0Config(input.platform?.env as Record<string, string | undefined> | undefined);
	const authProvider: SessionManagerOptions['authProvider'] = auth0Config ?? undefined;
	const sessionManager = createSessionManager(input.cookies, {
		isProduction: input.platform?.env?.ENVIRONMENT === 'production',
		domain: domainConfig.domain,
		authProvider,
	});
	const user = await sessionManager.getUser();
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
}): Promise<{ row: AgencyMcpEntitlementRow; decision: AgencyMcpEntitlementDecision }> {
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
			serviceTier: input.user.tier ?? 'agency',
		})) ??
		(await upsertAgencyMcpEntitlement(db, {
			authSubject: input.user.id,
			authEmail: input.user.email,
			accountId: input.accountId ?? canonicalIdentity.accountId,
			tenantId: input.tenantId ?? canonicalIdentity.tenantId,
			workspaceAccountId: input.accountId ?? canonicalIdentity.workspaceAccountId,
			serviceTier: input.user.tier ?? 'agency',
			metadata: {
				session_source: 'auth0',
				user_source: input.user.source ?? 'auth0',
				...(input.metadata ?? {}),
			},
		}));

	const canonicalRow = await canonicalizeAgencyEntitlementIdentity(db, input.user, row);

	return {
		row: canonicalRow,
		decision: evaluateAgencyMcpEntitlement(canonicalRow, {
			accountId: input.accountId ?? canonicalIdentity.accountId,
			tenantId: input.tenantId ?? canonicalIdentity.tenantId,
		}),
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
