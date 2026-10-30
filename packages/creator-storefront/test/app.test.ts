import { describe, expect, it } from 'vitest';
import { handleRequest } from '../src/app';
import type { AppServices } from '../src/app';
import type { Env } from '../src/config';
import { dispatch, unwrap } from '../src/dispatch';
import { D1ReadModel } from '../src/read-model';
import { StorefrontWriter } from '../src/writer';
import { FakeInventory, FakeStore, MemoryStorage, SqliteD1 } from './fakes';

const OWNER_KEY = 'o'.repeat(40);
const STAFF_KEY = 's'.repeat(40);

function setup() {
	const store = new FakeStore();
	const inventory = new FakeInventory();
	const publicInventory = new FakeInventory();
	const d1 = new SqliteD1();
	const writers = new Map<string, StorefrontWriter>();
	let storeCallsAllowed = true;
	const env: Env = {
		READ_MODEL: d1.asD1(),
		CREATOR_WRITER: {} as DurableObjectNamespace,
		AIRTABLE_API_KEY: 'pat-fixture',
		OWNER_API_KEY: OWNER_KEY,
		STAFF_API_KEY: STAFF_KEY,
		ALLOWED_COVER_ORIGINS: 'https://dashboard.example',
		TEMPLATE_SEARCH_URL: 'https://template-search.example'
	};
	const services: AppServices = {
		readModel: () => new D1ReadModel(d1.asD1()),
		publicInventory: () => publicInventory,
		store: () => {
			if (!storeCallsAllowed) throw new Error('Airtable must not be called on this path');
			return store;
		},
		runWriter: async (_env, op, creator, input) => {
			let writer = writers.get(creator.id);
			if (!writer) {
				writer = new StorefrontWriter({
					store,
					inventory,
					readModel: new D1ReadModel(d1.asD1()),
					storage: new MemoryStorage(),
					allowedCoverOrigins: ['https://dashboard.example']
				});
				writers.set(creator.id, writer);
			}
			return unwrap(await dispatch(writer, op, creator, input));
		}
	};
	const creator = store.addCreator('owner@example.com', 'studio');
	const assets = [store.addAsset(creator.id), store.addAsset(creator.id)];
	const call = (path: string, init: RequestInit & { key?: string; email?: string } = {}) => {
		const headers = new Headers(init.headers);
		if (init.key !== undefined) headers.set('Authorization', `Bearer ${init.key}`);
		if (init.email) headers.set('X-Storefront-Actor-Email', init.email);
		return handleRequest(new Request(`https://storefront.example${path}`, { ...init, headers }), env, services);
	};
	let n = 0;
	const owner = (path: string, method = 'GET', body?: unknown) =>
		call(path, {
			method,
			key: OWNER_KEY,
			email: 'owner@example.com',
			headers: { 'Idempotency-Key': `http-key-${(n += 1).toString().padStart(4, '0')}`, 'Content-Type': 'application/json' },
			body: body === undefined ? undefined : JSON.stringify(body)
		});
	return {
		store,
		inventory,
		publicInventory,
		env,
		creator,
		assets,
		call,
		owner,
		blockAirtable: () => {
			storeCallsAllowed = false;
		}
	};
}

async function publishFixture(ctx: ReturnType<typeof setup>) {
	await ctx.owner('/v1/owner/storefront', 'PUT', {
		expectedDraftVersion: 0,
		fields: { positioning: 'Clean', portfolioUrl: 'https://dribbble.com/x', supportText: 'Help', supportUrl: 'mailto:help@x.com' }
	});
	await ctx.owner('/v1/owner/storefront/selections', 'PUT', {
		expectedDraftVersion: 1,
		selections: [{ assetId: ctx.assets[0].id, note: 'Fav' }, { assetId: ctx.assets[1].id }]
	});
	return ctx.owner('/v1/owner/storefront/publish', 'POST', { expectedDraftVersion: 2 });
}

describe('public read', () => {
	it('serves the DTO from the read model only: no Airtable, no internal IDs, no-store', async () => {
		const ctx = setup();
		expect((await publishFixture(ctx)).status).toBe(200);
		ctx.blockAirtable();

		const response = await ctx.call('/v1/storefronts/studio');
		expect(response.status).toBe(200);
		expect(response.headers.get('Cache-Control')).toBe('no-store');
		const text = await response.text();
		expect(text).not.toMatch(/rec[A-Za-z0-9]{14}/);
		expect(text).not.toContain('owner@example.com');
		expect(JSON.parse(text)).toEqual({
			schema: 1,
			creatorSlug: 'studio',
			version: 1,
			publishedAt: expect.any(String),
			positioning: 'Clean',
			cover: null,
			links: [{ href: 'https://dribbble.com/x', label: 'View Dribbble portfolio' }],
			support: { text: 'Help', href: 'mailto:help@x.com' },
			selections: [
				{ templateSlug: ctx.assets[0].templateSlug, note: 'Fav' },
				{ templateSlug: ctx.assets[1].templateSlug, note: null }
			]
		});
	});

	it('drops pins that left template-search inventory after publish', async () => {
		const ctx = setup();
		await publishFixture(ctx);
		ctx.publicInventory.missing.add(ctx.assets[0].templateSlug!);
		const body = (await (await ctx.call('/v1/storefronts/studio')).json()) as { selections: Array<{ templateSlug: string }> };
		expect(body.selections.map((s) => s.templateSlug)).toEqual([ctx.assets[1].templateSlug]);
	});

	it('fails closed with 503 when inventory cannot answer', async () => {
		const ctx = setup();
		await publishFixture(ctx);
		ctx.publicInventory.down = true;
		const response = await ctx.call('/v1/storefronts/studio');
		expect(response.status).toBe(503);
		expect(await response.json()).toMatchObject({ error: 'inventory_unavailable' });
	});

	it('returns 404 for tombstones and unknown slugs', async () => {
		const ctx = setup();
		await publishFixture(ctx);
		await ctx.owner('/v1/owner/storefront/unpublish', 'POST');
		expect((await ctx.call('/v1/storefronts/studio')).status).toBe(404);
		expect((await ctx.call('/v1/storefronts/nope')).status).toBe(404);
	});
});

