import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
	getVideoByIdMock,
	getAdminVideoByIdMock,
	getVideosMock,
	getDBFromPlatformMock,
	getSeriesByIdentifierMock,
	isAdminUserMock,
	resolveRuntimeEnvMock
} = vi.hoisted(() => ({
	getVideoByIdMock: vi.fn(),
	getAdminVideoByIdMock: vi.fn(),
	getVideosMock: vi.fn(),
	getDBFromPlatformMock: vi.fn(),
	getSeriesByIdentifierMock: vi.fn(),
	isAdminUserMock: vi.fn(),
	resolveRuntimeEnvMock: vi.fn()
}));

vi.mock('$lib/server/db/videos', () => ({
	getVideoById: getVideoByIdMock,
	getAdminVideoById: getAdminVideoByIdMock,
	getVideos: getVideosMock
}));

vi.mock('$lib/server/d1-compat', () => ({
	getDBFromPlatform: getDBFromPlatformMock
}));

vi.mock('$lib/server/db/series', () => ({
	getSeriesByIdentifier: getSeriesByIdentifierMock
}));

vi.mock('$lib/server/admin', () => ({
	isAdminUser: isAdminUserMock
}));

vi.mock('$lib/server/env', () => ({
	resolveRuntimeEnv: resolveRuntimeEnvMock
}));

import { load } from '../../../../routes/watch/[id]/+page.server';

const VALID_STREAM_UID = '66666666666666666666666666666666';

function createVideo(overrides: Partial<Record<string, unknown>> = {}) {
	return {
		id: 'vid_default',
		title: 'Video',
		category: 'crew-call',
		episode_number: 1,
		tier: 'free',
		visibility: 'published',
		ingest_status: 'ready',
		stream_uid: VALID_STREAM_UID,
		asset_path: '',
		series_id: null,
		...overrides
	};
}

describe('watch/[id] load', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		getDBFromPlatformMock.mockReturnValue({ db: 'mock' });
		resolveRuntimeEnvMock.mockReturnValue({});
		isAdminUserMock.mockReturnValue(false);
		getSeriesByIdentifierMock.mockResolvedValue(null);
	});

	it('keeps current video visible while filtering related/next/prev to playable videos', async () => {
		const current = createVideo({
			id: 'current',
			episode_number: 2,
			ingest_status: 'processing',
			stream_uid: 'stream_current'
		});

		getVideoByIdMock.mockResolvedValue(current);
		getVideosMock.mockResolvedValue({
			videos: [
				createVideo({ id: 'prev_ready', episode_number: 1, stream_uid: null, asset_path: '/videos/1.mp4' }),
				current,
				createVideo({ id: 'next_failed', episode_number: 3, ingest_status: 'failed', stream_uid: 'stream_failed' }),
				createVideo({ id: 'next_ready', episode_number: 4, stream_uid: '77777777777777777777777777777777' }),
				createVideo({ id: 'other_ready', category: 'kodiak', episode_number: 1, stream_uid: null, asset_path: '/videos/k1.mp4' }),
				createVideo({ id: 'other_pending', category: 'kodiak', ingest_status: 'pending_upload', stream_uid: 'stream_pending' })
			]
		});

		const result = await load({
			params: { id: 'current' },
			locals: { user: null },
			platform: {}
		} as never);
		if (!result) {
			throw new Error('Expected watch load to return page data');
		}

		const typedResult = result as {
			video: { id: string };
			related: {
				sameCategory: Array<{ id: string }>;
				otherCategories: Array<{ id: string }>;
				prevVideo: { id: string } | null;
				nextVideo: { id: string } | null;
			};
		};

		expect(typedResult.video.id).toBe('current');
		expect(typedResult.related.sameCategory.map((video) => video.id)).toEqual(['prev_ready', 'next_ready']);
		expect(typedResult.related.otherCategories.map((video) => video.id)).toEqual(['other_ready']);
		expect(typedResult.related.prevVideo?.id).toBe('prev_ready');
		expect(typedResult.related.nextVideo?.id).toBe('next_ready');
	});
});
