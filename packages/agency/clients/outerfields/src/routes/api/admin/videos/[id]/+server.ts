import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { deleteVideo, updateVideo } from '$lib/server/db/videos';
import { isAdminUser } from '$lib/server/auth';

function parseTier(value: unknown): 'free' | 'preview' | 'gated' | undefined {
	if (value === 'free' || value === 'preview' || value === 'gated') return value;
	return undefined;
}

function normalizeAssetPath(path: string | undefined): string | undefined {
	if (!path) return path;
	if (path.startsWith('http://') || path.startsWith('https://')) return path;
	return path.startsWith('/') ? path : `/${path}`;
}

export const PATCH: RequestHandler = async ({ params, request, platform, locals }) => {
	if (!isAdminUser(locals.user)) {
		return json({ success: false, error: 'Not authorized' }, { status: 403 });
	}

	const db = platform?.env.DB;
	if (!db) {
		return json({ success: false, error: 'Database not available' }, { status: 500 });
	}

	const id = params.id;
	if (!id) {
		return json({ success: false, error: 'Video ID is required' }, { status: 400 });
	}

	try {
		const body = await request.json();
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
			asset_path: normalizeAssetPath(
				body.assetPath ? String(body.assetPath).trim() : undefined
			),
			thumbnail_path: normalizeAssetPath(
				body.thumbnailPath ? String(body.thumbnailPath).trim() : undefined
			),
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

	const db = platform?.env.DB;
	if (!db) {
		return json({ success: false, error: 'Database not available' }, { status: 500 });
	}

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
