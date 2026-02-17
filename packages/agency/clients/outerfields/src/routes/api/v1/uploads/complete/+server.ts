import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { markVideoUploadCompleted } from '$lib/server/db/videos';
import { isAdminUser } from '$lib/server/admin';

interface CompleteUploadRequest {
	videoId: string;
}

/**
 * POST /api/v1/uploads/complete
 * Marks an upload as complete from the client side.
 */
export const POST: RequestHandler = async ({ request, locals, platform }) => {
	const db = platform?.env.DB;
	if (!db) {
		return json({ success: false, error: 'Database not available' }, { status: 500 });
	}

	if (!locals.user) {
		return json({ success: false, error: 'Authentication required' }, { status: 401 });
	}

	if (!isAdminUser(locals.user, platform?.env)) {
		return json({ success: false, error: 'Admin access required' }, { status: 403 });
	}

	let payload: CompleteUploadRequest;
	try {
		payload = (await request.json()) as CompleteUploadRequest;
	} catch {
		return json({ success: false, error: 'Invalid JSON body' }, { status: 400 });
	}

	if (!payload.videoId) {
		return json({ success: false, error: 'videoId is required' }, { status: 400 });
	}

	const video = await markVideoUploadCompleted(db, payload.videoId);
	if (!video) {
		return json({ success: false, error: 'Video not found' }, { status: 404 });
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
