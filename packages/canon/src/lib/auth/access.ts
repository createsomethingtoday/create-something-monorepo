import { getTokenFromRequest, verifyIdentityToken } from './server.js';
import type { IdentityVerificationConfig, VerifiedIdentity } from './server.js';

export type ApplicationAccessStatus =
	| 'allowed'
	| 'anonymous'
	| 'blocked'
	| 'invalid'
	| 'unconfigured';

export type ApplicationAccessSource = 'identity' | 'preview' | 'none';

export interface ApplicationAccessPolicy {
	allowedSubjects?: string[];
	allowedEmails?: string[];
	allowedEmailDomains?: string[];
	allowedTenantIds?: string[];
	allowedRoles?: string[];
	allowAnyAuthenticated?: boolean;
}

export interface ApplicationAccessState {
	status: ApplicationAccessStatus;
	source: ApplicationAccessSource;
	signInUrl: string;
	subject: string | null;
	email: string | null;
	tenantId: string | null;
	roles: string[];
	reason: string;
	detail: string;
}

export interface ResolveApplicationAccessInput {
	request: Request;
	verification: IdentityVerificationConfig;
	policy: ApplicationAccessPolicy;
	signInUrl?: string;
	preview?: {
		enabled: boolean;
		environment: string;
	};
}

function normalizeList(values: string[] | undefined): string[] {
	return (values ?? []).map((value) => value.trim()).filter(Boolean);
}

function readClaim(claims: Record<string, unknown>, names: string[]): string | null {
	for (const name of names) {
		const value = claims[name];
		if (typeof value === 'string' && value.trim()) return value.trim();
	}
	return null;
}

function readRoles(claims: Record<string, unknown>): string[] {
	const roles = new Set<string>();
	for (const name of ['role', 'org_role', 'organization_role']) {
		const value = claims[name];
		if (typeof value === 'string' && value.trim()) roles.add(value.trim());
	}
	const list = claims.roles;
	if (Array.isArray(list)) {
		for (const value of list) {
			if (typeof value === 'string' && value.trim()) roles.add(value.trim());
		}
	}
	return [...roles];
}

function matchesPolicy(identity: VerifiedIdentity, policy: ApplicationAccessPolicy): {
	allowed: boolean;
	tenantId: string | null;
	roles: string[];
} {
	const allowedSubjects = normalizeList(policy.allowedSubjects);
	const allowedEmails = normalizeList(policy.allowedEmails).map((value) => value.toLowerCase());
	const allowedDomains = normalizeList(policy.allowedEmailDomains).map((value) =>
		value.toLowerCase().replace(/^@/, ''),
	);
	const allowedTenantIds = normalizeList(policy.allowedTenantIds);
	const allowedRoles = normalizeList(policy.allowedRoles);
	const claims = identity.claims as Record<string, unknown>;
	const tenantId = readClaim(claims, ['tenant_id', 'org_id', 'organization_id']);
	const roles = readRoles(claims);

	if (policy.allowAnyAuthenticated === true) return { allowed: true, tenantId, roles };
	if (allowedSubjects.includes(identity.subject)) return { allowed: true, tenantId, roles };

	const email = identity.email?.toLowerCase() ?? null;
	if (email && allowedEmails.includes(email)) return { allowed: true, tenantId, roles };
	const emailDomain = email?.split('@')[1] ?? null;
	if (emailDomain && allowedDomains.includes(emailDomain)) return { allowed: true, tenantId, roles };

	if (tenantId && allowedTenantIds.includes(tenantId)) {
		if (allowedRoles.length === 0 || roles.some((role) => allowedRoles.includes(role))) {
			return { allowed: true, tenantId, roles };
		}
	}
	if (roles.some((role) => allowedRoles.includes(role))) return { allowed: true, tenantId, roles };

	return { allowed: false, tenantId, roles };
}

function state(
	input: Pick<ApplicationAccessState, 'status' | 'reason'> & Partial<ApplicationAccessState>,
): ApplicationAccessState {
	return {
		source: 'none',
		signInUrl: '/sign-in',
		subject: null,
		email: null,
		tenantId: null,
		roles: [],
		detail: input.reason,
		...input,
	};
}

/** Resolve cryptographic identity and explicit application policy for one request. */
export const resolveApplicationAccess = async (
	input: ResolveApplicationAccessInput,
): Promise<ApplicationAccessState> => {
	const signInUrl = input.signInUrl ?? '/sign-in';
	if (input.preview?.enabled) {
		if (input.preview.environment === 'production') {
			return state({
				status: 'unconfigured',
				signInUrl,
				reason: 'Preview access cannot be enabled in production.',
				detail: 'Disable the preview bypass and configure first-party identity verification.',
			});
		}
		return state({
			status: 'allowed',
			source: 'preview',
			signInUrl,
			subject: 'local-preview',
			reason: 'Explicit non-production preview access is enabled.',
			detail: 'Local preview access is active outside production.',
		});
	}

	const token = getTokenFromRequest(input.request);
	if (!token) {
		return state({
			status: 'anonymous',
			signInUrl,
			reason: 'No first-party session token was found.',
			detail: 'Sign in before accessing this protected application.',
		});
	}

	const identity = await verifyIdentityToken(token, input.verification);
	if (!identity) {
		return state({
			status: 'invalid',
			signInUrl,
			reason: 'The first-party session token could not be verified.',
			detail: 'Sign in again or check the application identity configuration.',
		});
	}

	const match = matchesPolicy(identity, input.policy);
	return state({
		status: match.allowed ? 'allowed' : 'blocked',
		source: 'identity',
		signInUrl,
		subject: identity.subject,
		email: identity.email,
		tenantId: match.tenantId,
		roles: match.roles,
		reason: match.allowed
			? 'Verified identity matches application access policy.'
			: 'Verified identity does not match application access policy.',
		detail: match.allowed
			? 'Application access is active for this identity.'
			: 'Ask an administrator to add this identity to an explicit application allow rule.',
	});
};
