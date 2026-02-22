import { beforeEach, describe, expect, it, vi } from 'vitest';

const getAdminVideoByIdMock = vi.fn();
const isAdminUserMock = vi.fn();
const getDBFromPlatformMock = vi.fn();
const resolveRuntimeEnvMock = vi.fn();

const runMock = vi.fn();
const firstMock = vi.fn();
const prepareMock = vi.fn(() => ({
	bind: vi.fn(() => ({
		run: runMock,
		first: firstMock
	}))
}));

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

import { PATCH } from '../../../../../../../routes/api/v1/admin/videos/[id]/+server';

describe('PATCH /api/v1/admin/videos/:id publish guardrails', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		resolveRuntimeEnvMock.mockReturnValue({});
		isAdminUserMock.mockReturnValue(true);
		getDBFromPlatformMock.mockReturnValue({
			prepare: prepareMock
		});
		runMock.mockResolvedValue({ meta: { changes: 1 } });
		firstMock.mockResolvedValue(null);
	});

	it('rejects publishing when ingest is not ready', async () => {
		getAdminVideoByIdMock.mockResolvedValue({
			id: 'vid_1',
			stream_uid: 'stream_1',
			asset_path: '',
			ingest_status: 'processing',
			visibility: 'draft'
		});

		const response = await PATCH({
			params: { id: 'vid_1' },
			request: new Request('http://test.local/api/v1/admin/videos/vid_1', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ visibility: 'published' })
			}),
			locals: { user: { id: 'usr_1', email: 'admin@example.com' } },
			platform: {}
		} as never);

		expect(response.status).toBe(400);
		expect(prepareMock).not.toHaveBeenCalled();
	});

	it('rejects publishing when no playable source exists', async () => {
		getAdminVideoByIdMock.mockResolvedValue({
			id: 'vid_2',
			stream_uid: null,
			asset_path: '   ',
			ingest_status: 'ready',
			visibility: 'draft'
		});

		const response = await PATCH({
			params: { id: 'vid_2' },
			request: new Request('http://test.local/api/v1/admin/videos/vid_2', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ visibility: 'published' })
			}),
			locals: { user: { id: 'usr_1', email: 'admin@example.com' } },
			platform: {}
		} as never);

		expect(response.status).toBe(400);
		expect(prepareMock).not.toHaveBeenCalled();
	});
});
