import type { D1Database } from '@cloudflare/workers-types';

export interface Video {
	id: string;
	title: string;
	category: string;
	episode_number: number | null;
	tier: 'free' | 'preview' | 'gated';
	duration: number;
	asset_path: string;
	thumbnail_path: string;
	description: string | null;
	created_at: number;
	updated_at: number;
}

export interface VideosResponse {
	videos: Video[];
	total: number;
}

export interface CreateVideoInput {
	id?: string;
	title: string;
	category: string;
	episode_number?: number | null;
	tier: 'free' | 'preview' | 'gated';
	duration: number;
	asset_path: string;
	thumbnail_path: string;
	description?: string | null;
}

export interface UpdateVideoInput {
	title?: string;
	category?: string;
	episode_number?: number | null;
	tier?: 'free' | 'preview' | 'gated';
	duration?: number;
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

/**
 * Get all videos, optionally filtered by category
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
 * Get videos grouped by category
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
 * Get a single video by ID
 */
export async function getVideoById(db: D1Database, id: string): Promise<Video | null> {
	const result = await db.prepare('SELECT * FROM videos WHERE id = ?').bind(id).first<Video>();

	return result || null;
}

/**
 * Get videos by tier (free, preview, gated)
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
 * Get free videos (first episodes + trailers)
 */
export async function getFreeVideos(db: D1Database): Promise<VideosResponse> {
	return getVideosByTier(db, 'free');
}

/**
 * Search videos by title
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

function buildVideoId(title: string): string {
	const slug = title
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, 40);

	return `vid_${slug || 'upload'}_${Date.now()}`;
}

/**
 * Create a new video record.
 */
export async function createVideo(db: D1Database, input: CreateVideoInput): Promise<Video> {
	const id = input.id || buildVideoId(input.title);
	const now = Date.now();

	await db
		.prepare(
			`INSERT INTO videos (
				id, title, category, episode_number, tier, duration,
				asset_path, thumbnail_path, description, created_at, updated_at
			)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
		)
		.bind(
			id,
			input.title,
			input.category,
			input.episode_number ?? null,
			input.tier,
			input.duration,
			input.asset_path,
			input.thumbnail_path,
			input.description ?? null,
			now,
			now
		)
		.run();

	const created = await getVideoById(db, id);
	if (!created) {
		throw new Error('Failed to create video');
	}

	return created;
}

/**
 * Update an existing video with partial fields.
 */
export async function updateVideo(
	db: D1Database,
	id: string,
	updates: UpdateVideoInput
): Promise<Video | null> {
	const current = await getVideoById(db, id);
	if (!current) return null;

	await db
		.prepare(
			`UPDATE videos
			 SET title = ?,
			     category = ?,
			     episode_number = ?,
			     tier = ?,
			     duration = ?,
			     asset_path = ?,
			     thumbnail_path = ?,
			     description = ?,
			     updated_at = ?
			 WHERE id = ?`
		)
		.bind(
			updates.title ?? current.title,
			updates.category ?? current.category,
			updates.episode_number === undefined ? current.episode_number : updates.episode_number,
			updates.tier ?? current.tier,
			updates.duration ?? current.duration,
			updates.asset_path ?? current.asset_path,
			updates.thumbnail_path ?? current.thumbnail_path,
			updates.description === undefined ? current.description : updates.description,
			Date.now(),
			id
		)
		.run();

	return getVideoById(db, id);
}

/**
 * Delete a video by ID.
 */
export async function deleteVideo(db: D1Database, id: string): Promise<boolean> {
	const result = await db.prepare('DELETE FROM videos WHERE id = ?').bind(id).run();
	return (result.meta.changes || 0) > 0;
}

/**
 * Get category-level totals for admin management.
 */
export async function getCategorySummaries(db: D1Database): Promise<CategorySummary[]> {
	const result = await db
		.prepare(
			`SELECT
				category,
				COUNT(*) as total,
				SUM(CASE WHEN tier = 'free' THEN 1 ELSE 0 END) as free,
				SUM(CASE WHEN tier = 'preview' THEN 1 ELSE 0 END) as preview,
				SUM(CASE WHEN tier = 'gated' THEN 1 ELSE 0 END) as gated
			 FROM videos
			 GROUP BY category
			 ORDER BY category ASC`
		)
		.all<CategorySummary>();

	return result.results || [];
}

/**
 * Rename a category across all videos.
 */
export async function renameCategory(
	db: D1Database,
	fromCategory: string,
	toCategory: string
): Promise<number> {
	const result = await db
		.prepare('UPDATE videos SET category = ?, updated_at = ? WHERE category = ?')
		.bind(toCategory, Date.now(), fromCategory)
		.run();

	return result.meta.changes || 0;
}
