import { describe, expect, it, vi } from 'vitest';
import type { Cookies } from '@sveltejs/kit';
import { createLoginHandler } from './handlers.js';

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
