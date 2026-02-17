import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getAdminVideoById, getVideoById } from '$lib/server/db/videos';
import { isAdminUser } from '$lib/server/admin';
import {
	buildPublicHlsUrl,
	buildSignedHlsUrl,
	createStreamPlaybackToken,
	getPlaybackTokenTtlSeconds,
	getStreamCustomerCode
} from '$lib/server/stream';
import type { VideoPlaybackGrant } from '$lib/types/video-pipeline';

/**
 * GET /api/v1/videos/:id/playback
 * Returns a short-lived signed playback grant for a Stream-backed video.
 */
export const GET: RequestHandler = async ({ params, locals, platform }) => {
	const db = platform?.env.DB;
	if (!db) {
		return json({ success: false, error: 'Database not available' }, { status: 500 });
	}

	if (!locals.user) {
		return json({ success: false, error: 'Authentication required' }, { status: 401 });
	}

	const videoId = params.id;
	if (!videoId) {
		return json({ success: false, error: 'Video ID is required' }, { status: 400 });
	}

	const isAdmin = isAdminUser(locals.user, platform?.env);
	const video = isAdmin ? await getAdminVideoById(db, videoId) : await getVideoById(db, videoId);
	if (!video) {
		return json({ success: false, error: 'Video not found' }, { status: 404 });
	}

	if (!isAdmin && video.visibility !== 'published') {
		// Avoid leaking draft/archived metadata.
		return json({ success: false, error: 'Video not found' }, { status: 404 });
	}

	if (!video.stream_uid) {
		return json(
			{
				success: false,
				error: 'Video is not yet Stream-backed',
				ingestStatus: video.ingest_status,
				legacyAssetPath: video.asset_path || null
			},
			{ status: 404 }
		);
	}

	if (video.ingest_status !== 'ready') {
		const message =
			video.ingest_status === 'failed'
				? video.failure_reason || 'Video processing failed'
				: 'Video is still processing';

		return json(
			{
				success: false,
				error: message,
				ingestStatus: video.ingest_status,
				failureReason: video.failure_reason || null
			},
			{ status: 409 }
		);
	}

	try {
		const customerCode = getStreamCustomerCode(platform.env);
		const issuedAt = Math.floor(Date.now() / 1000);
		const expiresAt = issuedAt + getPlaybackTokenTtlSeconds(platform.env);

		const hlsUrl =
			video.playback_policy === 'public'
				? buildPublicHlsUrl(customerCode, video.stream_uid)
				: buildSignedHlsUrl(
						customerCode,
						(await createStreamPlaybackToken(platform.env, video.stream_uid, expiresAt)).token
					);

		const grant: VideoPlaybackGrant = {
			videoId: video.id,
			streamUid: video.stream_uid,
			hlsUrl,
			expiresAt,
			issuedAt,
			policy: video.playback_policy
		};

		return json({ success: true, data: grant });
	} catch (error) {
		return json(
			{
				success: false,
				error: error instanceof Error ? error.message : 'Failed to create playback grant'
			},
			{ status: 500 }
		);
	}
};
