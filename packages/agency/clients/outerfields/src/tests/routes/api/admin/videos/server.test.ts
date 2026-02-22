import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
	createVideoMock,
	getCategorySummariesMock,
	getVideosMock,
	searchVideosMock,
	isAdminUserMock,
	getDBFromPlatformMock
} = vi.hoisted(() => ({
	createVideoMock: vi.fn(),
	getCategorySummariesMock: vi.fn(),
	getVideosMock: vi.fn(),
	searchVideosMock: vi.fn(),
	isAdminUserMock: vi.fn(),
	getDBFromPlatformMock: vi.fn()
}));

vi.mock('$lib/server/db/videos', () => ({
	createVideo: createVideoMock,
	getCategorySummaries: getCategorySummariesMock,
	getVideos: getVideosMock,
	searchVideos: searchVideosMock
}));

vi.mock('$lib/server/auth', () => ({
	isAdminUser: isAdminUserMock
}));

vi.mock('$lib/server/d1-compat', () => ({
	getDBFromPlatform: getDBFromPlatformMock
}));

import { POST } from '../../../../../routes/api/admin/videos/+server';

describe('POST /api/admin/videos', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		isAdminUserMock.mockReturnValue(true);
		getDBFromPlatformMock.mockReturnValue({ db: 'mock' });
		createVideoMock.mockResolvedValue({ id: 'vid_1' });
	});

	it('rejects invalid JSON assetPath after normalization', async () => {
		const response = await POST({
			request: new Request('http://test.local/api/admin/videos', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					title: 'Video',
					category: 'crew-call',
					duration: 120,
					assetPath: 'https://bad url',
					thumbnailPath: '/thumbnails/cover.jpg'
				})
			}),
			locals: { user: { id: 'usr_1', email: 'admin@example.com' } },
			platform: {}
		} as never);

		expect(response.status).toBe(400);
		expect(createVideoMock).not.toHaveBeenCalled();
	});

	it('rejects multipart uploads when video MIME is not video/*', async () => {
		const formData = new FormData();
		formData.set('title', 'Video');
		formData.set('category', 'crew-call');
		formData.set('duration', '120');
		formData.set('video', new File(['not-video'], 'bad.txt', { type: 'text/plain' }));

		const response = await POST({
			request: new Request('http://test.local/api/admin/videos', {
				method: 'POST',
				body: formData
			}),
			locals: { user: { id: 'usr_1', email: 'admin@example.com' } },
			platform: {}
		} as never);

		expect(response.status).toBe(400);
		expect(createVideoMock).not.toHaveBeenCalled();
	});

	it('normalizes JSON asset/thumbnail paths before save', async () => {
		const response = await POST({
			request: new Request('http://test.local/api/admin/videos', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					title: 'Video',
					category: 'crew-call',
					duration: 120,
					assetPath: 'videos/ep1.mp4',
					thumbnailPath: 'thumbnails/ep1.jpg'
				})
			}),
			locals: { user: { id: 'usr_1', email: 'admin@example.com' } },
			platform: {}
		} as never);

		expect(response.status).toBe(201);
		expect(createVideoMock).toHaveBeenCalledWith(
			{ db: 'mock' },
			expect.objectContaining({
				asset_path: '/videos/ep1.mp4',
				thumbnail_path: '/thumbnails/ep1.jpg'
			})
		);
	});
});
