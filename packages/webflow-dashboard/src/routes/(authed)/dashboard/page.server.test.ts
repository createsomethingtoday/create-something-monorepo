import { describe, expect, it, vi } from 'vitest';
import { load } from './+page.server';

const ASSET = '/assets/recABCDEFGHIJKLMN?tab=timeline';

function event(cookie: string | undefined, user: { email: string } | null = { email: 'creator@example.com' }) {
	const cookies = { get: vi.fn(() => cookie), delete: vi.fn() };
	return { cookies, args: { locals: { user }, platform: undefined, depends: vi.fn(), cookies } as never };
}

describe('dashboard after sign-in', () => {
	it('sends the reader on to the asset they opened before sign-in, once', async () => {
		const { cookies, args } = event(ASSET);
		await expect(load(args)).rejects.toMatchObject({ status: 302, location: ASSET });
		expect(cookies.delete).toHaveBeenCalledWith('wf_post_login_path', { path: '/' });
	});

	it('stays on the dashboard with no remembered page', async () => {
		const { cookies, args } = event(undefined);
		await expect(load(args)).resolves.toBeDefined();
		expect(cookies.delete).not.toHaveBeenCalled();
	});

	it('drops a value that is not an asset page and stays on the dashboard', async () => {
		for (const value of ['https://evil.example', '//evil.example', '/profile', `${ASSET}&next=//evil.example`]) {
			const { cookies, args } = event(value);
			await expect(load(args)).resolves.toBeDefined();
			expect(cookies.delete).toHaveBeenCalled();
		}
	});
});
