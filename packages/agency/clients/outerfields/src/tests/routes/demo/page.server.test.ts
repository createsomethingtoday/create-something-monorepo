import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getVideosMock, isAdminUserMock, getDBFromPlatformMock } = vi.hoisted(() => ({
	getVideosMock: vi.fn(),
	isAdminUserMock: vi.fn(),
	getDBFromPlatformMock: vi.fn()
}));

vi.mock('$lib/server/db/videos', () => ({
	getVideos: getVideosMock
}));

vi.mock('$lib/server/auth', () => ({
	isAdminUser: isAdminUserMock
}));

vi.mock('$lib/server/d1-compat', () => ({
	getDBFromPlatform: getDBFromPlatformMock
}));

import { load } from '../../../routes/demo/+page.server';

const VALID_STREAM_UID = '55555555555555555555555555555555';

function createVideo(overrides: Partial<Record<string, unknown>> = {}) {
	return {
		id: 'vid_default',
		title: 'Video',
		category: 'crew-call',
		tier: 'free',
		duration: 120,
		thumbnail_path: '/thumbnails/crew-call/ep01.jpg',
		episode_number: 1,
		created_at: 1000,
		visibility: 'published',
		ingest_status: 'ready',
		stream_uid: VALID_STREAM_UID,
		asset_path: '',
		description: null,
		...overrides
	};
}

describe('demo load', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		getDBFromPlatformMock.mockReturnValue({ db: 'mock' });
		isAdminUserMock.mockReturnValue(false);
	});

	it('only includes publicly playable videos in featured and category rows', async () => {
		getVideosMock.mockResolvedValue({
			videos: [
				createVideo({ id: 'ready_newest', created_at: 5000, category: 'films' }),
				createVideo({ id: 'ready_oldest', created_at: 1000, category: 'crew-call', stream_uid: null, asset_path: '/videos/cc1.mp4' }),
				createVideo({ id: 'processing_hidden', created_at: 6000, category: 'crew-call', ingest_status: 'processing' }),
				createVideo({ id: 'failed_hidden', created_at: 4000, category: 'kodiak', ingest_status: 'failed' }),
				createVideo({ id: 'missing_source_hidden', created_at: 3000, category: 'kodiak', stream_uid: null, asset_path: '' })
			],
			total: 5
		});

		const result = await load({
			locals: { user: { id: 'usr_1', email: 'member@example.com', name: 'Member One' } },
			platform: {}
		} as never);
		if (!result) {
			throw new Error('Expected demo load to return page data');
		}

		const typedResult = result as {
			totalVideos: number;
			featured: { id: string } | null;
			categories: Array<{ items: Array<{ id: string }> }>;
		};

		expect(typedResult.totalVideos).toBe(1);
		expect(typedResult.featured?.id).toBe('ready_newest');

		const returnedIds = typedResult.categories.flatMap((category) =>
			category.items.map((item) => item.id)
		);
		expect(returnedIds.sort()).toEqual(['ready_newest']);
	});
});
