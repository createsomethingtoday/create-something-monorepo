import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { normalizeArenaImageUrl } from '$lib/taste/image';

const CACHE_CONTROL =
	'public, max-age=2592000, s-maxage=2592000, stale-while-revalidate=604800, immutable';

function parseBoundedInt(
	value: string | null,
	min: number,
	max: number
): number | undefined {
	if (!value) {
		return undefined;
	}

	const parsed = Number.parseInt(value, 10);
	if (!Number.isFinite(parsed)) {
		return undefined;
	}

	return Math.min(max, Math.max(min, parsed));
}

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

	const width = parseBoundedInt(url.searchParams.get('w'), 240, 2400);
	const quality = parseBoundedInt(url.searchParams.get('q'), 40, 90) ?? 68;
	const dpr = parseBoundedInt(url.searchParams.get('dpr'), 1, 3) ?? 1;
	const transformedWidth = width ? width * dpr : undefined;

	const baseRequestInit: RequestInit = {
		headers: {
			Accept: 'image/avif,image/webp,image/*,*/*;q=0.8'
		}
	};

	const transformedRequestInit: RequestInit = transformedWidth
		? {
				...baseRequestInit,
				cf: {
					image: {
						width: transformedWidth,
						quality,
						fit: 'scale-down',
						format: 'auto'
					}
				} as { image: Record<string, unknown> }
			}
		: baseRequestInit;

	let upstreamResponse: Response;
	try {
		upstreamResponse = await fetch(normalizedUrl, transformedRequestInit);

		// If image transforms are unavailable in this runtime, fall back gracefully.
		if (transformedWidth && !upstreamResponse.ok) {
			upstreamResponse = await fetch(normalizedUrl, baseRequestInit);
		}
	} catch (err) {
		if (transformedWidth) {
			try {
				upstreamResponse = await fetch(normalizedUrl, baseRequestInit);
			} catch (fallbackErr) {
				console.error('Taste image proxy fetch failed:', fallbackErr);
				throw error(502, 'Failed to fetch source image');
			}
		} else {
			console.error('Taste image proxy fetch failed:', err);
			throw error(502, 'Failed to fetch source image');
		}
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
