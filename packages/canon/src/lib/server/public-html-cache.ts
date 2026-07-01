import type { Handle } from '@sveltejs/kit';

export const DEFAULT_PUBLIC_HTML_CACHE_CONTROL =
	'public, max-age=60, s-maxage=300, stale-while-revalidate=86400';
export const DEFAULT_PUBLIC_HTML_CACHE_STATUS_HEADER = 'X-Create-Something-Edge-Cache';

const DEFAULT_UNCACHED_PATH_PREFIXES = [
	'/account',
	'/admin',
	'/api',
	'/auth',
	'/dashboard',
	'/login',
	'/logout',
	'/mcp-access',
	'/profile',
	'/settings',
	'/verify'
];

export type PublicHtmlCacheStatus = 'BYPASS' | 'HIT' | 'MISS';

export interface PublicHtmlCacheDecisionInput {
	method: string;
	pathname: string;
	search: string;
	headers: Headers;
	uncachedPathPrefixes?: string[];
}

export interface PublicHtmlCacheOptions {
	cacheControl?: string;
	statusHeader?: string;
	uncachedPathPrefixes?: string[];
}

interface CloudflareCachePlatform {
	caches?: {
		default?: Cache;
	};
	context?: {
		waitUntil?: (promise: Promise<unknown>) => void;
	};
}

export function shouldAttemptPublicHtmlCache(input: PublicHtmlCacheDecisionInput): boolean {
	if (input.method !== 'GET') {
		return false;
	}

	if (input.search) {
		return false;
	}

	if (input.headers.has('authorization') || input.headers.has('cookie')) {
		return false;
	}

	const uncachedPathPrefixes = input.uncachedPathPrefixes ?? DEFAULT_UNCACHED_PATH_PREFIXES;
	return !uncachedPathPrefixes.some((prefix) => isPathAtOrBelow(input.pathname, prefix));
}

export function createPublicHtmlCacheKey(request: Request): Request {
	return new Request(request.url, { method: 'GET' });
}

export function withPublicHtmlCacheHeaders(
	response: Response,
	status: PublicHtmlCacheStatus,
	options: PublicHtmlCacheOptions = {}
): Response {
	const headers = new Headers(response.headers);
	headers.set('Cache-Control', options.cacheControl ?? DEFAULT_PUBLIC_HTML_CACHE_CONTROL);
	headers.set(options.statusHeader ?? DEFAULT_PUBLIC_HTML_CACHE_STATUS_HEADER, status);

	return new Response(response.body, {
		status: response.status,
		statusText: response.statusText,
		headers
	});
}

export function isCacheablePublicHtmlResponse(response: Response): boolean {
	if (response.status !== 200) {
		return false;
	}

	if (response.headers.has('set-cookie')) {
		return false;
	}

	const cacheControl = response.headers.get('cache-control')?.toLowerCase() ?? '';
	if (cacheControl.includes('no-store') || cacheControl.includes('private')) {
		return false;
	}

	const contentType = response.headers.get('content-type')?.toLowerCase() ?? '';
	return contentType.startsWith('text/html');
}

export function createPublicHtmlCacheHandle(options: PublicHtmlCacheOptions = {}): Handle {
	return async ({ event, resolve }) => {
		const shouldAttemptCache = shouldAttemptPublicHtmlCache({
			method: event.request.method,
			pathname: event.url.pathname,
			search: event.url.search,
			headers: event.request.headers,
			uncachedPathPrefixes: options.uncachedPathPrefixes
		});

		const platform = event.platform as CloudflareCachePlatform | undefined;
		const edgeCache = platform?.caches?.default;
		if (!shouldAttemptCache || !edgeCache) {
			return resolve(event);
		}

		const cacheKey = createPublicHtmlCacheKey(event.request);
		const cached = await edgeCache.match(cacheKey);
		if (cached) {
			return withPublicHtmlCacheHeaders(cached, 'HIT', options);
		}

		const response = await resolve(event);
		if (!isCacheablePublicHtmlResponse(response)) {
			return response;
		}

		const cacheableResponse = withPublicHtmlCacheHeaders(response, 'MISS', options);
		platform?.context?.waitUntil?.(
			edgeCache.put(cacheKey, cacheableResponse.clone()).catch((error: unknown) => {
				console.error('Failed to write public HTML response to edge cache:', error);
			})
		);

		return cacheableResponse;
	};
}

function isPathAtOrBelow(pathname: string, prefix: string): boolean {
	return pathname === prefix || pathname.startsWith(`${prefix}/`);
}
