/**
 * Authentication Utilities
 *
 * Session persistence and token management for CREATE SOMETHING properties.
 * httpOnly cookies ensure security; auto-refresh ensures continuity.
 *
 * Canon: One identity, many manifestations. The infrastructure disappears.
 *
 * @packageDocumentation
 */

// Cookie utilities
export {
	COOKIE_CONFIG,
	setSessionCookies,
	getSessionCookies,
	clearSessionCookies,
	getAccessTokenCookieOptions,
	getRefreshTokenCookieOptions,
	getClearCookieOptions,
	getAccessTokenFromRequest,
	getRefreshTokenFromRequest,
	createAccessTokenCookie,
	createRefreshTokenCookie,
	createClearCookieHeaders,
	type CookieOptions,
	type SessionCookies,
	type SetCookieParams,
} from './cookies.js';

// Session management
export {
	SESSION_CONFIG,
	decodeJWT,
	isTokenExpired,
	needsRefresh,
	getTokenTTL,
	getUserFromToken,
	refreshTokens,
	revokeSession,
	createSessionManager,
	autoRefreshMiddleware,
	requireAuth,
	// JWT validation with JWKS
	validateToken,
	// SvelteKit hooks
	createAuthHooks,
	type TokenResponse,
	type JWTPayload,
	type User,
	type SessionState,
	type RefreshResult,
	type SessionAnalyticsEvent,
	type SessionManagerOptions,
	type JWK,
	type AuthHooksConfig,
} from './session.js';

// Analytics integration
export {
	createAuthEvent,
	sessionEventToAnalytics,
	createAuthAnalytics,
	calculateSessionDuration,
	calculateLinkAge,
	type AuthMethod,
	type AuthEventAction,
	type AuthEventMetadata,
	type AuthAnalyticsEvent,
	type AuthAnalyticsOptions,
} from './analytics.js';

// Server-side validation (KV-cached JWKS)
export {
	validateToken as validateTokenWithKV,
	requireAuth as requireAuthFromRequest,
	getTokenFromRequest,
	getOptionalUser,
	clearJWKSCache,
	AuthenticationError,
	type AuthEnv,
	type KVLike,
} from './server.js';
