import { describe, expect, it, vi } from 'vitest';
import type { D1Compat } from '$lib/server/d1-compat';
import {
	getFeaturedCatalogVideos,
	getHomeCatalogRows,
	type HomeCatalogSeriesRow,
	type Video
} from '$lib/server/db/videos';

type FeaturedQueryRow = Video & {
	series_title: string | null;
	series_slug: string | null;
};

interface BindCall {
	sql: string;
	params: unknown[];
}

interface MockDbConfig {
	seriesRows?: HomeCatalogSeriesRow[];
	videosBySeriesId?: Record<string, Video[]>;
	featuredRows?: FeaturedQueryRow[];
	fallbackRows?: FeaturedQueryRow[];
}

const VALID_STREAM_UID_A = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const VALID_STREAM_UID_B = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
const VALID_STREAM_UID_C = 'cccccccccccccccccccccccccccccccc';

function createSeriesRow(overrides: Partial<HomeCatalogSeriesRow> = {}): HomeCatalogSeriesRow {
	return {
		id: 'series_crew_call',
		slug: 'crew-call',
		title: 'Crew Call',
		description: null,
		sort_order: 10,
		home_filters: '["series"]',
		...overrides
	};
}

function createVideo(overrides: Partial<Video> = {}): Video {
	return {
		id: 'vid_default',
		title: 'Video',
		category: 'crew-call',
		series_id: 'series_crew_call',
		episode_number: 1,
		tier: 'free',
		duration: 120,
		duration_seconds: 120,
		asset_path: '',
		stream_uid: VALID_STREAM_UID_A,
		thumbnail_path: '/thumbnails/default.jpg',
		description: null,
		ingest_status: 'ready',
		ingest_source: 'upload',
		source_bytes: null,
		playback_policy: 'public',
		playback_ready_at: null,
		failure_reason: null,
		visibility: 'published',
		is_featured: 0,
		featured_order: 0,
		created_at: 1000,
		updated_at: 1000,
		...overrides
	};
}

function createFeaturedRow(video: Video, overrides: Partial<FeaturedQueryRow> = {}): FeaturedQueryRow {
	return {
		...video,
		series_title: 'Series',
		series_slug: 'series',
		...overrides
	};
}

function createMockDb(config: MockDbConfig = {}): {
	db: D1Compat;
	prepareMock: ReturnType<typeof vi.fn>;
	bindCalls: BindCall[];
} {
	const bindCalls: BindCall[] = [];

	const resolveRows = (sql: string, params: unknown[]): unknown[] => {
		const normalized = sql.replace(/\s+/g, ' ').trim();

		if (normalized.includes('FROM series') && normalized.includes('ORDER BY sort_order ASC')) {
			return config.seriesRows || [];
		}

		if (normalized.includes('FROM videos') && normalized.includes('WHERE series_id = ?')) {
			const seriesId = String(params[0] ?? '');
			return config.videosBySeriesId?.[seriesId] || [];
		}

		if (normalized.includes('AND v.is_featured = 1')) {
			return config.featuredRows || [];
		}

		if (normalized.includes('ORDER BY v.updated_at DESC')) {
			return config.fallbackRows || [];
		}

		throw new Error(`Unexpected SQL in test mock: ${normalized}`);
	};

	const prepareMock = vi.fn((sql: string) => ({
		all: async <T = unknown>() => ({ results: resolveRows(sql, []) as T[] }),
		bind: (...params: unknown[]) => {
			bindCalls.push({ sql, params });
			return {
				all: async <T = unknown>() => ({ results: resolveRows(sql, params) as T[] })
			};
		}
	}));

	return {
		db: { prepare: prepareMock } as unknown as D1Compat,
		prepareMock,
		bindCalls
	};
}

