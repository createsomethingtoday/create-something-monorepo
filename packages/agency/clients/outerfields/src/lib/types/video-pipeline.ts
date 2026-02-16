export type VideoIngestStatus = 'pending_upload' | 'processing' | 'ready' | 'failed';
export type VideoIngestSource = 'upload' | 'generated';
export type VideoPlaybackPolicy = 'private' | 'public';

export interface VideoPlaybackGrant {
	videoId: string;
	streamUid: string;
	hlsUrl: string;
	expiresAt: number;
	issuedAt: number;
	policy: VideoPlaybackPolicy;
}

export interface Series {
	id: string;
	slug: string;
	title: string;
	description: string | null;
	created_at: number;
	updated_at: number;
}

export interface SeriesEpisode {
	seriesId: string;
	seriesSlug: string;
	seriesTitle: string;
	videoId: string;
	title: string;
	episodeNumber: number | null;
	ingestStatus: VideoIngestStatus;
	streamUid: string | null;
	durationSeconds: number | null;
	thumbnailPath: string;
}

export interface CreateUploadRequest {
	title: string;
	category: string;
	description?: string;
	episodeNumber?: number | null;
	tier?: 'free' | 'preview' | 'gated';
	seriesId?: string | null;
	fileSizeBytes: number;
	fileName?: string;
	playbackPolicy?: VideoPlaybackPolicy;
	maxDurationSeconds?: number;
}

export interface CreateUploadResponse {
	videoId: string;
	streamUid: string;
	uploadUrl: string;
	tusResumable: '1.0.0';
	maxFileSizeBytes: number;
	ingestStatus: VideoIngestStatus;
	expiresAt: number;
}
