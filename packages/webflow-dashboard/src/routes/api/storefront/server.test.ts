import { afterEach, describe, expect, it, vi } from 'vitest';
import { GET, POST } from './+server';

const ORIGIN = 'https://dashboard.example';
const OWNER_KEY = 'k'.repeat(40);
const ENABLED_ENV = {
	CREATOR_STOREFRONT_ENABLED: 'true',
	CREATOR_STOREFRONT_SERVICE_URL: 'https://storefront.example',
	CREATOR_STOREFRONT_OWNER_KEY: OWNER_KEY,
	ENVIRONMENT: 'production'
};

afterEach(() => {
	vi.unstubAllGlobals();
});

function serviceReturning(status: number, body: unknown) {
	const fetchMock = vi.fn(async () => new Response(JSON.stringify(body), { status }));
	vi.stubGlobal('fetch', fetchMock);
	return fetchMock;
}

function post(body: unknown, headers: Record<string, string> = {}, env: Record<string, string> = ENABLED_ENV, email = 'owner@example.com') {
	return POST({
		request: new Request(`${ORIGIN}/api/storefront`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json', Origin: ORIGIN, 'Idempotency-Key': 'browser-key-0001', ...headers },
			body: JSON.stringify(body)
		}),
		url: new URL(`${ORIGIN}/api/storefront`),
		locals: email ? { user: { email } } : {},
		platform: { env }
	} as unknown as Parameters<typeof POST>[0]);
}

function get(query = '', env: Record<string, string> = ENABLED_ENV, email: string | null = 'owner@example.com') {
	return GET({
		url: new URL(`${ORIGIN}/api/storefront${query}`),
		locals: email ? { user: { email } } : {},
		platform: { env }
	} as unknown as Parameters<typeof GET>[0]);
}

