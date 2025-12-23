/**
 * Session Cookie Utilities
 *
 * httpOnly cookie management for secure token storage.
 * Tokens travel in cookies, not headers - the infrastructure disappears.
 *
 * @packageDocumentation
 */

// =============================================================================
// CONFIGURATION
// =============================================================================

/** Cookie configuration aligned with token TTLs from identity-worker */
export const COOKIE_CONFIG = {
	/** Access token expires in 15 minutes */
	ACCESS_TOKEN_MAX_AGE: 15 * 60,
	/** Refresh token expires in 7 days */
	REFRESH_TOKEN_MAX_AGE: 7 * 24 * 60 * 60,
	/** Cookie names */
	NAMES: {
		ACCESS_TOKEN: 'cs_access_token',
		REFRESH_TOKEN: 'cs_refresh_token',
	},
	/** Cookie path - available across the entire domain */
	PATH: '/',
	/** SameSite policy */
	SAME_SITE: 'Lax' as const,
} as const;

// =============================================================================
// TYPES
// =============================================================================

export interface CookieOptions {
	maxAge: number;
	httpOnly: boolean;
	secure: boolean;
	sameSite: 'Strict' | 'Lax' | 'None';
	path: string;
	domain?: string;
}

export interface SessionCookies {
	accessToken: string | undefined;
	refreshToken: string | undefined;
}

export interface SetCookieParams {
	accessToken?: string;
	refreshToken?: string;
	/** Override domain for cross-subdomain cookies */
	domain?: string;
}

// =============================================================================
// COOKIE HELPERS
// =============================================================================

/**
 * Generate cookie options for access token
 */
export function getAccessTokenCookieOptions(isProduction: boolean, domain?: string): CookieOptions {
	return {
		maxAge: COOKIE_CONFIG.ACCESS_TOKEN_MAX_AGE,
		httpOnly: true,
		secure: isProduction,
		sameSite: COOKIE_CONFIG.SAME_SITE,
		path: COOKIE_CONFIG.PATH,
		...(domain && { domain }),
	};
}

/**
 * Generate cookie options for refresh token
 */
export function getRefreshTokenCookieOptions(isProduction: boolean, domain?: string): CookieOptions {
	return {
		maxAge: COOKIE_CONFIG.REFRESH_TOKEN_MAX_AGE,
		httpOnly: true,
		secure: isProduction,
		sameSite: COOKIE_CONFIG.SAME_SITE,
		path: COOKIE_CONFIG.PATH,
		...(domain && { domain }),
	};
}

/**
 * Generate cookie options for clearing (immediate expiry)
 */
export function getClearCookieOptions(isProduction: boolean, domain?: string): CookieOptions {
	return {
		maxAge: 0,
		httpOnly: true,
		secure: isProduction,
		sameSite: COOKIE_CONFIG.SAME_SITE,
		path: COOKIE_CONFIG.PATH,
		...(domain && { domain }),
	};
}

// =============================================================================
// SVELTEKIT COOKIE INTEGRATION
// =============================================================================

/**
 * Set session cookies using SvelteKit's cookies API
 *
 * @example
 * ```typescript
 * // In +page.server.ts after login
 * import { setSessionCookies } from '@create-something/components/auth';
 *
 * export const actions = {
 *   login: async ({ cookies, request }) => {
 *     const response = await loginUser(formData);
 *     setSessionCookies(cookies, {
 *       accessToken: response.access_token,
 *       refreshToken: response.refresh_token,
 *     });
 *   }
 * };
 * ```
 */
export function setSessionCookies(
	cookies: {
		set: (name: string, value: string, options: CookieOptions) => void;
	},
	params: SetCookieParams,
	isProduction = true
): void {
	const { accessToken, refreshToken, domain } = params;

	if (accessToken) {
		cookies.set(
			COOKIE_CONFIG.NAMES.ACCESS_TOKEN,
			accessToken,
			getAccessTokenCookieOptions(isProduction, domain)
		);
	}

	if (refreshToken) {
		cookies.set(
			COOKIE_CONFIG.NAMES.REFRESH_TOKEN,
			refreshToken,
			getRefreshTokenCookieOptions(isProduction, domain)
		);
	}
}

/**
 * Get session cookies using SvelteKit's cookies API
 *
 * @example
 * ```typescript
 * // In +layout.server.ts
 * import { getSessionCookies } from '@create-something/components/auth';
 *
 * export const load = async ({ cookies }) => {
 *   const session = getSessionCookies(cookies);
 *   if (session.accessToken) {
 *     const user = await validateToken(session.accessToken);
 *     return { user };
 *   }
 *   return { user: null };
 * };
 * ```
 */
