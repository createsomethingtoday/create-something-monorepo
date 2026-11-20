import { getSessionCookies } from '@create-something/canon/auth/cookies';
import { verifyIdentityToken } from '@create-something/canon/auth/server';
import { Data, Effect, Either } from 'effect';

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
	analytics_opt_out: boolean;
	analytics_preference_verified: boolean;
}

class IdentityPreferenceUnavailable extends Data.TaggedError('IdentityPreferenceUnavailable')<{}> {}

async function accountAnalyticsPreference(issuer: string, token: string, subject: string, send: typeof fetch) {
	const operation = Effect.tryPromise({
		try: async signal => {
			const response = await send(`${issuer}/v1/users/me`, {
				headers: { Authorization: `Bearer ${token}` }, cache: 'no-store', redirect: 'error',
				signal: AbortSignal.any([signal, AbortSignal.timeout(3000)])
			});
			if (!response.ok || !response.body) {
				await response.body?.cancel();
				throw new IdentityPreferenceUnavailable();
			}
			const reader = response.body.getReader();
			const decoder = new TextDecoder();
			let bytes = 0; let text = '';
			try {
				while (true) {
					const part = await reader.read();
					if (part.done) break;
					bytes += part.value.byteLength;
					if (bytes > 8192) throw new IdentityPreferenceUnavailable();
					text += decoder.decode(part.value, { stream: true });
				}
				const profile: unknown = JSON.parse(text + decoder.decode());
				if (!profile || typeof profile !== 'object' || !('id' in profile) || profile.id !== subject ||
					!('analytics_opt_out' in profile) || typeof profile.analytics_opt_out !== 'boolean') throw new IdentityPreferenceUnavailable();
				return { analytics_opt_out: profile.analytics_opt_out, analytics_preference_verified: true };
			} finally { await reader.cancel().catch(() => {}); }
		},
		catch: () => new IdentityPreferenceUnavailable()
	}).pipe(Effect.timeoutFail({ duration: '4 seconds', onTimeout: () => new IdentityPreferenceUnavailable() }));
	const result = await Effect.runPromise(Effect.either(operation));
	// Keep JWT authentication separate: unavailable preferences pause marketing, not access.
	return Either.isRight(result) ? result.right : { analytics_opt_out: true, analytics_preference_verified: false };
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
	const preference = await accountAnalyticsPreference(issuer, token, identity.subject, input.fetch ?? globalThis.fetch);

	return {
		id: identity.subject,
		email: identity.email,
		tier: identity.tier,
		source,
		...preference,
	};
}
