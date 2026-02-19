export type VideoIngestStatus = 'pending_upload' | 'processing' | 'ready' | 'failed';
export type VideoIngestSource = 'upload' | 'generated';
export type VideoPlaybackPolicy = 'private' | 'public';
export type VideoVisibility = 'draft' | 'published' | 'archived';

export interface VideoPlaybackGrant {
	videoId: string;
	streamUid: string;
	hlsUrl: string;
	expiresAt: number;
	issuedAt: number;
	policy: VideoPlaybackPolicy;
}

export interface CreateUploadRequest {
	title: string;
	/** Legacy field. If omitted, server will default to the selected series slug. */
	category?: string;
	description?: string;
	episodeNumber?: number | null;
	tier?: 'free' | 'preview' | 'gated';
	seriesId: string;
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

