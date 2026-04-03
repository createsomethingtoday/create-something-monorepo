import type { Cookies } from '@sveltejs/kit';
import {
	PROPERTY_DOMAINS,
	createSessionManager,
	getAuth0Config,
	type User
} from '@create-something/canon/auth';
import {
	createAnonymousAgencyAccessState,
	createPreviewAgencyAccessState,
	createResolvedAgencyAccessState,
	createUnavailableAgencyAccessState,
	isAgencyAccessPreviewMode,
	type AgencyAccessPreviewMode,
	type AgencyAccessDecision,
	type AgencyAccessSnapshot,
	type AgencyAccessState
} from '$lib/agency-access';
import { resolveAgencyBaseUrl } from './control-plane';
import { isAgencyAccessPreviewEnabled } from './runtime';

const AGENCY_ACCESS_PREVIEW_COOKIE = 'abundance_agency_access_preview';
const AGENCY_ACCESS_PREVIEW_TTL = 60 * 60 * 24 * 7;

interface AgencyEntitlementResponse {
	decision: AgencyAccessDecision;
	snapshot: AgencyAccessSnapshot;
	updatedAt?: string | null;
	accountId?: string | null;
	tenantId?: string | null;
}

function isAgencyAccessChecks(value: unknown): value is AgencyAccessDecision['checks'] {
	if (!value || typeof value !== 'object' || Array.isArray(value)) {
		return false;
	}

	const record = value as Record<string, unknown>;
	return (
		typeof record.managedBearerAllowed === 'boolean' &&
		typeof record.orgMembershipActive === 'boolean' &&
		typeof record.serviceEntitled === 'boolean' &&
		typeof record.policyAccepted === 'boolean' &&
		typeof record.contractActive === 'boolean' &&
		typeof record.billingActive === 'boolean'
	);
}

function isAgencyAccessDecision(value: unknown): value is AgencyAccessDecision {
	if (!value || typeof value !== 'object' || Array.isArray(value)) {
		return false;
	}

	const record = value as Record<string, unknown>;
	return (
		typeof record.allowed === 'boolean' &&
		typeof record.reason === 'string' &&
		(record.accountId === null || typeof record.accountId === 'string') &&
		(record.tenantId === null || typeof record.tenantId === 'string') &&
		isAgencyAccessChecks(record.checks)
	);
}

function isApprovedException(value: unknown): value is AgencyAccessSnapshot['approvedException'] {
	if (!value || typeof value !== 'object' || Array.isArray(value)) {
		return false;
	}

	const record = value as Record<string, unknown>;
	return (
		typeof record.present === 'boolean' &&
		(record.type === null || typeof record.type === 'string') &&
		(record.allowedScope === null || typeof record.allowedScope === 'string') &&
		(record.graduationTarget === null || typeof record.graduationTarget === 'string') &&
		(record.reviewBy === null || typeof record.reviewBy === 'string')
	);
}

function isAgencyAccessSnapshot(value: unknown): value is AgencyAccessSnapshot {
	if (!value || typeof value !== 'object' || Array.isArray(value)) {
		return false;
	}

	const record = value as Record<string, unknown>;
	return (
		(record.serviceTier === 'mcp_only' ||
			record.serviceTier === 'policy_os_trial' ||
			record.serviceTier === 'policy_os_core') &&
		typeof record.managedBearerAllowed === 'boolean' &&
		typeof record.orgMembershipActive === 'boolean' &&
		typeof record.serviceEntitled === 'boolean' &&
		typeof record.policyAccepted === 'boolean' &&
		typeof record.contractActive === 'boolean' &&
		typeof record.billingActive === 'boolean' &&
		isApprovedException(record.approvedException)
	);
}

export async function getOptionalAgencySessionUser(input: {
	cookies: Cookies;
	platform?: App.Platform;
}): Promise<User | null> {
	const platformEnv = input.platform?.env as Record<string, string | undefined> | undefined;
	const authProvider = getAuth0Config(platformEnv);
	const session = createSessionManager(input.cookies, {
		isProduction: platformEnv?.ENVIRONMENT === 'production',
		domain: PROPERTY_DOMAINS.agency,
		authProvider: authProvider ?? undefined
	});

	return session.getUser();
}

export function getAgencyAccessPreviewMode(cookies: Cookies): AgencyAccessPreviewMode | null {
	const rawValue = cookies.get(AGENCY_ACCESS_PREVIEW_COOKIE)?.trim();
	if (!rawValue || !isAgencyAccessPreviewMode(rawValue)) {
		return null;
	}

	return rawValue;
}

export function setAgencyAccessPreviewModeCookie(
	cookies: Cookies,
	mode: AgencyAccessPreviewMode | null,
	secure: boolean
) {
	if (!mode) {
		cookies.delete(AGENCY_ACCESS_PREVIEW_COOKIE, {
			path: '/'
		});
		return;
	}

	cookies.set(AGENCY_ACCESS_PREVIEW_COOKIE, mode, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure,
		maxAge: AGENCY_ACCESS_PREVIEW_TTL
	});
}

export async function loadAgencyAccessState(input: {
	user: User | null;
	fetch: typeof globalThis.fetch;
	request: Request;
	platform?: App.Platform;
}): Promise<AgencyAccessState> {
	if (!input.user) {
		return createAnonymousAgencyAccessState();
	}

	const target = new URL('/api/me/entitlement', resolveAgencyBaseUrl(input.platform));
	const cookieHeader = input.request.headers.get('cookie');

	try {
		const response = await input.fetch(target, {
			headers: {
				accept: 'application/json',
				...(cookieHeader ? { cookie: cookieHeader } : {})
			}
		});

		if (!response.ok) {
			return createUnavailableAgencyAccessState();
		}

		const payload = (await response.json()) as Partial<AgencyEntitlementResponse>;
		if (!isAgencyAccessDecision(payload.decision) || !isAgencyAccessSnapshot(payload.snapshot)) {
			return createUnavailableAgencyAccessState();
		}

		return createResolvedAgencyAccessState({
			decision: payload.decision,
			snapshot: payload.snapshot,
			source: 'live',
			updatedAt: typeof payload.updatedAt === 'string' ? payload.updatedAt : null,
			accountId: typeof payload.accountId === 'string' ? payload.accountId : payload.decision.accountId,
			tenantId: typeof payload.tenantId === 'string' ? payload.tenantId : payload.decision.tenantId
		});
	} catch {
		return createUnavailableAgencyAccessState();
	}
}

export async function getAgencyAccessStateForRequest(input: {
	cookies: Cookies;
	fetch: typeof globalThis.fetch;
	request: Request;
	platform?: App.Platform;
}) {
	const previewMode = isAgencyAccessPreviewEnabled(input.platform)
		? getAgencyAccessPreviewMode(input.cookies)
		: null;
	const user = await getOptionalAgencySessionUser({
		cookies: input.cookies,
		platform: input.platform
	});

	if (!isAgencyAccessPreviewEnabled(input.platform)) {
		setAgencyAccessPreviewModeCookie(input.cookies, null, input.request.url.startsWith('https:'));
	}

	if (!user && previewMode) {
		return createPreviewAgencyAccessState(previewMode);
	}

	return loadAgencyAccessState({
		user,
		fetch: input.fetch,
		request: input.request,
		platform: input.platform
	});
}
