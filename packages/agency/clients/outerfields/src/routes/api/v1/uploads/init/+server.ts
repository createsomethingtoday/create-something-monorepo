import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	attachStreamUidToVideo,
	createVideoUploadReservation,
	markVideoUploadFailed
} from '$lib/server/db/videos';
import { getSeriesByIdentifier } from '$lib/server/db/series';
import { isAdminUser } from '$lib/server/admin';
import { createTusDirectUpload, getMaxDirectUploadBytes } from '$lib/server/stream';
import type { CreateUploadRequest, CreateUploadResponse } from '$lib/types/video-pipeline';
import { getDBFromPlatform } from '$lib/server/d1-compat';
import { resolveRuntimeEnv } from '$lib/server/env';

const MAX_FILE_SIZE_BYTES = getMaxDirectUploadBytes();

function isSupportedTier(value: unknown): value is 'free' | 'preview' | 'gated' {
	return value === 'free' || value === 'preview' || value === 'gated';
}

function isSupportedPlaybackPolicy(value: unknown): value is 'private' | 'public' {
	return value === 'private' || value === 'public';
}

/**
 * POST /api/v1/uploads/init
 * Creates a reserved video row and a Cloudflare Stream tus direct upload URL.
 */
export const POST: RequestHandler = async ({ request, locals, platform }) => {
	const db = getDBFromPlatform(platform);
	const runtimeEnv = resolveRuntimeEnv(((platform as { env?: Record<string, string | undefined> } | undefined)?.env));

	try {
		if (!locals.user) {
			return json({ success: false, error: 'Authentication required' }, { status: 401 });
		}

		if (!isAdminUser(locals.user, runtimeEnv)) {
			return json({ success: false, error: 'Admin access required' }, { status: 403 });
		}

		let payload: CreateUploadRequest;
		try {
			payload = (await request.json()) as CreateUploadRequest;
		} catch {
			return json({ success: false, error: 'Invalid JSON body' }, { status: 400 });
		}

		const title = payload.title?.trim();
		const seriesIdentifier = payload.seriesId?.trim();
		const maxDurationSeconds =
			payload.maxDurationSeconds === undefined || payload.maxDurationSeconds === null
				? undefined
				: Math.floor(payload.maxDurationSeconds);

		if (!title) {
			return json({ success: false, error: 'Title is required' }, { status: 400 });
		}
		if (!seriesIdentifier) {
			return json({ success: false, error: 'seriesId is required' }, { status: 400 });
		}
		if (!Number.isFinite(payload.fileSizeBytes) || payload.fileSizeBytes <= 0) {
			return json({ success: false, error: 'fileSizeBytes must be a positive number' }, { status: 400 });
		}
		if (payload.fileSizeBytes > MAX_FILE_SIZE_BYTES) {
			return json(
				{
					success: false,
					error: `File too large. Maximum supported size is ${MAX_FILE_SIZE_BYTES} bytes (30GB).`,
					maxFileSizeBytes: MAX_FILE_SIZE_BYTES
				},
				{ status: 400 }
			);
		}
		if (payload.tier && !isSupportedTier(payload.tier)) {
			return json({ success: false, error: 'Invalid tier value' }, { status: 400 });
		}
		if (payload.playbackPolicy && !isSupportedPlaybackPolicy(payload.playbackPolicy)) {
			return json({ success: false, error: 'Invalid playbackPolicy value' }, { status: 400 });
		}
		if (
			payload.maxDurationSeconds !== undefined &&
			payload.maxDurationSeconds !== null &&
			(!Number.isFinite(payload.maxDurationSeconds) || payload.maxDurationSeconds <= 0 || !Number.isFinite(maxDurationSeconds) || maxDurationSeconds <= 0)
		) {
			return json({ success: false, error: 'maxDurationSeconds must be a positive number' }, { status: 400 });
		}

		const series = await getSeriesByIdentifier(db, seriesIdentifier);
		if (!series) {
			return json({ success: false, error: 'Series not found' }, { status: 404 });
		}

		// Legacy category field is still used by some UI. Default to series slug.
		const category = payload.category?.trim() || series.slug;

		const reservation = await createVideoUploadReservation(db, {
			title,
			category,
			description: payload.description,
			episodeNumber: payload.episodeNumber,
			tier: payload.tier,
			seriesId: series.id,
			playbackPolicy: payload.playbackPolicy ?? 'private',
			ingestSource: 'upload',
			sourceBytes: payload.fileSizeBytes,
			durationSeconds: maxDurationSeconds ?? null
		});

		try {
			const directUpload = await createTusDirectUpload(runtimeEnv, {
				uploadLength: payload.fileSizeBytes,
				fileName: payload.fileName?.trim() || `${title}.mp4`,
				creatorId: locals.user.id,
				maxDurationSeconds,
				playbackPolicy: payload.playbackPolicy ?? 'private',
				meta: {
					videoId: reservation.id,
					category,
					seriesId: series.id
				}
			});

			await attachStreamUidToVideo(db, reservation.id, directUpload.streamUid);

			const response: CreateUploadResponse = {
				videoId: reservation.id,
				streamUid: directUpload.streamUid,
				uploadUrl: directUpload.uploadUrl,
				tusResumable: '1.0.0',
				maxFileSizeBytes: MAX_FILE_SIZE_BYTES,
				ingestStatus: 'pending_upload',
				expiresAt: directUpload.expiresAt
			};

			return json({ success: true, data: response });
		} catch (error) {
			const reason = error instanceof Error ? error.message : 'Failed to initialize upload';
			await markVideoUploadFailed(db, reservation.id, reason);
			return json({ success: false, error: reason }, { status: 500 });
		}
	} catch (error) {
		console.error('[uploads/init] Unhandled error:', error);
		const reason = error instanceof Error ? error.message : 'Failed to initialize upload';
		return json({ success: false, error: reason }, { status: 500 });
	}
};
