/**
 * Auth Store
 *
 * Client-side authentication state management using Svelte 5 runes.
 * Provides reactive user state and auth operations.
 *
 * Canon: One identity, many manifestations. The store disappears; only the user remains.
 *
 * @packageDocumentation
 */

import { writable, derived, type Readable } from 'svelte/store';
import {
	SESSION_CONFIG,
	type User,
	type TokenResponse,
	decodeJWT,
	isTokenExpired,
	refreshTokens,
	revokeSession,
} from '../index.js';
import { createAuthAnalytics, type AuthMethod } from '../analytics.js';

// =============================================================================
// TYPES
// =============================================================================

export interface AuthState {
	user: User | null;
	isAuthenticated: boolean;
	isLoading: boolean;
	error: string | null;
}

export interface AuthStoreConfig {
	/** Identity worker endpoint (defaults to SESSION_CONFIG.IDENTITY_ENDPOINT) */
	identityEndpoint?: string;
	/** Analytics tracking options */
	analytics?: {
		property: 'io' | 'space' | 'agency' | 'ltd' | 'lms';
		getSessionId: () => string;
		trackEvent: (event: unknown) => void;
	};
	/** Callback after successful login */
	onLoginSuccess?: (user: User) => void;
	/** Callback after logout */
	onLogoutSuccess?: () => void;
	/** Callback on auth error */
	onError?: (error: string) => void;
}

export interface LoginCredentials {
	email: string;
	password: string;
}

export interface SignupCredentials {
	email: string;
	password: string;
	name?: string;
	source?: 'io' | 'space' | 'agency' | 'ltd' | 'lms';
}

export interface MagicLinkRequest {
	email: string;
	source?: 'io' | 'space' | 'agency' | 'ltd' | 'lms';
}

// =============================================================================
// STORE
// =============================================================================

const initialState: AuthState = {
	user: null,
	isAuthenticated: false,
	isLoading: false,
	error: null,
};

/**
 * Create an auth store for client-side auth management
 *
 * @example
 * ```typescript
 * // In +layout.svelte
 * import { createAuthStore } from '@create-something/canon/auth/components';
 *
 * const auth = createAuthStore({
 *   analytics: {
 *     property: 'space',
 *     getSessionId: () => sessionId,
 *     trackEvent: (e) => track(e)
 *   }
 * });
 *
 * // In components
 * {#if $auth.isAuthenticated}
 *   <UserMenu user={$auth.user} onLogout={() => auth.logout()} />
 * {:else}
 *   <LoginForm onSubmit={(creds) => auth.login(creds)} />
 * {/if}
 * ```
 */
