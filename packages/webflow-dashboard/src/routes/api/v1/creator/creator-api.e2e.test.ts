import { createHash, randomUUID } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createFakeAirtable, type FakeAirtable } from '$lib/server/testing/fake-airtable';
import { CREATOR_API_MIGRATION, createSqliteD1 } from '$lib/server/testing/sqlite-d1';

/**
 * End to end through the real route handlers, the real Airtable client code
 * and the real D1 statements. Only the two outside systems are stand-ins: the
 * `airtable` package (in-memory tables) and D1 (in-memory SQLite running the
 * real migration).
 */

const airtableHolder = vi.hoisted(() => ({ current: null as unknown }));

vi.mock('airtable', () => ({
	default: class {
		base() {
			return (table: string) => (airtableHolder.current as FakeAirtable).table(table);
		}
	}
}));

const { TABLES } = await import('$lib/server/airtable');
const { CREATOR_API_QUOTA } = await import('$lib/server/creator-api');
const { MAX_ACTIVE_API_KEYS } = await import('$lib/server/api-keys');
const keysRoute = await import('../../keys/+server');
const generateRoute = await import('../../keys/generate/+server');
const revokeRoute = await import('../../keys/revoke/+server');
const profileRoute = await import('./profile/+server');
const assetsRoute = await import('./assets/+server');
const assetRoute = await import('./assets/[id]/+server');
const unknownRoute = await import('../[...path]/+server');

const ORIGIN = 'https://dashboard.example';
const CREATOR_A = 'recTestCreatorA00';
const CREATOR_B = 'recTestCreatorB00';
const ASSET_A1 = 'recTestAssetA0001';
const ASSET_A2 = 'recTestAssetA0002';
const ASSET_B1 = 'recTestAssetB0001';
const EMAIL_A = 'creator-a@example.com';
const EMAIL_B = 'creator-b@example.com';
// One person, one email, two creator profiles (about 1 in 30 real creators).
const CREATOR_S1 = 'recTestCreatorS01';
const CREATOR_S2 = 'recTestCreatorS02';
const ASSET_S1 = 'recTestAssetS0001';
const ASSET_S2 = 'recTestAssetS0002';
const EMAIL_SHARED = 'two-brands@example.com';

function creator(id: string, email: string, name: string) {
	return {
		id,
		fields: {
			Name: name,
			'📧WF Account Email': email,
			'🥞CMS Slug': name.toLowerCase().replace(/\s+/g, '-'),
			'ℹ️Biography': `${name} builds templates.`,
			'ℹ️Legal Name': `${name} Legal Entity LLC`,
			'🔗Personal Site': 'https://studio.example',
			'🖼️Avatar (Primary)': [{ url: 'https://images.example/avatar.png' }]
		}
	};
}

function asset(id: string, creatorId: string, name: string, status: string, submitted: string) {
	return {
		id,
		fields: {
			Name: name,
			'🚀Marketplace Status': status,
			'⚙️🆎Type (Text)': 'Template🏗️',
			'📅Submitted Date': submitted,
			'🖼️Thumbnail Image': [{ url: `https://images.example/${id}.png` }],
			'🔗Website URL': `https://${id.toLowerCase()}.example`,
			'🔗Listing URL': `https://marketplace.example/templates/${id}`,
			'📋 Cumulative Purchases': 12,
			'📋 Cumulative Revenue': 948,
			'⚙️🎨Creator Record ID': [creatorId]
		}
	};
}

let airtable: FakeAirtable;
let env: Record<string, unknown>;
let pending: Promise<unknown>[];

afterEach(() => {
	vi.useRealTimers();
});

