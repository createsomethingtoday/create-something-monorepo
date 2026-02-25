import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getAdminVideoByIdMock, isAdminUserMock, getDBFromPlatformMock, resolveRuntimeEnvMock, runMock, bindMock, prepareMock } =
	vi.hoisted(() => {
		const hoistedRunMock = vi.fn();
		const hoistedBindMock = vi.fn(() => ({ run: hoistedRunMock }));
		const hoistedPrepareMock = vi.fn(() => ({ bind: hoistedBindMock }));

		return {
			getAdminVideoByIdMock: vi.fn(),
			isAdminUserMock: vi.fn(),
			getDBFromPlatformMock: vi.fn(),
			resolveRuntimeEnvMock: vi.fn(),
			runMock: hoistedRunMock,
			bindMock: hoistedBindMock,
			prepareMock: hoistedPrepareMock
		};
	});

vi.mock('$lib/server/db/videos', () => ({
	getAdminVideoById: getAdminVideoByIdMock
}));

vi.mock('$lib/server/admin', () => ({
	isAdminUser: isAdminUserMock
}));

vi.mock('$lib/server/d1-compat', () => ({
	getDBFromPlatform: getDBFromPlatformMock
}));

vi.mock('$lib/server/env', () => ({
	resolveRuntimeEnv: resolveRuntimeEnvMock
}));

import { POST } from '../../../../../../../../routes/api/v1/admin/videos/[id]/thumbnail/+server';

function writeU32BE(bytes: Uint8Array, offset: number, value: number): void {
	bytes[offset] = (value >>> 24) & 0xff;
	bytes[offset + 1] = (value >>> 16) & 0xff;
	bytes[offset + 2] = (value >>> 8) & 0xff;
	bytes[offset + 3] = value & 0xff;
}

function makePng(width: number, height: number): Uint8Array {
	const bytes = new Uint8Array(33);
	// PNG signature
	bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0);
	// IHDR chunk length
	writeU32BE(bytes, 8, 13);
	// IHDR
	bytes.set([0x49, 0x48, 0x44, 0x52], 12);
	writeU32BE(bytes, 16, width);
	writeU32BE(bytes, 20, height);
	bytes[24] = 8; // bit depth
	bytes[25] = 2; // color type
	bytes[26] = 0; // compression
	bytes[27] = 0; // filter
	bytes[28] = 0; // interlace
	// CRC placeholder
	bytes.set([0x00, 0x00, 0x00, 0x00], 29);
	return bytes;
}

