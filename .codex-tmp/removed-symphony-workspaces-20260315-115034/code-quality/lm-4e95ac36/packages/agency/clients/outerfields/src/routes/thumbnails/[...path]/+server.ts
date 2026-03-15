import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { R2Bucket } from '@cloudflare/workers-types';

function normalizeThumbnailObjectKey(pathParam: string | undefined): string | null {
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

	return `thumbnails/${decoded}`;
}

function inferImageContentTypeFromKey(key: string): string {
	const lower = key.toLowerCase();
	if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
	if (lower.endsWith('.png')) return 'image/png';
	if (lower.endsWith('.webp')) return 'image/webp';
	return 'application/octet-stream';
}

function buildBaseHeaders(
	contentType: string,
	size: number,
	etag: string | undefined,
	uploadedAt: Date | undefined
): Headers {
	const headers = new Headers();
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

	const key = normalizeThumbnailObjectKey(params.path);
	if (!key) {
		return json({ success: false, error: 'Invalid thumbnail path' }, { status: 400 });
	}

	const object = await bucket.head(key);
	if (!object) {
		return json({ success: false, error: 'Thumbnail not found' }, { status: 404 });
	}

	const contentType = object.httpMetadata?.contentType || inferImageContentTypeFromKey(key);
	const headers = buildBaseHeaders(contentType, object.size, object.httpEtag, object.uploaded);
	return new Response(null, { status: 200, headers });
};

export const GET: RequestHandler = async ({ params, platform }) => {
	const bucket = (platform?.env as { VIDEO_ASSETS?: R2Bucket } | undefined)?.VIDEO_ASSETS;
	if (!bucket) {
		return json({ success: false, error: 'Video asset bucket is not configured' }, { status: 500 });
	}

	const key = normalizeThumbnailObjectKey(params.path);
	if (!key) {
		return json({ success: false, error: 'Invalid thumbnail path' }, { status: 400 });
	}

	const object = await bucket.head(key);
	if (!object) {
		return json({ success: false, error: 'Thumbnail not found' }, { status: 404 });
	}

	const bodyObject = await bucket.get(key);
	if (!bodyObject?.body) {
		return json({ success: false, error: 'Thumbnail not found' }, { status: 404 });
	}

	const contentType = object.httpMetadata?.contentType || inferImageContentTypeFromKey(key);
	const headers = buildBaseHeaders(contentType, object.size, object.httpEtag, object.uploaded);
	return new Response(bodyObject.body as unknown as BodyInit, { status: 200, headers });
};
