import { beforeEach, describe, expect, it, vi } from 'vitest';

const getVideosMock = vi.fn();
const getVideosByCategoryMock = vi.fn();
const getDBFromPlatformMock = vi.fn();

vi.mock('$lib/server/db/videos', () => ({
	getVideos: getVideosMock,
	getVideosByCategory: getVideosByCategoryMock
}));

vi.mock('$lib/server/d1-compat', () => ({
	getDBFromPlatform: getDBFromPlatformMock
}));

import { GET } from '../../../../routes/api/videos/+server';

function createVideo(overrides: Partial<Record<string, unknown>> = {}) {
	return {
		id: 'vid_default',
		visibility: 'published',
		ingest_status: 'ready',
		stream_uid: 'stream_1',
		asset_path: '',
		...overrides
	};
}

describe('GET /api/videos', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		getDBFromPlatformMock.mockReturnValue({ db: 'mock' });
	});

	it('returns only publicly playable videos in the default list response', async () => {
		getVideosMock.mockResolvedValue({
			videos: [
				createVideo({ id: 'playable_stream', stream_uid: 'stream_1' }),
				createVideo({ id: 'playable_asset', stream_uid: null, asset_path: '/videos/asset.mp4' }),
				createVideo({ id: 'processing', ingest_status: 'processing' }),
				createVideo({ id: 'failed', ingest_status: 'failed' }),
				createVideo({ id: 'missing_source', stream_uid: null, asset_path: '' })
			],
			total: 5
		});

		const response = await GET({
			url: new URL('http://test.local/api/videos'),
			platform: {}
		} as never);

		expect(response.status).toBe(200);
		const body = (await response.json()) as {
			success: boolean;
			data: { total: number; videos: Array<{ id: string }> };
		};
		expect(body.success).toBe(true);
		expect(body.data.total).toBe(2);
		expect(body.data.videos.map((video) => video.id)).toEqual(['playable_stream', 'playable_asset']);
	});

	it('filters grouped responses and removes empty categories', async () => {
		getVideosByCategoryMock.mockResolvedValue({
			films: [
				createVideo({ id: 'films_ready', stream_uid: null, asset_path: '/videos/films-ready.mp4' }),
				createVideo({ id: 'films_pending', ingest_status: 'pending_upload', stream_uid: 'stream_pending' })
			],
			drafts: [
				createVideo({ id: 'draft_only', visibility: 'draft', stream_uid: 'stream_draft' })
			]
		});

		const response = await GET({
			url: new URL('http://test.local/api/videos?grouped=true'),
			platform: {}
		} as never);

		expect(response.status).toBe(200);
		const body = (await response.json()) as {
			success: boolean;
			data: Record<string, Array<{ id: string }>>;
		};
		expect(body.success).toBe(true);
		expect(Object.keys(body.data)).toEqual(['films']);
		expect(body.data.films.map((video) => video.id)).toEqual(['films_ready']);
	});
});
