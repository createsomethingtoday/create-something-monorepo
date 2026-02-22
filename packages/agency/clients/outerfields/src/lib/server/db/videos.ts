import type { D1Compat } from '$lib/server/d1-compat';
import { randomUUID } from 'node:crypto';

import type {
	VideoIngestSource,
	VideoIngestStatus,
	VideoPlaybackPolicy,
	VideoVisibility
} from '$lib/types/video-pipeline';

export type {
	VideoIngestSource,
	VideoIngestStatus,
	VideoPlaybackPolicy,
	VideoVisibility
} from '$lib/types/video-pipeline';

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
	visibility: VideoVisibility;
	is_featured: number;
	featured_order: number;
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

export interface ListAdminVideosFilters {
	q?: string;
	visibility?: VideoVisibility | 'all';
	ingestStatus?: VideoIngestStatus | 'all';
	seriesId?: string;
	tier?: 'free' | 'preview' | 'gated';
	featured?: 'true' | 'false';
	limit?: number;
	offset?: number;
}

/**
 * Legacy admin API compatibility types.
 * Kept to support /api/admin/* routes while /api/v1/* is the primary surface.
 */
export interface CreateVideoInput {
	title: string;
	category: string;
	tier: 'free' | 'preview' | 'gated';
	duration: number;
	episode_number?: number | null;
	asset_path: string;
	thumbnail_path?: string;
	description?: string | null;
}

export interface UpdateVideoInput {
	title?: string;
	category?: string;
	tier?: 'free' | 'preview' | 'gated';
	duration?: number;
	episode_number?: number | null;
	asset_path?: string;
	thumbnail_path?: string;
	description?: string | null;
}

export interface CategorySummary {
	category: string;
	total: number;
	free: number;
	preview: number;
	gated: number;
}

function nowSeconds(): number {
	return Math.floor(Date.now() / 1000);
}

function createVideoId(): string {
	const suffix = randomUUID().replace(/-/g, '').slice(0, 16);
	return `vid_${suffix}`;
}

async function resolveSeriesIdBySlug(db: D1Compat, slug: string): Promise<string | null> {
	if (!slug) return null;
	const row = await db
		.prepare('SELECT id FROM series WHERE slug = ? LIMIT 1')
		.bind(slug)
		.first<{ id: string }>();
	return row?.id ?? null;
}

/**
 * Get all videos, optionally filtered by category
 */
