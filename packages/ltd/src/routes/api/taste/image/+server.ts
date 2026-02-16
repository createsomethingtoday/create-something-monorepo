import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { normalizeArenaImageUrl } from '$lib/taste/image';

const CACHE_CONTROL = 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=604800';

/**
 * Proxies Are.na-hosted images through our domain for better reliability and caching.
 * Restricts origin hosts to known Are.na image CDNs to avoid open-proxy abuse.
 */
export const GET: RequestHandler = async ({ fetch, url }) => {
	const sourceUrl = url.searchParams.get('url');
	if (!sourceUrl) {
		throw error(400, 'Missing url query parameter');
	}

	const normalizedUrl = normalizeArenaImageUrl(sourceUrl);
	if (!normalizedUrl) {
		throw error(400, 'Invalid or unsupported image URL');
	}

	let upstreamResponse: Response;
	try {
		upstreamResponse = await fetch(normalizedUrl, {
			headers: {
				Accept: 'image/*,*/*;q=0.8'
			}
		});
	} catch (err) {
		console.error('Taste image proxy fetch failed:', err);
		throw error(502, 'Failed to fetch source image');
	}

	if (!upstreamResponse.ok) {
		throw error(502, `Source image request failed (${upstreamResponse.status})`);
	}

	const contentType = upstreamResponse.headers.get('content-type');
	if (!contentType || !contentType.startsWith('image/')) {
		throw error(415, 'Source response is not an image');
	}

	const responseHeaders = new Headers();
	responseHeaders.set('Content-Type', contentType);
	responseHeaders.set('Cache-Control', CACHE_CONTROL);
	responseHeaders.set('Vary', 'Accept');
	responseHeaders.set('X-Content-Type-Options', 'nosniff');

	const contentLength = upstreamResponse.headers.get('content-length');
	if (contentLength) {
		responseHeaders.set('Content-Length', contentLength);
	}

	const etag = upstreamResponse.headers.get('etag');
	if (etag) {
		responseHeaders.set('ETag', etag);
	}

	const lastModified = upstreamResponse.headers.get('last-modified');
	if (lastModified) {
		responseHeaders.set('Last-Modified', lastModified);
	}

	return new Response(upstreamResponse.body, {
		status: 200,
		headers: responseHeaders
	});
};
