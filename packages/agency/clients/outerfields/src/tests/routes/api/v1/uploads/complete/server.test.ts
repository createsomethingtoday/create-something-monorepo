import { beforeEach, describe, expect, it, vi } from 'vitest';

const getAdminVideoByIdMock = vi.fn();
const markVideoUploadCompletedMock = vi.fn();
const isAdminUserMock = vi.fn();
const getDBFromPlatformMock = vi.fn();
const resolveRuntimeEnvMock = vi.fn();

vi.mock('$lib/server/db/videos', () => ({
	getAdminVideoById: getAdminVideoByIdMock,
	markVideoUploadCompleted: markVideoUploadCompletedMock
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

import { POST } from '../../../../../../routes/api/v1/uploads/complete/+server';

describe('POST /api/v1/uploads/complete', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		resolveRuntimeEnvMock.mockReturnValue({});
		isAdminUserMock.mockReturnValue(true);
		getDBFromPlatformMock.mockReturnValue({ db: 'mock' });
	});

	it('transitions pending_upload to processing', async () => {
		getAdminVideoByIdMock.mockResolvedValue({
			id: 'vid_1',
			stream_uid: 'stream_1',
			ingest_status: 'pending_upload',
			failure_reason: null
		});
		markVideoUploadCompletedMock.mockResolvedValue({
			id: 'vid_1',
			stream_uid: 'stream_1',
			ingest_status: 'processing',
			updated_at: 123
		});

		const response = await POST({
			request: new Request('http://test.local/api/v1/uploads/complete', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ videoId: '  vid_1  ' })
			}),
			locals: { user: { id: 'usr_1', email: 'admin@example.com' } },
			platform: {}
		} as never);

		expect(response.status).toBe(200);
		expect(getAdminVideoByIdMock).toHaveBeenCalledWith({ db: 'mock' }, 'vid_1');
		expect(markVideoUploadCompletedMock).toHaveBeenCalledWith({ db: 'mock' }, 'vid_1');
		const body = (await response.json()) as { success: boolean; data: { ingestStatus: string } };
		expect(body.success).toBe(true);
		expect(body.data.ingestStatus).toBe('processing');
	});

	it('is idempotent when upload is already ready', async () => {
		getAdminVideoByIdMock.mockResolvedValue({
			id: 'vid_2',
			stream_uid: 'stream_2',
			ingest_status: 'ready',
			updated_at: 456,
			failure_reason: null
		});

		const response = await POST({
			request: new Request('http://test.local/api/v1/uploads/complete', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ videoId: 'vid_2' })
			}),
			locals: { user: { id: 'usr_1', email: 'admin@example.com' } },
			platform: {}
		} as never);

		expect(response.status).toBe(200);
		expect(markVideoUploadCompletedMock).not.toHaveBeenCalled();
		const body = (await response.json()) as { success: boolean; data: { ingestStatus: string } };
		expect(body.success).toBe(true);
		expect(body.data.ingestStatus).toBe('ready');
	});

	it('returns 409 when stream_uid is missing', async () => {
		getAdminVideoByIdMock.mockResolvedValue({
			id: 'vid_3',
			stream_uid: null,
			ingest_status: 'pending_upload',
			failure_reason: null
		});

		const response = await POST({
			request: new Request('http://test.local/api/v1/uploads/complete', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ videoId: 'vid_3' })
			}),
			locals: { user: { id: 'usr_1', email: 'admin@example.com' } },
			platform: {}
		} as never);

		expect(response.status).toBe(409);
		expect(markVideoUploadCompletedMock).not.toHaveBeenCalled();
	});

	it('returns 409 when ingest_status is failed', async () => {
		getAdminVideoByIdMock.mockResolvedValue({
			id: 'vid_4',
			stream_uid: 'stream_4',
			ingest_status: 'failed',
			failure_reason: 'transcode failed'
		});

		const response = await POST({
			request: new Request('http://test.local/api/v1/uploads/complete', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ videoId: 'vid_4' })
			}),
			locals: { user: { id: 'usr_1', email: 'admin@example.com' } },
			platform: {}
		} as never);

		expect(response.status).toBe(409);
		expect(markVideoUploadCompletedMock).not.toHaveBeenCalled();
	});
});
