/**
 * Session Management
 *
 * Token refresh and session lifecycle management.
 * Auto-refresh ensures continuous authentication without user interruption.
 *
 * @packageDocumentation
 */

import {
	COOKIE_CONFIG,
	setSessionCookies,
	getSessionCookies,
	clearSessionCookies,
	getAccessTokenFromRequest,
	getRefreshTokenFromRequest,
	type CookieOptions,
} from './cookies.js';

// =============================================================================
// CONFIGURATION
// =============================================================================

/** Session configuration */
export const SESSION_CONFIG = {
	/** Refresh access token when it has less than 2 minutes remaining */
	REFRESH_THRESHOLD_SECONDS: 2 * 60,
	/** Identity worker endpoint */
	IDENTITY_ENDPOINT: 'https://id.createsomething.space',
	/** JWKS cache TTL in seconds */
	JWKS_CACHE_TTL: 3600,
} as const;

// =============================================================================
// TYPES
// =============================================================================

export interface TokenResponse {
	access_token: string;
	refresh_token: string;
	token_type: 'Bearer';
	expires_in: number;
}

export interface JWTPayload {
	sub: string;
	email: string;
	tier: 'free' | 'pro' | 'agency';
	source: 'workway' | 'templates' | 'io' | 'space' | 'lms';
	iss: string;
	aud: string[];
	iat: number;
	exp: number;
}

export interface User {
	id: string;
	email: string;
	tier: 'free' | 'pro' | 'agency';
	source: 'workway' | 'templates' | 'io' | 'space' | 'lms';
}

export interface SessionState {
	user: User | null;
	expiresAt: number | null;
	isAuthenticated: boolean;
}

export interface RefreshResult {
	success: boolean;
	tokens?: TokenResponse;
	error?: string;
}

export interface SessionAnalyticsEvent {
	action:
		| 'auth_login_complete'
		| 'auth_logout'
		| 'auth_token_refresh'
		| 'auth_session_expired'
		| 'auth_session_restored';
	metadata?: Record<string, unknown>;
}

// =============================================================================
// JWT UTILITIES
// =============================================================================

/**
 * Decode a JWT without verification (for client-side use only)
 * Use validateToken() for server-side verification
 */
export function decodeJWT(token: string): JWTPayload | null {
	try {
		const [, payloadB64] = token.split('.');
		if (!payloadB64) return null;

		const payload = JSON.parse(atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/')));
		return payload as JWTPayload;
	} catch {
		return null;
	}
}

/**
 * Check if a token is expired or about to expire
 */
export function isTokenExpired(token: string, thresholdSeconds = 0): boolean {
	const payload = decodeJWT(token);
	if (!payload) return true;

	const now = Math.floor(Date.now() / 1000);
	return payload.exp <= now + thresholdSeconds;
}

/**
 * Check if token needs refresh (within threshold of expiration)
 */
export function needsRefresh(token: string): boolean {
	return isTokenExpired(token, SESSION_CONFIG.REFRESH_THRESHOLD_SECONDS);
}

/**
 * Get time until token expires in seconds
 */
export function getTokenTTL(token: string): number {
	const payload = decodeJWT(token);
	if (!payload) return 0;

	const now = Math.floor(Date.now() / 1000);
	return Math.max(0, payload.exp - now);
}

/**
 * Extract user info from access token
 */
export function getUserFromToken(token: string): User | null {
	const payload = decodeJWT(token);
	if (!payload) return null;

	return {
		id: payload.sub,
		email: payload.email,
		tier: payload.tier,
		source: payload.source,
	};
}

// =============================================================================
// TOKEN REFRESH
// =============================================================================

/**
 * Refresh tokens using the Identity worker
 *
 * @example
 * ```typescript
 * // In +page.server.ts
 * const session = getSessionCookies(cookies);
 * if (session.refreshToken && needsRefresh(session.accessToken)) {
 *   const result = await refreshTokens(session.refreshToken);
 *   if (result.success) {
 *     setSessionCookies(cookies, {
 *       accessToken: result.tokens.access_token,
 *       refreshToken: result.tokens.refresh_token,
 *     });
 *   }
 * }
 * ```
 */
export async function refreshTokens(refreshToken: string): Promise<RefreshResult> {
	try {
		const response = await fetch(`${SESSION_CONFIG.IDENTITY_ENDPOINT}/v1/auth/refresh`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({ refresh_token: refreshToken }),
		});

		if (!response.ok) {
			const error = await response.json().catch(() => ({ error: 'unknown' }));
			return {
				success: false,
				error: (error as { error?: string }).error || 'refresh_failed',
			};
		}

		const tokens = (await response.json()) as TokenResponse;
		return {
			success: true,
			tokens,
		};
	} catch (error) {
		return {
			success: false,
			error: error instanceof Error ? error.message : 'network_error',
		};
	}
}

