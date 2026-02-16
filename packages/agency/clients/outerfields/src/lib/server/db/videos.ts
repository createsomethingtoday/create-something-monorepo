import type { D1Database } from '@cloudflare/workers-types';

export type VideoIngestStatus = 'pending_upload' | 'processing' | 'ready' | 'failed';
export type VideoIngestSource = 'upload' | 'generated';
export type VideoPlaybackPolicy = 'private' | 'public';

export interface Video {
	id: string;
	title: string;
	category: string;
	series_id: string | null;
	episode_number: number | null;
	tier: 'free' | 'preview' | 'gated';
	duration: number;
	duration_seconds: number | null;
	asset_path: string;
	stream_uid: string | null;
	thumbnail_path: string;
	description: string | null;
	ingest_status: VideoIngestStatus;
	ingest_source: VideoIngestSource;
	source_bytes: number | null;
	playback_policy: VideoPlaybackPolicy;
	playback_ready_at: number | null;
	failure_reason: string | null;
	created_at: number;
	updated_at: number;
}

export interface VideosResponse {
	videos: Video[];
	total: number;
}

export interface CreateVideoUploadReservationInput {
	title: string;
	category: string;
	description?: string;
	episodeNumber?: number | null;
	tier?: 'free' | 'preview' | 'gated';
	seriesId?: string | null;
	playbackPolicy?: VideoPlaybackPolicy;
	ingestSource?: VideoIngestSource;
	streamUid?: string | null;
	sourceBytes?: number | null;
	durationSeconds?: number | null;
}

export interface StreamWebhookUpdate {
	streamUid: string;
	state: 'processing' | 'ready' | 'failed';
	durationSeconds?: number | null;
	sourceBytes?: number | null;
	failureReason?: string | null;
}

function nowSeconds(): number {
	return Math.floor(Date.now() / 1000);
}

function createVideoId(): string {
	const suffix = crypto.randomUUID().replace(/-/g, '').slice(0, 16);
	return `vid_${suffix}`;
}

/**
 * Get all videos, optionally filtered by category.
 */
export async function getVideos(
	db: D1Database,
	category?: string
): Promise<VideosResponse> {
	let query = 'SELECT * FROM videos';
	const params: string[] = [];

	if (category) {
		query += ' WHERE category = ?';
		params.push(category);
	}

	query += ' ORDER BY category, episode_number NULLS LAST, created_at';

	const result = await db.prepare(query).bind(...params).all<Video>();

	return {
		videos: result.results || [],
		total: result.results?.length || 0
	};
}

/**
 * Get videos grouped by category.
 */
export async function getVideosByCategory(db: D1Database): Promise<Record<string, Video[]>> {
	const { videos } = await getVideos(db);

	const grouped: Record<string, Video[]> = {};

	for (const video of videos) {
		if (!grouped[video.category]) {
			grouped[video.category] = [];
		}
		grouped[video.category].push(video);
	}

	return grouped;
}

/**
 * Get a single video by ID.
 */
export async function getVideoById(db: D1Database, id: string): Promise<Video | null> {
	const result = await db.prepare('SELECT * FROM videos WHERE id = ?').bind(id).first<Video>();
	return result || null;
}

/**
 * Get a single video by Stream UID.
 */
export async function getVideoByStreamUid(db: D1Database, streamUid: string): Promise<Video | null> {
	const result = await db
		.prepare('SELECT * FROM videos WHERE stream_uid = ?')
		.bind(streamUid)
		.first<Video>();
	return result || null;
}

/**
 * Create a new reserved video row before client upload begins.
 */
