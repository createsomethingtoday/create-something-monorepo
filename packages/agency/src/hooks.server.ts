import { redirect, type Handle } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';
import { createAuthHooks } from '@create-something/canon/auth';
import { abundanceApiAuthHandle } from './lib/server/abundance-api-auth';
import {
	createPublicHtmlCacheKey,
	isCacheablePublicHtmlResponse,
	shouldAttemptPublicHtmlCache,
	withPublicHtmlCacheHeaders
} from './lib/server/public-html-cache';

/**
 * Redirects for deprecated routes (post-MCP pivot)
 */
const deprecatedRedirects: Record<string, string> = {
	'/categories': '/services',
	'/category': '/services',
	'/work': '/',
	'/discover': '/'
};

const redirectHandle: Handle = async ({ event, resolve }) => {
	const path = event.url.pathname;

	// Check exact matches first
	if (deprecatedRedirects[path]) {
		throw redirect(301, deprecatedRedirects[path]);
	}

	// Check prefix matches for nested routes
	for (const [prefix, target] of Object.entries(deprecatedRedirects)) {
		if (path.startsWith(prefix + '/')) {
			throw redirect(301, target);
		}
	}

	return resolve(event);
};

const authHandle = createAuthHooks({
	protectedPaths: ['/account', '/dashboard', '/admin', '/mcp-access'],
	loginPath: '/login',
	includeRedirect: true,
}) as Handle;

const publicHtmlCacheHandle: Handle = async ({ event, resolve }) => {
	const shouldAttemptCache = shouldAttemptPublicHtmlCache({
		method: event.request.method,
		pathname: event.url.pathname,
		search: event.url.search,
		headers: event.request.headers
	});

	const edgeCache = event.platform?.caches?.default;
	if (!shouldAttemptCache || !edgeCache) {
		return resolve(event);
	}

	const cacheKey = createPublicHtmlCacheKey(event.request);
	const cached = await edgeCache.match(cacheKey);
	if (cached) {
		return withPublicHtmlCacheHeaders(cached, 'HIT');
	}

	const response = await resolve(event);
	if (!isCacheablePublicHtmlResponse(response)) {
		return response;
	}

	const cacheableResponse = withPublicHtmlCacheHeaders(response, 'MISS');
	event.platform?.context?.waitUntil(
		edgeCache.put(cacheKey, cacheableResponse.clone()).catch((error: unknown) => {
			console.error('Failed to write public HTML response to edge cache:', error);
		})
	);

	return cacheableResponse;
};

export const handle = sequence(redirectHandle, authHandle, abundanceApiAuthHandle, publicHtmlCacheHandle);
