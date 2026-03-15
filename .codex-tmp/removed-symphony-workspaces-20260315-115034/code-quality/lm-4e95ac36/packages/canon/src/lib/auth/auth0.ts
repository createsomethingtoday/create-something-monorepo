import type { Cookies } from '@sveltejs/kit';
import type { Auth0ProviderConfig } from './types.js';

export type Auth0Config = Omit<Auth0ProviderConfig, 'type'>;

export interface Auth0EnvLike {
	AUTH0_DOMAIN?: string;
	AUTH0_CLIENT_ID?: string;
	AUTH0_CLIENT_SECRET?: string;
	AUTH0_AUDIENCE?: string;
	AUTH0_SCOPE?: string;
	AUTH0_ISSUER_BASE_URL?: string;
	AUTH0_JWKS_URL?: string;
	AUTH0_CLAIMS_NAMESPACE?: string;
	AUTH0_REDIRECT_URI?: string;
}

export interface Auth0TokenResponse {
	access_token?: string;
	refresh_token?: string;
	id_token?: string;
	expires_in?: number;
	token_type?: string;
	error?: string;
	error_description?: string;
}

const DEFAULT_SCOPE = 'openid profile email offline_access';
const DEFAULT_NAMESPACE = 'https://createsomething.agency';
const STATE_COOKIE = 'cs_auth_state';
const REDIRECT_COOKIE = 'cs_auth_redirect';

function normalizeDomain(value: string): string {
	return value.replace(/^https?:\/\//, '').replace(/\/+$/, '');
}

export function getAuth0Config(env?: Auth0EnvLike | null): Auth0ProviderConfig | null {
	if (!env?.AUTH0_DOMAIN || !env.AUTH0_CLIENT_ID) return null;

	const domain = normalizeDomain(env.AUTH0_DOMAIN);
	const issuer = (env.AUTH0_ISSUER_BASE_URL ?? `https://${domain}`).replace(/\/+$/, '');
	const jwksUrl = env.AUTH0_JWKS_URL ?? `${issuer}/.well-known/jwks.json`;

	return {
		type: 'auth0',
		domain,
		clientId: env.AUTH0_CLIENT_ID,
		clientSecret: env.AUTH0_CLIENT_SECRET,
		audience: env.AUTH0_AUDIENCE,
		scope: env.AUTH0_SCOPE ?? DEFAULT_SCOPE,
		issuer,
		jwksUrl,
		claimsNamespace: (env.AUTH0_CLAIMS_NAMESPACE ?? DEFAULT_NAMESPACE).replace(/\/+$/, '')
	};
}

export function resolveAuth0RedirectUri(requestUrl: string, env?: Auth0EnvLike | null): string {
	const explicit = env?.AUTH0_REDIRECT_URI?.trim();
	if (explicit) {
		return explicit.replace(/\/+$/, '');
	}

	return new URL('/auth/callback', requestUrl).toString();
}

export function buildAuth0AuthorizeUrl(params: {
	config: Auth0Config;
	redirectUri: string;
	state: string;
	screenHint?: 'login' | 'signup';
}): string {
	const url = new URL(`https://${params.config.domain}/authorize`);
	url.searchParams.set('response_type', 'code');
	url.searchParams.set('client_id', params.config.clientId);
	url.searchParams.set('redirect_uri', params.redirectUri);
	url.searchParams.set('scope', params.config.scope);
	url.searchParams.set('state', params.state);
	if (shouldSendAudience(params.config)) url.searchParams.set('audience', params.config.audience!);
	if (params.screenHint === 'signup') url.searchParams.set('screen_hint', 'signup');
	return url.toString();
}

export function buildAuth0LogoutUrl(params: {
	config: Auth0Config;
	returnTo: string;
}): string {
	const url = new URL(`https://${params.config.domain}/v2/logout`);
	url.searchParams.set('client_id', params.config.clientId);
	url.searchParams.set('returnTo', params.returnTo);
	return url.toString();
}

function shouldSendAudience(config: Auth0Config): boolean {
	if (!config.audience) return false;

	// Browser sign-in for the property session only needs an ID token. Treat the Management API
	// audience as a misconfiguration so login still works when that secret drifts into Pages.
	return config.audience !== `https://${config.domain}/api/v2/`;
}

export async function exchangeAuth0Code(params: {
	config: Auth0Config;
	code: string;
	redirectUri: string;
}): Promise<Auth0TokenResponse> {
	if (!params.config.clientSecret) {
		throw new Error('Auth0 client secret is not configured');
	}

	const response = await fetch(`https://${params.config.domain}/oauth/token`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			grant_type: 'authorization_code',
			client_id: params.config.clientId,
			client_secret: params.config.clientSecret,
			code: params.code,
			redirect_uri: params.redirectUri
		})
	});

	return (await response.json()) as Auth0TokenResponse;
}

export async function refreshAuth0Tokens(params: {
	config: Auth0Config;
	refreshToken: string;
}): Promise<Auth0TokenResponse> {
	if (!params.config.clientSecret) {
		throw new Error('Auth0 client secret is not configured');
	}

	const response = await fetch(`https://${params.config.domain}/oauth/token`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			grant_type: 'refresh_token',
			client_id: params.config.clientId,
			client_secret: params.config.clientSecret,
			refresh_token: params.refreshToken
		})
	});

	return (await response.json()) as Auth0TokenResponse;
}

export async function revokeAuth0RefreshToken(params: {
	config: Auth0Config;
	refreshToken: string;
}): Promise<boolean> {
	if (!params.config.clientSecret) return false;

	const response = await fetch(`https://${params.config.domain}/oauth/revoke`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			client_id: params.config.clientId,
			client_secret: params.config.clientSecret,
			token: params.refreshToken
		})
	});

	return response.ok;
}

export function generateAuthState(): string {
	const bytes = crypto.getRandomValues(new Uint8Array(24));
	return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function setAuth0StateCookies(
	cookies: Cookies,
	params: {
		state: string;
		redirectTo: string;
		isProduction: boolean;
		domain?: string;
	}
): void {
	const cookieOptions = {
		httpOnly: true,
		secure: params.isProduction,
		sameSite: 'lax' as const,
		path: '/',
		maxAge: 10 * 60,
		...(params.domain ? { domain: params.domain } : {})
	};

	cookies.set(STATE_COOKIE, params.state, cookieOptions);
	cookies.set(REDIRECT_COOKIE, params.redirectTo, cookieOptions);
}

export function consumeAuth0StateCookies(
	cookies: Cookies,
	params: { isProduction: boolean; domain?: string }
): { state?: string; redirectTo?: string } {
	const state = cookies.get(STATE_COOKIE);
	const redirectTo = cookies.get(REDIRECT_COOKIE);
	const clearOptions = {
		httpOnly: true,
		secure: params.isProduction,
		sameSite: 'lax' as const,
		path: '/',
		maxAge: 0,
		...(params.domain ? { domain: params.domain } : {})
	};

	cookies.set(STATE_COOKIE, '', clearOptions);
	cookies.set(REDIRECT_COOKIE, '', clearOptions);

	return { state, redirectTo };
}
