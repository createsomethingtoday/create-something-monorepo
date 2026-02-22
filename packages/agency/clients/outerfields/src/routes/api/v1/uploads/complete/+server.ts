import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getAdminVideoById, markVideoUploadCompleted } from '$lib/server/db/videos';
import { isAdminUser } from '$lib/server/admin';
import { getDBFromPlatform } from '$lib/server/d1-compat';
import { resolveRuntimeEnv } from '$lib/server/env';

interface CompleteUploadRequest {
	videoId: string;
}

/**
 * POST /api/v1/uploads/complete
 * Marks an upload as complete from the client side.
 */
export const POST: RequestHandler = async ({ request, locals, platform }) => {
	const runtimeEnv = resolveRuntimeEnv(((platform as { env?: Record<string, string | undefined> } | undefined)?.env));
	const db = getDBFromPlatform(platform);

	if (!locals.user) {
		return json({ success: false, error: 'Authentication required' }, { status: 401 });
	}

	if (!isAdminUser(locals.user, runtimeEnv)) {
		return json({ success: false, error: 'Admin access required' }, { status: 403 });
	}

	let payload: CompleteUploadRequest;
	try {
		payload = (await request.json()) as CompleteUploadRequest;
	} catch {
		return json({ success: false, error: 'Invalid JSON body' }, { status: 400 });
	}

	const videoId = payload.videoId?.trim();
	if (!videoId) {
		return json({ success: false, error: 'videoId is required' }, { status: 400 });
	}

	const existing = await getAdminVideoById(db, videoId);
	if (!existing) {
		return json({ success: false, error: 'Video not found' }, { status: 404 });
	}

	if (!existing.stream_uid?.trim()) {
		return json(
			{
				success: false,
				error: 'Video upload is missing stream_uid and cannot be completed',
				ingestStatus: existing.ingest_status
			},
			{ status: 409 }
		);
	}

	if (existing.ingest_status === 'failed') {
		return json(
			{
				success: false,
				error: existing.failure_reason || 'Video upload has failed and cannot be completed',
				ingestStatus: existing.ingest_status
			},
			{ status: 409 }
		);
	}

	let video = existing;
	if (existing.ingest_status === 'pending_upload') {
		const updated = await markVideoUploadCompleted(db, videoId);
		if (!updated) {
			return json({ success: false, error: 'Video not found' }, { status: 404 });
		}
		video = updated;
	}

	return json({
		success: true,
		data: {
			videoId: video.id,
			ingestStatus: video.ingest_status,
			streamUid: video.stream_uid,
			updatedAt: video.updated_at
		}
	});
};
