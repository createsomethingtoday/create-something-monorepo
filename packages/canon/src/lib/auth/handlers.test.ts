import { describe, expect, it, vi } from 'vitest';
import type { Cookies } from '@sveltejs/kit';
import { createLoginHandler, createPlayerLoginHandler } from './handlers.js';

describe('createLoginHandler', () => {
	it('uses the application identity URL and local cookie security from runtime configuration', async () => {
		const requestedUrls: string[] = [];
		const runtimeFetch = vi.fn(async (input: string | URL | Request) => {
			requestedUrls.push(String(input));
			return Response.json({
				access_token: 'access-token',
				refresh_token: 'refresh-token',
				expires_in: 900,
				user: {
					id: 'user_staff',
					email: 'operator@createsomething.io',
					tier: 'agency',
					source: 'io',
				},
			});
		});
		const cookieWrites: Array<{
			name: string;
			value: string;
			options: Parameters<Cookies['set']>[2];
		}> = [];
		const handler = createLoginHandler();

		const response = await handler({
			request: new Request('http://127.0.0.1:4173/api/auth/login', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					email: 'operator@createsomething.io',
					password: 'test-password',
				}),
			}),
			cookies: {
				set(name: string, value: string, options: Parameters<Cookies['set']>[2]) {
					cookieWrites.push({ name, value, options });
				},
			},
			fetch: runtimeFetch as typeof globalThis.fetch,
			platform: {
				env: {
					ENVIRONMENT: 'development',
					IDENTITY_API_URL: 'http://127.0.0.1:8787',
				},
			},
		});

		expect(response.status).toBe(200);
		expect(requestedUrls).toEqual(['http://127.0.0.1:8787/v1/auth/login']);
		expect(cookieWrites).toHaveLength(2);
		expect(cookieWrites.every((write) => write.options.secure === false)).toBe(true);
		expect(cookieWrites.every((write) => write.options.httpOnly === true)).toBe(true);
	});
});

describe('createPlayerLoginHandler', () => {
	it('uses the player endpoint and the shorter Identity-owned session lifetime', async () => {
		const requestedUrls: string[] = [];
		const runtimeFetch = vi.fn(async (input: string | URL | Request) => {
			requestedUrls.push(String(input));
			return Response.json({
				access_token: 'player-access-token',
				refresh_token: 'player-refresh-token',
				expires_in: 900,
				refresh_expires_in: 43_200,
				user: { id: 'guard-player-13', access_type: 'player' },
			});
		});
		const cookieWrites: Array<{ name: string; options: Parameters<Cookies['set']>[2] }> = [];
		const handler = createPlayerLoginHandler();
		const response = await handler({
			request: new Request('https://guard.test/api/auth/player-login', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ player_code: 'ACE-2713', passphrase: 'river lantern balance corner' }),
			}),
			cookies: {
				set(name: string, _value: string, options: Parameters<Cookies['set']>[2]) {
					cookieWrites.push({ name, options });
				},
			},
			fetch: runtimeFetch as typeof globalThis.fetch,
			platform: { env: { ENVIRONMENT: 'production', IDENTITY_API_URL: 'https://id.test' } },
		});

		expect(response.status).toBe(200);
		expect(requestedUrls).toEqual(['https://id.test/v1/auth/player-login']);
		expect(cookieWrites.find((write) => write.name === 'cs_refresh_token')?.options.maxAge).toBe(43_200);
	});
});
