import {
	IDENTITY_APPLICATION_AUDIENCES,
	PRODUCTION_IDENTITY_ORIGIN,
} from '@create-something/auth-platform';
import {
	verifyIdentityToken,
	type AuthEnv,
	type VerifiedIdentity,
} from '@create-something/canon/auth/server';

export interface LtdIdentityVerificationOptions {
	cache?: AuthEnv;
	fetch?: typeof globalThis.fetch;
	now?: () => number;
}

export function verifyLtdIdentityToken(
	token: string,
	options: LtdIdentityVerificationOptions = {},
): Promise<VerifiedIdentity | null> {
	return verifyIdentityToken(token, {
		issuer: PRODUCTION_IDENTITY_ORIGIN,
		jwksUrl: `${PRODUCTION_IDENTITY_ORIGIN}/.well-known/jwks.json`,
		audience: IDENTITY_APPLICATION_AUDIENCES.ltd,
		cache: options.cache,
		fetch: options.fetch,
		now: options.now,
	});
}
