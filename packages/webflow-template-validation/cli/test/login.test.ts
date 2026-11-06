import { mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// login.ts builds its token path from homedir() at import time. Point it at a
// throwaway directory so these tests can never read or overwrite a real token.
const { home } = vi.hoisted(() => ({
	home: `${(process.env.TMPDIR ?? '/tmp').replace(/\/+$/, '')}/wf-template-cli-test-${process.pid}-${Date.now()}`
}));
vi.mock('node:os', async (importOriginal) => ({ ...(await importOriginal<typeof import('node:os')>()), homedir: () => home }));

const { CONFIG_DIR, TOKEN_PATH, hasToken, loadToken, logout } = await import('../src/mcp/login.ts');
// Hard stop before any test writes or deletes: never run against a real home directory.
if (!TOKEN_PATH.startsWith(`${home}/`)) throw new Error(`refusing to run: token path ${TOKEN_PATH} is outside the test home ${home}`);

const CLIENT_PATH = join(CONFIG_DIR, 'mcp-client.json');
const base = {
	server: 'https://mcp.test/mcp',
	issuer: 'https://auth.test',
	token_endpoint: 'https://auth.test/token',
	client_id: 'client-test'
};
const writeToken = async (token: Record<string, unknown>) => {
	await mkdir(CONFIG_DIR, { recursive: true });
	await writeFile(TOKEN_PATH, JSON.stringify(token));
};

describe('token storage', () => {
	beforeEach(async () => {
		await rm(home, { recursive: true, force: true });
	});
	afterEach(() => {
		vi.unstubAllGlobals();
	});
	afterAll(async () => {
		await rm(home, { recursive: true, force: true });
	});

	it('keeps tokens under the mocked home directory', () => {
		expect(TOKEN_PATH).toBe(join(home, '.config', 'webflow-template-cli', 'mcp-token.json'));
	});

	it('asks for a login when no token exists', async () => {
		expect(await hasToken()).toBe(false);
		await expect(loadToken()).rejects.toThrow(/no token at .*; run 'wf-template-validate login' first/);
	});

	it('returns an unexpired token without a network call', async () => {
		const fetchMock = vi.fn();
		vi.stubGlobal('fetch', fetchMock);
		await writeToken({ ...base, access_token: 'access-1', refresh_token: 'refresh-1', expires_at: Date.now() + 10 * 60_000 });
		expect((await loadToken()).access_token).toBe('access-1');
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it('refreshes an expired token, keeps the old refresh token when none is returned, and stores it as 0600', async () => {
		const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) =>
			new Response(JSON.stringify({ access_token: 'access-2', expires_in: 3600, token_type: 'Bearer' }), { status: 200 })
		);
		vi.stubGlobal('fetch', fetchMock);
		await writeToken({ ...base, access_token: 'access-1', refresh_token: 'refresh-1', expires_at: Date.now() - 1000 });

		const next = await loadToken();
		expect(next).toMatchObject({ access_token: 'access-2', refresh_token: 'refresh-1', token_type: 'Bearer' });
		expect(next.expires_at).toBeGreaterThan(Date.now() + 3500 * 1000);

		const [url, init] = fetchMock.mock.calls[0];
		expect(url).toBe('https://auth.test/token');
		expect(Object.fromEntries(new URLSearchParams(String(init?.body)))).toEqual({
			grant_type: 'refresh_token',
			refresh_token: 'refresh-1',
			client_id: 'client-test',
			resource: 'https://mcp.test/mcp'
		});

		expect(JSON.parse(await readFile(TOKEN_PATH, 'utf8')).access_token).toBe('access-2');
		expect((await stat(TOKEN_PATH)).mode & 0o777).toBe(0o600);
	});

	it('refreshes inside the last minute before expiry', async () => {
		const fetchMock = vi.fn(async () => new Response(JSON.stringify({ access_token: 'access-2' }), { status: 200 }));
		vi.stubGlobal('fetch', fetchMock);
		await writeToken({ ...base, access_token: 'access-1', refresh_token: 'refresh-1', expires_at: Date.now() + 30_000 });
		expect((await loadToken()).access_token).toBe('access-2');
	});

	it('asks for a new login when an expired token has no refresh token', async () => {
		await writeToken({ ...base, access_token: 'access-1', expires_at: Date.now() - 1000 });
		await expect(loadToken()).rejects.toThrow(/no refresh_token; run `wf-template-validate login` again/);
	});

	it('reports a refused refresh without echoing the refresh token', async () => {
		vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ error: 'invalid_grant', error_description: 'expired' }), { status: 400 })));
		await writeToken({ ...base, access_token: 'access-1', refresh_token: 'refresh-secret', expires_at: Date.now() - 1000 });
		const error = await loadToken().catch((e: Error) => e);
		expect(String(error)).toMatch(/token endpoint HTTP 400: invalid_grant expired/);
		expect(String(error)).not.toContain('refresh-secret');
	});

	it('logout deletes only the token file and keeps the client registration', async () => {
		await writeToken({ ...base, access_token: 'access-1' });
		await writeFile(CLIENT_PATH, JSON.stringify({ client_id: 'client-test' }));
		expect(await logout()).toBe(true);
		expect(await hasToken()).toBe(false);
		expect(JSON.parse(await readFile(CLIENT_PATH, 'utf8')).client_id).toBe('client-test');
		expect(await logout()).toBe(false);
	});
});
