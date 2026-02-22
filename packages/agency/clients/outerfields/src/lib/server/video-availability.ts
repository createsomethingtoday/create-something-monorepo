import type { Video } from '$lib/server/db/videos';

type VideoAvailabilityShape = Pick<Video, 'visibility' | 'ingest_status' | 'stream_uid' | 'asset_path'>;

function hasText(value: string | null | undefined): boolean {
	return typeof value === 'string' && value.trim().length > 0;
}

export function hasPlayableVideoSource(video: Pick<Video, 'stream_uid' | 'asset_path'>): boolean {
	return hasText(video.stream_uid) || hasText(video.asset_path);
}

export function isPubliclyPlayable(video: VideoAvailabilityShape): boolean {
	return video.visibility === 'published' && video.ingest_status === 'ready' && hasPlayableVideoSource(video);
}

export function filterPubliclyPlayable<T extends VideoAvailabilityShape>(videos: T[]): T[] {
	return videos.filter((video) => isPubliclyPlayable(video));
}