export function getSessionCookies(cookies: { get: (name: string) => string | undefined }): SessionCookies {
	return {
		accessToken: cookies.get(COOKIE_CONFIG.NAMES.ACCESS_TOKEN),
		refreshToken: cookies.get(COOKIE_CONFIG.NAMES.REFRESH_TOKEN),
	};
}

/**
 * Clear session cookies (logout)
 *
 * @example
 * ```typescript
 * // In +page.server.ts logout action
 * import { clearSessionCookies } from '@create-something/components/auth';
 *
 * export const actions = {
 *   logout: async ({ cookies }) => {
 *     clearSessionCookies(cookies);
 *     throw redirect(303, '/');
 *   }
 * };
 * ```
 */
export function clearSessionCookies(
	cookies: {
		set: (name: string, value: string, options: CookieOptions) => void;
		delete: (name: string, options?: { path?: string }) => void;
	},
	isProduction = true,
	domain?: string
): void {
	// Use set with empty value and maxAge=0 for cross-browser compatibility
	const clearOptions = getClearCookieOptions(isProduction, domain);

	cookies.set(COOKIE_CONFIG.NAMES.ACCESS_TOKEN, '', clearOptions);
	cookies.set(COOKIE_CONFIG.NAMES.REFRESH_TOKEN, '', clearOptions);
}

// =============================================================================
// TOKEN EXTRACTION FROM REQUEST
// =============================================================================

/**
 * Extract access token from a Request object's Cookie header
 * Useful in API routes and middleware
 */
export function getAccessTokenFromRequest(request: Request): string | null {
	const cookieHeader = request.headers.get('Cookie');
	if (!cookieHeader) return null;

	const cookies = parseCookieHeader(cookieHeader);
	return cookies[COOKIE_CONFIG.NAMES.ACCESS_TOKEN] || null;
}

/**
 * Extract refresh token from a Request object's Cookie header
 */
export function getRefreshTokenFromRequest(request: Request): string | null {
	const cookieHeader = request.headers.get('Cookie');
	if (!cookieHeader) return null;

	const cookies = parseCookieHeader(cookieHeader);
	return cookies[COOKIE_CONFIG.NAMES.REFRESH_TOKEN] || null;
}

/**
 * Parse a Cookie header into key-value pairs
 */
function parseCookieHeader(header: string): Record<string, string> {
	const cookies: Record<string, string> = {};

	header.split(';').forEach((pair) => {
		const [name, ...valueParts] = pair.trim().split('=');
		if (name) {
			cookies[name] = valueParts.join('=');
		}
	});

	return cookies;
}

// =============================================================================
// SET-COOKIE HEADER GENERATION
// =============================================================================

/**
 * Generate Set-Cookie header value for access token
 * Useful for Cloudflare Workers and raw Response construction
 */
export function createAccessTokenCookie(
	token: string,
	isProduction = true,
	domain?: string
): string {
	return formatSetCookieHeader(
		COOKIE_CONFIG.NAMES.ACCESS_TOKEN,
		token,
		getAccessTokenCookieOptions(isProduction, domain)
	);
}

/**
 * Generate Set-Cookie header value for refresh token
 */
export function createRefreshTokenCookie(
	token: string,
	isProduction = true,
	domain?: string
): string {
	return formatSetCookieHeader(
		COOKIE_CONFIG.NAMES.REFRESH_TOKEN,
		token,
		getRefreshTokenCookieOptions(isProduction, domain)
	);
}

/**
 * Generate Set-Cookie headers to clear both tokens
 */
export function createClearCookieHeaders(isProduction = true, domain?: string): string[] {
	const clearOptions = getClearCookieOptions(isProduction, domain);
	return [
		formatSetCookieHeader(COOKIE_CONFIG.NAMES.ACCESS_TOKEN, '', clearOptions),
		formatSetCookieHeader(COOKIE_CONFIG.NAMES.REFRESH_TOKEN, '', clearOptions),
	];
}

/**
 * Format a Set-Cookie header value
 */
function formatSetCookieHeader(name: string, value: string, options: CookieOptions): string {
	const parts = [`${name}=${value}`];

	if (options.maxAge !== undefined) {
		parts.push(`Max-Age=${options.maxAge}`);
	}
	if (options.path) {
		parts.push(`Path=${options.path}`);
	}
	if (options.domain) {
		parts.push(`Domain=${options.domain}`);
	}
	if (options.httpOnly) {
		parts.push('HttpOnly');
	}
	if (options.secure) {
		parts.push('Secure');
	}
	if (options.sameSite) {
		parts.push(`SameSite=${options.sameSite}`);
	}

	return parts.join('; ');
}
