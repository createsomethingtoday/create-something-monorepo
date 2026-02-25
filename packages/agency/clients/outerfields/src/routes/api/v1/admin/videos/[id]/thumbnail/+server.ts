import { randomUUID } from 'node:crypto';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { R2Bucket } from '@cloudflare/workers-types';
import { getAdminVideoById } from '$lib/server/db/videos';
import { isAdminUser } from '$lib/server/admin';
import { getDBFromPlatform } from '$lib/server/d1-compat';
import { resolveRuntimeEnv } from '$lib/server/env';
import { ImageUploadValidationError, assertValidThumbnailUpload } from '$lib/server/image-upload';

function nowSeconds(): number {
	return Math.floor(Date.now() / 1000);
}

function createThumbnailObjectKey(videoId: string, extension: string): string {
	const timestamp = Date.now();
	const suffix = randomUUID().replace(/-/g, '').slice(0, 10);
	return `thumbnails/uploads/${videoId}/${timestamp}-${suffix}.${extension}`;
}

/**
 * POST /api/v1/admin/videos/:id/thumbnail
 * Uploads a thumbnail image to R2 and updates videos.thumbnail_path.
 */
export const POST: RequestHandler = async ({ request, locals, params, platform }) => {
	const runtimeEnv = resolveRuntimeEnv(((platform as { env?: Record<string, string | undefined> } | undefined)?.env));
	const db = getDBFromPlatform(platform);

	if (!locals.user) {
		return json({ success: false, error: 'Authentication required' }, { status: 401 });
	}
	if (!isAdminUser(locals.user, runtimeEnv)) {
		return json({ success: false, error: 'Admin access required' }, { status: 403 });
	}

	const videoId = params.id?.trim();
	if (!videoId) {
		return json({ success: false, error: 'Video id is required' }, { status: 400 });
	}

	const existing = await getAdminVideoById(db, videoId);
	if (!existing) {
		return json({ success: false, error: 'Video not found' }, { status: 404 });
	}

	const bucket = (platform?.env as { VIDEO_ASSETS?: R2Bucket } | undefined)?.VIDEO_ASSETS;
	if (!bucket) {
		return json({ success: false, error: 'Video asset bucket is not configured' }, { status: 500 });
	}

	let formData: FormData;
	try {
		formData = await request.formData();
	} catch {
		return json({ success: false, error: 'Invalid multipart/form-data body' }, { status: 400 });
	}

	const fileValue = formData.get('file');
	if (!(fileValue instanceof File)) {
		return json({ success: false, error: 'Thumbnail file is required' }, { status: 400 });
	}

	try {
		const bytes = new Uint8Array(await fileValue.arrayBuffer());
		const validated = assertValidThumbnailUpload({
			mimeType: fileValue.type,
			size: fileValue.size,
			bytes
		});

		const key = createThumbnailObjectKey(existing.id, validated.extension);
		await bucket.put(key, bytes, {
			httpMetadata: {
				contentType: validated.contentType,
				cacheControl: 'public, max-age=3600'
			},
			customMetadata: {
				videoId: existing.id,
				uploadedBy: locals.user.id,
				uploadedAt: String(Date.now())
			}
		});

		const thumbnailPath = `/${key}`;
		await db
			.prepare(
				`UPDATE videos
				 SET thumbnail_path = ?,
					 updated_at = ?
				 WHERE id = ?`
			)
			.bind(thumbnailPath, nowSeconds(), existing.id)
			.run();

		const updated = await getAdminVideoById(db, existing.id);
		if (!updated) {
			return json({ success: false, error: 'Video not found after thumbnail update' }, { status: 404 });
		}

		return json({
			success: true,
			data: updated,
			upload: {
				key,
				contentType: validated.contentType,
				size: validated.size,
				width: validated.width,
				height: validated.height
			}
		});
	} catch (error) {
		if (error instanceof ImageUploadValidationError) {
			return json({ success: false, error: error.message }, { status: 400 });
		}

		const reason = error instanceof Error ? error.message : 'Failed to upload thumbnail';
		return json({ success: false, error: reason }, { status: 500 });
	}
};
