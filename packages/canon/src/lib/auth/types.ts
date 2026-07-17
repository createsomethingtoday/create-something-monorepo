/**
 * Authentication Types & Configuration
 *
 * Shared types and constants used across auth modules.
 * This module exists to break circular dependencies between session.ts and server.ts.
 *
 * @packageDocumentation
 */

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

export interface AuthProviderConfig {
	type: 'identity-worker' | 'auth0';
}

export interface Auth0ProviderConfig extends AuthProviderConfig {
	type: 'auth0';
	domain: string;
	clientId: string;
	clientSecret?: string;
	audience?: string;
	scope: string;
	issuer: string;
	jwksUrl: string;
	claimsNamespace: string;
}

// =============================================================================
// TYPES
// =============================================================================

export interface TokenResponse {
	access_token: string;
	refresh_token: string;
	token_type: 'Bearer';
	expires_in: number;
}

export interface ExchangeResponse extends TokenResponse {
	user: {
		id: string;
		email: string;
		email_verified: boolean;
		name: string | null;
		avatar_url: string | null;
		tier: 'free' | 'pro' | 'agency';
		analytics_opt_out: boolean;
		created_at: string;
	};
}

export interface ErrorResponse {
	error: string;
}

export interface JWTPayload {
	sub: string;
	email?: string;
	tier?: 'free' | 'pro' | 'agency';
	source?: 'workway' | 'templates' | 'io' | 'space' | 'lms' | 'auth0';
	iss: string;
	aud: string[] | string;
	iat: number;
	exp: number;
	name?: string;
	[key: string]: unknown;
}

export interface User {
	id: string;
	email: string;
	tier: 'free' | 'pro' | 'agency';
	source: 'workway' | 'templates' | 'io' | 'space' | 'lms' | 'auth0';
	analytics_opt_out?: boolean;
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

/** JWK (JSON Web Key) structure for ES256 public keys */
export interface JWK {
	kty: string;
	crv?: string;
	x?: string;
	y?: string;
	n?: string;
	e?: string;
	kid: string;
	alg: string;
	use: string;
}

/** Configuration for createAuthHooks */
export interface AuthHooksConfig {
	/** Routes that require authentication (default: []) */
	protectedPaths?: string[];
	/** Login redirect path (default: '/login') */
	loginPath?: string;
	/** Whether to include redirect parameter (default: true) */
	includeRedirect?: boolean;
	/** Whether running in production (default: true) */
	isProduction?: boolean;
	/** Domain for cross-subdomain cookies */
	domain?: string;
	/** Analytics event emitter */
	onAnalyticsEvent?: (event: SessionAnalyticsEvent) => void;
	/** Explicit session provider. Set Identity to prevent retired provider env from taking precedence. */
	authProvider?: AuthProviderConfig | Auth0ProviderConfig;
}

export interface SessionManagerOptions {
	/** Whether running in production (affects Secure flag) */
	isProduction?: boolean;
	/** Domain for cross-subdomain cookies */
	domain?: string;
	/** Analytics event emitter */
	onAnalyticsEvent?: (event: SessionAnalyticsEvent) => void;
	/** Auth provider override */
	authProvider?: AuthProviderConfig | Auth0ProviderConfig;
}

/**
 * Minimal KV interface for JWKS caching
 * Compatible with Cloudflare KVNamespace without requiring @cloudflare/workers-types
 */
export interface KVLike {
	get(key: string, type: 'json'): Promise<unknown>;
	put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
	delete(key: string): Promise<void>;
}

/** Environment with optional KV namespace for JWKS caching */
export interface AuthEnv {
	/** KV namespace for caching JWKS (optional - falls back to module cache) */
	AUTH_CACHE?: KVLike;
	AUTH0_DOMAIN?: string;
	AUTH0_CLIENT_ID?: string;
	AUTH0_CLIENT_SECRET?: string;
	AUTH0_AUDIENCE?: string;
	AUTH0_SCOPE?: string;
	AUTH0_ISSUER_BASE_URL?: string;
	AUTH0_JWKS_URL?: string;
	AUTH0_CLAIMS_NAMESPACE?: string;
}