function asArrayBuffer(bytes: Uint8Array): ArrayBuffer {
	return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

function makeFormRequest(formData: FormData): Request {
	return new Request('http://test.local/api/v1/admin/videos/vid_1/thumbnail', {
		method: 'POST',
		body: formData
	});
}

describe('POST /api/v1/admin/videos/:id/thumbnail', () => {
	const putMock = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();
		resolveRuntimeEnvMock.mockReturnValue({});
		isAdminUserMock.mockReturnValue(true);
		getDBFromPlatformMock.mockReturnValue({
			prepare: prepareMock
		});
		getAdminVideoByIdMock.mockResolvedValue({
			id: 'vid_1',
			thumbnail_path: '/thumbnails/old.jpg'
		});
		putMock.mockResolvedValue(undefined);
	});

	it('returns 401 when user is missing', async () => {
		const formData = new FormData();
		formData.set('file', new File([asArrayBuffer(makePng(1280, 720))], 'thumb.png', { type: 'image/png' }));

		const response = await POST({
			params: { id: 'vid_1' },
			request: makeFormRequest(formData),
			locals: {},
			platform: { env: { VIDEO_ASSETS: { put: putMock } } }
		} as never);

		expect(response.status).toBe(401);
	});

	it('returns 403 when user is not admin', async () => {
		isAdminUserMock.mockReturnValue(false);
		const formData = new FormData();
		formData.set('file', new File([asArrayBuffer(makePng(1280, 720))], 'thumb.png', { type: 'image/png' }));

		const response = await POST({
			params: { id: 'vid_1' },
			request: makeFormRequest(formData),
			locals: { user: { id: 'usr_1', email: 'member@example.com' } },
			platform: { env: { VIDEO_ASSETS: { put: putMock } } }
		} as never);

		expect(response.status).toBe(403);
	});

	it('returns 404 when video is not found', async () => {
		getAdminVideoByIdMock.mockResolvedValueOnce(null);
		const formData = new FormData();
		formData.set('file', new File([asArrayBuffer(makePng(1280, 720))], 'thumb.png', { type: 'image/png' }));

		const response = await POST({
			params: { id: 'missing' },
			request: makeFormRequest(formData),
			locals: { user: { id: 'usr_1', email: 'admin@example.com' } },
			platform: { env: { VIDEO_ASSETS: { put: putMock } } }
		} as never);

		expect(response.status).toBe(404);
	});

	it('returns 500 when VIDEO_ASSETS binding is missing', async () => {
		const formData = new FormData();
		formData.set('file', new File([asArrayBuffer(makePng(1280, 720))], 'thumb.png', { type: 'image/png' }));

		const response = await POST({
			params: { id: 'vid_1' },
			request: makeFormRequest(formData),
			locals: { user: { id: 'usr_1', email: 'admin@example.com' } },
			platform: { env: {} }
		} as never);

		expect(response.status).toBe(500);
	});

	it('returns 400 when file is missing', async () => {
		const formData = new FormData();
		const response = await POST({
			params: { id: 'vid_1' },
			request: makeFormRequest(formData),
			locals: { user: { id: 'usr_1', email: 'admin@example.com' } },
			platform: { env: { VIDEO_ASSETS: { put: putMock } } }
		} as never);

		expect(response.status).toBe(400);
	});

	it('returns 400 for unsupported MIME type', async () => {
		const formData = new FormData();
		formData.set('file', new File([new Uint8Array([0x01, 0x02, 0x03])], 'note.txt', { type: 'text/plain' }));

		const response = await POST({
			params: { id: 'vid_1' },
			request: makeFormRequest(formData),
			locals: { user: { id: 'usr_1', email: 'admin@example.com' } },
			platform: { env: { VIDEO_ASSETS: { put: putMock } } }
		} as never);

		expect(response.status).toBe(400);
	});

	it('returns 400 for files larger than 5MB', async () => {
		const oversizedBytes = new Uint8Array(5 * 1024 * 1024 + 1);
		oversizedBytes[0] = 0x89;
		oversizedBytes[1] = 0x50;
		oversizedBytes[2] = 0x4e;
		oversizedBytes[3] = 0x47;

		const formData = new FormData();
		formData.set('file', new File([asArrayBuffer(oversizedBytes)], 'big.png', { type: 'image/png' }));

		const response = await POST({
			params: { id: 'vid_1' },
			request: makeFormRequest(formData),
			locals: { user: { id: 'usr_1', email: 'admin@example.com' } },
			platform: { env: { VIDEO_ASSETS: { put: putMock } } }
		} as never);

		expect(response.status).toBe(400);
	});

	it('returns 400 when dimensions are below minimum', async () => {
		const formData = new FormData();
		formData.set('file', new File([asArrayBuffer(makePng(320, 200))], 'small.png', { type: 'image/png' }));

		const response = await POST({
			params: { id: 'vid_1' },
			request: makeFormRequest(formData),
			locals: { user: { id: 'usr_1', email: 'admin@example.com' } },
			platform: { env: { VIDEO_ASSETS: { put: putMock } } }
		} as never);

		expect(response.status).toBe(400);
	});

	it('uploads thumbnail, updates DB, and returns updated video', async () => {
		getAdminVideoByIdMock
			.mockResolvedValueOnce({
				id: 'vid_1',
				thumbnail_path: '/thumbnails/old.jpg'
			})
			.mockResolvedValueOnce({
				id: 'vid_1',
				thumbnail_path: '/thumbnails/uploads/vid_1/new-file.jpg'
			});

		const formData = new FormData();
		formData.set('file', new File([asArrayBuffer(makePng(1280, 720))], 'poster.png', { type: 'image/png' }));

		const response = await POST({
			params: { id: 'vid_1' },
			request: makeFormRequest(formData),
			locals: { user: { id: 'usr_1', email: 'admin@example.com' } },
			platform: { env: { VIDEO_ASSETS: { put: putMock } } }
		} as never);

		expect(response.status).toBe(200);
		expect(putMock).toHaveBeenCalledTimes(1);
		const [uploadedKey, uploadedBytes, uploadedOptions] = putMock.mock.calls[0] as [
			string,
			Uint8Array,
			{
				httpMetadata: { contentType: string; cacheControl: string };
				customMetadata: Record<string, string>;
			}
		];
		expect(uploadedKey).toMatch(/^thumbnails\/uploads\/vid_1\/\d+-[a-f0-9]{10}\.png$/);
		expect(uploadedBytes).toBeInstanceOf(Uint8Array);
		expect(uploadedOptions.httpMetadata.contentType).toBe('image/png');
		expect(uploadedOptions.httpMetadata.cacheControl).toBe('public, max-age=3600');

		expect(prepareMock).toHaveBeenCalledWith(expect.stringContaining('UPDATE videos'));
		expect(bindMock).toHaveBeenCalledWith(expect.stringMatching(/^\/thumbnails\/uploads\/vid_1\//), expect.any(Number), 'vid_1');
		expect(runMock).toHaveBeenCalledTimes(1);

		const body = (await response.json()) as {
			success: boolean;
			data: { id: string; thumbnail_path: string };
			upload: { width: number; height: number; contentType: string };
		};
		expect(body.success).toBe(true);
		expect(body.data.id).toBe('vid_1');
		expect(body.upload.width).toBe(1280);
		expect(body.upload.height).toBe(720);
		expect(body.upload.contentType).toBe('image/png');
	});
});
