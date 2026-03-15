import type { Video } from '$lib/server/db/videos';

type VideoAvailabilityShape = Pick<Video, 'visibility' | 'ingest_status' | 'stream_uid'>;
const STREAM_UID_PATTERN = /^[0-9a-f]{32}$/i;

export function isValidStreamUid(value: string | null | undefined): boolean {
	const normalized = typeof value === 'string' ? value.trim() : '';
	return normalized.length > 0 && STREAM_UID_PATTERN.test(normalized);
}

export function hasPlayableVideoSource(video: Pick<Video, 'stream_uid'>): boolean {
	return isValidStreamUid(video.stream_uid);
}

export function isPubliclyPlayable(video: VideoAvailabilityShape): boolean {
	return video.visibility === 'published' && video.ingest_status === 'ready' && hasPlayableVideoSource(video);
}

export function filterPubliclyPlayable<T extends VideoAvailabilityShape>(videos: T[]): T[] {
	return videos.filter((video) => isPubliclyPlayable(video));
}
