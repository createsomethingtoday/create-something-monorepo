/**
 * Cross-Domain Authentication
 *
 * Shared logic for exchanging cross-domain tokens for session tokens.
 * Used across all CREATE SOMETHING properties (.agency, .io, .ltd, .space).
 *
 * Canon: DRY principle - single source of truth for cross-domain authentication.
 *
 * @packageDocumentation
 */

import type { Cookies } from '@sveltejs/kit';
import { redirect } from '@sveltejs/kit';
import { setSessionCookies } from './cookies.js';
import { identityClient } from '../api/index.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('CrossDomainExchange');

export interface CrossDomainExchangeParams {
	token: string;
	cookies: Cookies;
	domain: string;
	isProduction: boolean;
	propertyLabel: string; // e.g., '.agency', '.io', '.ltd', '.space'
	redirectTo?: string;
}

/**
 * Exchange a cross-domain token for session tokens
 *
 * @param params - Exchange parameters
 * @throws {Response} - Redirects to login on error or to destination on success
 */
export async function exchangeCrossDomainToken(
	params: CrossDomainExchangeParams
): Promise<never> {
	const { token, cookies, domain, isProduction, propertyLabel, redirectTo = '/account' } = params;

	logger.info('Cross-domain exchange starting', {
		propertyLabel,
		hasToken: !!token,
		redirectTo
	});

	if (!token) {
		logger.warn('No token provided', { propertyLabel });
		throw redirect(302, '/login?error=invalid_token');
	}

	const result = await identityClient.exchangeCrossDomainToken({ token });

	if (!result.success) {
		logger.warn('Token exchange failed', { propertyLabel, error: result.error });
		const errorMsg = encodeURIComponent(result.error || 'exchange_failed');
		throw redirect(302, `/login?error=${errorMsg}`);
	}

	logger.info('Token exchanged successfully', {
		propertyLabel,
		userId: result.data.user?.id
	});

	setSessionCookies(
		cookies,
		{
			accessToken: result.data.access_token,
			refreshToken: result.data.refresh_token,
			domain
		},
		isProduction
	);

	logger.info('Redirecting to destination', { propertyLabel, redirectTo });
	throw redirect(302, redirectTo);
}
