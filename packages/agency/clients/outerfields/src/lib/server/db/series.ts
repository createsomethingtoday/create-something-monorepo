import type { D1Database } from '@cloudflare/workers-types';
import type { Video } from './videos';

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
	video: Video;
}

export interface CreateSeriesInput {
	slug: string;
	title: string;
	description?: string;
}

function nowSeconds(): number {
	return Math.floor(Date.now() / 1000);
}

function normalizeSlug(slug: string): string {
	return slug
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');
}

function createSeriesId(slug: string): string {
	return `series_${slug.replace(/-/g, '_')}`;
}

export async function getSeries(db: D1Database): Promise<Series[]> {
	const result = await db
		.prepare('SELECT * FROM series ORDER BY title ASC')
		.all<Series>();
	return result.results || [];
}

export async function getSeriesByIdentifier(
	db: D1Database,
	identifier: string
): Promise<Series | null> {
	const series = await db
		.prepare('SELECT * FROM series WHERE id = ? OR slug = ? LIMIT 1')
		.bind(identifier, identifier)
		.first<Series>();
	return series || null;
}

export async function createSeries(db: D1Database, input: CreateSeriesInput): Promise<Series> {
	const slug = normalizeSlug(input.slug);
	if (!slug) {
		throw new Error('Series slug cannot be empty');
	}

	const id = createSeriesId(slug);
	const now = nowSeconds();

	await db
		.prepare(
			`INSERT INTO series (id, slug, title, description, created_at, updated_at)
			 VALUES (?, ?, ?, ?, ?, ?)`
		)
		.bind(id, slug, input.title.trim(), input.description?.trim() || null, now, now)
		.run();

	const created = await getSeriesByIdentifier(db, id);
	if (!created) {
		throw new Error('Failed to create series');
	}

	return created;
}

export async function upsertSeries(db: D1Database, input: CreateSeriesInput): Promise<Series> {
	const slug = normalizeSlug(input.slug);
	if (!slug) {
		throw new Error('Series slug cannot be empty');
	}

	const id = createSeriesId(slug);
	const now = nowSeconds();

	await db
		.prepare(
			`INSERT INTO series (id, slug, title, description, created_at, updated_at)
			 VALUES (?, ?, ?, ?, ?, ?)
			 ON CONFLICT(slug) DO UPDATE SET
			 title = excluded.title,
			 description = COALESCE(excluded.description, series.description),
			 updated_at = excluded.updated_at`
		)
		.bind(id, slug, input.title.trim(), input.description?.trim() || null, now, now)
		.run();

	const created = await getSeriesByIdentifier(db, slug);
	if (!created) {
		throw new Error('Failed to upsert series');
	}

	return created;
}

export async function getSeriesVideos(
	db: D1Database,
	identifier: string
): Promise<SeriesEpisode[]> {
	const series = await getSeriesByIdentifier(db, identifier);
	if (!series) {
		return [];
	}

	const result = await db
		.prepare(
			`SELECT v.*
			 FROM videos v
			 WHERE v.series_id = ?
			 ORDER BY v.episode_number NULLS LAST, v.created_at ASC`
		)
		.bind(series.id)
		.all<Video>();

	return (result.results || []).map((video) => ({
		seriesId: series.id,
		seriesSlug: series.slug,
		seriesTitle: series.title,
		video
	}));
}
