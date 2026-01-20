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

// Identity API endpoint (single source of truth)
export const IDENTITY_API = 'https://id.createsomething.space';

// Shared types (canonical source to avoid circular dependencies)
export {
	SESSION_CONFIG,
	type TokenResponse,
	type ExchangeResponse,
	type ErrorResponse,
	type JWTPayload,
	type User,
	type SessionState,
	type RefreshResult,
	type SessionAnalyticsEvent,
	type SessionManagerOptions,
	type AuthHooksConfig,
	type JWK,
	type KVLike,
	type AuthEnv,
} from './types.js';

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

// Session management (client-side utilities, no cryptographic validation)
export {
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
	// SvelteKit hooks
	createAuthHooks,
	// Logout handler
	handleLogout,
} from './session.js';

// Cross-domain authentication
export {
	exchangeCrossDomainToken,
	type CrossDomainExchangeParams,
} from './crossDomain.js';

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
// validateToken is the canonical cryptographic validation function
export {
	validateToken,
	validateToken as validateTokenWithKV,
	requireAuth as requireAuthFromRequest,
	getTokenFromRequest,
	getOptionalUser,
	clearJWKSCache,
	AuthenticationError,
} from './server.js';

// Auth endpoint handlers (DRY utilities)
export {
	getDomainConfig,
	handleIdentityResponse,
	createAuthErrorResponse,
	handleIdentityError,
	createAuthHandler,
	createLoginHandler,
	createSignupHandler,
	// Cross-domain handlers
	TARGET_DOMAINS,
	PROPERTY_DOMAINS,
	createCrossDomainHandler,
	createCrossDomainPageLoader,
	createMagicLinkCallbackLoader,
	// Page loaders
	createAuthenticatedPageLoader,
	createCategoryPageLoader,
	createAccountPageLoader,
	createLoginPageLoader,
	createLayoutServerLoader,
	type DomainConfig,
} from './handlers.js';

// UI Components
export {
	createAuthStore,
	getAuthStore,
	LoginForm,
	SignupForm,
	MagicLinkForm,
	UserMenu,
	ProtectedRoute,
	type AuthState,
	type AuthStoreConfig,
	type LoginCredentials,
	type SignupCredentials,
	type MagicLinkRequest,
} from './components/index.js';
