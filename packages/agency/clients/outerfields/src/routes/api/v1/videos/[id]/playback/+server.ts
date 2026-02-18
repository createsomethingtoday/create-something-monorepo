import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDBFromPlatform } from '$lib/server/d1-compat';
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
import { resolveRuntimeEnv } from '$lib/server/env';

/**
 * GET /api/v1/videos/:id/playback
 * Returns a short-lived playback grant for Stream-backed videos (with legacy fallback).
 */
export const GET: RequestHandler = async ({ params, locals, platform }) => {
	const runtimeEnv = resolveRuntimeEnv(((platform as { env?: Record<string, string | undefined> } | undefined)?.env));
	const db = getDBFromPlatform(platform);

	const videoId = params.id;
	if (!videoId) {
		return json({ success: false, error: 'Video ID is required' }, { status: 400 });
	}

	const isAdmin = isAdminUser(locals.user, runtimeEnv);
	const video = isAdmin ? await getAdminVideoById(db, videoId) : await getVideoById(db, videoId);

	if (!video) {
		return json({ success: false, error: 'Video not found' }, { status: 404 });
	}

	if (!isAdmin && video.visibility !== 'published') {
		// Avoid leaking draft/archived metadata.
		return json({ success: false, error: 'Video not found' }, { status: 404 });
	}

	// Tier gating: members-only content requires a member session.
	const isMember = locals.user?.membership ?? false;
	if (!isAdmin && video.tier !== 'free' && !isMember) {
		return json({ success: false, error: 'Membership required' }, { status: 401 });
	}

	if (!video.stream_uid) {
		return json(
			{
				success: false,
				error: 'Video is not Stream-backed',
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
		const customerCode = getStreamCustomerCode(runtimeEnv);
		const issuedAt = Math.floor(Date.now() / 1000);
		const expiresAt = issuedAt + getPlaybackTokenTtlSeconds(runtimeEnv);

		const hlsUrl =
			video.playback_policy === 'public'
				? buildPublicHlsUrl(customerCode, video.stream_uid)
				: buildSignedHlsUrl(
						customerCode,
						(await createStreamPlaybackToken(runtimeEnv, video.stream_uid, expiresAt)).token
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
