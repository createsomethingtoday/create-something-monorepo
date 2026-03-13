import { beforeEach, describe, expect, it, vi } from 'vitest';

const { isAdminUserMock } = vi.hoisted(() => ({
	isAdminUserMock: vi.fn()
}));

vi.mock('$lib/server/auth', () => ({
	isAdminUser: isAdminUserMock
}));

import { DELETE, PATCH } from '../../../../../../routes/api/admin/videos/[id]/+server';

describe('Legacy /api/admin/videos/[id] write endpoints', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('returns 403 when PATCH is called by non-admin', async () => {
		isAdminUserMock.mockReturnValue(false);

		const response = await PATCH({
			params: { id: 'vid_1' },
			request: new Request('http://test.local/api/admin/videos/vid_1', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ title: 'New title' })
			}),
			locals: { user: { id: 'usr_1', email: 'member@example.com' } },
			platform: {}
		} as never);

		expect(response.status).toBe(403);
	});

	it('returns 410 for PATCH with migration guidance', async () => {
		isAdminUserMock.mockReturnValue(true);

		const response = await PATCH({
			params: { id: 'vid_1' },
			request: new Request('http://test.local/api/admin/videos/vid_1', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ title: 'New title' })
			}),
			locals: { user: { id: 'usr_1', email: 'admin@example.com' } },
			platform: {}
		} as never);

		expect(response.status).toBe(410);
		const body = (await response.json()) as { success: boolean; adminVideosApi: string };
		expect(body.success).toBe(false);
		expect(body.adminVideosApi).toBe('/api/v1/admin/videos/:id');
	});

	it('returns 410 for DELETE with migration guidance', async () => {
		isAdminUserMock.mockReturnValue(true);

		const response = await DELETE({
			params: { id: 'vid_1' },
			request: new Request('http://test.local/api/admin/videos/vid_1', {
				method: 'DELETE'
			}),
			locals: { user: { id: 'usr_1', email: 'admin@example.com' } },
			platform: {}
		} as never);

		expect(response.status).toBe(410);
		const body = (await response.json()) as { success: boolean; adminVideosApi: string };
		expect(body.success).toBe(false);
		expect(body.adminVideosApi).toBe('/api/v1/admin/videos/:id');
	});
});