beforeEach(() => {
	// The clock is controlled so rate-limit windows are exact. Each API call
	// below moves it one second on, unless a test asks for the same second.
	vi.useFakeTimers({ toFake: ['Date'] });
	vi.setSystemTime(new Date('2026-11-13T12:00:05Z'));

	airtable = createFakeAirtable(
		{
			[TABLES.CREATORS]: [
				creator(CREATOR_A, EMAIL_A, 'Studio A'),
				creator(CREATOR_B, EMAIL_B, 'Studio B'),
				creator(CREATOR_S1, EMAIL_SHARED, 'First Brand'),
				creator(CREATOR_S2, EMAIL_SHARED, 'Second Brand')
			],
			[TABLES.ASSETS]: [
				asset(ASSET_A1, CREATOR_A, 'Alpha', '5️⃣Published🚀', '2026-03-01'),
				asset(ASSET_A2, CREATOR_A, 'Beta Draft', '1️⃣Draft', '2026-06-01'),
				asset(ASSET_B1, CREATOR_B, 'Other Studio Template', '5️⃣Published🚀', '2026-05-01'),
				asset(ASSET_S1, CREATOR_S1, 'First Brand Template', '5️⃣Published🚀', '2026-01-01'),
				asset(ASSET_S2, CREATOR_S2, 'Second Brand Template', '5️⃣Published🚀', '2026-02-01')
			],
			[TABLES.API_KEYS]: []
		},
		{
			backLinks: [
				{
					table: TABLES.API_KEYS,
					field: 'Creator',
					inverseTable: TABLES.CREATORS,
					inverseField: 'API Keys'
				}
			],
			createdTimeField: { [TABLES.API_KEYS]: 'Created Date' }
		}
	);
	airtableHolder.current = airtable;

	const kv = new Map<string, string>();
	env = {
		DB: createSqliteD1(CREATOR_API_MIGRATION),
		SESSIONS: {
			get: async (key: string) => kv.get(key) ?? null,
			put: async (key: string, value: string) => void kv.set(key, value)
		},
		AIRTABLE_API_KEY: 'test-airtable-token',
		AIRTABLE_BASE_ID: 'appTestBase000000'
	};
	pending = [];
});

function platform() {
	return { env, context: { waitUntil: (promise: Promise<unknown>) => void pending.push(promise) } };
}

/** Wait for background writes (usage counters) the handlers handed to waitUntil. */
async function settle() {
	await Promise.all(pending.splice(0));
}

async function sessionPost(
	handler: (event: never) => Promise<Response> | Response,
	path: string,
	email: string,
	body: unknown
): Promise<Response> {
	return handler({
		request: new Request(`${ORIGIN}${path}`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(body)
		}),
		locals: { user: { email } },
		platform: platform()
	} as never);
}

async function createKey(email: string, scopes = ['read:assets', 'read:profile'], keyName = 'CI') {
	const response = await sessionPost(generateRoute.POST as never, '/api/keys/generate', email, {
		keyName,
		scopes
	});
	return (await read(response)) as { apiKey: string; keyId: string; expiresAt: string };
}

async function listKeys(email: string) {
	const response = await keysRoute.GET({ locals: { user: { email } }, platform: platform() } as never);
	return (await read(response)) as {
		keys: { keyId: string; status: string; requestCount: number; lastUsed: string | null }[];
		active: number;
	};
}

async function api(
	handler: (event: never) => Promise<Response> | Response,
	path: string,
	options: {
		key?: string;
		params?: Record<string, string>;
		ip?: string;
		authorization?: string;
		sameSecond?: boolean;
	} = {}
): Promise<Response> {
	if (!options.sameSecond) vi.setSystemTime(Date.now() + 1000);
	const headers = new Headers();
	const authorization = options.authorization ?? (options.key ? `Bearer ${options.key}` : null);
	if (authorization) headers.set('Authorization', authorization);

	const url = new URL(`${ORIGIN}${path}`);
	const response = await handler({
		request: new Request(url, { headers }),
		url,
		params: options.params ?? {},
		platform: platform(),
		getClientAddress: () => options.ip ?? '203.0.113.10'
	} as never);
	await settle();
	return response;
}

