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
import { IDENTITY_API } from './index.js';
import { setSessionCookies } from './cookies.js';
import type { ExchangeResponse, ErrorResponse } from './types.js';

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

	console.log(`[Cross-Domain Exchange ${propertyLabel}] Starting`, {
		hasToken: !!token,
		tokenLength: token?.length,
		redirectTo,
	});

	if (!token) {
		console.log(`[Cross-Domain Exchange ${propertyLabel}] No token provided`);
		throw redirect(302, '/login?error=invalid_token');
	}

	try {
		// Exchange cross-domain token for session tokens
		console.log(`[Cross-Domain Exchange ${propertyLabel}] Calling identity-worker...`);
		const response = await fetch(`${IDENTITY_API}/v1/auth/cross-domain/exchange`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ token }),
		});

		console.log(`[Cross-Domain Exchange ${propertyLabel}] Identity response status:`, response.status);

		if (!response.ok) {
			const errorResult = (await response.json()) as ErrorResponse;
			console.log(`[Cross-Domain Exchange ${propertyLabel}] Identity error:`, errorResult);
			const errorMsg = encodeURIComponent(errorResult.error || 'exchange_failed');
			throw redirect(302, `/login?error=${errorMsg}`);
		}

		const result = (await response.json()) as ExchangeResponse;
		console.log(`[Cross-Domain Exchange ${propertyLabel}] Token exchanged successfully`, {
			hasAccessToken: !!result.access_token,
			hasRefreshToken: !!result.refresh_token,
			userId: result.user?.id,
		});

		// Set session cookies
		console.log(`[Cross-Domain Exchange ${propertyLabel}] Setting cookies`, {
			isProduction,
			domain,
		});

		setSessionCookies(
			cookies,
			{
				accessToken: result.access_token,
				refreshToken: result.refresh_token,
				domain,
			},
			isProduction
		);

		console.log(`[Cross-Domain Exchange ${propertyLabel}] Redirecting to:`, redirectTo);

		// Redirect to final destination
		throw redirect(302, redirectTo);
	} catch (err) {
		// If it's already a redirect, re-throw it
		if (err instanceof Response || (err as { status?: number }).status === 302) {
			throw err;
		}

		console.error(`[Cross-Domain Exchange ${propertyLabel}] Error:`, err);
		throw redirect(302, '/login?error=exchange_failed');
	}
}
