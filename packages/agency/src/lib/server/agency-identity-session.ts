import { getSessionCookies } from '@create-something/canon/auth/cookies';
import { verifyIdentityToken } from '@create-something/canon/auth/server';

const DEFAULT_IDENTITY_ISSUER = 'https://id.createsomething.space';
const DEFAULT_IDENTITY_AUDIENCE = 'client-workspace';
const IDENTITY_SOURCES = ['workway', 'templates', 'io', 'space', 'lms'] as const;

export interface AgencySessionUser {
	id: string;
	email: string;
	tier?: 'free' | 'pro' | 'agency';
	source?: string;
}

export interface VerifiedAgencySessionUser extends AgencySessionUser {
	tier: 'free' | 'pro' | 'agency';
	source: 'workway' | 'templates' | 'io' | 'space' | 'lms';
}

function list(value: string | undefined, fallback: string): string[] {
	const entries = (value || fallback)
		.split(',')
		.map((entry) => entry.trim())
		.filter(Boolean);
	return entries.length > 0 ? entries : [fallback];
}

export async function verifyAgencyIdentitySession(input: {
	cookies: { get(name: string): string | undefined };
	platform: App.Platform | undefined;
	fetch?: typeof globalThis.fetch;
}): Promise<VerifiedAgencySessionUser | null> {
	const token = getSessionCookies(input.cookies).accessToken;
	if (!token) return null;

	const issuer = (input.platform?.env?.CS_IDENTITY_ISSUER || DEFAULT_IDENTITY_ISSUER).replace(
		/\/+$/,
		'',
	);
	const audiences = list(input.platform?.env?.CS_IDENTITY_AUDIENCE, DEFAULT_IDENTITY_AUDIENCE);
	if (audiences.length !== 1) return null;
	const identity = await verifyIdentityToken(token, {
		issuer,
		jwksUrl: input.platform?.env?.CS_IDENTITY_JWKS_URL || `${issuer}/.well-known/jwks.json`,
		audience: audiences[0],
		fetch: input.fetch,
	});
	if (!identity?.email) return null;
	const source = IDENTITY_SOURCES.find((candidate) => candidate === identity.source) ?? 'space';

	return {
		id: identity.subject,
		email: identity.email,
		tier: identity.tier,
		source,
	};
}