export async function getVideos(
	db: D1Compat,
	category?: string
): Promise<VideosResponse> {
	let query = 'SELECT * FROM videos WHERE visibility = ?';
	const params: Array<string | number> = ['published'];

	if (category) {
		query += ' AND category = ?';
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
 * Get videos grouped by category
 */
export async function getVideosByCategory(db: D1Compat): Promise<Record<string, Video[]>> {
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
 * Get a single video by ID
 */
export async function getVideoById(db: D1Compat, id: string): Promise<Video | null> {
	const result = db
		.prepare('SELECT * FROM videos WHERE id = ? AND visibility = ?')
		.bind(id, 'published')
		.first<Video>();
	return (await result) || null;
}

/**
 * Get a single video by ID (admin view, includes drafts/archived).
 */
export async function getAdminVideoById(db: D1Compat, id: string): Promise<Video | null> {
	const result = await db.prepare('SELECT * FROM videos WHERE id = ?').bind(id).first<Video>();
	return result || null;
}

/**
 * Get a single video by Stream UID.
 */
export async function getVideoByStreamUid(db: D1Compat, streamUid: string): Promise<Video | null> {
	const result = db
		.prepare('SELECT * FROM videos WHERE stream_uid = ?')
		.bind(streamUid)
		.first<Video>();
	return (await result) || null;
}

/**
 * Create a new reserved video row before client upload begins.
 */
export async function createVideoUploadReservation(
	db: D1Compat,
	input: CreateVideoUploadReservationInput
): Promise<Video> {
	const id = createVideoId();
	const createdAt = nowSeconds();
	const tier = input.tier ?? 'free';
	const playbackPolicy = input.playbackPolicy ?? 'private';
	const ingestSource = input.ingestSource ?? 'upload';

	await db.prepare(
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
			visibility,
			is_featured,
			featured_order,
			created_at,
			updated_at
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
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
			'draft',
			0,
			0,
			createdAt,
			createdAt
		)
		.run();

	const created = await getAdminVideoById(db, id);
	if (!created) {
		throw new Error('Failed to create reserved video row');
	}

	return created;
}

/**
 * Create a generated video row that already has a Stream UID.
 */
export async function createGeneratedVideo(
	db: D1Compat,
	input: CreateVideoUploadReservationInput
): Promise<Video> {
	const created = await createVideoUploadReservation(db, {
		...input,
		ingestSource: 'generated',
		playbackPolicy: input.playbackPolicy ?? 'private',
		streamUid: input.streamUid ?? null
	});

	if (input.streamUid) {
		await db.prepare(
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

	return (await getAdminVideoById(db, created.id)) ?? created;
}

/**
 * Attach a Stream UID to a reserved video.
 */
export async function attachStreamUidToVideo(db: D1Compat, videoId: string, streamUid: string): Promise<void> {
	await db.prepare(
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
export async function markVideoUploadCompleted(db: D1Compat, videoId: string): Promise<Video | null> {
	await db.prepare(
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

	return getAdminVideoById(db, videoId);
}

/**
 * Mark a reserved upload as failed.
 */
export async function markVideoUploadFailed(db: D1Compat, videoId: string, failureReason: string): Promise<Video | null> {
	await db.prepare(
		`UPDATE videos
		 SET ingest_status = 'failed',
			 failure_reason = ?,
			 updated_at = ?
		 WHERE id = ?`
	)
		.bind(failureReason, nowSeconds(), videoId)
		.run();

	return getAdminVideoById(db, videoId);
}

/**
 * Apply a Stream webhook status transition.
 * The transition is idempotent and does not downgrade from ready to failed/processing.
 */
export async function applyStreamWebhookUpdate(db: D1Compat, update: StreamWebhookUpdate): Promise<Video | null> {
	const now = nowSeconds();

	if (update.state === 'ready') {
		await db.prepare(
			`UPDATE videos
			 SET ingest_status = 'ready',
				 duration_seconds = COALESCE(?, duration_seconds, duration),
				 source_bytes = COALESCE(?, source_bytes),
				 playback_ready_at = COALESCE(playback_ready_at, ?),
				 failure_reason = NULL,
				 updated_at = ?
			 WHERE stream_uid = ?`
		)
			.bind(update.durationSeconds ?? null, update.sourceBytes ?? null, now, now, update.streamUid)
			.run();
	}

	if (update.state === 'processing') {
		await db.prepare(
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
		await db.prepare(
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
 * Get videos by tier (free, preview, gated)
 */
export async function getVideosByTier(
	db: D1Compat,
	tier: 'free' | 'preview' | 'gated'
): Promise<VideosResponse> {
	const result = await db
		.prepare(
			`SELECT * FROM videos
			 WHERE tier = ?
			   AND visibility = ?
			 ORDER BY category, episode_number NULLS LAST`
		)
		.bind(tier, 'published')
		.all<Video>();

	return {
		videos: result.results || [],
		total: result.results?.length || 0
	};
}

/**
 * Get free videos (first episodes + trailers)
 */
export async function getFreeVideos(db: D1Compat): Promise<VideosResponse> {
	return getVideosByTier(db, 'free');
}

/**
 * Search videos by title
 */
export async function searchVideos(db: D1Compat, query: string): Promise<VideosResponse> {
	const result = await db
		.prepare(
			`SELECT * FROM videos
			 WHERE visibility = ?
			   AND title LIKE ?
			 ORDER BY category, episode_number NULLS LAST`
		)
		.bind('published', `%${query}%`)
		.all<Video>();

	return {
		videos: result.results || [],
		total: result.results?.length || 0
	};
}

/**
 * Legacy helper used by /api/admin/categories.
 */
export async function getCategorySummaries(db: D1Compat): Promise<CategorySummary[]> {
	const result = await db
		.prepare(
			`SELECT
				category,
				COUNT(*) AS total,
				SUM(CASE WHEN tier = 'free' THEN 1 ELSE 0 END) AS free,
				SUM(CASE WHEN tier = 'preview' THEN 1 ELSE 0 END) AS preview,
				SUM(CASE WHEN tier = 'gated' THEN 1 ELSE 0 END) AS gated
			FROM videos
			WHERE visibility != 'archived'
			GROUP BY category
			ORDER BY category ASC`
		)
		.all<CategorySummary>();

	return result.results || [];
}

/**
 * Legacy helper used by /api/admin/categories.
 */
export async function renameCategory(db: D1Compat, from: string, to: string): Promise<number> {
	const source = from.trim();
	const target = to.trim();
	if (!source || !target || source === target) return 0;

	const [sourceSeriesId, targetSeriesId] = await Promise.all([
		resolveSeriesIdBySlug(db, source),
		resolveSeriesIdBySlug(db, target)
	]);

	if (sourceSeriesId && !targetSeriesId) {
		await db
			.prepare('UPDATE series SET slug = ?, updated_at = ? WHERE id = ?')
			.bind(target, nowSeconds(), sourceSeriesId)
			.run();
	}

	const nextSeriesId = targetSeriesId ?? sourceSeriesId;

	let updateStatement =
		'UPDATE videos SET category = ?, updated_at = ? WHERE category = ?';
	const bindValues: Array<string | number | null> = [target, nowSeconds(), source];

	if (nextSeriesId) {
		updateStatement =
			'UPDATE videos SET category = ?, series_id = ?, updated_at = ? WHERE category = ?';
		bindValues.splice(1, 0, nextSeriesId);
	}

	const result = await db.prepare(updateStatement).bind(...bindValues).run();
	return result.meta.changes;
}

/**
 * Legacy helper used by /api/admin/videos.
 */
export async function createVideo(db: D1Compat, input: CreateVideoInput): Promise<Video> {
	const id = createVideoId();
	const now = nowSeconds();
	const title = input.title.trim();
	const category = input.category.trim();
	const duration = Math.max(1, Math.floor(input.duration));
	const thumbnailPath = input.thumbnail_path?.trim() || '/thumbnails/hero-building-outerfields.jpg';
	const seriesId = await resolveSeriesIdBySlug(db, category);

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
				playback_ready_at,
				failure_reason,
				visibility,
				is_featured,
				featured_order,
				created_at,
				updated_at
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
		)
		.bind(
			id,
			title,
			category,
			seriesId,
			input.episode_number ?? null,
			input.tier,
			duration,
			duration,
			input.asset_path,
			null,
			thumbnailPath,
			input.description ?? null,
			'ready',
			'generated',
			null,
			'public',
			now,
			null,
			'published',
			0,
			0,
			now,
			now
		)
		.run();

	const created = await getAdminVideoById(db, id);
	if (!created) {
		throw new Error('Failed to create video');
	}

	return created;
}

/**
 * Legacy helper used by /api/admin/videos/:id.
 */
export async function updateVideo(db: D1Compat, id: string, input: UpdateVideoInput): Promise<Video | null> {
	const existing = await getAdminVideoById(db, id);
	if (!existing) return null;

	const sets: string[] = [];
	const values: Array<string | number | null> = [];

	if (input.title !== undefined) {
		sets.push('title = ?');
		values.push(input.title.trim());
	}

	if (input.category !== undefined) {
		const category = input.category.trim();
		const seriesId = await resolveSeriesIdBySlug(db, category);
		sets.push('category = ?');
		values.push(category);
		sets.push('series_id = ?');
		values.push(seriesId);
	}

	if (input.tier !== undefined) {
		sets.push('tier = ?');
		values.push(input.tier);
	}

	if (input.duration !== undefined) {
		const duration = Math.max(1, Math.floor(input.duration));
		sets.push('duration = ?');
		values.push(duration);
		sets.push('duration_seconds = ?');
		values.push(duration);
	}

	if (input.episode_number !== undefined) {
		sets.push('episode_number = ?');
		values.push(input.episode_number);
	}

	if (input.asset_path !== undefined) {
		sets.push('asset_path = ?');
		values.push(input.asset_path);
	}

	if (input.thumbnail_path !== undefined) {
		sets.push('thumbnail_path = ?');
		values.push(input.thumbnail_path);
	}

	if (input.description !== undefined) {
		sets.push('description = ?');
		values.push(input.description);
	}

	if (sets.length === 0) {
		return existing;
	}

	sets.push('updated_at = ?');
	values.push(nowSeconds());

	await db
		.prepare(`UPDATE videos SET ${sets.join(', ')} WHERE id = ?`)
		.bind(...values, id)
		.run();

	return getAdminVideoById(db, id);
}

/**
 * Legacy helper used by /api/admin/videos/:id.
 */
export async function deleteVideo(db: D1Compat, id: string): Promise<boolean> {
	const existing = await getAdminVideoById(db, id);
	if (!existing) return false;

	await db
		.prepare(
			`UPDATE videos
			 SET visibility = 'archived',
				 is_featured = 0,
				 featured_order = 0,
				 updated_at = ?
			 WHERE id = ?`
		)
		.bind(nowSeconds(), id)
		.run();

	return true;
}

export interface HomeCatalogSeriesRow {
	id: string;
	slug: string;
	title: string;
	description: string | null;
	sort_order: number;
	home_filters: string;
}

export interface HomeCatalogRow {
	series: HomeCatalogSeriesRow;
	videos: Video[];
}

export async function getHomeCatalogRows(db: D1Compat): Promise<HomeCatalogRow[]> {
	const seriesResult = await db
		.prepare(
			`SELECT id, slug, title, description, sort_order, home_filters
			 FROM series
			 WHERE visibility = 'published'
			 ORDER BY sort_order ASC, title ASC`
		)
		.all<HomeCatalogSeriesRow>();

	const rows: HomeCatalogRow[] = [];

	for (const series of seriesResult.results || []) {
		const videos = await db
			.prepare(
				`SELECT *
				 FROM videos
				 WHERE series_id = ?
				   AND visibility = 'published'
				   AND ingest_status = 'ready'
				 ORDER BY episode_number IS NULL ASC, episode_number ASC, created_at ASC`
			)
			.bind(series.id)
			.all<Video>();

		if ((videos.results || []).length === 0) continue;

		rows.push({
			series,
			videos: videos.results || []
		});
	}

	return rows;
}

export interface FeaturedCatalogVideo {
	video: Video;
	seriesTitle: string | null;
	seriesSlug: string | null;
}

export async function getFeaturedCatalogVideos(db: D1Compat, limit: number): Promise<FeaturedCatalogVideo[]> {
	const capped = Math.max(1, Math.min(50, Math.floor(limit)));

	const featured = await db
		.prepare(
			`SELECT v.*, s.title as series_title, s.slug as series_slug
			 FROM videos v
			 LEFT JOIN series s ON s.id = v.series_id
			 WHERE v.visibility = 'published'
			   AND v.ingest_status = 'ready'
			   AND v.is_featured = 1
			 ORDER BY v.featured_order ASC, v.updated_at DESC
			 LIMIT ?`
		)
		.bind(capped)
		.all<(Video & { series_title: string | null; series_slug: string | null })>();

	const featuredRows = featured.results || [];
	if (featuredRows.length > 0) {
		return featuredRows.map((row) => ({
			video: row,
			seriesTitle: row.series_title ?? null,
			seriesSlug: row.series_slug ?? null
		}));
	}

	const fallback = await db
		.prepare(
			`SELECT v.*, s.title as series_title, s.slug as series_slug
			 FROM videos v
			 LEFT JOIN series s ON s.id = v.series_id
			 WHERE v.visibility = 'published'
			   AND v.ingest_status = 'ready'
			 ORDER BY v.updated_at DESC
			 LIMIT ?`
		)
		.bind(capped)
		.all<(Video & { series_title: string | null; series_slug: string | null })>();

	return (fallback.results || []).map((row) => ({
		video: row,
		seriesTitle: row.series_title ?? null,
		seriesSlug: row.series_slug ?? null
	}));
}

export async function listAdminVideos(db: D1Compat, filters: ListAdminVideosFilters = {}): Promise<VideosResponse> {
	const limit = Math.max(1, Math.min(500, Math.floor(filters.limit ?? 200)));
	const offset = Math.max(0, Math.floor(filters.offset ?? 0));

	let where = 'WHERE 1 = 1';
	const params: Array<string | number> = [];

	if (filters.q?.trim()) {
		where += ' AND title LIKE ?';
		params.push(`%${filters.q.trim()}%`);
	}

	if (filters.visibility && filters.visibility !== 'all') {
		where += ' AND visibility = ?';
		params.push(filters.visibility);
	}

	if (filters.ingestStatus && filters.ingestStatus !== 'all') {
		where += ' AND ingest_status = ?';
		params.push(filters.ingestStatus);
	}

	if (filters.seriesId?.trim()) {
		where += ' AND series_id = ?';
		params.push(filters.seriesId.trim());
	}

	if (filters.tier) {
		where += ' AND tier = ?';
		params.push(filters.tier);
	}

	if (filters.featured === 'true') {
		where += ' AND is_featured = 1';
	}
	if (filters.featured === 'false') {
		where += ' AND is_featured = 0';
	}

	const rows = await db
		.prepare(
			`SELECT *
			 FROM videos
			 ${where}
			 ORDER BY updated_at DESC
			 LIMIT ? OFFSET ?`
		)
		.bind(...params, limit, offset)
		.all<Video>();

	const countRow = await db
		.prepare(`SELECT COUNT(*) as count FROM videos ${where}`)
		.bind(...params)
		.first<{ count: number }>();

	return {
		videos: rows.results || [],
		total: countRow?.count ?? 0
	};
}
