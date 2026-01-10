/**
 * Auth Handler Utilities
 *
 * Shared utilities for authentication endpoints to eliminate duplication.
 * Follows DRY principle across login, signup, and magic-link endpoints.
 */

import type { Cookies } from '@sveltejs/kit';
import { json } from '@sveltejs/kit';
import { setSessionCookies, type TokenResponse, type User } from './cookies.js';
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