describe('catalog visibility filters', () => {
	it('filters home rows to Stream-backed playable videos and drops empty series', async () => {
		const crewSeriesId = 'series_crew_call';
		const kodiakSeriesId = 'series_kodiak';
		const { db } = createMockDb({
			seriesRows: [
				createSeriesRow({ id: crewSeriesId, slug: 'crew-call', sort_order: 10 }),
				createSeriesRow({ id: kodiakSeriesId, slug: 'kodiak', title: 'Kodiak', sort_order: 20 })
			],
			videosBySeriesId: {
				[crewSeriesId]: [
					createVideo({
						id: 'upload_ready',
						series_id: crewSeriesId,
						ingest_source: 'upload',
						stream_uid: VALID_STREAM_UID_A,
						episode_number: 1
					}),
					createVideo({
						id: 'generated_ready',
						series_id: crewSeriesId,
						ingest_source: 'generated',
						stream_uid: VALID_STREAM_UID_B,
						episode_number: 2
					}),
					createVideo({
						id: 'seeded_no_stream',
						series_id: crewSeriesId,
						ingest_source: 'generated',
						stream_uid: null,
						episode_number: 3
					}),
					createVideo({
						id: 'seeded_malformed_stream',
						series_id: crewSeriesId,
						ingest_source: 'generated',
						stream_uid: 'stream_invalid',
						episode_number: 4
					})
				],
				[kodiakSeriesId]: [
					createVideo({
						id: 'kodiak_no_stream',
						category: 'kodiak',
						series_id: kodiakSeriesId,
						stream_uid: null
					}),
					createVideo({
						id: 'kodiak_pending',
						category: 'kodiak',
						series_id: kodiakSeriesId,
						ingest_status: 'processing',
						stream_uid: VALID_STREAM_UID_C
					})
				]
			}
		});

		const rows = await getHomeCatalogRows(db);

		expect(rows).toHaveLength(1);
		expect(rows[0]?.series.slug).toBe('crew-call');
		expect(rows[0]?.videos.map((video) => video.id)).toEqual(['upload_ready', 'generated_ready']);
	});

	it('filters featured rows by playability, preserves featured-first order, and respects limit', async () => {
		const { db, bindCalls } = createMockDb({
			featuredRows: [
				createFeaturedRow(
					createVideo({
						id: 'featured_valid',
						is_featured: 1,
						featured_order: 1,
						stream_uid: VALID_STREAM_UID_A
					}),
					{ series_title: 'Crew Call', series_slug: 'crew-call' }
				),
				createFeaturedRow(
					createVideo({
						id: 'featured_hidden_no_stream',
						is_featured: 1,
						featured_order: 2,
						stream_uid: null
					}),
					{ series_title: 'Crew Call', series_slug: 'crew-call' }
				),
				createFeaturedRow(
					createVideo({
						id: 'featured_hidden_bad_stream',
						is_featured: 1,
						featured_order: 3,
						stream_uid: 'stream_invalid'
					}),
					{ series_title: 'Crew Call', series_slug: 'crew-call' }
				)
			],
			fallbackRows: [
				createFeaturedRow(
					createVideo({
						id: 'fallback_valid_1',
						stream_uid: VALID_STREAM_UID_B
					}),
					{ series_title: 'Films', series_slug: 'films' }
				),
				createFeaturedRow(
					createVideo({
						id: 'fallback_hidden_no_stream',
						stream_uid: null
					}),
					{ series_title: 'Films', series_slug: 'films' }
				),
				createFeaturedRow(
					createVideo({
						id: 'fallback_valid_2',
						stream_uid: VALID_STREAM_UID_C
					}),
					{ series_title: 'Kodiak', series_slug: 'kodiak' }
				)
			]
		});

		const rows = await getFeaturedCatalogVideos(db, 2);

		expect(rows).toHaveLength(2);
		expect(rows.map((row) => row.video.id)).toEqual(['featured_valid', 'fallback_valid_1']);
		expect(bindCalls.map((call) => call.params[0])).toEqual([8, 8]);
	});

	it('keeps Stream-backed videos visible regardless of ingest_source', async () => {
		const crewSeriesId = 'series_crew_call';
		const { db } = createMockDb({
			seriesRows: [createSeriesRow({ id: crewSeriesId })],
			videosBySeriesId: {
				[crewSeriesId]: [
					createVideo({
						id: 'upload_source',
						ingest_source: 'upload',
						stream_uid: VALID_STREAM_UID_A
					}),
					createVideo({
						id: 'generated_source',
						ingest_source: 'generated',
						stream_uid: VALID_STREAM_UID_B
					})
				]
			}
		});

		const rows = await getHomeCatalogRows(db);
		const ids = rows[0]?.videos.map((video) => video.id) ?? [];

		expect(ids).toEqual(['upload_source', 'generated_source']);
	});
});
