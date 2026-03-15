import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
	attachStreamUidToVideoMock,
	createVideoUploadReservationMock,
	markVideoUploadFailedMock,
	getSeriesByIdentifierMock,
	isAdminUserMock,
	createTusDirectUploadMock,
	getMaxDirectUploadBytesMock,
	getDBFromPlatformMock,
	resolveRuntimeEnvMock
} = vi.hoisted(() => ({
	attachStreamUidToVideoMock: vi.fn(),
	createVideoUploadReservationMock: vi.fn(),
	markVideoUploadFailedMock: vi.fn(),
	getSeriesByIdentifierMock: vi.fn(),
	isAdminUserMock: vi.fn(),
	createTusDirectUploadMock: vi.fn(),
	getMaxDirectUploadBytesMock: vi.fn(() => 30_000_000_000),
	getDBFromPlatformMock: vi.fn(),
	resolveRuntimeEnvMock: vi.fn()
}));

vi.mock('$lib/server/db/videos', () => ({
	attachStreamUidToVideo: attachStreamUidToVideoMock,
	createVideoUploadReservation: createVideoUploadReservationMock,
	markVideoUploadFailed: markVideoUploadFailedMock
}));

vi.mock('$lib/server/db/series', () => ({
	getSeriesByIdentifier: getSeriesByIdentifierMock
}));

vi.mock('$lib/server/admin', () => ({
	isAdminUser: isAdminUserMock
}));

vi.mock('$lib/server/stream', () => ({
	createTusDirectUpload: createTusDirectUploadMock,
	getMaxDirectUploadBytes: getMaxDirectUploadBytesMock
}));

vi.mock('$lib/server/d1-compat', () => ({
	getDBFromPlatform: getDBFromPlatformMock
}));

vi.mock('$lib/server/env', () => ({
	resolveRuntimeEnv: resolveRuntimeEnvMock
}));

import { POST } from '../../../../../../routes/api/v1/uploads/init/+server';

const VALID_STREAM_UID = '11111111111111111111111111111111';

describe('POST /api/v1/uploads/init', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		resolveRuntimeEnvMock.mockReturnValue({});
		isAdminUserMock.mockReturnValue(true);
		getDBFromPlatformMock.mockReturnValue({ db: 'mock' });
		getSeriesByIdentifierMock.mockResolvedValue({ id: 'series_1', slug: 'crew-call' });
		createVideoUploadReservationMock.mockResolvedValue({ id: 'vid_1' });
		createTusDirectUploadMock.mockResolvedValue({
			streamUid: VALID_STREAM_UID,
			uploadUrl: 'https://upload.example/tus',
			expiresAt: '2099-01-01T00:00:00.000Z'
		});
	});

	it('rejects non-positive maxDurationSeconds', async () => {
		const response = await POST({
			request: new Request('http://test.local/api/v1/uploads/init', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					title: 'Upload Test',
					seriesId: 'series_1',
					fileSizeBytes: 12345,
					maxDurationSeconds: 0
				})
			}),
			locals: { user: { id: 'usr_1', email: 'admin@example.com' } },
			platform: {}
		} as never);

		expect(response.status).toBe(400);
		expect(createVideoUploadReservationMock).not.toHaveBeenCalled();
	});

	it('floors and forwards valid maxDurationSeconds to reservation and stream init', async () => {
		const response = await POST({
			request: new Request('http://test.local/api/v1/uploads/init', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					title: 'Upload Test',
					seriesId: 'series_1',
					fileSizeBytes: 12345,
					maxDurationSeconds: 42.9
				})
			}),
			locals: { user: { id: 'usr_1', email: 'admin@example.com' } },
			platform: {}
		} as never);

		expect(response.status).toBe(200);
		expect(createVideoUploadReservationMock).toHaveBeenCalledWith(
			{ db: 'mock' },
			expect.objectContaining({
				durationSeconds: 42
			})
		);
		expect(createTusDirectUploadMock).toHaveBeenCalledWith(
			{},
			expect.objectContaining({
				maxDurationSeconds: 42
			})
		);
		expect(attachStreamUidToVideoMock).toHaveBeenCalledWith({ db: 'mock' }, 'vid_1', VALID_STREAM_UID);
	});

	it('marks the reservation as failed when Stream returns an invalid stream UID', async () => {
		createTusDirectUploadMock.mockResolvedValue({
			streamUid: 'stream_1',
			uploadUrl: 'https://upload.example/tus',
			expiresAt: '2099-01-01T00:00:00.000Z'
		});

		const response = await POST({
			request: new Request('http://test.local/api/v1/uploads/init', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					title: 'Upload Test',
					seriesId: 'series_1',
					fileSizeBytes: 12345
				})
			}),
			locals: { user: { id: 'usr_1', email: 'admin@example.com' } },
			platform: {}
		} as never);

		expect(response.status).toBe(500);
		expect(attachStreamUidToVideoMock).not.toHaveBeenCalled();
		expect(markVideoUploadFailedMock).toHaveBeenCalledWith(
			{ db: 'mock' },
			'vid_1',
			'Cloudflare Stream returned an invalid stream UID'
		);
	});
});