/** Response bodies are asserted field by field, so they are read untyped. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function read(response: Response): Promise<any> {
	return response.json();
}

function unknownKey(): string {
	return `wf_live_${randomUUID().replace(/-/g, '')}`;
}

describe('API key lifecycle', () => {
	it('stores a new key in the columns the API Keys table really has', async () => {
		const { apiKey, expiresAt } = await createKey(EMAIL_A);

		expect(apiKey).toMatch(/^wf_live_[0-9a-f]{32}$/);
		expect(expiresAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);

		const [created] = airtable.callsTo('create', TABLES.API_KEYS);
		expect(created.detail).toEqual({
			'API Key Hash': createHash('sha256').update(apiKey).digest('hex'),
			Creator: [CREATOR_A],
			Status: 'Active',
			Scopes: ['read:assets', 'read:profile'],
			'Key Name': 'CI',
			'Key Prefix': apiKey.slice(0, 16),
			'Expiration Date': expiresAt,
			'Request Count': 0
		});
		// The full key is returned once and never written anywhere.
		expect(JSON.stringify(airtable.tables)).not.toContain(apiKey);
	});

	it('lists only the keys of the signed-in creator', async () => {
		const mine = await createKey(EMAIL_A);
		await createKey(EMAIL_B);

		const listed = await listKeys(EMAIL_A);
		expect(listed.keys.map((key) => key.keyId)).toEqual([mine.keyId]);
		expect(listed.active).toBe(1);
	});

	it('refuses unknown permissions and missing names', async () => {
		await expect(
			sessionPost(generateRoute.POST as never, '/api/keys/generate', EMAIL_A, {
				keyName: 'CI',
				scopes: ['read:assets', 'write:assets']
			})
		).rejects.toMatchObject({ status: 400 });
		await expect(
			sessionPost(generateRoute.POST as never, '/api/keys/generate', EMAIL_A, {
				keyName: '  ',
				scopes: ['read:assets']
			})
		).rejects.toMatchObject({ status: 400 });
		expect(airtable.callsTo('create', TABLES.API_KEYS)).toHaveLength(0);
	});

	it(`stops at ${MAX_ACTIVE_API_KEYS} active keys per creator`, async () => {
		// Seeded directly: the hourly creation limit is a separate control.
		for (let index = 0; index < MAX_ACTIVE_API_KEYS; index++) {
			await airtable.table(TABLES.API_KEYS).create([
				{
					fields: {
						'API Key Hash': createHash('sha256').update(`seed-${index}`).digest('hex'),
						Creator: [CREATOR_A],
						Status: 'Active',
						Scopes: ['read:assets'],
						'Expiration Date': '2099-01-01'
					}
				}
			]);
		}

		await expect(
			sessionPost(generateRoute.POST as never, '/api/keys/generate', EMAIL_A, {
				keyName: 'One too many',
				scopes: ['read:assets']
			})
		).rejects.toMatchObject({ status: 400 });
		expect(airtable.tables[TABLES.API_KEYS]).toHaveLength(MAX_ACTIVE_API_KEYS);
	});

	it('limits how many keys one creator can create per hour', async () => {
		for (let attempt = 0; attempt < 10; attempt++) {
			const { keyId } = await createKey(EMAIL_A);
			await sessionPost(revokeRoute.POST as never, '/api/keys/revoke', EMAIL_A, { keyId });
		}

		await expect(
			sessionPost(generateRoute.POST as never, '/api/keys/generate', EMAIL_A, {
				keyName: 'Eleventh',
				scopes: ['read:assets']
			})
		).rejects.toMatchObject({ status: 429 });
	});

	it('answers 404 when asked to revoke a key that does not exist', async () => {
		await expect(
			sessionPost(revokeRoute.POST as never, '/api/keys/revoke', EMAIL_A, {
				keyId: 'recDoesNotExist00'
			})
		).rejects.toMatchObject({ status: 404 });
		await expect(
			sessionPost(revokeRoute.POST as never, '/api/keys/revoke', EMAIL_A, { keyId: 'not-an-id' })
		).rejects.toMatchObject({ status: 404 });
	});

	it('does not let one creator revoke another creator’s key', async () => {
		const { keyId, apiKey } = await createKey(EMAIL_A);

		await expect(
			sessionPost(revokeRoute.POST as never, '/api/keys/revoke', EMAIL_B, { keyId })
		).rejects.toMatchObject({ status: 404 });

		expect(airtable.callsTo('update', TABLES.API_KEYS)).toHaveLength(0);
		expect((await api(assetsRoute.GET as never, '/api/v1/creator/assets', { key: apiKey })).status).toBe(200);
	});
});

describe('GET /api/v1/creator/*', () => {
	it('returns the creator’s assets, newest first, with quota headers', async () => {
		const { apiKey } = await createKey(EMAIL_A);

		const response = await api(assetsRoute.GET as never, '/api/v1/creator/assets', { key: apiKey });
		const body = await read(response);

		expect(response.status).toBe(200);
		expect(body.data.map((item: { id: string }) => item.id)).toEqual([ASSET_A2, ASSET_A1]);
		expect(body.data[1]).toEqual({
			id: ASSET_A1,
			name: 'Alpha',
			status: 'Published',
			type: 'Template',
			submittedDate: '2026-03-01',
			publishedDate: null,
			thumbnail: `https://images.example/${ASSET_A1}.png`,
			websiteUrl: `https://${ASSET_A1.toLowerCase()}.example`,
			marketplaceUrl: `https://marketplace.example/templates/${ASSET_A1}`,
			metrics: { viewers: null, purchases: 12, revenue: 948 }
		});
		expect(body.pagination).toEqual({ total: 2, limit: 50, offset: 0, hasMore: false });
		expect(body.meta).toMatchObject({ version: 'v1', cached: false });

		expect(response.headers.get('X-RateLimit-Limit')).toBe(String(CREATOR_API_QUOTA.requests));
		expect(response.headers.get('X-RateLimit-Remaining')).toBe(String(CREATOR_API_QUOTA.requests - 1));
		expect(Number(response.headers.get('X-RateLimit-Reset'))).toBeGreaterThan(Date.now() / 1000);
		expect(response.headers.get('Cache-Control')).toBe('no-store');
		expect(response.headers.get('X-Request-Id')).toBeTruthy();
		// No CORS: the API is for servers, where a key can stay secret.
		expect(response.headers.get('Access-Control-Allow-Origin')).toBeNull();
	});

	it('filters and pages the list', async () => {
		const { apiKey } = await createKey(EMAIL_A);

		const published = await read(
			await api(assetsRoute.GET as never, '/api/v1/creator/assets?status=published&type=TEMPLATE', {
				key: apiKey
			})
		);
		expect(published.data.map((item: { id: string }) => item.id)).toEqual([ASSET_A1]);
		expect(published.pagination.total).toBe(1);

		const secondPage = await read(
			await api(assetsRoute.GET as never, '/api/v1/creator/assets?limit=1&offset=1', { key: apiKey })
		);
		expect(secondPage.data.map((item: { id: string }) => item.id)).toEqual([ASSET_A1]);
		expect(secondPage.pagination).toEqual({ total: 2, limit: 1, offset: 1, hasMore: false });

		const firstPage = await read(
			await api(assetsRoute.GET as never, '/api/v1/creator/assets?limit=1', { key: apiKey })
		);
		expect(firstPage.pagination.hasMore).toBe(true);
	});

	it('rejects a query it does not understand', async () => {
		const { apiKey } = await createKey(EMAIL_A);

		for (const query of ['limit=0', 'limit=abc', 'offset=-1', 'status=Live', 'type=Plugin']) {
			const response = await api(assetsRoute.GET as never, `/api/v1/creator/assets?${query}`, {
				key: apiKey
			});
			expect(response.status, query).toBe(400);
			expect((await read(response)).code, query).toBe('INVALID_PARAMETER');
		}
	});

	it('returns one asset by ID', async () => {
		const { apiKey } = await createKey(EMAIL_A);

		const response = await api(assetRoute.GET as never, `/api/v1/creator/assets/${ASSET_A1}`, {
			key: apiKey,
			params: { id: ASSET_A1 }
		});
		const body = await read(response);

		expect(response.status).toBe(200);
		expect(body).toMatchObject({ id: ASSET_A1, name: 'Alpha', meta: { version: 'v1' } });
	});

	it('answers 404 for another creator’s asset, the same as for a missing one', async () => {
		const { apiKey } = await createKey(EMAIL_A);

		const foreign = await api(assetRoute.GET as never, `/api/v1/creator/assets/${ASSET_B1}`, {
			key: apiKey,
			params: { id: ASSET_B1 }
		});
		const missing = await api(assetRoute.GET as never, '/api/v1/creator/assets/recDoesNotExist00', {
			key: apiKey,
			params: { id: 'recDoesNotExist00' }
		});

		for (const response of [foreign, missing]) {
			const body = await read(response);
			expect(response.status).toBe(404);
			expect(body.code).toBe('ASSET_NOT_FOUND');
			expect(JSON.stringify(body)).not.toContain('Other Studio Template');
		}
	});

	it('returns the public profile, and nothing private', async () => {
		const { apiKey } = await createKey(EMAIL_A);

		const response = await api(profileRoute.GET as never, '/api/v1/creator/profile', { key: apiKey });
		const body = await read(response);

		expect(response.status).toBe(200);
		expect(body).toMatchObject({
			id: CREATOR_A,
			name: 'Studio A',
			slug: 'studio-a',
			avatar: 'https://images.example/avatar.png',
			biography: 'Studio A builds templates.',
			personalSite: 'https://studio.example'
		});
		const text = JSON.stringify(body);
		expect(text).not.toContain('Legal Entity');
		expect(text).not.toContain(EMAIL_A);
	});

	it('enforces the key’s permissions', async () => {
		const { apiKey } = await createKey(EMAIL_A, ['read:assets']);

		const response = await api(profileRoute.GET as never, '/api/v1/creator/profile', { key: apiKey });

		expect(response.status).toBe(403);
		expect((await read(response)).code).toBe('INSUFFICIENT_SCOPE');
	});

	it('serves repeat requests without going back to Airtable', async () => {
		const { apiKey } = await createKey(EMAIL_A);

		await api(assetsRoute.GET as never, '/api/v1/creator/assets', { key: apiKey });
		const before = airtable.calls.length;

		const second = await api(assetsRoute.GET as never, '/api/v1/creator/assets', { key: apiKey });
		const single = await api(assetRoute.GET as never, `/api/v1/creator/assets/${ASSET_A1}`, {
			key: apiKey,
			params: { id: ASSET_A1 }
		});

		expect((await read(second)).meta.cached).toBe(true);
		expect((await read(single)).meta.cached).toBe(true);
		expect(airtable.calls.length).toBe(before);
	});

	it('counts every served request against the key', async () => {
		const { apiKey, keyId } = await createKey(EMAIL_A);

		await api(assetsRoute.GET as never, '/api/v1/creator/assets', { key: apiKey });
		await api(profileRoute.GET as never, '/api/v1/creator/profile', { key: apiKey });
		await api(assetsRoute.GET as never, '/api/v1/creator/assets', { key: apiKey });

		const listed = await listKeys(EMAIL_A);
		const key = listed.keys.find((candidate) => candidate.keyId === keyId);
		expect(key?.requestCount).toBe(3);
		expect(key?.lastUsed).toBeTruthy();
		// The request path never writes to Airtable.
		expect(airtable.callsTo('update', TABLES.API_KEYS)).toHaveLength(0);
	});

	it('answers unknown v1 paths in JSON', async () => {
		const response = await api(unknownRoute.fallback as never, '/api/v1/creator/nope');

		expect(response.status).toBe(404);
		expect((await read(response)).code).toBe('NOT_FOUND');
	});
});

describe('one email on several creator profiles', () => {
	it('gives the key the same assets the dashboard shows that person', async () => {
		const { apiKey } = await createKey(EMAIL_SHARED);

		const [created] = airtable.callsTo('create', TABLES.API_KEYS);
		expect((created.detail as { Creator: string[] }).Creator).toEqual([CREATOR_S1, CREATOR_S2]);

		const list = await read(await api(assetsRoute.GET as never, '/api/v1/creator/assets', { key: apiKey }));
		expect(list.data.map((item: { id: string }) => item.id)).toEqual([ASSET_S2, ASSET_S1]);

		const single = await api(assetRoute.GET as never, `/api/v1/creator/assets/${ASSET_S2}`, {
			key: apiKey,
			params: { id: ASSET_S2 }
		});
		expect(single.status).toBe(200);

		// The profile is the one the dashboard's Profile tab shows: the first record.
		const profile = await read(await api(profileRoute.GET as never, '/api/v1/creator/profile', { key: apiKey }));
		expect(profile.id).toBe(CREATOR_S1);
	});

	it('lists that key once, and only for that person', async () => {
		const { keyId } = await createKey(EMAIL_SHARED);

		expect((await listKeys(EMAIL_SHARED)).keys.map((key) => key.keyId)).toEqual([keyId]);
		expect((await listKeys(EMAIL_A)).keys).toHaveLength(0);
	});

	it('still cannot reach a creator the email is not on', async () => {
		const { apiKey } = await createKey(EMAIL_SHARED);

		const response = await api(assetRoute.GET as never, `/api/v1/creator/assets/${ASSET_A1}`, {
			key: apiKey,
			params: { id: ASSET_A1 }
		});
		expect(response.status).toBe(404);
	});
});

describe('API key authentication', () => {
	it('rejects a request without a key, or with a malformed one, before any lookup', async () => {
		const missing = await api(assetsRoute.GET as never, '/api/v1/creator/assets');
		expect(missing.status).toBe(401);
		expect((await read(missing)).code).toBe('MISSING_AUTH_HEADER');

		for (const authorization of ['Bearer nope', 'Basic abc', "Bearer wf_live_' OR 1=1", 'wf_live_x']) {
			const response = await api(assetsRoute.GET as never, '/api/v1/creator/assets', { authorization });
			expect(response.status, authorization).toBe(401);
			expect((await read(response)).code, authorization).toBe('INVALID_KEY_FORMAT');
		}

		expect(airtable.calls).toHaveLength(0);
	});

	it('does not accept a dashboard session in place of a key', async () => {
		const url = new URL(`${ORIGIN}/api/v1/creator/assets`);
		const response = await assetsRoute.GET({
			request: new Request(url),
			url,
			params: {},
			locals: { user: { email: EMAIL_A } },
			platform: platform(),
			getClientAddress: () => '203.0.113.10'
		} as never);

		expect(response.status).toBe(401);
		expect((await read(response)).code).toBe('MISSING_AUTH_HEADER');
	});

	it('rejects a well-formed key that was never issued', async () => {
		const response = await api(assetsRoute.GET as never, '/api/v1/creator/assets', { key: unknownKey() });

		expect(response.status).toBe(401);
		expect((await read(response)).code).toBe('INVALID_KEY');
	});

	it('stops a revoked key on its very next request', async () => {
		const { apiKey, keyId } = await createKey(EMAIL_A);
		expect((await api(assetsRoute.GET as never, '/api/v1/creator/assets', { key: apiKey })).status).toBe(200);

		const revoked = await sessionPost(revokeRoute.POST as never, '/api/keys/revoke', EMAIL_A, { keyId });
		expect(revoked.status).toBe(200);

		const response = await api(assetsRoute.GET as never, '/api/v1/creator/assets', { key: apiKey });
		expect(response.status).toBe(401);
		expect((await read(response)).code).toBe('KEY_REVOKED');
		expect((await listKeys(EMAIL_A)).keys[0].status).toBe('Revoked');
	});

	it('reports a failed revoke as failed, and a second try finishes it', async () => {
		const { apiKey, keyId } = await createKey(EMAIL_A);
		await api(assetsRoute.GET as never, '/api/v1/creator/assets', { key: apiKey });

		// The database refuses one write: the revoked marker.
		const db = env.DB as D1Database;
		let failNextCacheWrite = true;
		env.DB = {
			...db,
			prepare: (sql: string) => {
				if (failNextCacheWrite && sql.includes('INSERT INTO api_cache')) {
					failNextCacheWrite = false;
					throw new Error('D1 unavailable');
				}
				return db.prepare(sql);
			}
		};

		await expect(
			sessionPost(revokeRoute.POST as never, '/api/keys/revoke', EMAIL_A, { keyId })
		).rejects.toMatchObject({ status: 500 });

		const retry = await sessionPost(revokeRoute.POST as never, '/api/keys/revoke', EMAIL_A, { keyId });
		expect(retry.status).toBe(200);
		expect((await api(assetsRoute.GET as never, '/api/v1/creator/assets', { key: apiKey })).status).toBe(401);
	});

	it('refuses a request that was verifying the key while it was revoked', async () => {
		const { apiKey, keyId } = await createKey(EMAIL_A);

		// The revoke lands after Airtable answered "Active" and before the
		// request caches that answer.
		let revokedMidRequest = false;
		airtable.hooks.afterSelect = async (table) => {
			if (table !== TABLES.API_KEYS || revokedMidRequest) return;
			revokedMidRequest = true;
			await sessionPost(revokeRoute.POST as never, '/api/keys/revoke', EMAIL_A, { keyId });
		};

		const inFlight = await api(assetsRoute.GET as never, '/api/v1/creator/assets', { key: apiKey });
		expect(revokedMidRequest).toBe(true);
		expect(inFlight.status).toBe(401);
		expect((await read(inFlight)).code).toBe('KEY_REVOKED');

		const next = await api(assetsRoute.GET as never, '/api/v1/creator/assets', { key: apiKey });
		expect(next.status).toBe(401);
	});

	it('answers repeats of a revoked key without asking Airtable again', async () => {
		const { apiKey, keyId } = await createKey(EMAIL_A);
		await sessionPost(revokeRoute.POST as never, '/api/keys/revoke', EMAIL_A, { keyId });
		const before = airtable.calls.length;

		for (let repeat = 0; repeat < 5; repeat++) {
			const response = await api(assetsRoute.GET as never, '/api/v1/creator/assets', { key: apiKey });
			expect((await read(response)).code).toBe('KEY_REVOKED');
		}

		expect(airtable.calls.length).toBe(before);
	});

	it('accepts a key the original dashboard issued', async () => {
		// The old app: wf_live_ + a dashless UUID, SHA-256 hex in "API Key Hash".
		const legacyKey = unknownKey();
		await airtable.table(TABLES.API_KEYS).create([
			{
				fields: {
					'API Key Hash': createHash('sha256').update(legacyKey).digest('hex'),
					Creator: [CREATOR_A],
					Status: 'Active',
					Scopes: ['read:assets', 'read:profile'],
					'Key Name': 'Issued by the old dashboard',
					'Key Prefix': legacyKey.slice(0, 16),
					'Expiration Date': '2099-01-01',
					'Request Count': 4,
					'Last Used': '2025-12-01T00:00:00.000Z'
				}
			}
		]);

		const response = await api(assetsRoute.GET as never, '/api/v1/creator/assets', { key: legacyKey });
		expect(response.status).toBe(200);
		expect((await read(response)).pagination.total).toBe(2);

		// Requests the old host counted are kept and the new ones are added.
		const [key] = (await listKeys(EMAIL_A)).keys;
		expect(key.requestCount).toBe(5);
	});

	it('rejects an expired key', async () => {
		const expiredKey = unknownKey();
		await airtable.table(TABLES.API_KEYS).create([
			{
				fields: {
					'API Key Hash': createHash('sha256').update(expiredKey).digest('hex'),
					Creator: [CREATOR_A],
					Status: 'Active',
					Scopes: ['read:assets'],
					'Expiration Date': '2025-01-01'
				}
			}
		]);

		const response = await api(assetsRoute.GET as never, '/api/v1/creator/assets', { key: expiredKey });
		expect(response.status).toBe(401);
		expect((await read(response)).code).toBe('KEY_EXPIRED');
		expect((await listKeys(EMAIL_A)).keys[0].status).toBe('Expired');
	});
});

describe('rate limits', () => {
	it('allows the hourly quota, then answers 429 until the window resets', async () => {
		const { apiKey, keyId } = await createKey(EMAIL_A);

		let last: Response | undefined;
		for (let request = 0; request < CREATOR_API_QUOTA.requests; request++) {
			last = await api(assetsRoute.GET as never, '/api/v1/creator/assets', { key: apiKey });
		}
		expect(last?.status).toBe(200);
		expect(last?.headers.get('X-RateLimit-Remaining')).toBe('0');

		const refused = await api(assetsRoute.GET as never, '/api/v1/creator/assets', { key: apiKey });
		expect(refused.status).toBe(429);
		expect((await read(refused)).code).toBe('RATE_LIMIT_EXCEEDED');
		expect(Number(refused.headers.get('Retry-After'))).toBeGreaterThan(0);
		expect(refused.headers.get('X-RateLimit-Remaining')).toBe('0');

		// A refused request is not a served request.
		const key = (await listKeys(EMAIL_A)).keys.find((candidate) => candidate.keyId === keyId);
		expect(key?.requestCount).toBe(CREATOR_API_QUOTA.requests);
	});

	it('shares one quota across all keys of a creator, and none across creators', async () => {
		const first = await createKey(EMAIL_A, ['read:assets'], 'First');
		const second = await createKey(EMAIL_A, ['read:assets'], 'Second');
		const other = await createKey(EMAIL_B, ['read:assets'], 'Other creator');

		for (let request = 0; request < CREATOR_API_QUOTA.requests; request++) {
			await api(assetsRoute.GET as never, '/api/v1/creator/assets', { key: first.apiKey });
		}

		expect((await api(assetsRoute.GET as never, '/api/v1/creator/assets', { key: second.apiKey })).status).toBe(429);
		expect((await api(assetsRoute.GET as never, '/api/v1/creator/assets', { key: other.apiKey })).status).toBe(200);
	});

	it('counts a creator’s quota the same whatever order a key’s creators are linked in', async () => {
		const first = await createKey(EMAIL_SHARED, ['read:assets'], 'Linked S1, S2');
		// A key whose links were written the other way round.
		const reversed = unknownKey();
		await airtable.table(TABLES.API_KEYS).create([
			{
				fields: {
					'API Key Hash': createHash('sha256').update(reversed).digest('hex'),
					Creator: [CREATOR_S2, CREATOR_S1],
					Status: 'Active',
					Scopes: ['read:assets'],
					'Expiration Date': '2099-01-01'
				}
			}
		]);

		for (let request = 0; request < CREATOR_API_QUOTA.requests; request++) {
			await api(assetsRoute.GET as never, '/api/v1/creator/assets', { key: first.apiKey });
		}

		expect((await api(assetsRoute.GET as never, '/api/v1/creator/assets', { key: reversed })).status).toBe(429);
	});

	it('limits key lookups per second across all addresses, and keeps verified keys working', async () => {
		const { apiKey } = await createKey(EMAIL_A);
		await api(assetsRoute.GET as never, '/api/v1/creator/assets', { key: apiKey });

		// One second, three addresses, three keys we have never seen.
		vi.setSystemTime(Date.now() + 1000);
		const burst = [];
		for (const ip of ['198.51.100.21', '198.51.100.22', '198.51.100.23']) {
			burst.push(
				await api(assetsRoute.GET as never, '/api/v1/creator/assets', {
					key: unknownKey(),
					ip,
					sameSecond: true
				})
			);
		}

		expect(burst.map((response) => response.status)).toEqual([401, 401, 503]);
		expect(burst[2].headers.get('Retry-After')).toBe('1');
		expect((await read(burst[2])).code).toBe('SERVICE_UNAVAILABLE');

		// A key that is already verified needs no lookup, so it is not held up.
		const verified = await api(assetsRoute.GET as never, '/api/v1/creator/assets', {
			key: apiKey,
			sameSecond: true
		});
		expect(verified.status).toBe(200);
	});

	it('caps how many unknown keys one address can make us look up', async () => {
		const ip = '198.51.100.7';
		let refusedAt = 0;

		for (let attempt = 1; attempt <= 130; attempt++) {
			const response = await api(assetsRoute.GET as never, '/api/v1/creator/assets', {
				key: unknownKey(),
				ip
			});
			if (response.status === 429) {
				expect((await read(response)).code).toBe('TOO_MANY_KEY_LOOKUPS');
				refusedAt = attempt;
				break;
			}
		}

		expect(refusedAt).toBe(121);
		expect(airtable.callsTo('select', TABLES.API_KEYS)).toHaveLength(120);

		// A different address, and a creator with a working key, are unaffected.
		const elsewhere = await api(assetsRoute.GET as never, '/api/v1/creator/assets', {
			key: unknownKey(),
			ip: '198.51.100.8'
		});
		expect(elsewhere.status).toBe(401);
	});
});
