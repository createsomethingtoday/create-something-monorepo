import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
	getVideoByIdMock,
	getAdminVideoByIdMock,
	isAdminUserMock,
	getDBFromPlatformMock,
	resolveRuntimeEnvMock,
	buildPublicHlsUrlMock,
	buildSignedHlsUrlMock,
	createStreamPlaybackTokenMock,
	getPlaybackTokenTtlSecondsMock,
	getStreamCustomerCodeMock
} = vi.hoisted(() => ({
	getVideoByIdMock: vi.fn(),
	getAdminVideoByIdMock: vi.fn(),
	isAdminUserMock: vi.fn(),
	getDBFromPlatformMock: vi.fn(),
	resolveRuntimeEnvMock: vi.fn(),
	buildPublicHlsUrlMock: vi.fn(),
	buildSignedHlsUrlMock: vi.fn(),
	createStreamPlaybackTokenMock: vi.fn(),
	getPlaybackTokenTtlSecondsMock: vi.fn(),
	getStreamCustomerCodeMock: vi.fn()
}));

vi.mock('$lib/server/d1-compat', () => ({
	getDBFromPlatform: getDBFromPlatformMock
}));

vi.mock('$lib/server/db/videos', () => ({
	getVideoById: getVideoByIdMock,
	getAdminVideoById: getAdminVideoByIdMock
}));

vi.mock('$lib/server/admin', () => ({
	isAdminUser: isAdminUserMock
}));

vi.mock('$lib/server/stream', () => ({
	buildPublicHlsUrl: buildPublicHlsUrlMock,
	buildSignedHlsUrl: buildSignedHlsUrlMock,
	createStreamPlaybackToken: createStreamPlaybackTokenMock,
	getPlaybackTokenTtlSeconds: getPlaybackTokenTtlSecondsMock,
	getStreamCustomerCode: getStreamCustomerCodeMock
}));

vi.mock('$lib/server/env', () => ({
	resolveRuntimeEnv: resolveRuntimeEnvMock
}));

import { GET } from '../../../../../../../routes/api/v1/videos/[id]/playback/+server';

const VALID_STREAM_UID = '88888888888888888888888888888888';

function createVideo(overrides: Partial<Record<string, unknown>> = {}) {
	return {
		id: 'vid_default',
		visibility: 'published',
		tier: 'free',
		ingest_status: 'ready',
		stream_uid: VALID_STREAM_UID,
		asset_path: '',
		playback_policy: 'public',
		failure_reason: null,
		...overrides
	};
}

describe('GET /api/v1/videos/[id]/playback', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		resolveRuntimeEnvMock.mockReturnValue({});
		getDBFromPlatformMock.mockReturnValue({ db: 'mock' });
		isAdminUserMock.mockReturnValue(false);
		getPlaybackTokenTtlSecondsMock.mockReturnValue(900);
		getStreamCustomerCodeMock.mockReturnValue('customer_code');
		buildPublicHlsUrlMock.mockReturnValue('https://cdn.example/video.m3u8');
		buildSignedHlsUrlMock.mockReturnValue('https://cdn.example/signed.m3u8');
		createStreamPlaybackTokenMock.mockResolvedValue({ token: 'signed_token' });
	});

	it('returns playback grant for ready videos and sets no-store cache header', async () => {
		getVideoByIdMock.mockResolvedValue(createVideo({ id: 'vid_ready' }));

		const response = await GET({
			params: { id: 'vid_ready' },
			locals: { user: null },
			platform: {}
		} as never);

		expect(response.status).toBe(200);
		expect(response.headers.get('cache-control')).toBe('private, no-store');
		const body = (await response.json()) as {
			success: boolean;
			data: { videoId: string; hlsUrl: string };
		};
		expect(body.success).toBe(true);
		expect(body.data.videoId).toBe('vid_ready');
		expect(body.data.hlsUrl).toBe('https://cdn.example/video.m3u8');
	});

	it('returns 409 when ingest_status is processing', async () => {
		getVideoByIdMock.mockResolvedValue(
			createVideo({
				id: 'vid_processing',
				ingest_status: 'processing'
			})
		);

		const response = await GET({
			params: { id: 'vid_processing' },
			locals: { user: null },
			platform: {}
		} as never);

		expect(response.status).toBe(409);
		expect(response.headers.get('cache-control')).toBe('private, no-store');
	});

	it('returns 409 when stream_uid is malformed', async () => {
		getVideoByIdMock.mockResolvedValue(
			createVideo({
				id: 'vid_bad_uid',
				stream_uid: 'stream_invalid'
			})
		);

		const response = await GET({
			params: { id: 'vid_bad_uid' },
			locals: { user: null },
			platform: {}
		} as never);

		expect(response.status).toBe(409);
		expect(response.headers.get('cache-control')).toBe('private, no-store');
		const body = (await response.json()) as { error: string };
		expect(body.error).toBe('Video stream is unavailable');
	});

	it('returns asset-path fallback grant when stream_uid is missing but asset_path exists', async () => {
		getVideoByIdMock.mockResolvedValue(
			createVideo({
				id: 'vid_missing_uid',
				stream_uid: null,
				asset_path: '/videos/legacy-upload.mp4'
			})
		);

		const response = await GET({
			params: { id: 'vid_missing_uid' },
			locals: { user: null },
			platform: {}
		} as never);

		expect(response.status).toBe(200);
		expect(response.headers.get('cache-control')).toBe('private, no-store');
		const body = (await response.json()) as {
			success: boolean;
			data: { videoId: string; hlsUrl: string };
		};
		expect(body.success).toBe(true);
		expect(body.data.videoId).toBe('vid_missing_uid');
		expect(body.data.hlsUrl).toBe('/videos/legacy-upload.mp4');
	});

	it('returns 404 when stream_uid is missing and no asset fallback exists', async () => {
		getVideoByIdMock.mockResolvedValue(
			createVideo({
				id: 'vid_missing_uid_no_fallback',
				stream_uid: null,
				asset_path: ''
			})
		);

		const response = await GET({
			params: { id: 'vid_missing_uid_no_fallback' },
			locals: { user: null },
			platform: {}
		} as never);

		expect(response.status).toBe(404);
		expect(response.headers.get('cache-control')).toBe('private, no-store');
		const body = (await response.json()) as { error: string };
		expect(body.error).toBe('Video stream is unavailable');
	});

	it('returns 409 with failure reason when ingest_status is failed', async () => {
		getVideoByIdMock.mockResolvedValue(
			createVideo({
				id: 'vid_failed',
				ingest_status: 'failed',
				failure_reason: 'transcode failed'
			})
		);

		const response = await GET({
			params: { id: 'vid_failed' },
			locals: { user: null },
			platform: {}
		} as never);

		expect(response.status).toBe(409);
		expect(response.headers.get('cache-control')).toBe('private, no-store');
		const body = (await response.json()) as { error: string };
		expect(body.error).toBe('transcode failed');
	});
});
