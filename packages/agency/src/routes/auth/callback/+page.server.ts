import { error, redirect } from '@sveltejs/kit';
import {
	consumeAuth0StateCookies,
	exchangeAuth0Code,
	getAuth0Config,
	getDomainConfig,
	setSessionCookies,
} from '@create-something/canon/auth';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url, cookies, platform, request }) => {
	const config = getAuth0Config(platform?.env);
	if (!config) {
		throw error(503, 'Portal sign-in is not configured');
	}

	const authError = url.searchParams.get('error');
	if (authError) {
		throw redirect(302, `/login?error=${encodeURIComponent(authError)}`);
	}

	const code = url.searchParams.get('code');
	const state = url.searchParams.get('state');
	if (!code || !state) {
		throw redirect(302, '/login?error=missing_callback_params');
	}

	const domainConfig = getDomainConfig(platform?.env?.ENVIRONMENT);
	const stored = consumeAuth0StateCookies(cookies, {
		isProduction: domainConfig.isProduction,
		domain: domainConfig.domain,
	});

	if (!stored.state || stored.state !== state) {
		throw redirect(302, '/login?error=invalid_state');
	}

	const callbackUrl = resolveAuth0RedirectUri(request.url, platform?.env);
	const tokenResponse = await exchangeAuth0Code({
		config,
		code,
		redirectUri: callbackUrl,
	});

	if (!tokenResponse.id_token) {
		throw redirect(
			302,
			`/login?error=${encodeURIComponent(tokenResponse.error_description || tokenResponse.error || 'token_exchange_failed')}`
		);
	}

	// For managed property sessions, the cookie stores the identity JWT (`id_token`).
	// This token carries the user claims our shared session manager reads for portal auth.
	setSessionCookies(
		cookies,
		{
			accessToken: tokenResponse.id_token,
			refreshToken: tokenResponse.refresh_token,
			domain: domainConfig.domain,
		},
		domainConfig.isProduction
	);

	throw redirect(302, stored.redirectTo || '/');
};

function resolveAuth0RedirectUri(requestUrl: string, env?: App.Platform['env']) {
	const explicit = env?.AUTH0_REDIRECT_URI?.trim();
	if (explicit) {
		return explicit.replace(/\/+$/, '');
	}
	return new URL('/auth/callback', requestUrl).toString();
}