describe('authorization', () => {
	it('owner routes need the owner key and an actor; the staff key is forbidden there', async () => {
		const ctx = setup();
		expect((await ctx.call('/v1/owner/storefront', { email: 'owner@example.com' })).status).toBe(401);
		expect((await ctx.call('/v1/owner/storefront', { key: 'x'.repeat(40), email: 'owner@example.com' })).status).toBe(401);
		expect((await ctx.call('/v1/owner/storefront', { key: STAFF_KEY, email: 'owner@example.com' })).status).toBe(403);
		expect((await ctx.call('/v1/owner/storefront', { key: OWNER_KEY })).status).toBe(401);
		expect((await ctx.call('/v1/owner/storefront', { key: OWNER_KEY, email: 'owner@example.com' })).status).toBe(200);
	});

	it('an owner caller cannot name a creator: the email resolves it, and ambiguity is refused', async () => {
		const ctx = setup();
		expect((await ctx.call('/v1/owner/storefront', { key: OWNER_KEY, email: 'nobody@example.com' })).status).toBe(404);
		ctx.store.addCreator('owner@example.com', 'duplicate');
		const response = await ctx.call('/v1/owner/storefront', { key: OWNER_KEY, email: 'owner@example.com' });
		expect(response.status).toBe(409);
		expect(await response.json()).toMatchObject({ error: 'ambiguous_creator' });
	});

	it('staff routes need the staff key; the owner key is forbidden there', async () => {
		const ctx = setup();
		await publishFixture(ctx);
		const path = `/v1/staff/creators/${ctx.creator.id}/suspend`;
		const headers = { 'Idempotency-Key': 'staff-key-0001' };
		expect((await ctx.call(path, { method: 'POST', key: OWNER_KEY, headers })).status).toBe(403);
		const ok = await ctx.call(path, { method: 'POST', key: STAFF_KEY, headers });
		expect(ok.status).toBe(200);
		expect(await ok.json()).toMatchObject({ op: 'suspend', state: 'removed' });
		expect((await ctx.owner('/v1/owner/storefront/unpublish', 'POST')).status).toBe(423);
	});

	it('owner responses are private no-store and never expose creator or storefront IDs', async () => {
		const ctx = setup();
		await publishFixture(ctx);
		const response = await ctx.owner('/v1/owner/storefront');
		expect(response.headers.get('Cache-Control')).toBe('no-store, private');
		const text = await response.text();
		expect(text).not.toContain(ctx.creator.id);
		expect(text).not.toContain(ctx.store.storefrontIdsFor(ctx.creator.id)[0]);
	});
});

describe('configuration', () => {
	it('fails closed and names (never reveals) missing settings', async () => {
		const ctx = setup();
		const env: Env = { ...ctx.env, READ_MODEL: undefined, OWNER_API_KEY: undefined, STAFF_API_KEY: 'short' };
		const services = {} as AppServices;
		const pub = await handleRequest(new Request('https://s.example/v1/storefronts/studio'), env, services);
		expect(pub.status).toBe(503);
		expect(await pub.json()).toMatchObject({ error: 'not_configured', details: { missing: ['READ_MODEL'] } });

		const own = await handleRequest(
			new Request('https://s.example/v1/owner/storefront', { headers: { Authorization: `Bearer ${OWNER_KEY}` } }),
			env,
			services
		);
		expect(own.status).toBe(503);
		const body = await own.text();
		expect(body).toContain('OWNER_API_KEY');
		expect(body).not.toContain('short');
	});

	it('separates liveness from readiness', async () => {
		const ctx = setup();
		const env: Env = { ...ctx.env, READ_MODEL: undefined };
		expect((await handleRequest(new Request('https://s.example/health'), env, {} as AppServices)).status).toBe(200);
		const ready = await handleRequest(new Request('https://s.example/health/ready'), env, {} as AppServices);
		expect(ready.status).toBe(503);
		expect(await ready.json()).toEqual({ ready: false, public: ['READ_MODEL'], authoring: ['READ_MODEL'] });
		const fine = await handleRequest(new Request('https://s.example/health/ready'), ctx.env, {} as AppServices);
		expect(await fine.json()).toEqual({ ready: true, public: [], authoring: [] });
	});

	it('rejects identical owner and staff keys', async () => {
		const ctx = setup();
		const env: Env = { ...ctx.env, STAFF_API_KEY: OWNER_KEY };
		const ready = await handleRequest(new Request('https://s.example/health/ready'), env, {} as AppServices);
		expect(await ready.json()).toMatchObject({ authoring: ['invalid:OWNER_API_KEY=STAFF_API_KEY'] });
	});
});