describe('/api/storefront proxy', () => {
	it('checks Origin itself even when the request carries an attacker Authorization header', async () => {
		const fetchMock = serviceReturning(200, {});
		const response = await post(
			{ action: 'publish', expectedDraftVersion: 2 },
			{ Origin: 'https://evil.example', Authorization: 'Bearer attacker' }
		);
		expect(response.status).toBe(403);
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it('builds service headers from the session, never forwarding browser auth or actor headers', async () => {
		const fetchMock = serviceReturning(200, { publicationRevision: 1, op: 'publish', state: 'live', status: 'Published' });
		const response = await post(
			{ action: 'publish', expectedDraftVersion: 2 },
			{ Authorization: 'Bearer attacker', 'X-Storefront-Actor-Email': 'victim@example.com' }
		);
		expect(response.status).toBe(200);
		const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
		const headers = new Headers(init.headers);
		expect(url).toBe('https://storefront.example/v1/owner/storefront/publish');
		expect(headers.get('Authorization')).toBe(`Bearer ${OWNER_KEY}`);
		expect(headers.get('X-Storefront-Actor-Email')).toBe('owner@example.com');
		expect(headers.get('Idempotency-Key')).toBe('browser-key-0001');
		expect(await response.json()).toEqual({
			receipt: { publicationRevision: 1, op: 'publish', state: 'live', status: 'Published' }
		});
	});

	it('is disabled (no tab, no service call) when the flag or config is missing', async () => {
		const fetchMock = serviceReturning(200, {});
		for (const env of [
			{},
			{ ...ENABLED_ENV, CREATOR_STOREFRONT_ENABLED: 'false' },
			{ ...ENABLED_ENV, CREATOR_STOREFRONT_OWNER_KEY: 'short' },
			{ ...ENABLED_ENV, CREATOR_STOREFRONT_SERVICE_URL: 'http://storefront.example' },
			{ ...ENABLED_ENV, CREATOR_STOREFRONT_ALLOWED_EMAILS: 'someone-else@example.com' }
		]) {
			expect(await (await get('?probe=1', env as Record<string, string>)).json()).toEqual({ enabled: false });
			expect((await post({ action: 'save', expectedDraftVersion: 0, fields: {} }, {}, env as Record<string, string>)).status).toBe(404);
		}
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it('requires a session and an idempotency key, and rejects inherited action names', async () => {
		const fetchMock = serviceReturning(200, {});
		expect((await get('', ENABLED_ENV, null)).status).toBe(401);
		expect((await post({ action: 'publish', expectedDraftVersion: 1 }, { 'Idempotency-Key': '' })).status).toBe(400);
		for (const action of ['constructor', '__proto__', 'toString']) {
			expect((await post({ action, expectedDraftVersion: 1 })).status).toBe(400);
		}
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it('rejects covers not uploaded through this dashboard before calling the service', async () => {
		const fetchMock = serviceReturning(200, {});
		const response = await post({
			action: 'save',
			expectedDraftVersion: 0,
			fields: { coverUrl: 'https://evil.example/api/uploads/x.webp', coverAlt: 'x' }
		});
		expect(response.status).toBe(422);
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it('passes the service ambiguity refusal through instead of picking a record', async () => {
		serviceReturning(409, { error: 'ambiguous_creator', message: 'More than one Creator matches this account' });
		const response = await get();
		expect(response.status).toBe(409);
		expect(await response.json()).toMatchObject({ error: 'ambiguous_creator' });
	});

	describe('creator selection', () => {
		const CREATOR = 'recCREATORAAAAAA1';
		const OTHER = 'recCREATORBBBBBB2';
		const headersOf = (fetchMock: ReturnType<typeof serviceReturning>) =>
			new Headers((fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].headers);

		it('passes through only {id, slug} choices of an ambiguity, dropping everything else', async () => {
			serviceReturning(409, {
				error: 'ambiguous_creator',
				message: 'select one',
				details: {
					choices: [
						{ id: CREATOR, slug: 'studio', email: 'owner@example.com', stripeAccount: 'acct_1' },
						{ id: OTHER, slug: null },
						{ id: 'not-a-record-id', slug: 'bad' }
					],
					secret: 'x'
				}
			});
			const response = await get();
			const text = await response.text();
			expect(response.status).toBe(409);
			expect(JSON.parse(text)).toEqual({
				error: 'ambiguous_creator',
				message: 'select one',
				details: { choices: [{ id: CREATOR, slug: 'studio' }, { id: OTHER, slug: null }] }
			});
			for (const leaked of ['owner@example.com', 'acct_1', 'not-a-record-id', 'secret']) expect(text).not.toContain(leaked);
		});

		it('drops choices from any error other than a 409 ambiguity', async () => {
			serviceReturning(403, { error: 'forbidden', message: 'no', details: { choices: [{ id: CREATOR, slug: 's' }] } });
			expect(await (await get()).json()).toEqual({ error: 'forbidden', message: 'no' });
		});

		it('forwards only a validated selection, in a freshly built header, on GET', async () => {
			const fetchMock = serviceReturning(200, { draft: {}, candidates: [] });
			expect((await get(`?creator=${CREATOR}`)).status).toBe(200);
			const headers = headersOf(fetchMock);
			expect(headers.get('X-Storefront-Creator-Id')).toBe(CREATOR);
			expect(headers.get('X-Storefront-Actor-Email')).toBe('owner@example.com');
		});

		it('rejects a malformed selection on GET and POST before calling the service', async () => {
			const fetchMock = serviceReturning(200, {});
			for (const bad of ['x', 'rec123', `${CREATOR}%0d%0aX-Evil:1`, 'recCREATORAAAAAA1,recCREATORBBBBBB2']) {
				expect((await get(`?creator=${bad}`)).status).toBe(400);
			}
			for (const bad of ['x', 7, {}, ['recCREATORAAAAAA1'], 'recCREATORAAAAAA1 ']) {
				expect((await post({ action: 'publish', expectedDraftVersion: 1, creatorId: bad })).status).toBe(400);
			}
			expect(fetchMock).not.toHaveBeenCalled();
		});

		it('sends the chosen creator on every POST action and nothing when none is chosen', async () => {
			const fetchMock = serviceReturning(200, { draft: {}, candidates: [] });
			const actions = [
				{ action: 'save', expectedDraftVersion: 1, fields: {} },
				{ action: 'selections', expectedDraftVersion: 1, selections: [] },
				{ action: 'publish', expectedDraftVersion: 1 },
				{ action: 'unpublish' }
			];
			for (const body of actions) await post({ ...body, creatorId: OTHER });
			for (const call of fetchMock.mock.calls as unknown as Array<[string, RequestInit]>) {
				expect(new Headers(call[1].headers).get('X-Storefront-Creator-Id')).toBe(OTHER);
				expect(call[1].body ?? '').not.toContain(OTHER);
			}
			fetchMock.mockClear();
			await post({ action: 'publish', expectedDraftVersion: 1 });
			expect(headersOf(fetchMock).has('X-Storefront-Creator-Id')).toBe(false);
		});

		it('never forwards a browser-supplied selection or actor header', async () => {
			const fetchMock = serviceReturning(200, {});
			await post(
				{ action: 'publish', expectedDraftVersion: 1 },
				{ 'X-Storefront-Creator-Id': OTHER, 'X-Storefront-Actor-Email': 'victim@example.com', Authorization: 'Bearer attacker' }
			);
			const headers = headersOf(fetchMock);
			expect(headers.has('X-Storefront-Creator-Id')).toBe(false);
			expect(headers.get('X-Storefront-Actor-Email')).toBe('owner@example.com');
			expect(headers.get('Authorization')).toBe(`Bearer ${OWNER_KEY}`);
		});
	});

	it('strips fields the browser must not see from service responses', async () => {
		serviceReturning(200, {
			draft: {
				exists: true,
				draftVersion: 3,
				status: 'Published',
				storefrontId: 'recSTOREFRONT0001',
				creatorId: 'recCREATOR0000001',
				fields: { positioning: 'p', legalName: 'Private Name' },
				selections: [{ assetId: 'recASSET000000001', position: 1, note: null, creatorEmail: 'x@y.z' }]
			},
			pending: false,
			lastReceipt: null,
			candidates: [{ assetId: 'recASSET000000001', name: 'T', templateSlug: 't', stripeAccount: 'acct_1' }]
		});
		const text = await (await get()).text();
		for (const secret of ['recSTOREFRONT0001', 'recCREATOR0000001', 'Private Name', 'x@y.z', 'acct_1']) {
			expect(text).not.toContain(secret);
		}
	});

	it('maps an unreachable service to 503 without leaking its URL', async () => {
		vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new TypeError('connect ECONNREFUSED'))));
		const response = await get();
		expect(response.status).toBe(503);
		expect(await response.text()).not.toContain('storefront.example');
	});
});
