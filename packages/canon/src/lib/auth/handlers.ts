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
import type { IdentityUser } from '../api/identity-client.js';

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
	response: TokenResponse & { user: IdentityUser },
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
 * import { createAuthHandler } from '@create-something/canon/auth';
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

// =============================================================================
// CROSS-DOMAIN AUTH HANDLERS
// =============================================================================

import { redirect } from '@sveltejs/kit';
import { getSessionCookies } from './cookies.js';
import { exchangeCrossDomainToken } from './crossDomain.js';

/**
 * Target domains for cross-domain authentication
 */
export const TARGET_DOMAINS: Record<string, string> = {
	ltd: 'https://createsomething.ltd',
	io: 'https://createsomething.io',
	space: 'https://createsomething.space',
	agency: 'https://createsomething.agency',
	lms: 'https://learn.createsomething.space'
};

/**
 * Property domain configuration for each property
 */
export const PROPERTY_DOMAINS: Record<string, string> = {
	ltd: '.createsomething.ltd',
	io: '.createsomething.io',
	space: '.createsomething.space',
	agency: '.createsomething.agency',
	lms: '.createsomething.space'
};

interface CrossDomainHandlerOptions {
	/** Identity client for generating tokens */
	identityClient: {
		generateCrossDomainToken: (params: { target: string; accessToken: string }) => Promise<{
			success: boolean;
			data?: { token: string };
			error?: string;
			status?: number;
		}>;
	};
	/** Function to get error message from result */
	getIdentityErrorMessage?: (result: { error?: string; success?: boolean; status?: number }, defaultMsg: string) => string;
}

/**
 * Create cross-domain API handler (GET endpoint that redirects)
 * 
 * Usage:
 * ```ts
 * import { createCrossDomainHandler } from '@create-something/canon/auth';
 * import { identityClient, getIdentityErrorMessage } from '@create-something/canon/api';
 * 
 * export const GET = createCrossDomainHandler({
 *   identityClient,
 *   getIdentityErrorMessage
 * });
 * ```
 */
export function createCrossDomainHandler(options: CrossDomainHandlerOptions) {
	return async ({ url, cookies }: { url: URL; cookies: Cookies }) => {
		const target = url.searchParams.get('target');
		const redirectPath = url.searchParams.get('redirect') || '/account';

		if (!target || !TARGET_DOMAINS[target]) {
			return json({ error: 'Invalid target property' }, { status: 400 });
		}

		const session = getSessionCookies(cookies);
		if (!session.accessToken) {
			return json({ error: 'Not authenticated' }, { status: 401 });
		}

		const result = await options.identityClient.generateCrossDomainToken({
			target,
			accessToken: session.accessToken
		});

		if (!result.success) {
			const errorMsg = options.getIdentityErrorMessage 
				? options.getIdentityErrorMessage(result, 'Token generation failed')
				: result.error || 'Token generation failed';
			return json({ error: errorMsg }, { status: result.status || 500 });
		}

		const targetUrl = new URL('/auth/cross-domain', TARGET_DOMAINS[target]);
		targetUrl.searchParams.set('token', result.data!.token);
		targetUrl.searchParams.set('redirect', redirectPath);

		return new Response(null, {
			status: 302,
			headers: { Location: targetUrl.toString() }
		});
	};
}

interface CrossDomainPageLoaderOptions {
	/** Property identifier (ltd, io, agency, space, lms) */
	property: 'ltd' | 'io' | 'agency' | 'space' | 'lms';
}

/**
 * Create cross-domain page loader (receives token and sets cookies)
 * 
 * Usage:
 * ```ts
 * import { createCrossDomainPageLoader } from '@create-something/canon/auth';
 * 
 * export const load = createCrossDomainPageLoader({ property: 'ltd' });
 * ```
 */
export function createCrossDomainPageLoader(options: CrossDomainPageLoaderOptions) {
	const propertyLabel = `.${options.property}`;
	const productionDomain = PROPERTY_DOMAINS[options.property];

	return async ({ url, cookies, platform }: { 
		url: URL; 
		cookies: Cookies; 
		platform?: { env?: { ENVIRONMENT?: string } } 
	}) => {
		const token = url.searchParams.get('token');
		const redirectTo = url.searchParams.get('redirect') || '/account';
		const isProduction = platform?.env?.ENVIRONMENT === 'production';
		const domain = isProduction ? productionDomain : undefined;

		await exchangeCrossDomainToken({
			token: token || '',
			cookies,
			domain: domain || '',
			isProduction: isProduction ?? true,
			propertyLabel,
			redirectTo,
		});
	};
}

