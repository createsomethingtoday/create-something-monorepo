import { beforeEach, describe, expect, it, vi } from 'vitest';

const getVideoByIdMock = vi.fn();
const getAdminVideoByIdMock = vi.fn();
const isAdminUserMock = vi.fn();
const getDBFromPlatformMock = vi.fn();
const resolveRuntimeEnvMock = vi.fn();
const buildPublicHlsUrlMock = vi.fn();
const buildSignedHlsUrlMock = vi.fn();
const createStreamPlaybackTokenMock = vi.fn();
const getPlaybackTokenTtlSecondsMock = vi.fn();
const getStreamCustomerCodeMock = vi.fn();

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

import { GET } from './+server';

function createVideo(overrides: Partial<Record<string, unknown>> = {}) {
	return {
		id: 'vid_default',
		visibility: 'published',
		tier: 'free',
		ingest_status: 'ready',
		stream_uid: 'stream_1',
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
