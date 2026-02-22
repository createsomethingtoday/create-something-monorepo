import { beforeEach, describe, expect, it, vi } from 'vitest';

const { updateVideoMock, deleteVideoMock, isAdminUserMock, getDBFromPlatformMock } = vi.hoisted(() => ({
	updateVideoMock: vi.fn(),
	deleteVideoMock: vi.fn(),
	isAdminUserMock: vi.fn(),
	getDBFromPlatformMock: vi.fn()
}));

vi.mock('$lib/server/db/videos', () => ({
	updateVideo: updateVideoMock,
	deleteVideo: deleteVideoMock
}));

vi.mock('$lib/server/auth', () => ({
	isAdminUser: isAdminUserMock
}));

vi.mock('$lib/server/d1-compat', () => ({
	getDBFromPlatform: getDBFromPlatformMock
}));

import { PATCH } from '../../../../../../routes/api/admin/videos/[id]/+server';

describe('PATCH /api/admin/videos/[id]', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		isAdminUserMock.mockReturnValue(true);
		getDBFromPlatformMock.mockReturnValue({ db: 'mock' });
		updateVideoMock.mockResolvedValue({ id: 'vid_1' });
	});

	it('rejects attempts to clear assetPath', async () => {
		const response = await PATCH({
			params: { id: 'vid_1' },
			request: new Request('http://test.local/api/admin/videos/vid_1', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ assetPath: '   ' })
			}),
			locals: { user: { id: 'usr_1', email: 'admin@example.com' } },
			platform: {}
		} as never);

		expect(response.status).toBe(400);
		expect(updateVideoMock).not.toHaveBeenCalled();
	});

	it('normalizes assetPath/thumbnailPath values before update', async () => {
		const response = await PATCH({
			params: { id: 'vid_1' },
			request: new Request('http://test.local/api/admin/videos/vid_1', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					assetPath: 'videos/ep1.mp4',
					thumbnailPath: 'thumbnails/ep1.jpg'
				})
			}),
			locals: { user: { id: 'usr_1', email: 'admin@example.com' } },
			platform: {}
		} as never);

		expect(response.status).toBe(200);
		expect(updateVideoMock).toHaveBeenCalledWith(
			{ db: 'mock' },
			'vid_1',
			expect.objectContaining({
				asset_path: '/videos/ep1.mp4',
				thumbnail_path: '/thumbnails/ep1.jpg'
			})
		);
	});
});
