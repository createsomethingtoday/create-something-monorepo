import { describe, expect, it, vi } from 'vitest';
import type { Cookies } from '@sveltejs/kit';
import { createCrossDomainPageLoader, createLoginHandler } from './handlers.js';

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

describe('createCrossDomainPageLoader', () => {
	it('exchanges on the server for the exact host and writes host-only HttpOnly cookies', async () => {
		const originalFetch = globalThis.fetch;
		const requests: Array<{ url: string; body: unknown }> = [];
		globalThis.fetch = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
			requests.push({
				url: String(input),
				body: init?.body ? JSON.parse(String(init.body)) : null,
			});
			return Response.json({
				access_token: 'access-token',
				refresh_token: 'refresh-token',
				token_type: 'Bearer',
				expires_in: 900,
				user: { id: 'user-1', email: 'operator@example.com', created_at: '2026-08-15T00:00:00Z' },
			});
		}) as typeof globalThis.fetch;
		const cookieWrites: Array<{ name: string; options: Record<string, unknown> }> = [];
		const loader = createCrossDomainPageLoader({ property: 'ltd' });

		try {
			await expect(loader({
				url: new URL('https://createsomething.ltd/auth/cross-domain?token=one-time-code&redirect=/account'),
				cookies: {
					set(name: string, _value: string, options: Record<string, unknown>) {
						cookieWrites.push({ name, options });
					},
				} as unknown as Cookies,
				platform: { env: { ENVIRONMENT: 'production' } },
			})).rejects.toMatchObject({ status: 302, location: '/account' });
		} finally {
			globalThis.fetch = originalFetch;
		}

		expect(requests).toEqual([{
			url: 'https://id.createsomething.space/v1/auth/cross-domain/exchange',
			body: { token: 'one-time-code', target: 'ltd' },
		}]);
		expect(cookieWrites).toHaveLength(2);
		expect(cookieWrites.every(({ options }) => options.httpOnly === true && options.secure === true)).toBe(true);
		expect(cookieWrites.every(({ options }) => !('domain' in options))).toBe(true);
	});
});
