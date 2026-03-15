/**
 * JWT Utilities
 *
 * Parse JWT payload without verification.
 * We trust the Identity Worker has already validated the token.
 */

export interface JWTPayload {
	sub?: string;
	email?: string;
	[key: string]: unknown;
}

/**
 * Parse JWT payload without verification
 * (we trust the Identity Worker already validated it)
 */
export function parseJWT(token: string): JWTPayload | null {
	try {
		const parts = token.split('.');
		if (parts.length !== 3) return null;
		const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
		return payload;
	} catch {
		return null;
	}
}
