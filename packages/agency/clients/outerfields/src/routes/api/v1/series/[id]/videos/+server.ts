import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getSeriesByIdentifier, getSeriesVideos } from '$lib/server/db/series';
import type { SeriesEpisode } from '$lib/types/video-pipeline';

/**
 * GET /api/v1/series/:id/videos
 * Returns all series episodes with ingest/playback status.
 */
export const GET: RequestHandler = async ({ params, locals, platform }) => {
	const db = platform?.env.DB;
	if (!db) {
		return json({ success: false, error: 'Database not available' }, { status: 500 });
	}

	if (!locals.user) {
		return json({ success: false, error: 'Authentication required' }, { status: 401 });
	}

	const identifier = params.id;
	if (!identifier) {
		return json({ success: false, error: 'Series identifier is required' }, { status: 400 });
	}

	const series = await getSeriesByIdentifier(db, identifier);
	if (!series) {
		return json({ success: false, error: 'Series not found' }, { status: 404 });
	}

	const rows = await getSeriesVideos(db, identifier);
	const episodes: SeriesEpisode[] = rows.map((entry) => ({
		seriesId: entry.seriesId,
		seriesSlug: entry.seriesSlug,
		seriesTitle: entry.seriesTitle,
		videoId: entry.video.id,
		title: entry.video.title,
		episodeNumber: entry.video.episode_number,
		ingestStatus: entry.video.ingest_status,
		streamUid: entry.video.stream_uid,
		durationSeconds: entry.video.duration_seconds,
		thumbnailPath: entry.video.thumbnail_path
	}));

	return json({
		success: true,
		data: {
			series,
			episodes
		}
	});
};
