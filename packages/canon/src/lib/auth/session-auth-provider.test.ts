import { afterEach, describe, expect, it, vi } from 'vitest';

import { createAuthHooks, handleLogout } from './session.js';

function token(payload: Record<string, unknown>): string {
	return `${btoa(JSON.stringify({ alg: 'ES256', kid: 'test' }))}.${btoa(JSON.stringify(payload))}.signature`;
}

describe('createAuthHooks provider ownership', () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('keeps refresh on Identity when retired provider configuration is still present', async () => {
		const values = new Map<string, string>([
			[
				'cs_access_token',
				token({
					sub: 'usr_customer',
					email: 'owner@example.com',
					iss: 'https://id.createsomething.space',
					aud: ['client-workspace'],
					iat: 1,
					exp: 2,
				}),
			],
			['cs_refresh_token', 'identity-refresh-token'],
		]);
		const identityFetch = vi.fn(async () =>
			Response.json({
				access_token: token({
					sub: 'usr_customer',
					email: 'owner@example.com',
					iss: 'https://id.createsomething.space',
					aud: ['client-workspace'],
					iat: 1_900_000_000,
					exp: 1_900_000_900,
				}),
				refresh_token: 'rotated-refresh-token',
				token_type: 'Bearer',
				expires_in: 900,
			}),
		);
		vi.stubGlobal('fetch', identityFetch);

		const handle = createAuthHooks({
			protectedPaths: ['/map/workspace'],
			authProvider: { type: 'identity-worker' },
		});
		const locals: { user?: unknown } = {};
		const response = await handle({
			event: {
				cookies: {
					get: (name: string) => values.get(name),
					set: (name: string, value: string) => values.set(name, value),
					delete: (name: string) => values.delete(name),
				},
				url: new URL('https://createsomething.agency/map/workspace'),
				locals,
				platform: {
					env: {
						AUTH0_DOMAIN: 'retired.example.auth0.com',
						AUTH0_CLIENT_ID: 'retired-client',
					},
				},
			} as never,
			resolve: async () => new Response('ok'),
		});

		expect(response.status).toBe(200);
		expect(identityFetch).toHaveBeenCalledWith(
			'https://id.createsomething.space/v1/auth/refresh',
			expect.objectContaining({ method: 'POST' }),
		);
		expect(locals.user).toMatchObject({ id: 'usr_customer', email: 'owner@example.com' });
	});

	it('keeps logout on Identity when retired provider configuration is still present', async () => {
		const identityFetch = vi.fn(async () => Response.json({ success: true }));
		vi.stubGlobal('fetch', identityFetch);
		const cleared: string[] = [];

		const response = await handleLogout(
			new Request('https://createsomething.agency/api/auth/logout', {
				method: 'POST',
				headers: { Cookie: 'cs_refresh_token=identity-refresh-token' },
			}),
			{
				get: () => undefined,
				set: (name: string, value: string) => {
					if (value === '') cleared.push(name);
				},
				delete: () => undefined,
			},
			{
				env: {
					ENVIRONMENT: 'production',
					AUTH0_DOMAIN: 'retired.example.auth0.com',
					AUTH0_CLIENT_ID: 'retired-client',
				},
			},
			{ authProvider: { type: 'identity-worker' } },
		);

		expect(identityFetch).toHaveBeenCalledWith(
			'https://id.createsomething.space/v1/auth/logout',
			expect.objectContaining({ method: 'POST' }),
		);
		expect(cleared).toEqual(['cs_access_token', 'cs_refresh_token']);
		expect(await response.json()).toEqual({
			success: true,
			logoutUrl: 'https://createsomething.agency/login',
		});
	});
});
