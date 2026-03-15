import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { R2Bucket } from '@cloudflare/workers-types';

function normalizeVideoObjectKey(pathParam: string | undefined): string | null {
	if (!pathParam) return null;

	let decoded = '';
	try {
		decoded = decodeURIComponent(pathParam).replace(/^\/+/, '');
	} catch {
		return null;
	}
	if (!decoded) return null;

	const segments = decoded.split('/');
	if (segments.some((segment) => !segment || segment === '.' || segment === '..')) {
		return null;
	}

	return `videos/${decoded}`;
}

function inferContentTypeFromKey(key: string): string {
	const lower = key.toLowerCase();
	if (lower.endsWith('.m3u8')) return 'application/vnd.apple.mpegurl';
	if (lower.endsWith('.mpd')) return 'application/dash+xml';
	if (lower.endsWith('.mp4')) return 'video/mp4';
	if (lower.endsWith('.mov')) return 'video/quicktime';
	if (lower.endsWith('.webm')) return 'video/webm';
	if (lower.endsWith('.m4v')) return 'video/x-m4v';
	if (lower.endsWith('.avi')) return 'video/x-msvideo';
	return 'application/octet-stream';
}

type ParsedRange =
	| { kind: 'none' }
	| { kind: 'invalid' }
	| { kind: 'range'; start: number; end: number; length: number };

function parseRangeHeader(rangeHeader: string | null, size: number): ParsedRange {
	if (!rangeHeader) return { kind: 'none' };
	if (!rangeHeader.startsWith('bytes=')) return { kind: 'invalid' };

	const value = rangeHeader.slice('bytes='.length).trim();
	if (!value || value.includes(',')) return { kind: 'invalid' };

	const [rawStart, rawEnd] = value.split('-');
	if (rawStart === undefined || rawEnd === undefined) return { kind: 'invalid' };

	if (rawStart === '') {
		const suffixLength = Number(rawEnd);
		if (!Number.isFinite(suffixLength) || suffixLength <= 0) return { kind: 'invalid' };
		const length = Math.min(Math.floor(suffixLength), size);
		const start = size - length;
		const end = size - 1;
		return { kind: 'range', start, end, length };
	}

	const start = Number(rawStart);
	if (!Number.isFinite(start) || start < 0) return { kind: 'invalid' };

	let end = rawEnd === '' ? size - 1 : Number(rawEnd);
	if (!Number.isFinite(end) || end < start) return { kind: 'invalid' };

	const normalizedStart = Math.floor(start);
	const normalizedEnd = Math.min(Math.floor(end), size - 1);
	if (normalizedStart >= size) return { kind: 'invalid' };

	return {
		kind: 'range',
		start: normalizedStart,
		end: normalizedEnd,
		length: normalizedEnd - normalizedStart + 1
	};
}

function buildBaseHeaders(
	contentType: string,
	size: number,
	etag: string | undefined,
	uploadedAt: Date | undefined
): Headers {
	const headers = new Headers();
	headers.set('Accept-Ranges', 'bytes');
	headers.set('Content-Type', contentType);
	headers.set('Cache-Control', 'public, max-age=3600');
	headers.set('Content-Length', String(size));
	if (etag) headers.set('ETag', etag);
	if (uploadedAt) headers.set('Last-Modified', uploadedAt.toUTCString());
	return headers;
}

export const HEAD: RequestHandler = async ({ params, platform }) => {
	const bucket = (platform?.env as { VIDEO_ASSETS?: R2Bucket } | undefined)?.VIDEO_ASSETS;
	if (!bucket) {
		return json({ success: false, error: 'Video asset bucket is not configured' }, { status: 500 });
	}

	const key = normalizeVideoObjectKey(params.path);
	if (!key) {
		return json({ success: false, error: 'Invalid video path' }, { status: 400 });
	}

	const object = await bucket.head(key);
	if (!object) {
		return json({ success: false, error: 'Video not found' }, { status: 404 });
	}

	const contentType = object.httpMetadata?.contentType || inferContentTypeFromKey(key);
	const headers = buildBaseHeaders(contentType, object.size, object.httpEtag, object.uploaded);
	return new Response(null, { status: 200, headers });
};

export const GET: RequestHandler = async ({ request, params, platform }) => {
	const bucket = (platform?.env as { VIDEO_ASSETS?: R2Bucket } | undefined)?.VIDEO_ASSETS;
	if (!bucket) {
		return json({ success: false, error: 'Video asset bucket is not configured' }, { status: 500 });
	}

	const key = normalizeVideoObjectKey(params.path);
	if (!key) {
		return json({ success: false, error: 'Invalid video path' }, { status: 400 });
	}

	const object = await bucket.head(key);
	if (!object) {
		return json({ success: false, error: 'Video not found' }, { status: 404 });
	}

	const contentType = object.httpMetadata?.contentType || inferContentTypeFromKey(key);
	const parsedRange = parseRangeHeader(request.headers.get('range'), object.size);

	if (parsedRange.kind === 'invalid') {
		const headers = buildBaseHeaders(contentType, object.size, object.httpEtag, object.uploaded);
		headers.set('Content-Range', `bytes */${object.size}`);
		return new Response(null, { status: 416, headers });
	}

	if (parsedRange.kind === 'range') {
		const ranged = await bucket.get(key, {
			range: { offset: parsedRange.start, length: parsedRange.length }
		});
		if (!ranged?.body) {
			return json({ success: false, error: 'Video not found' }, { status: 404 });
		}

		const headers = buildBaseHeaders(contentType, parsedRange.length, object.httpEtag, object.uploaded);
		headers.set('Content-Range', `bytes ${parsedRange.start}-${parsedRange.end}/${object.size}`);
		return new Response(ranged.body as unknown as BodyInit, { status: 206, headers });
	}

	const full = await bucket.get(key);
	if (!full?.body) {
		return json({ success: false, error: 'Video not found' }, { status: 404 });
	}

	const headers = buildBaseHeaders(contentType, object.size, object.httpEtag, object.uploaded);
	return new Response(full.body as unknown as BodyInit, { status: 200, headers });
};
