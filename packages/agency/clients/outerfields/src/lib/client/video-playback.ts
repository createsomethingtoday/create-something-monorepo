import type { VideoIngestStatus, VideoPlaybackGrant } from '$lib/types/video-pipeline';

export type PlaybackResolutionStatus =
	| 'ready'
	| 'processing'
	| 'failed'
	| 'auth_required'
	| 'legacy'
	| 'unavailable'
	| 'error';

export interface PlaybackResolution {
	status: PlaybackResolutionStatus;
	grant?: VideoPlaybackGrant;
	ingestStatus?: VideoIngestStatus;
	legacyAssetPath?: string;
	message?: string;
}

interface PlaybackErrorResponse {
	error?: string;
	ingestStatus?: VideoIngestStatus;
	legacyAssetPath?: string | null;
	failureReason?: string | null;
}

export async function fetchVideoPlayback(videoId: string): Promise<PlaybackResolution> {
	const response = await fetch(`/api/v1/videos/${videoId}/playback`);
	const payload = (await response.json()) as unknown;
	const successPayload = payload as { success?: boolean; data?: VideoPlaybackGrant };
	const errorPayload = payload as PlaybackErrorResponse;

	if (response.ok && successPayload.data) {
		return {
			status: 'ready',
			grant: successPayload.data
		};
	}

	const fallback = errorPayload.error || 'Failed to resolve playback';

	if (response.status === 401) {
		return {
			status: 'auth_required',
			message: errorPayload.error || 'Sign in required to watch this video'
		};
	}

	if (response.status === 404 && errorPayload.legacyAssetPath) {
		return {
			status: 'legacy',
			legacyAssetPath: errorPayload.legacyAssetPath,
			message: errorPayload.error || 'Using legacy video source'
		};
	}

	if (response.status === 409) {
		return {
			status: errorPayload.ingestStatus === 'failed' ? 'failed' : 'processing',
			ingestStatus: errorPayload.ingestStatus,
			message: errorPayload.failureReason || errorPayload.error || 'Video is still being prepared'
		};
	}

	if (response.status === 404) {
		return {
			status: 'unavailable',
			message: errorPayload.error || 'Video stream is not available'
		};
	}

	return {
		status: 'error',
		message: fallback
	};
}

