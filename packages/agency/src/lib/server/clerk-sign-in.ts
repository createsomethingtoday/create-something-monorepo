const DEFAULT_CLERK_REDIRECT_URL = 'https://ona-agent-chat.pages.dev/agents';

type EnvLike = Record<string, unknown> | undefined;

function readFirstEnv(env: EnvLike, keys: string[]) {
	for (const key of keys) {
		const rawValue = env?.[key];
		const value = typeof rawValue === 'string' ? rawValue.trim() : '';
		if (value) {
			return value;
		}
	}

	return null;
}

function isLocalhost(hostname: string) {
	return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]';
}

function isCreateSomethingHost(hostname: string) {
	return hostname === 'createsomething.agency' || hostname.endsWith('.createsomething.agency');
}

function isOnaAgentsHost(hostname: string) {
	return hostname === 'ona-agent-chat.pages.dev' || hostname.endsWith('.ona-agent-chat.pages.dev');
}

export function readClerkPublishableKey(env: EnvLike) {
	return readFirstEnv(env, [
		'CLERK_PUBLISHABLE_KEY',
		'PUBLIC_CLERK_PUBLISHABLE_KEY',
		'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
		'VITE_CLERK_PUBLISHABLE_KEY'
	]);
}

export function readClerkFrontendApiUrl(env: EnvLike) {
	return readFirstEnv(env, ['CLERK_FRONTEND_API_URL', 'NEXT_PUBLIC_CLERK_FRONTEND_API_URL']);
}

export function readClerkSignUpUrl(env: EnvLike) {
	return readFirstEnv(env, ['CLERK_SIGN_UP_URL', 'PUBLIC_CLERK_SIGN_UP_URL']);
}

export function readClerkFallbackRedirectUrl(env: EnvLike) {
	return readFirstEnv(env, ['CLERK_SIGN_IN_FALLBACK_REDIRECT_URL']) ?? DEFAULT_CLERK_REDIRECT_URL;
}

export function isAllowedClerkRedirect(target: URL, currentOrigin: string) {
	if (target.origin === currentOrigin) {
		return true;
	}

	if (target.protocol !== 'https:') {
		return isLocalhost(target.hostname) && target.protocol === 'http:';
	}

	return isCreateSomethingHost(target.hostname) || isOnaAgentsHost(target.hostname);
}

export function normalizeClerkRedirectUrl(rawValue: string | null, baseUrl: URL, fallbackUrl: string) {
	const candidate = rawValue?.trim() || fallbackUrl;

	try {
		const target = new URL(candidate, baseUrl.origin);
		const fallback = new URL(fallbackUrl, baseUrl.origin);

		if (isAllowedClerkRedirect(target, baseUrl.origin)) {
			return target.toString();
		}

		return fallback.toString();
	} catch {
		return new URL(DEFAULT_CLERK_REDIRECT_URL).toString();
	}
}

export interface ClerkSignInRouteState {
	publishableKey: string | null;
	frontendApiUrl: string | null;
	redirectUrl: string;
	signUpUrl: string | null;
	canonicalUrl: string | null;
}

export function getClerkSignInRouteState(url: URL, env: EnvLike): ClerkSignInRouteState {
	const fallbackRedirectUrl = normalizeClerkRedirectUrl(
		readClerkFallbackRedirectUrl(env),
		url,
		DEFAULT_CLERK_REDIRECT_URL
	);
	const rawRedirectUrl = url.searchParams.get('redirect_url') ?? url.searchParams.get('redirect');
	const redirectUrl = normalizeClerkRedirectUrl(rawRedirectUrl, url, fallbackRedirectUrl);
	const canonical = new URL(url);
	const currentRedirectUrl = url.searchParams.get('redirect_url');
	const hasLegacyRedirect = url.searchParams.has('redirect');

	canonical.searchParams.delete('redirect');
	canonical.searchParams.set('redirect_url', redirectUrl);

	return {
		publishableKey: readClerkPublishableKey(env),
		frontendApiUrl: readClerkFrontendApiUrl(env),
		redirectUrl,
		signUpUrl: readClerkSignUpUrl(env),
		canonicalUrl:
			hasLegacyRedirect || currentRedirectUrl !== redirectUrl ? canonical.toString() : null
	};
}