interface MagicLinkCallbackOptions {
	/** Property identifier (ltd, io, agency, space, lms) */
	property: 'ltd' | 'io' | 'agency' | 'space' | 'lms';
	/** Identity client for verifying magic links */
	identityClient: {
		verifyMagicLink: (params: { token: string }) => Promise<{
			success: boolean;
			data?: { access_token: string; refresh_token: string; user?: { id: string } };
			error?: string;
		}>;
	};
}

/**
 * Create magic link callback page loader
 * 
 * Usage:
 * ```ts
 * import { createMagicLinkCallbackLoader } from '@create-something/canon/auth';
 * import { identityClient } from '@create-something/canon/api';
 * 
 * export const load = createMagicLinkCallbackLoader({ 
 *   property: 'ltd',
 *   identityClient 
 * });
 * ```
 */
export function createMagicLinkCallbackLoader(options: MagicLinkCallbackOptions) {
	const productionDomain = PROPERTY_DOMAINS[options.property];

	return async ({ url, cookies, platform }: { 
		url: URL; 
		cookies: Cookies; 
		platform?: { env?: { ENVIRONMENT?: string } } 
	}) => {
		const token = url.searchParams.get('token');
		const redirectTo = url.searchParams.get('redirect') || '/';

		if (!token) {
			redirect(302, '/login?error=invalid_token');
		}

		const result = await options.identityClient.verifyMagicLink({ token });

		if (!result.success) {
			redirect(302, `/login?error=${encodeURIComponent(result.error || 'verification_failed')}`);
		}

		const isProduction = platform?.env?.ENVIRONMENT === 'production';
		const domain = isProduction ? productionDomain : undefined;

		setSessionCookies(
			cookies,
			{
				accessToken: result.data!.access_token,
				refreshToken: result.data!.refresh_token,
				domain
			},
			isProduction ?? true
		);

		redirect(302, redirectTo);
	};
}

// =============================================================================
// PAGE LOADERS
// =============================================================================

/**
 * Create category page loader for fetching papers by category.
 * 
 * Usage:
 * ```ts
 * import { createCategoryPageLoader } from '@create-something/canon/auth';
 * export const load = createCategoryPageLoader();
 * ```
 */
export function createCategoryPageLoader() {
	return async ({ params, platform }: {
		params: { slug: string };
		platform?: { env?: { DB?: D1Database } };
	}) => {
		const { slug } = params;

		if (!platform?.env?.DB) {
			return {
				papers: [],
				category: { name: slug.charAt(0).toUpperCase() + slug.slice(1), slug, count: 0 }
			};
		}

		try {
			const result = await platform.env.DB.prepare(`
				SELECT * FROM papers
				WHERE category = ? AND published = 1 AND is_hidden = 0 AND archived = 0
				ORDER BY created_at DESC
			`).bind(slug).all();

			const papers = result.results || [];

			return {
				papers,
				category: {
					name: slug.charAt(0).toUpperCase() + slug.slice(1),
					slug,
					count: papers.length
				}
			};
		} catch (error) {
			console.error('Error fetching category from D1:', error);
			return {
				papers: [],
				category: { name: slug.charAt(0).toUpperCase() + slug.slice(1), slug, count: 0 }
			};
		}
	};
}

interface D1Database {
	prepare(query: string): D1PreparedStatement;
}

interface D1PreparedStatement {
	bind(...values: unknown[]): D1PreparedStatement;
	all<T = unknown>(): Promise<{ results: T[] }>;
}

/**
 * Create account page loader with analytics fetching.
 * 
 * Usage:
 * ```ts
 * import { createAccountPageLoader } from '@create-something/canon/auth';
 * export const load = createAccountPageLoader();
 * ```
 */
