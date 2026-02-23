import { beforeEach, describe, expect, it, vi } from 'vitest';

const { isAdminUserMock } = vi.hoisted(() => ({
	isAdminUserMock: vi.fn()
}));

vi.mock('$lib/server/auth', () => ({
	isAdminUser: isAdminUserMock
}));

import { POST } from '../../../../../routes/api/admin/videos/+server';

describe('POST /api/admin/videos (legacy write endpoint)', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('returns 403 for non-admin callers', async () => {
		isAdminUserMock.mockReturnValue(false);

		const response = await POST({
			request: new Request('http://test.local/api/admin/videos', {
				method: 'POST'
			}),
			locals: { user: { id: 'usr_1', email: 'member@example.com' } },
			platform: {}
		} as never);

		expect(response.status).toBe(403);
	});

	it('returns 410 with migration guidance for admins', async () => {
		isAdminUserMock.mockReturnValue(true);

		const response = await POST({
			request: new Request('http://test.local/api/admin/videos', {
				method: 'POST'
			}),
			locals: { user: { id: 'usr_1', email: 'admin@example.com' } },
			platform: {}
		} as never);

		expect(response.status).toBe(410);
		const body = (await response.json()) as {
			success: boolean;
			error: string;
			uploadsInit: string;
			uploadsComplete: string;
			adminVideosApi: string;
		};
		expect(body.success).toBe(false);
		expect(body.uploadsInit).toBe('/api/v1/uploads/init');
		expect(body.uploadsComplete).toBe('/api/v1/uploads/complete');
		expect(body.adminVideosApi).toBe('/api/v1/admin/videos');
	});
});
