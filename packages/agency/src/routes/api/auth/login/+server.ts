import { redirect, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	buildAuth0AuthorizeUrl,
	generateAuthState,
	getAuth0Config,
	getDomainConfig,
	setAuth0StateCookies,
} from '@create-something/canon/auth';

export const GET: RequestHandler = async ({ url, cookies, platform, request }) => {
	const config = getAuth0Config(platform?.env);
	if (!config) {
		return json({ error: 'Auth0 is not configured' }, { status: 503 });
	}

	const state = generateAuthState();
	const redirectTo = url.searchParams.get('redirect') || '/';
	const screenHint = url.searchParams.get('screen_hint') === 'signup' ? 'signup' : 'login';
	const domainConfig = getDomainConfig(platform?.env?.ENVIRONMENT);
	const callbackUrl = new URL('/auth/callback', request.url).toString();

	setAuth0StateCookies(cookies, {
		state,
		redirectTo,
		isProduction: domainConfig.isProduction,
		domain: domainConfig.domain,
	});

	redirect(
		302,
		buildAuth0AuthorizeUrl({
			config,
			redirectUri: callbackUrl,
			state,
			screenHint,
		})
	);
};

export const POST: RequestHandler = async () => {
	return json(
		{ error: 'Email/password login has been replaced by Auth0. Use GET /api/auth/login.' },
		{ status: 405 }
	);
};
