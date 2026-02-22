import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getVideoByIdMock, getVideosMock, getDBFromPlatformMock } = vi.hoisted(() => ({
	getVideoByIdMock: vi.fn(),
	getVideosMock: vi.fn(),
	getDBFromPlatformMock: vi.fn()
}));

vi.mock('$lib/server/db/videos', () => ({
	getVideoById: getVideoByIdMock,
	getVideos: getVideosMock
}));

vi.mock('$lib/server/d1-compat', () => ({
	getDBFromPlatform: getDBFromPlatformMock
}));

import { GET } from '../../../../../../routes/api/videos/[id]/related/+server';

const VALID_STREAM_UID = '22222222222222222222222222222222';

function createVideo(overrides: Partial<Record<string, unknown>> = {}) {
	return {
		id: 'vid_default',
		category: 'crew-call',
		episode_number: 1,
		visibility: 'published',
		ingest_status: 'ready',
		stream_uid: VALID_STREAM_UID,
		asset_path: '',
		...overrides
	};
}

describe('GET /api/videos/[id]/related', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		getDBFromPlatformMock.mockReturnValue({ db: 'mock' });
	});

	it('returns 404 when current video is not publicly playable', async () => {
		getVideoByIdMock.mockResolvedValue(
			createVideo({
				id: 'current',
				ingest_status: 'processing'
			})
		);

		const response = await GET({
			params: { id: 'current' },
			url: new URL('http://test.local/api/videos/current/related'),
			platform: {}
		} as never);

		expect(response.status).toBe(404);
	});

	it('returns only publicly playable related videos', async () => {
		getVideoByIdMock.mockResolvedValue(createVideo({ id: 'current', category: 'crew-call', episode_number: 2 }));
		getVideosMock.mockResolvedValue({
			videos: [
				createVideo({ id: 'current', category: 'crew-call', episode_number: 2 }),
				createVideo({ id: 'same_ready', category: 'crew-call', episode_number: 3, asset_path: '/videos/3.mp4', stream_uid: null }),
				createVideo({ id: 'same_failed', category: 'crew-call', episode_number: 4, ingest_status: 'failed' }),
				createVideo({ id: 'other_ready', category: 'kodiak', episode_number: 1, stream_uid: '33333333333333333333333333333333' }),
				createVideo({ id: 'other_processing', category: 'kodiak', ingest_status: 'processing', stream_uid: 'stream_pending' }),
				createVideo({ id: 'other_no_source', category: 'films', stream_uid: null, asset_path: '' })
			]
		});

		const response = await GET({
			params: { id: 'current' },
			url: new URL('http://test.local/api/videos/current/related?limit=10'),
			platform: {}
		} as never);

		expect(response.status).toBe(200);
		const body = (await response.json()) as {
			success: boolean;
			data: {
				sameCategory: Array<{ id: string }>;
				otherCategories: Array<{ id: string }>;
			};
		};

		expect(body.success).toBe(true);
		expect(body.data.sameCategory.map((video) => video.id)).toEqual(['same_ready']);
		expect(body.data.otherCategories.map((video) => video.id)).toEqual(['other_ready']);
	});
});
