import type { D1Compat } from '$lib/server/d1-compat';
import type { Video } from './videos';

export type SeriesVisibility = 'draft' | 'published' | 'archived';

export interface Series {
	id: string;
	slug: string;
	title: string;
	description: string | null;
	visibility: SeriesVisibility;
	sort_order: number;
	home_filters: string;
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

export async function getSeries(db: D1Compat): Promise<Series[]> {
	const result = await db
		.prepare(`SELECT * FROM series WHERE visibility = 'published' ORDER BY sort_order ASC, title ASC`)
		.all<Series>();
	return result.results || [];
}

export async function listAdminSeries(db: D1Compat): Promise<Series[]> {
	const result = await db.prepare('SELECT * FROM series ORDER BY sort_order ASC, title ASC').all<Series>();
	return result.results || [];
}

export async function getSeriesByIdentifier(db: D1Compat, identifier: string): Promise<Series | null> {
	const byId = await db.prepare('SELECT * FROM series WHERE id = ?').bind(identifier).first<Series>();
	if (byId) {
		return byId;
	}

	return (
		(await db.prepare('SELECT * FROM series WHERE slug = ?')
			.bind(identifier)
			.first<Series>()) || null
	);
}

export async function createSeries(db: D1Compat, input: CreateSeriesInput): Promise<Series> {
	const slug = normalizeSlug(input.slug);
	if (!slug) {
		throw new Error('Series slug cannot be empty');
	}

	const id = createSeriesId(slug);
	const now = nowSeconds();

	await db.prepare(
		`INSERT INTO series (id, slug, title, description, home_filters, created_at, updated_at)
		 VALUES (?, ?, ?, ?, ?, ?, ?)`
	)
		.bind(id, slug, input.title.trim(), input.description?.trim() || null, '["series"]', now, now)
		.run();

	const created = await getSeriesByIdentifier(db, id);
	if (!created) {
		throw new Error('Failed to create series');
	}

	return created;
}

export async function upsertSeries(db: D1Compat, input: CreateSeriesInput): Promise<Series> {
	const slug = normalizeSlug(input.slug);
	if (!slug) {
		throw new Error('Series slug cannot be empty');
	}

	const id = createSeriesId(slug);
	const now = nowSeconds();

	await db.prepare(
		`INSERT INTO series (id, slug, title, description, home_filters, created_at, updated_at)
		 VALUES (?, ?, ?, ?, ?, ?, ?)
		 ON CONFLICT(slug) DO UPDATE SET
		 title = excluded.title,
		 description = COALESCE(excluded.description, series.description),
		 updated_at = excluded.updated_at`
	)
		.bind(id, slug, input.title.trim(), input.description?.trim() || null, '["series"]', now, now)
		.run();

	const created = await getSeriesByIdentifier(db, slug);
	if (!created) {
		throw new Error('Failed to upsert series');
	}

	return created;
}

export async function getSeriesVideos(db: D1Compat, identifier: string): Promise<SeriesEpisode[]> {
	const series = await getSeriesByIdentifier(db, identifier);
	if (!series) {
		return [];
	}

	const result = await db
		.prepare(
			`SELECT v.*
			 FROM videos v
			 WHERE v.series_id = ?
			   AND v.visibility = 'published'
			 ORDER BY v.episode_number NULLS LAST, v.created_at ASC`
		)
		.bind(series.id)
		.all<Video>();

	return (result.results || []).map((video: Video) => ({
		seriesId: series.id,
		seriesSlug: series.slug,
		seriesTitle: series.title,
		video
	}));
}

export interface UpdateSeriesHomeConfigInput {
	title?: string;
	description?: string | null;
	visibility?: SeriesVisibility;
	sort_order?: number;
	home_filters?: string;
}

export async function updateSeriesHomeConfig(
	db: D1Compat,
	seriesId: string,
	input: UpdateSeriesHomeConfigInput
): Promise<Series | null> {
	const now = nowSeconds();

	await db.prepare(
		`UPDATE series
		 SET title = COALESCE(?, title),
			 description = COALESCE(?, description),
			 visibility = COALESCE(?, visibility),
			 sort_order = COALESCE(?, sort_order),
			 home_filters = COALESCE(?, home_filters),
			 updated_at = ?
		 WHERE id = ?`
	)
		.bind(
			input.title?.trim() || null,
			input.description === undefined ? null : input.description,
			input.visibility ?? null,
			Number.isFinite(input.sort_order) ? input.sort_order : null,
			input.home_filters ?? null,
			now,
			seriesId
		)
		.run();

	return getSeriesByIdentifier(db, seriesId);
}
