import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getVideoByIdMock, getDBFromPlatformMock } = vi.hoisted(() => ({
	getVideoByIdMock: vi.fn(),
	getDBFromPlatformMock: vi.fn()
}));

vi.mock('$lib/server/db/videos', () => ({
	getVideoById: getVideoByIdMock
}));

vi.mock('$lib/server/d1-compat', () => ({
	getDBFromPlatform: getDBFromPlatformMock
}));

import { GET } from '../../../../../routes/api/videos/[id]/+server';

function createVideo(overrides: Partial<Record<string, unknown>> = {}) {
	return {
		id: 'vid_default',
		title: 'Video',
		visibility: 'published',
		ingest_status: 'ready',
		stream_uid: 'stream_1',
		asset_path: '',
		...overrides
	};
}

describe('GET /api/videos/[id]', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		getDBFromPlatformMock.mockReturnValue({ db: 'mock' });
	});

	it('returns 404 for non-playable videos', async () => {
		getVideoByIdMock.mockResolvedValue(
			createVideo({
				id: 'vid_processing',
				ingest_status: 'processing'
			})
		);

		await expect(
			GET({
				params: { id: 'vid_processing' },
				platform: {}
			} as never)
		).rejects.toMatchObject({ status: 404 });
	});

	it('returns success for publicly playable videos', async () => {
		getVideoByIdMock.mockResolvedValue(createVideo({ id: 'vid_ready' }));

		const response = await GET({
			params: { id: 'vid_ready' },
			platform: {}
		} as never);

		expect(response.status).toBe(200);
		const body = (await response.json()) as {
			success: boolean;
			data: { id: string };
		};
		expect(body.success).toBe(true);
		expect(body.data.id).toBe('vid_ready');
	});
});
