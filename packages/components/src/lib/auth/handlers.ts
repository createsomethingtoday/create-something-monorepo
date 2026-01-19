/**
 * Auth Handler Utilities
 *
 * Shared utilities for authentication endpoints to eliminate duplication.
 * Follows DRY principle across login, signup, and magic-link endpoints.
 */

import type { Cookies } from '@sveltejs/kit';
import { json } from '@sveltejs/kit';
import { setSessionCookies } from './cookies.js';
import type { TokenResponse, User } from './types.js';
import { generateCorrelationId, logError } from '../utils/index.js';
import type { ApiResponse } from '../types/index.js';

/**
 * Domain configuration based on environment
 */
export interface DomainConfig {
	isProduction: boolean;
	domain: string | undefined;
}

/**
 * Get domain configuration for cookie setting
 */
export function getDomainConfig(environment?: string): DomainConfig {
	const isProduction = environment === 'production';
	const domain = isProduction ? '.createsomething.agency' : undefined;
	return { isProduction, domain };
}

/**
 * Handle successful token response from Identity API
 * Sets cookies and returns user data
 */
export function handleIdentityResponse(
	cookies: Cookies,
	response: TokenResponse & { user: User },
	domainConfig: DomainConfig
) {
	setSessionCookies(
		cookies,
		{
			accessToken: response.access_token,
			refreshToken: response.refresh_token,
			domain: domainConfig.domain
		},
		domainConfig.isProduction ?? true
	);

	return json({
		success: true,
		data: { user: response.user }
	} as ApiResponse<{ user: User }>);
}

/**
 * Create standardized error response with correlation ID
 */
export function createAuthErrorResponse(
	action: string,
	error: unknown,
	customMessage?: string
) {
	const correlationId = generateCorrelationId();
	logError(action, error, correlationId);
	return json(
		{
			success: false,
			error: customMessage || `${action} failed`,
			correlationId
		} as ApiResponse<never>,
		{ status: 500 }
	);
}

/**
 * Handle Identity API error response
 */
export function handleIdentityError(
	errorResponse: { error?: string },
	defaultMessage: string,
	status: number
) {
	return json(
		{
			success: false,
			error: errorResponse.error || defaultMessage
		} as ApiResponse<never>,
		{ status }
	);
}

// =============================================================================
// REQUEST HANDLER FACTORIES
// =============================================================================

const IDENTITY_WORKER = 'https://id.createsomething.space';

interface AuthHandlerConfig {
	/** Identity API endpoint path (e.g., '/v1/auth/login') */
	endpoint: string;
	/** Action name for error logging */
	action: string;
	/** Optional request body transformer */
	transformBody?: (body: unknown) => unknown;
	/** Optional domain override for cookies (e.g., '.createsomething.space') */
	cookieDomain?: string;
}

interface AuthResponse {
	access_token: string;
	refresh_token: string;
	expires_in: number;
	user: User;
	error?: string;
	message?: string;
}

/**
 * Create a SvelteKit request handler for authentication endpoints.
 * 
 * Usage:
 * ```ts
 * import { createAuthHandler } from '@create-something/components/auth';
 * 
 * export const POST = createAuthHandler({
 *   endpoint: '/v1/auth/login',
 *   action: 'Login'
 * });
 * ```
 */
export function createAuthHandler(config: AuthHandlerConfig) {
	return async ({ request, cookies }: { request: Request; cookies: Cookies }) => {
		try {
			const rawBody = await request.json();
			const body = config.transformBody ? config.transformBody(rawBody) : rawBody;

			const response = await fetch(`${IDENTITY_WORKER}${config.endpoint}`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(body),
			});

			const data = (await response.json()) as AuthResponse;

			if (!response.ok) {
				return handleIdentityError(data, `${config.action} failed`, response.status);
			}

			// Set cookies for the tokens
			const cookieOptions = {
				path: '/',
				httpOnly: true,
				secure: true,
				sameSite: 'lax' as const,
			};

			cookies.set('cs_access_token', data.access_token, {
				...cookieOptions,
				...(config.cookieDomain && { domain: config.cookieDomain }),
				maxAge: data.expires_in,
			});

			cookies.set('cs_refresh_token', data.refresh_token, {
				...cookieOptions,
				...(config.cookieDomain && { domain: config.cookieDomain }),
				maxAge: 7 * 24 * 60 * 60, // 7 days
			});

			return json({ success: true, user: data.user });
		} catch (error) {
			return createAuthErrorResponse(config.action, error);
		}
	};
}

/**
 * Pre-configured login handler
 */
export function createLoginHandler(options?: { cookieDomain?: string }) {
	return createAuthHandler({
		endpoint: '/v1/auth/login',
		action: 'Login',
		cookieDomain: options?.cookieDomain,
	});
}

/**
 * Pre-configured signup handler
 */
export function createSignupHandler(options?: { source?: string; cookieDomain?: string }) {
	return createAuthHandler({
		endpoint: '/v1/auth/signup',
		action: 'Signup',
		cookieDomain: options?.cookieDomain,
		transformBody: (body) => ({
			...(body as object),
			...(options?.source && { source: options.source }),
		}),
	});
}
