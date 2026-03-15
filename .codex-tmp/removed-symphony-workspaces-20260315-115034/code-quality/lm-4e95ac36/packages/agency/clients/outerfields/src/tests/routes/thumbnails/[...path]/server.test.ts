import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GET, HEAD } from '../../../../routes/thumbnails/[...path]/+server';

describe('GET/HEAD /thumbnails/[...path]', () => {
	const headMock = vi.fn();
	const getMock = vi.fn();

	const bucket = {
		head: headMock,
		get: getMock
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('returns 500 when VIDEO_ASSETS is not configured', async () => {
		const response = await GET({
			params: { path: 'uploads/vid_1/thumb.jpg' },
			platform: { env: {} }
		} as never);

		expect(response.status).toBe(500);
	});

	it('returns 400 for invalid path traversal', async () => {
		const response = await GET({
			params: { path: '../secret.jpg' },
			platform: { env: { VIDEO_ASSETS: bucket } }
		} as never);

		expect(response.status).toBe(400);
	});

	it('returns 404 when thumbnail does not exist', async () => {
		headMock.mockResolvedValue(null);

		const response = await GET({
			params: { path: 'uploads/vid_1/missing.jpg' },
			platform: { env: { VIDEO_ASSETS: bucket } }
		} as never);

		expect(response.status).toBe(404);
	});

	it('GET returns thumbnail bytes with cache headers', async () => {
		headMock.mockResolvedValue({
			size: 512,
			httpMetadata: { contentType: 'image/webp' },
			httpEtag: 'thumb-etag',
			uploaded: new Date('2026-01-01T00:00:00.000Z')
		});
		getMock.mockResolvedValue({
			body: new Uint8Array([1, 2, 3, 4])
		});

		const response = await GET({
			params: { path: 'uploads/vid_1/thumb.webp' },
			platform: { env: { VIDEO_ASSETS: bucket } }
		} as never);

		expect(response.status).toBe(200);
		expect(response.headers.get('content-type')).toBe('image/webp');
		expect(response.headers.get('cache-control')).toBe('public, max-age=3600');
		expect(response.headers.get('content-length')).toBe('512');
		expect(headMock).toHaveBeenCalledWith('thumbnails/uploads/vid_1/thumb.webp');
		expect(getMock).toHaveBeenCalledWith('thumbnails/uploads/vid_1/thumb.webp');
	});

	it('HEAD returns metadata headers for available thumbnails', async () => {
		headMock.mockResolvedValue({
			size: 1024,
			httpMetadata: { contentType: 'image/jpeg' },
			httpEtag: 'etag-jpg',
			uploaded: new Date('2026-01-02T00:00:00.000Z')
		});

		const response = await HEAD({
			params: { path: 'uploads/vid_1/thumb.jpg' },
			platform: { env: { VIDEO_ASSETS: bucket } }
		} as never);

		expect(response.status).toBe(200);
		expect(response.headers.get('content-type')).toBe('image/jpeg');
		expect(response.headers.get('content-length')).toBe('1024');
		expect(response.headers.get('cache-control')).toBe('public, max-age=3600');
	});
});
