import { describe, expect, it, vi } from 'vitest';
import {
	createPublicHtmlCacheHandle,
	isCacheablePublicHtmlResponse,
	shouldAttemptPublicHtmlCache,
	withPublicHtmlCacheHeaders
} from './public-html-cache.js';

function cacheDecision(overrides: Partial<Parameters<typeof shouldAttemptPublicHtmlCache>[0]> = {}) {
	return shouldAttemptPublicHtmlCache({
		method: 'GET',
		pathname: '/',
		search: '',
		headers: new Headers(),
		...overrides
	});
}

describe('public HTML cache policy', () => {
	it('allows anonymous canonical public GETs', () => {
		expect(cacheDecision()).toBe(true);
		expect(cacheDecision({ pathname: '/services' })).toBe(true);
		expect(cacheDecision({ pathname: '/experiments/example-paper' })).toBe(true);
	});

	it('skips personalized or high-variance requests', () => {
		expect(cacheDecision({ method: 'POST' })).toBe(false);
		expect(cacheDecision({ search: '?utm_source=newsletter' })).toBe(false);
		expect(cacheDecision({ headers: new Headers({ cookie: 'session=abc' }) })).toBe(false);
		expect(cacheDecision({ headers: new Headers({ authorization: 'Bearer token' }) })).toBe(false);
	});

	it('skips protected and API routes', () => {
		expect(cacheDecision({ pathname: '/api/contact' })).toBe(false);
		expect(cacheDecision({ pathname: '/admin' })).toBe(false);
		expect(cacheDecision({ pathname: '/admin/security' })).toBe(false);
		expect(cacheDecision({ pathname: '/dashboard' })).toBe(false);
		expect(cacheDecision({ pathname: '/login' })).toBe(false);
		expect(cacheDecision({ pathname: '/mcp-access/tools' })).toBe(false);
	});

	it('supports app-specific protected paths', () => {
		expect(cacheDecision({ pathname: '/learn', uncachedPathPrefixes: ['/learn'] })).toBe(false);
		expect(cacheDecision({ pathname: '/data/nba/clutch', uncachedPathPrefixes: ['/data/nba'] })).toBe(false);
	});

	it('only stores successful public HTML responses', () => {
		expect(
			isCacheablePublicHtmlResponse(new Response('<!doctype html>', { headers: { 'content-type': 'text/html' } }))
		).toBe(true);
		expect(
			isCacheablePublicHtmlResponse(new Response('missing', { status: 404, headers: { 'content-type': 'text/html' } }))
		).toBe(false);
		expect(isCacheablePublicHtmlResponse(new Response('{}', { headers: { 'content-type': 'application/json' } }))).toBe(
			false
		);
		expect(
			isCacheablePublicHtmlResponse(
				new Response('<!doctype html>', {
					headers: { 'content-type': 'text/html', 'set-cookie': 'session=abc' }
				})
			)
		).toBe(false);
		expect(
			isCacheablePublicHtmlResponse(
				new Response('<!doctype html>', {
					headers: { 'cache-control': 'private', 'content-type': 'text/html' }
				})
			)
		).toBe(false);
	});

	it('marks edge cache status and ttl', () => {
		const response = withPublicHtmlCacheHeaders(
			new Response('<!doctype html>', { headers: { 'content-type': 'text/html' } }),
			'MISS',
			{ statusHeader: 'X-Test-Edge-Cache' }
		);

		expect(response.headers.get('x-test-edge-cache')).toBe('MISS');
		expect(response.headers.get('cache-control')).toBe('public, max-age=60, s-maxage=300, stale-while-revalidate=86400');
	});

	it('wraps SvelteKit handle responses with cache lookup and asynchronous write', async () => {
		const match = vi.fn().mockResolvedValue(null);
		const put = vi.fn().mockResolvedValue(undefined);
		const waitUntil = vi.fn();
		const resolve = vi
			.fn()
			.mockResolvedValue(new Response('<!doctype html>', { headers: { 'content-type': 'text/html' } }));
		const handle = createPublicHtmlCacheHandle({ statusHeader: 'X-Test-Edge-Cache' });

		const response = await handle({
			event: {
				request: new Request('https://createsomething.io/'),
				url: new URL('https://createsomething.io/'),
				platform: {
					caches: { default: { match, put } },
					context: { waitUntil }
				}
			} as never,
			resolve
		});

		expect(match).toHaveBeenCalledOnce();
		expect(resolve).toHaveBeenCalledOnce();
		expect(waitUntil).toHaveBeenCalledOnce();
		expect(put).toHaveBeenCalledOnce();
		expect(response.headers.get('x-test-edge-cache')).toBe('MISS');
	});
});