export function createAccountPageLoader() {
	return async ({ parent, cookies }: {
		parent: () => Promise<{ user?: { id: string; analytics_opt_out?: boolean } }>;
		cookies: Cookies;
	}) => {
		const { user } = await parent();

		if (!user) {
			redirect(302, '/login?redirect=/account');
		}

		// Fetch analytics from .io aggregator if user hasn't opted out
		let analytics = null;

		if (!user.analytics_opt_out) {
			try {
				const accessToken = cookies.get('cs_access_token');
				const response = await fetch('https://createsomething.io/api/user/analytics/aggregate?days=30', {
					headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {}
				});
				if (response.ok) {
					analytics = await response.json();
				}
			} catch (err) {
				console.warn('Failed to fetch user analytics:', err);
			}
		}

		return { user, analytics };
	};
}

// =============================================================================
// SIMPLE AUTHENTICATED PAGE LOADER
// =============================================================================

interface AuthenticatedPageLoaderOptions {
	/** URL to redirect to if not authenticated (default: '/login') */
	loginUrl?: string;
}

/**
 * Create a simple authenticated page loader.
 * Redirects to login if user is not authenticated.
 * 
 * This eliminates the common pattern:
 * ```ts
 * export const load = async ({ locals }) => {
 *   if (!locals.user) throw redirect(302, '/login');
 *   return { user: { email: locals.user.email } };
 * };
 * ```
 * 
 * Usage:
 * ```ts
 * import { createAuthenticatedPageLoader } from '@create-something/canon/auth';
 * export const load = createAuthenticatedPageLoader();
 * 
 * // Or with options:
 * export const load = createAuthenticatedPageLoader({
 *   loginUrl: '/auth/signin'
 * });
 * ```
 */
export function createAuthenticatedPageLoader<T extends { email: string } = { email: string }>(
	options: AuthenticatedPageLoaderOptions = {}
) {
	const { loginUrl = '/login' } = options;

	return async ({ locals }: { locals: { user?: T } }) => {
		if (!locals.user) {
			redirect(302, loginUrl);
		}

		return { 
			user: {
				email: locals.user.email
			}
		};
	};
}

interface LoginPageLoaderOptions {
	property: 'ltd' | 'io' | 'agency' | 'space' | 'lms';
}

/**
 * Create login page loader that redirects if already authenticated.
 * 
 * Usage:
 * ```ts
 * import { createLoginPageLoader } from '@create-something/canon/auth';
 * export const load = createLoginPageLoader({ property: 'ltd' });
 * ```
 */
export function createLoginPageLoader(options: LoginPageLoaderOptions) {
	const productionDomain = PROPERTY_DOMAINS[options.property];

	return async ({ url, cookies, platform }: {
		url: URL;
		cookies: Cookies;
		platform?: { env?: { ENVIRONMENT?: string } };
	}) => {
		const { createSessionManager } = await import('./session.js');
		
		const session = createSessionManager(cookies, {
			isProduction: platform?.env?.ENVIRONMENT === 'production',
			domain: productionDomain
		});

		const user = await session.getUser();
		if (user) {
			const redirectTo = url.searchParams.get('redirect') || '/';
			redirect(302, redirectTo);
		}

		return {
			redirectTo: url.searchParams.get('redirect') || '/'
		};
	};
}

interface LayoutServerLoaderOptions {
	property: 'ltd' | 'io' | 'agency' | 'space' | 'lms';
}

/**
 * Create layout server loader for getting user session.
 * 
 * Usage:
 * ```ts
 * import { createLayoutServerLoader } from '@create-something/canon/auth';
 * export const load = createLayoutServerLoader({ property: 'ltd' });
 * ```
 */
export function createLayoutServerLoader(options: LayoutServerLoaderOptions) {
	const productionDomain = PROPERTY_DOMAINS[options.property];

	return async ({ url, cookies, platform }: {
		url: URL;
		cookies: Cookies;
		platform?: { env?: { ENVIRONMENT?: string } };
	}) => {
		const { createSessionManager } = await import('./session.js');
		
		const session = createSessionManager(cookies, {
			isProduction: platform?.env?.ENVIRONMENT === 'production',
			domain: productionDomain
		});

		const user = await session.getUser();

		return {
			pathname: url.pathname,
			user
		};
	};
}
