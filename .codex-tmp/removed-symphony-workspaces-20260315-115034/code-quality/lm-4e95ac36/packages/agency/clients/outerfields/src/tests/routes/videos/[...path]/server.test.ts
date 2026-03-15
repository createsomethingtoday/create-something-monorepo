import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GET, HEAD } from '../../../../routes/videos/[...path]/+server';

describe('GET/HEAD /videos/[...path]', () => {
	const headMock = vi.fn();
	const getMock = vi.fn();

	const bucket = {
		head: headMock,
		get: getMock
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('returns 404 when the object does not exist', async () => {
		headMock.mockResolvedValue(null);

		const response = await GET({
			request: new Request('https://outerfields-pcn.pages.dev/videos/trailers/trailer01.mp4'),
			params: { path: 'trailers/trailer01.mp4' },
			platform: { env: { VIDEO_ASSETS: bucket } }
		} as never);

		expect(response.status).toBe(404);
	});

	it('returns 206 with correct range headers for byte-range requests', async () => {
		headMock.mockResolvedValue({
			size: 100,
			httpMetadata: { contentType: 'video/mp4' },
			httpEtag: 'etag123',
			uploaded: new Date('2026-01-01T00:00:00.000Z')
		});
		getMock.mockResolvedValue({
			body: new Uint8Array([1, 2, 3, 4, 5])
		});

		const response = await GET({
			request: new Request('https://outerfields-pcn.pages.dev/videos/crew-call/ep01.mp4', {
				headers: { range: 'bytes=0-4' }
			}),
			params: { path: 'crew-call/ep01.mp4' },
			platform: { env: { VIDEO_ASSETS: bucket } }
		} as never);

		expect(response.status).toBe(206);
		expect(response.headers.get('content-range')).toBe('bytes 0-4/100');
		expect(response.headers.get('content-length')).toBe('5');
		expect(response.headers.get('accept-ranges')).toBe('bytes');
		expect(getMock).toHaveBeenCalledWith('videos/crew-call/ep01.mp4', {
			range: { offset: 0, length: 5 }
		});
	});

	it('returns 416 for invalid ranges', async () => {
		headMock.mockResolvedValue({
			size: 10,
			httpMetadata: { contentType: 'video/mp4' },
			httpEtag: 'etag123',
			uploaded: new Date('2026-01-01T00:00:00.000Z')
		});

		const response = await GET({
			request: new Request('https://outerfields-pcn.pages.dev/videos/crew-call/ep01.mp4', {
				headers: { range: 'bytes=99-100' }
			}),
			params: { path: 'crew-call/ep01.mp4' },
			platform: { env: { VIDEO_ASSETS: bucket } }
		} as never);

		expect(response.status).toBe(416);
		expect(response.headers.get('content-range')).toBe('bytes */10');
		expect(getMock).not.toHaveBeenCalled();
	});

	it('HEAD returns metadata headers for available objects', async () => {
		headMock.mockResolvedValue({
			size: 2048,
			httpMetadata: { contentType: 'video/mp4' },
			httpEtag: 'etag456',
			uploaded: new Date('2026-01-02T00:00:00.000Z')
		});

		const response = await HEAD({
			params: { path: 'trailers/trailer01.mp4' },
			platform: { env: { VIDEO_ASSETS: bucket } }
		} as never);

		expect(response.status).toBe(200);
		expect(response.headers.get('content-type')).toBe('video/mp4');
		expect(response.headers.get('content-length')).toBe('2048');
		expect(response.headers.get('accept-ranges')).toBe('bytes');
	});
});