export async function createVideoUploadReservation(
	db: D1Database,
	input: CreateVideoUploadReservationInput
): Promise<Video> {
	const id = createVideoId();
	const createdAt = nowSeconds();
	const tier = input.tier ?? 'free';
	const playbackPolicy = input.playbackPolicy ?? 'private';
	const ingestSource = input.ingestSource ?? 'upload';

	await db
		.prepare(
			`INSERT INTO videos (
				id,
				title,
				category,
				series_id,
				episode_number,
				tier,
				duration,
				duration_seconds,
				asset_path,
				stream_uid,
				thumbnail_path,
				description,
				ingest_status,
				ingest_source,
				source_bytes,
				playback_policy,
				created_at,
				updated_at
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
		)
		.bind(
			id,
			input.title,
			input.category,
			input.seriesId ?? null,
			input.episodeNumber ?? null,
			tier,
			Math.max(0, input.durationSeconds ?? 0),
			input.durationSeconds ?? null,
			'',
			input.streamUid ?? null,
			'/thumbnails/hero-building-outerfields.jpg',
			input.description ?? null,
			'pending_upload',
			ingestSource,
			input.sourceBytes ?? null,
			playbackPolicy,
			createdAt,
			createdAt
		)
		.run();

	const created = await getVideoById(db, id);
	if (!created) {
		throw new Error('Failed to create reserved video row');
	}

	return created;
}

/**
 * Create a generated video row that already has a Stream UID.
 */
export async function createGeneratedVideo(
	db: D1Database,
	input: CreateVideoUploadReservationInput
): Promise<Video> {
	const created = await createVideoUploadReservation(db, {
		...input,
		ingestSource: 'generated',
		playbackPolicy: input.playbackPolicy ?? 'private',
		streamUid: input.streamUid ?? null
	});

	if (input.streamUid) {
		await db
			.prepare(
				`UPDATE videos
				SET ingest_status = ?,
					duration_seconds = COALESCE(?, duration_seconds),
					source_bytes = COALESCE(?, source_bytes),
					updated_at = ?
				WHERE id = ?`
			)
			.bind('processing', input.durationSeconds ?? null, input.sourceBytes ?? null, nowSeconds(), created.id)
			.run();
	}

	return (await getVideoById(db, created.id)) ?? created;
}

/**
 * Attach a Stream UID to a reserved video.
 */
export async function attachStreamUidToVideo(
	db: D1Database,
	videoId: string,
	streamUid: string
): Promise<void> {
	await db
		.prepare(
			`UPDATE videos
			 SET stream_uid = ?,
				 updated_at = ?
			 WHERE id = ?`
		)
		.bind(streamUid, nowSeconds(), videoId)
		.run();
}

/**
 * Move a pending upload to processing after the client reports completion.
 */
export async function markVideoUploadCompleted(
	db: D1Database,
	videoId: string
): Promise<Video | null> {
	await db
		.prepare(
			`UPDATE videos
			 SET ingest_status = CASE
				WHEN ingest_status = 'pending_upload' THEN 'processing'
				ELSE ingest_status
			 END,
				updated_at = ?
			 WHERE id = ?`
		)
		.bind(nowSeconds(), videoId)
		.run();

	return getVideoById(db, videoId);
}

/**
 * Mark a reserved upload as failed.
 */
export async function markVideoUploadFailed(
	db: D1Database,
	videoId: string,
	failureReason: string
): Promise<Video | null> {
	await db
		.prepare(
			`UPDATE videos
			 SET ingest_status = 'failed',
				 failure_reason = ?,
				 updated_at = ?
			 WHERE id = ?`
		)
		.bind(failureReason, nowSeconds(), videoId)
		.run();

	return getVideoById(db, videoId);
}

/**
 * Apply a Stream webhook status transition.
 * The transition is idempotent and does not downgrade from ready to failed/processing.
 */
export async function applyStreamWebhookUpdate(
	db: D1Database,
	update: StreamWebhookUpdate
): Promise<Video | null> {
	const now = nowSeconds();

	if (update.state === 'ready') {
		await db
			.prepare(
				`UPDATE videos
				 SET ingest_status = 'ready',
					 duration_seconds = COALESCE(?, duration_seconds, duration),
					 source_bytes = COALESCE(?, source_bytes),
					 playback_ready_at = COALESCE(playback_ready_at, ?),
					 failure_reason = NULL,
					 updated_at = ?
				 WHERE stream_uid = ?`
			)
			.bind(
				update.durationSeconds ?? null,
				update.sourceBytes ?? null,
				now,
				now,
				update.streamUid
			)
			.run();
	}

	if (update.state === 'processing') {
		await db
			.prepare(
				`UPDATE videos
				 SET ingest_status = 'processing',
					 updated_at = ?
				 WHERE stream_uid = ?
				   AND ingest_status != 'ready'`
			)
			.bind(now, update.streamUid)
			.run();
	}

	if (update.state === 'failed') {
		await db
			.prepare(
				`UPDATE videos
				 SET ingest_status = 'failed',
					 failure_reason = COALESCE(?, failure_reason),
					 updated_at = ?
				 WHERE stream_uid = ?
				   AND ingest_status != 'ready'`
			)
			.bind(update.failureReason ?? null, now, update.streamUid)
			.run();
	}

	return getVideoByStreamUid(db, update.streamUid);
}

/**
 * Get videos by tier (free, preview, gated).
 */
export async function getVideosByTier(
	db: D1Database,
	tier: 'free' | 'preview' | 'gated'
): Promise<VideosResponse> {
	const result = await db
		.prepare('SELECT * FROM videos WHERE tier = ? ORDER BY category, episode_number NULLS LAST')
		.bind(tier)
		.all<Video>();

	return {
		videos: result.results || [],
		total: result.results?.length || 0
	};
}

/**
 * Get free videos (first episodes + trailers).
 */
export async function getFreeVideos(db: D1Database): Promise<VideosResponse> {
	return getVideosByTier(db, 'free');
}

/**
 * Search videos by title.
 */
export async function searchVideos(db: D1Database, query: string): Promise<VideosResponse> {
	const result = await db
		.prepare('SELECT * FROM videos WHERE title LIKE ? ORDER BY category, episode_number NULLS LAST')
		.bind(`%${query}%`)
		.all<Video>();

	return {
		videos: result.results || [],
		total: result.results?.length || 0
	};
}
