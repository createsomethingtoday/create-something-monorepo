import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { deleteVideo, updateVideo } from '$lib/server/db/videos';
import { isAdminUser } from '$lib/server/auth';
import { getDBFromPlatform } from '$lib/server/d1-compat';

function parseTier(value: unknown): 'free' | 'preview' | 'gated' | undefined {
	if (value === 'free' || value === 'preview' || value === 'gated') return value;
	return undefined;
}

function normalizeAssetPath(path: string | undefined): string | undefined {
	if (!path) return undefined;
	const trimmed = path.trim();
	if (!trimmed) return undefined;
	if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
	return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
}

export const PATCH: RequestHandler = async ({ params, request, platform, locals }) => {
	if (!isAdminUser(locals.user)) {
		return json({ success: false, error: 'Not authorized' }, { status: 403 });
	}

	const db = getDBFromPlatform(platform);

	const id = params.id;
	if (!id) {
		return json({ success: false, error: 'Video ID is required' }, { status: 400 });
	}

	try {
		const body = await request.json();
		const hasAssetPathInput =
			Object.prototype.hasOwnProperty.call(body, 'assetPath') ||
			Object.prototype.hasOwnProperty.call(body, 'asset_path');
		const hasThumbnailPathInput =
			Object.prototype.hasOwnProperty.call(body, 'thumbnailPath') ||
			Object.prototype.hasOwnProperty.call(body, 'thumbnail_path');

		const rawAssetPath = hasAssetPathInput ? String(body.assetPath ?? body.asset_path ?? '').trim() : undefined;
		if (hasAssetPathInput && !rawAssetPath) {
			return json({ success: false, error: 'assetPath cannot be empty' }, { status: 400 });
		}

		const normalizedAssetPath = normalizeAssetPath(rawAssetPath);
		if (hasAssetPathInput && !normalizedAssetPath) {
			return json({ success: false, error: 'assetPath must be a valid URL/path' }, { status: 400 });
		}

		const rawThumbnailPath = hasThumbnailPathInput
			? String(body.thumbnailPath ?? body.thumbnail_path ?? '').trim()
			: undefined;
		const normalizedThumbnailPath = normalizeAssetPath(rawThumbnailPath);
		if (hasThumbnailPathInput && !normalizedThumbnailPath) {
			return json({ success: false, error: 'thumbnailPath must be a valid URL/path' }, { status: 400 });
		}

		const updated = await updateVideo(db, id, {
			title: body.title ? String(body.title).trim() : undefined,
			category: body.category ? String(body.category).trim() : undefined,
			episode_number:
				body.episodeNumber === undefined
					? undefined
					: body.episodeNumber === null || body.episodeNumber === ''
						? null
						: Number(body.episodeNumber),
			tier: parseTier(body.tier),
			duration:
				body.duration === undefined || body.duration === null || body.duration === ''
					? undefined
					: Math.max(1, Math.floor(Number(body.duration))),
			asset_path: normalizedAssetPath,
			thumbnail_path: normalizedThumbnailPath,
			description:
				body.description === undefined
					? undefined
					: String(body.description).trim() || null
		});

		if (!updated) {
			return json({ success: false, error: 'Video not found' }, { status: 404 });
		}

		return json({ success: true, data: updated });
	} catch (error) {
		console.error('Error updating video:', error);
		return json({ success: false, error: 'Failed to update video' }, { status: 500 });
	}
};

export const DELETE: RequestHandler = async ({ params, platform, locals }) => {
	if (!isAdminUser(locals.user)) {
		return json({ success: false, error: 'Not authorized' }, { status: 403 });
	}

	const db = getDBFromPlatform(platform);

	const id = params.id;
	if (!id) {
		return json({ success: false, error: 'Video ID is required' }, { status: 400 });
	}

	try {
		const deleted = await deleteVideo(db, id);
		if (!deleted) {
			return json({ success: false, error: 'Video not found' }, { status: 404 });
		}
		return json({ success: true });
	} catch (error) {
		console.error('Error deleting video:', error);
		return json({ success: false, error: 'Failed to delete video' }, { status: 500 });
	}
};