export function createAuthStore(config: AuthStoreConfig = {}) {
	const { identityEndpoint = SESSION_CONFIG.IDENTITY_ENDPOINT, analytics, onLoginSuccess, onLogoutSuccess, onError } =
		config;

	const state = writable<AuthState>(initialState);
	let refreshToken: string | null = null;

	// Create analytics tracker if configured
	const authAnalytics = analytics
		? createAuthAnalytics({
				property: analytics.property,
				getSessionId: analytics.getSessionId,
				getUrl: () => (typeof window !== 'undefined' ? window.location.href : ''),
				trackEvent: analytics.trackEvent as (event: unknown) => void,
			})
		: null;

	// ==========================================================================
	// HELPERS
	// ==========================================================================

	function setError(error: string) {
		state.update((s) => ({ ...s, error, isLoading: false }));
		onError?.(error);
	}

	function setLoading(isLoading: boolean) {
		state.update((s) => ({ ...s, isLoading, error: isLoading ? null : s.error }));
	}

	function setUser(user: User | null, token?: string) {
		if (token) {
			refreshToken = token;
		}
		state.update((s) => ({
			...s,
			user,
			isAuthenticated: !!user,
			isLoading: false,
			error: null,
		}));
	}

	function extractUser(accessToken: string): User | null {
		const payload = decodeJWT(accessToken);
		if (!payload) return null;
		return {
			id: payload.sub,
			email: payload.email,
			tier: payload.tier,
			source: payload.source,
		};
	}

	// ==========================================================================
	// AUTH OPERATIONS
	// ==========================================================================

	async function login(credentials: LoginCredentials): Promise<boolean> {
		setLoading(true);
		authAnalytics?.trackLoginStart('password');

		try {
			const response = await fetch(`${identityEndpoint}/v1/auth/login`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(credentials),
				credentials: 'include',
			});

			if (!response.ok) {
				const error = await response.json().catch(() => ({ error: 'login_failed' }));
				const errorCode = (error as { error?: string }).error || 'login_failed';
				authAnalytics?.trackLoginError('password', errorCode);
				setError(getErrorMessage(errorCode));
				return false;
			}

			const tokens = (await response.json()) as TokenResponse & { user: { id: string; email: string } };
			const user = extractUser(tokens.access_token);

			if (user) {
				setUser(user, tokens.refresh_token);
				authAnalytics?.trackLoginComplete('password', true);
				onLoginSuccess?.(user);
				return true;
			}

			setError('Failed to decode token');
			return false;
		} catch (err) {
			const errorCode = err instanceof Error ? err.message : 'network_error';
			authAnalytics?.trackLoginError('password', errorCode);
			setError('Network error. Please try again.');
			return false;
		}
	}

	async function signup(credentials: SignupCredentials): Promise<boolean> {
		setLoading(true);
		authAnalytics?.trackSignupStart('password');

		try {
			const response = await fetch(`${identityEndpoint}/v1/auth/signup`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					email: credentials.email,
					password: credentials.password,
					name: credentials.name,
					source: credentials.source || 'space',
				}),
				credentials: 'include',
			});

			if (!response.ok) {
				const error = await response.json().catch(() => ({ error: 'signup_failed' }));
				const errorCode = (error as { error?: string }).error || 'signup_failed';
				authAnalytics?.trackSignupError('password', errorCode);
				setError(getErrorMessage(errorCode));
				return false;
			}

			const tokens = (await response.json()) as TokenResponse & { user: { id: string; email: string } };
			const user = extractUser(tokens.access_token);

			if (user) {
				setUser(user, tokens.refresh_token);
				authAnalytics?.trackSignupComplete('password', user.tier);
				onLoginSuccess?.(user);
				return true;
			}

			setError('Failed to decode token');
			return false;
		} catch (err) {
			const errorCode = err instanceof Error ? err.message : 'network_error';
			authAnalytics?.trackSignupError('password', errorCode);
			setError('Network error. Please try again.');
			return false;
		}
	}

	async function sendMagicLink(request: MagicLinkRequest): Promise<boolean> {
		setLoading(true);
		authAnalytics?.trackLoginStart('magic_link');

		try {
			// First check if user exists
			const loginResponse = await fetch(`${identityEndpoint}/v1/auth/magic-login`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					email: request.email,
					source: request.source || 'space',
				}),
			});

			if (loginResponse.ok) {
				// User exists, magic link flow would typically send email
				// For now, magic-login directly returns tokens (server-side would send email)
				authAnalytics?.trackMagicLinkSent();
				setLoading(false);
				return true;
			}

			// User doesn't exist, try magic signup
			if (loginResponse.status === 404) {
				const signupResponse = await fetch(`${identityEndpoint}/v1/auth/magic-signup`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						email: request.email,
						source: request.source || 'space',
					}),
				});

				if (signupResponse.ok) {
					authAnalytics?.trackMagicLinkSent();
					setLoading(false);
					return true;
				}
			}

			const error = await loginResponse.json().catch(() => ({ error: 'magic_link_failed' }));
			const errorCode = (error as { error?: string }).error || 'magic_link_failed';
			authAnalytics?.trackLoginError('magic_link', errorCode);
			setError(getErrorMessage(errorCode));
			return false;
		} catch (err) {
			const errorCode = err instanceof Error ? err.message : 'network_error';
			authAnalytics?.trackLoginError('magic_link', errorCode);
			setError('Network error. Please try again.');
			return false;
		}
	}

	async function logout(): Promise<void> {
		const currentState = getState();
		const sessionDuration = currentState.user ? undefined : undefined; // Could calculate from token

		if (refreshToken) {
			await revokeSession(refreshToken);
		}

		refreshToken = null;
		setUser(null);
		authAnalytics?.trackLogout(sessionDuration);
		onLogoutSuccess?.();
	}

	async function refresh(): Promise<boolean> {
		if (!refreshToken) return false;

		const result = await refreshTokens(refreshToken);
		if (result.success && result.tokens) {
			const user = extractUser(result.tokens.access_token);
			if (user) {
				setUser(user, result.tokens.refresh_token);
				authAnalytics?.trackTokenRefresh(result.tokens.expires_in);
				return true;
			}
		}

		return false;
	}

	function getState(): AuthState {
		let currentState: AuthState = initialState;
		state.subscribe((s) => (currentState = s))();
		return currentState;
	}

	/**
	 * Initialize auth state from server-provided user data
	 * Call this in +layout.svelte with data from load function
	 */
	function initialize(user: User | null) {
		setUser(user);
		if (user) {
			authAnalytics?.trackSessionRestored(user.id);
		}
	}

	// ==========================================================================
	// STORE INTERFACE
	// ==========================================================================

	return {
		subscribe: state.subscribe,
		login,
		signup,
		sendMagicLink,
		logout,
		refresh,
		initialize,
		// Derived stores for convenience
		user: derived(state, ($s) => $s.user),
		isAuthenticated: derived(state, ($s) => $s.isAuthenticated),
		isLoading: derived(state, ($s) => $s.isLoading),
		error: derived(state, ($s) => $s.error),
	};
}

// =============================================================================
// ERROR MESSAGES
// =============================================================================

function getErrorMessage(code: string): string {
	const messages: Record<string, string> = {
		invalid_credentials: 'Invalid email or password',
		email_exists: 'An account with this email already exists',
		invalid_email: 'Please enter a valid email address',
		weak_password: 'Password must be at least 8 characters',
		rate_limited: 'Too many attempts. Please try again later.',
		invalid_token: 'Session expired. Please log in again.',
		network_error: 'Network error. Please check your connection.',
		user_not_found: 'No account found with this email',
		account_deleted: 'This account has been deleted',
	};

	return messages[code] || 'An error occurred. Please try again.';
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

let defaultStore: ReturnType<typeof createAuthStore> | null = null;

/**
 * Get or create a default auth store instance
 */
export function getAuthStore(config?: AuthStoreConfig): ReturnType<typeof createAuthStore> {
	if (!defaultStore) {
		defaultStore = createAuthStore(config);
	}
	return defaultStore;
}