/**
 * Logout by revoking refresh token at Identity worker
 */
export async function revokeSession(refreshToken: string): Promise<boolean> {
	try {
		const response = await fetch(`${SESSION_CONFIG.IDENTITY_ENDPOINT}/v1/auth/logout`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({ refresh_token: refreshToken }),
		});

		return response.ok;
	} catch {
		return false;
	}
}

// =============================================================================
// SERVER-SIDE SESSION MANAGEMENT
// =============================================================================

type CookiesAPI = {
	get: (name: string) => string | undefined;
	set: (name: string, value: string, options: CookieOptions) => void;
	delete: (name: string, options?: { path?: string }) => void;
};

export interface SessionManagerOptions {
	/** Whether running in production (affects Secure flag) */
	isProduction?: boolean;
	/** Domain for cross-subdomain cookies */
	domain?: string;
	/** Analytics event emitter */
	onAnalyticsEvent?: (event: SessionAnalyticsEvent) => void;
}

/**
 * Create a session manager for server-side use
 *
 * @example
 * ```typescript
 * // In +layout.server.ts
 * import { createSessionManager } from '@create-something/components/auth';
 *
 * export const load = async ({ cookies, platform }) => {
 *   const session = createSessionManager(cookies, {
 *     isProduction: platform?.env.ENVIRONMENT === 'production',
 *     onAnalyticsEvent: (event) => {
 *       // Send to analytics
 *     }
 *   });
 *
 *   const user = await session.getUser();
 *   return { user };
 * };
 * ```
 */
