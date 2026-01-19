/**
 * Identity API Client
 *
 * Typed wrapper for the CREATE SOMETHING Identity Worker API.
 * Eliminates duplicate fetch patterns across auth endpoints.
 *
 * @example
 * import { identityClient } from '@create-something/components/api';
 *
 * // Login
 * const result = await identityClient.login({ email, password });
 * if (result.success) {
 *   setSessionCookies(cookies, result.data);
 * }
 *
 * // Magic link
 * const result = await identityClient.magicLogin({ email, source: 'io' });
 */

import { IDENTITY_API } from '../auth/index.js';

// ============================================
// Types
// ============================================

/**
 * Standard Identity API error response
 */
export interface IdentityErrorResponse {
	error: string;
	message?: string;
	code?: string;
}

/**
 * Token response from successful auth
 */
export interface TokenResponse {
	access_token: string;
	refresh_token: string;
	expires_in: number;
	token_type: 'Bearer';
}

/**
 * User data from Identity API
 */
export interface IdentityUser {
	id: string;
	email: string;
	name?: string;
	created_at: string;
}

/**
 * Login/signup response with tokens and user
 */
export interface AuthResponse extends TokenResponse {
	user: IdentityUser;
}

/**
 * Cross-domain token response
 */
export interface CrossDomainResponse {
	token: string;
	expires_at: string;
}

/**
 * Result type for Identity API calls
 */
export type IdentityResult<T> =
	| { success: true; data: T }
	| { success: false; error: string; status: number };

// ============================================
// Request Types
// ============================================

export interface LoginRequest {
	email: string;
	password: string;
}

export interface SignupRequest {
	email: string;
	password: string;
	name?: string;
	source?: string;
}

export interface MagicLoginRequest {
	email: string;
	source?: string;
}

export interface MagicSignupRequest {
	email: string;
	source?: string;
}

export interface VerifyMagicLinkRequest {
	token: string;
}

export interface CrossDomainRequest {
	target: string;
	accessToken: string;
}

export interface CrossDomainExchangeRequest {
	token: string;
}

export interface RefreshTokenRequest {
	refreshToken: string;
}

// ============================================
// Client Implementation
// ============================================

/**
 * Make a request to the Identity API
 */
async function identityRequest<T>(
	endpoint: string,
	options: {
		method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
		body?: unknown;
		accessToken?: string;
	} = {}
): Promise<IdentityResult<T>> {
	const { method = 'POST', body, accessToken } = options;

	const headers: Record<string, string> = {
		'Content-Type': 'application/json'
	};

	if (accessToken) {
		headers['Authorization'] = `Bearer ${accessToken}`;
	}

	try {
		const response = await fetch(`${IDENTITY_API}${endpoint}`, {
			method,
			headers,
			body: body ? JSON.stringify(body) : undefined
		});

		if (!response.ok) {
			const errorResult = (await response.json()) as IdentityErrorResponse;
			return {
				success: false,
				error: errorResult.error || 'Request failed',
				status: response.status
			};
		}

		const data = (await response.json()) as T;
		return { success: true, data };
	} catch (err) {
		return {
			success: false,
			error: err instanceof Error ? err.message : 'Network error',
			status: 0
		};
	}
}

/**
 * Identity API Client
 *
 * Provides typed methods for all Identity Worker endpoints.
 * Handles JSON serialization, error parsing, and type safety.
 */
export const identityClient = {
	/**
	 * Login with email and password
	 *
	 * @example
	 * const result = await identityClient.login({ email, password });
	 * if (result.success) {
	 *   const { access_token, refresh_token, user } = result.data;
	 * }
	 */
	async login(request: LoginRequest): Promise<IdentityResult<AuthResponse>> {
		return identityRequest<AuthResponse>('/v1/auth/login', {
			body: request
		});
	},

	/**
	 * Register a new user
	 *
	 * @example
	 * const result = await identityClient.signup({
	 *   email,
	 *   password,
	 *   name: 'John Doe',
	 *   source: 'io'
	 * });
	 */
	async signup(request: SignupRequest): Promise<IdentityResult<AuthResponse>> {
		return identityRequest<AuthResponse>('/v1/auth/register', {
			body: request
		});
	},

	/**
	 * Request a magic login link
	 *
	 * @example
	 * const result = await identityClient.magicLogin({ email, source: 'space' });
	 * if (result.success) {
	 *   // Email sent
	 * }
	 */
	async magicLogin(request: MagicLoginRequest): Promise<IdentityResult<{ success: true }>> {
		return identityRequest<{ success: true }>('/v1/auth/magic-login', {
			body: request
		});
	},

	/**
	 * Request a magic signup link
	 */
	async magicSignup(request: MagicSignupRequest): Promise<IdentityResult<{ success: true }>> {
		return identityRequest<{ success: true }>('/v1/auth/magic-signup', {
			body: request
		});
	},

	/**
	 * Verify a magic link token
	 *
	 * @example
	 * const result = await identityClient.verifyMagicLink({ token });
	 * if (result.success) {
	 *   setSessionCookies(cookies, result.data);
	 * }
	 */
	async verifyMagicLink(request: VerifyMagicLinkRequest): Promise<IdentityResult<AuthResponse>> {
		return identityRequest<AuthResponse>('/v1/auth/verify-magic-link', {
			body: request
		});
	},

	/**
	 * Generate a cross-domain authentication token
	 *
	 * @example
	 * const result = await identityClient.generateCrossDomainToken({
	 *   target: 'space',
	 *   accessToken: session.accessToken
	 * });
	 */
	async generateCrossDomainToken(
		request: CrossDomainRequest
	): Promise<IdentityResult<CrossDomainResponse>> {
		return identityRequest<CrossDomainResponse>('/v1/auth/cross-domain/generate', {
			body: { target: request.target },
			accessToken: request.accessToken
		});
	},

	/**
	 * Exchange a cross-domain token for session tokens
	 */
	async exchangeCrossDomainToken(
		request: CrossDomainExchangeRequest
	): Promise<IdentityResult<AuthResponse>> {
		return identityRequest<AuthResponse>('/v1/auth/cross-domain/exchange', {
			body: request
		});
	},

	/**
	 * Refresh an access token
	 */
	async refreshToken(request: RefreshTokenRequest): Promise<IdentityResult<TokenResponse>> {
		return identityRequest<TokenResponse>('/v1/auth/refresh', {
			body: { refresh_token: request.refreshToken }
		});
	},

	/**
	 * Logout and invalidate tokens
	 */
	async logout(accessToken: string): Promise<IdentityResult<{ success: true }>> {
		return identityRequest<{ success: true }>('/v1/auth/logout', {
			accessToken
		});
	}
};

// ============================================
// Helper Functions
// ============================================

/**
 * Extract user-friendly error message from Identity API result
 */
export function getIdentityErrorMessage(
	result: { success: false; error: string; status: number },
	defaultMessage: string
): string {
	// Map common errors to user-friendly messages
	const errorMap: Record<string, string> = {
		'Invalid credentials': 'Invalid email or password',
		'User not found': 'No account found with this email',
		'Email already exists': 'An account with this email already exists',
		'Invalid token': 'This link has expired or is invalid',
		'Token expired': 'This link has expired. Please request a new one.'
	};

	return errorMap[result.error] || result.error || defaultMessage;
}

/**
 * Check if error is an authentication error (401)
 */
export function isAuthError(result: { success: false; status: number }): boolean {
	return result.status === 401;
}

/**
 * Check if error is a validation error (400)
 */
export function isValidationError(result: { success: false; status: number }): boolean {
	return result.status === 400;
}