export function createSessionManager(cookies: CookiesAPI, options: SessionManagerOptions = {}) {
	const { isProduction = true, domain, onAnalyticsEvent } = options;

	return {
		/**
		 * Get current user from session, refreshing if needed
		 */
		async getUser(): Promise<User | null> {
			const session = getSessionCookies(cookies);

			// No tokens at all
			if (!session.accessToken && !session.refreshToken) {
				return null;
			}

			// Access token valid
			if (session.accessToken && !isTokenExpired(session.accessToken)) {
				return getUserFromToken(session.accessToken);
			}

			// Try to refresh
			if (session.refreshToken) {
				const refreshed = await this.refresh();
				if (refreshed) {
					const newSession = getSessionCookies(cookies);
					return newSession.accessToken ? getUserFromToken(newSession.accessToken) : null;
				}
			}

			// Session expired
			onAnalyticsEvent?.({
				action: 'auth_session_expired',
				metadata: {
					had_access_token: !!session.accessToken,
					had_refresh_token: !!session.refreshToken,
				},
			});

			return null;
		},

		/**
		 * Get session state with expiration info
		 */
		getState(): SessionState {
			const session = getSessionCookies(cookies);

			if (!session.accessToken) {
				return {
					user: null,
					expiresAt: null,
					isAuthenticated: false,
				};
			}

			const payload = decodeJWT(session.accessToken);

			return {
				user: payload
					? {
							id: payload.sub,
							email: payload.email,
							tier: payload.tier,
							source: payload.source,
						}
					: null,
				expiresAt: payload?.exp ?? null,
				isAuthenticated: !!payload && !isTokenExpired(session.accessToken),
			};
		},

		/**
		 * Check if tokens need refresh
		 */
		needsRefresh(): boolean {
			const session = getSessionCookies(cookies);
			if (!session.accessToken) return false;
			return needsRefresh(session.accessToken);
		},

		/**
		 * Refresh tokens if needed, returns true if successful
		 */
		async refresh(): Promise<boolean> {
			const session = getSessionCookies(cookies);
			if (!session.refreshToken) return false;

			const result = await refreshTokens(session.refreshToken);

			if (result.success && result.tokens) {
				setSessionCookies(
					cookies,
					{
						accessToken: result.tokens.access_token,
						refreshToken: result.tokens.refresh_token,
						domain,
					},
					isProduction
				);

				onAnalyticsEvent?.({
					action: 'auth_token_refresh',
					metadata: {
						expires_in: result.tokens.expires_in,
					},
				});

				return true;
			}

			return false;
		},

		/**
		 * Set tokens after login
		 */
		setTokens(tokens: TokenResponse): void {
			setSessionCookies(
				cookies,
				{
					accessToken: tokens.access_token,
					refreshToken: tokens.refresh_token,
					domain,
				},
				isProduction
			);

			const user = getUserFromToken(tokens.access_token);
			onAnalyticsEvent?.({
				action: 'auth_login_complete',
				metadata: {
					user_id: user?.id,
					tier: user?.tier,
				},
			});
		},

		/**
		 * Clear session (logout)
		 */
		async logout(): Promise<void> {
			const session = getSessionCookies(cookies);

			// Calculate session duration for analytics
			let sessionDurationMinutes: number | undefined;
			if (session.accessToken) {
				const payload = decodeJWT(session.accessToken);
				if (payload) {
					// Estimate session start from token issue time
					const now = Math.floor(Date.now() / 1000);
					sessionDurationMinutes = Math.round((now - payload.iat) / 60);
				}
			}

			// Revoke at identity worker
			if (session.refreshToken) {
				await revokeSession(session.refreshToken);
			}

			// Clear cookies
			clearSessionCookies(cookies, isProduction, domain);

			onAnalyticsEvent?.({
				action: 'auth_logout',
				metadata: {
					session_duration_minutes: sessionDurationMinutes,
				},
			});
		},
	};
}

// =============================================================================
// MIDDLEWARE HELPERS
// =============================================================================

/**
 * Auto-refresh middleware for SvelteKit hooks
 *
 * @example
 * ```typescript
 * // In hooks.server.ts
 * import { autoRefreshMiddleware } from '@create-something/components/auth';
 *
 * export const handle: Handle = async ({ event, resolve }) => {
 *   await autoRefreshMiddleware(event.cookies);
 *   return resolve(event);
 * };
 * ```
 */
export async function autoRefreshMiddleware(
	cookies: CookiesAPI,
	options: SessionManagerOptions = {}
): Promise<boolean> {
	const session = createSessionManager(cookies, options);

	if (session.needsRefresh()) {
		return session.refresh();
	}

	return false;
}

/**
 * Require authentication, redirect if not authenticated
 *
 * @example
 * ```typescript
 * // In +page.server.ts
 * import { requireAuth } from '@create-something/components/auth';
 * import { redirect } from '@sveltejs/kit';
 *
 * export const load = async ({ cookies }) => {
 *   const user = await requireAuth(cookies);
 *   if (!user) {
 *     throw redirect(303, '/login');
 *   }
 *   return { user };
 * };
 * ```
 */
export async function requireAuth(
	cookies: CookiesAPI,
	options: SessionManagerOptions = {}
): Promise<User | null> {
	const session = createSessionManager(cookies, options);
	return session.getUser();
}
