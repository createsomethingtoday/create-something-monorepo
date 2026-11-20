import { describe, expect, it } from 'vitest';
import { PUBLICATION_STATUS } from '../src/fields';
import type { ReadModel } from '../src/ports';
import { D1ReadModel } from '../src/read-model';
import type { ApplyResult, CreatorRef, ReadModelRow } from '../src/types';
import { StorefrontWriter } from '../src/writer';
import { FakeInventory, FakeStore, MemoryStorage, SqliteD1, recId } from './fakes';

const COVER = 'https://dashboard.example/api/uploads/u/cover.webp';

/** Wraps the real read model and fails chosen applies. */
class FlakyReadModel implements ReadModel {
	failSlugs: string[] = [];
	constructor(readonly inner: ReadModel) {}
	async apply(row: ReadModelRow): Promise<ApplyResult> {
		const i = this.failSlugs.indexOf(row.creatorSlug);
		if (i >= 0) {
			this.failSlugs.splice(i, 1);
			const { StorefrontError } = await import('../src/errors');
			throw new StorefrontError('upstream_unavailable', 'injected read-model failure');
		}
		return this.inner.apply(row);
	}
	get(slug: string) {
		return this.inner.get(slug);
	}
}

function setup() {
	const store = new FakeStore();
	const inventory = new FakeInventory();
	const d1 = new SqliteD1();
	const readModel = new FlakyReadModel(new D1ReadModel(d1.asD1()));
	const storage = new MemoryStorage();
	const alarms: number[] = [];
	const makeWriter = () =>
		new StorefrontWriter({
			store,
			inventory,
			readModel,
			storage,
			allowedCoverOrigins: ['https://dashboard.example'],
			scheduleReconcile: async (ms) => {
				alarms.push(ms);
			}
		});
	const creator = store.addCreator('owner@example.com', 'studio');
	const assets = [store.addAsset(creator.id), store.addAsset(creator.id), store.addAsset(creator.id)];
	let n = 0;
	const key = () => `key-${(n += 1).toString().padStart(6, '0')}`;
	return { store, inventory, readModel, storage, alarms, writer: makeWriter(), makeWriter, creator, assets, key };
}

async function draftWithSelections(ctx: ReturnType<typeof setup>) {
	await ctx.writer.saveDraft(ctx.creator, {
		expectedDraftVersion: 0,
		fields: { positioning: 'Clean templates', coverUrl: COVER, coverAlt: 'Cover' },
		idempotencyKey: ctx.key()
	});
	await ctx.writer.replaceSelections(ctx.creator, {
		expectedDraftVersion: 1,
		selections: [{ assetId: ctx.assets[0].id, note: 'Favorite' }, { assetId: ctx.assets[1].id }],
		idempotencyKey: ctx.key()
	});
	return 2;
}

describe('draft writes', () => {
	it('serializes concurrent first creates: one storefront, one winner, one version conflict', async () => {
		const ctx = setup();
		const results = await Promise.allSettled([
			ctx.writer.saveDraft(ctx.creator, { expectedDraftVersion: 0, fields: { positioning: 'A' }, idempotencyKey: ctx.key() }),
			ctx.writer.saveDraft(ctx.creator, { expectedDraftVersion: 0, fields: { positioning: 'B' }, idempotencyKey: ctx.key() })
		]);
		expect(results.map((r) => r.status)).toEqual(['fulfilled', 'rejected']);
		expect((results[1] as PromiseRejectedResult).reason).toMatchObject({ code: 'version_conflict' });
		expect(ctx.store.storefrontIdsFor(ctx.creator.id)).toHaveLength(1);
		expect(ctx.store.calls.filter((c) => c === 'createStorefront')).toHaveLength(1);
	});

	it('replays the same idempotency key and rejects a reused key with a different payload', async () => {
		const ctx = setup();
		const key = ctx.key();
		const input = { expectedDraftVersion: 0, fields: { positioning: 'A' }, idempotencyKey: key };
		await ctx.writer.saveDraft(ctx.creator, input);
		const second = await ctx.writer.saveDraft(ctx.creator, input);
		expect(second.draft.draftVersion).toBe(1);
		expect(ctx.store.calls.filter((c) => c === 'updateStorefront')).toHaveLength(1);

		await expect(
			ctx.writer.saveDraft(ctx.creator, { ...input, fields: { positioning: 'B' } })
		).rejects.toMatchObject({ code: 'idempotency_conflict' });
		await expect(
			ctx.writer.saveDraft(ctx.creator, { ...input, idempotencyKey: null })
		).rejects.toMatchObject({ code: 'idempotency_key_required' });
	});

	it('recovers a draft write that failed before commit, and blocks other writes while it is uncertain', async () => {
		const ctx = setup();
		await ctx.writer.saveDraft(ctx.creator, { expectedDraftVersion: 0, fields: { positioning: 'v1' }, idempotencyKey: ctx.key() });
		const key = ctx.key();
		ctx.store.failNext('updateStorefront', 'before'); // the write
		ctx.store.failNext('updateStorefront', 'before'); // the recovery attempt of the next caller
		await expect(
			ctx.writer.saveDraft(ctx.creator, { expectedDraftVersion: 1, fields: { positioning: 'v2' }, idempotencyKey: key })
		).rejects.toMatchObject({ code: 'upstream_unavailable' });

		await expect(
			ctx.writer.saveDraft(ctx.creator, { expectedDraftVersion: 1, fields: { positioning: 'other' }, idempotencyKey: ctx.key() })
		).rejects.toMatchObject({ code: 'intent_pending' });

		const restarted = ctx.makeWriter();
		const view = await restarted.saveDraft(ctx.creator, {
			expectedDraftVersion: 1,
			fields: { positioning: 'v2' },
			idempotencyKey: key
		});
		expect(view.draft).toMatchObject({ draftVersion: 2, fields: { positioning: 'v2' } });
	});

	it('returns the last committed draft while a write is pending', async () => {
		const ctx = setup();
		await ctx.writer.saveDraft(ctx.creator, { expectedDraftVersion: 0, fields: { positioning: 'v1' }, idempotencyKey: ctx.key() });
		ctx.store.failNext('updateStorefront', 'before');
		ctx.store.failNext('updateStorefront', 'before');
		await expect(
			ctx.writer.saveDraft(ctx.creator, { expectedDraftVersion: 1, fields: { positioning: 'v2' }, idempotencyKey: ctx.key() })
		).rejects.toBeTruthy();
		const view = await ctx.writer.view(ctx.creator);
		expect(view.pending).toBe(true);
		expect(view.draft).toMatchObject({ draftVersion: 1, fields: { positioning: 'v1' } });
	});

	it('treats a write that landed but lost its response as committed on retry (no second write)', async () => {
		const ctx = setup();
		await ctx.writer.saveDraft(ctx.creator, { expectedDraftVersion: 0, fields: { positioning: 'v1' }, idempotencyKey: ctx.key() });
		const key = ctx.key();
		ctx.store.failNext('updateStorefront', 'after');
		await expect(
			ctx.writer.saveDraft(ctx.creator, { expectedDraftVersion: 1, fields: { positioning: 'v2' }, idempotencyKey: key })
		).rejects.toMatchObject({ code: 'upstream_unavailable' });
		const writesBefore = ctx.store.calls.filter((c) => c === 'updateStorefront').length;

		const view = await ctx.makeWriter().saveDraft(ctx.creator, {
			expectedDraftVersion: 1,
			fields: { positioning: 'v2' },
			idempotencyKey: key
		});
		expect(view.draft.draftVersion).toBe(2);
		expect(ctx.store.calls.filter((c) => c === 'updateStorefront').length).toBe(writesBefore);
	});
});

describe('selections', () => {
	it('rejects cross-owner, unpublished and non-template assets', async () => {
		const ctx = setup();
		const other = ctx.store.addCreator('other@example.com', 'other');
		const foreign = ctx.store.addAsset(other.id);
		const draft = ctx.store.addAsset(ctx.creator.id, { marketplaceStatus: '1️⃣Upcoming🆕' });
		const library = ctx.store.addAsset(ctx.creator.id, { typeText: 'Library📚' });
		await expect(
			ctx.writer.replaceSelections(ctx.creator, {
				expectedDraftVersion: 0,
				selections: [{ assetId: foreign.id }, { assetId: draft.id }, { assetId: library.id }],
				idempotencyKey: ctx.key()
			})
		).rejects.toMatchObject({
			code: 'ineligible_selection',
			details: {
				issues: [
					{ assetId: foreign.id, reason: 'not_owned' },
					{ assetId: draft.id, reason: 'not_published' },
					{ assetId: library.id, reason: 'not_template' }
				]
			}
		});
	});

	it('recovers a partially applied replace after restart without duplicate rows', async () => {
		const ctx = setup();
		const key = ctx.key();
		ctx.store.failNext('createSelections', 'after');
		const input = {
			expectedDraftVersion: 0,
			selections: [{ assetId: ctx.assets[0].id }, { assetId: ctx.assets[1].id, note: 'n' }],
			idempotencyKey: key
		};
		await expect(ctx.writer.replaceSelections(ctx.creator, input)).rejects.toMatchObject({ code: 'upstream_unavailable' });

		const view = await ctx.makeWriter().replaceSelections(ctx.creator, input);
		expect(view.draft.draftVersion).toBe(1);
		expect(view.draft.selections).toEqual([
			{ assetId: ctx.assets[0].id, position: 1, note: null },
			{ assetId: ctx.assets[1].id, position: 2, note: 'n' }
		]);
		expect(ctx.store.selections.size).toBe(2);
	});

	it('fails closed on a selection row linked to another storefront, before any mutation', async () => {
		const ctx = setup();
		await draftWithSelections(ctx);
		const row = [...ctx.store.selections.values()][0];
		row.storefrontIds.push(recId('stf'));
		const mutationsBefore = ctx.store.calls.filter((c) => /^(create|update|delete)Selections$/.test(c)).length;

		await expect(
			ctx.writer.replaceSelections(ctx.creator, {
				expectedDraftVersion: 2,
				selections: [{ assetId: ctx.assets[2].id }],
				idempotencyKey: ctx.key()
			})
		).rejects.toMatchObject({ code: 'invariant_violation' });
		await expect(
			ctx.writer.publish(ctx.creator, { expectedDraftVersion: 2, idempotencyKey: ctx.key() })
		).rejects.toMatchObject({ code: 'invariant_violation' });
		expect(ctx.store.calls.filter((c) => /^(create|update|delete)Selections$/.test(c)).length).toBe(mutationsBefore);
	});

	it('fails closed on duplicate positions', async () => {
		const ctx = setup();
		await draftWithSelections(ctx);
		for (const row of ctx.store.selections.values()) row.position = 1;
		await expect(ctx.writer.view(ctx.creator)).rejects.toMatchObject({ code: 'invariant_violation' });
	});
});

describe('publication', () => {
	it('publishes a live snapshot and re-publishes an unchanged draft after unpublish', async () => {
		const ctx = setup();
		const version = await draftWithSelections(ctx);
		const first = await ctx.writer.publish(ctx.creator, { expectedDraftVersion: version, idempotencyKey: ctx.key() });
		expect(first).toMatchObject({ state: 'live', readModel: 'committed', publicationRevision: 1, publishedDraftVersion: 2 });

		const off = await ctx.writer.unpublish(ctx.creator, { idempotencyKey: ctx.key() });
		expect(off).toMatchObject({ state: 'removed', publicationRevision: 2 });
		expect(await ctx.readModel.get('studio')).toMatchObject({ state: 'unpublished' });

		const again = await ctx.writer.publish(ctx.creator, { expectedDraftVersion: version, idempotencyKey: ctx.key() });
		expect(again).toMatchObject({ state: 'live', publicationRevision: 3, publishedDraftVersion: 2 });
		expect(await ctx.readModel.get('studio')).toMatchObject({ state: 'live', revision: 3 });
	});

	it('blocks publish on templates missing from inventory, and fails closed when inventory is down', async () => {
		const ctx = setup();
		const version = await draftWithSelections(ctx);
		ctx.inventory.missing.add(ctx.assets[1].templateSlug!);
		await expect(ctx.writer.publish(ctx.creator, { expectedDraftVersion: version, idempotencyKey: ctx.key() })).rejects.toMatchObject({
			code: 'ineligible_selection',
			details: { issues: [{ assetId: ctx.assets[1].id, reason: 'not_in_inventory' }] }
		});
		ctx.inventory.missing.clear();
		ctx.inventory.down = true;
		await expect(ctx.writer.publish(ctx.creator, { expectedDraftVersion: version, idempotencyKey: ctx.key() })).rejects.toMatchObject({
			code: 'upstream_unavailable'
		});
		expect(await ctx.readModel.get('studio')).toBeNull();
	});

	it('only staff clear a suspension: owner unpublish and publish are refused', async () => {
		const ctx = setup();
		const version = await draftWithSelections(ctx);
		await ctx.writer.publish(ctx.creator, { expectedDraftVersion: version, idempotencyKey: ctx.key() });
		expect(await ctx.writer.suspend(ctx.creator, { idempotencyKey: ctx.key() })).toMatchObject({ state: 'removed' });

		await expect(ctx.writer.unpublish(ctx.creator, { idempotencyKey: ctx.key() })).rejects.toMatchObject({ code: 'suspended' });
		await expect(ctx.writer.publish(ctx.creator, { expectedDraftVersion: version, idempotencyKey: ctx.key() })).rejects.toMatchObject({
			code: 'suspended'
		});
		expect(await ctx.readModel.get('studio')).toMatchObject({ state: 'suspended' });

		expect(await ctx.writer.clearSuspension(ctx.creator, { idempotencyKey: ctx.key() })).toMatchObject({
			status: PUBLICATION_STATUS.unpublished
		});
		expect(await ctx.writer.publish(ctx.creator, { expectedDraftVersion: version, idempotencyKey: ctx.key() })).toMatchObject({
			state: 'live'
		});
	});

	it('a suspension whose Airtable step failed still blocks the owner (writer state wins)', async () => {
		const ctx = setup();
		const version = await draftWithSelections(ctx);
		await ctx.writer.publish(ctx.creator, { expectedDraftVersion: version, idempotencyKey: ctx.key() });
		ctx.store.failNext('updateStorefront', 'before');
		expect(await ctx.writer.suspend(ctx.creator, { idempotencyKey: ctx.key() })).toMatchObject({ state: 'propagating' });
		await expect(ctx.writer.publish(ctx.creator, { expectedDraftVersion: version, idempotencyKey: ctx.key() })).rejects.toMatchObject({
			code: 'suspended'
		});
	});

	it('a delayed publish cannot resurrect a later suspension; its retry reports superseded, not live', async () => {
		const ctx = setup();
		const version = await draftWithSelections(ctx);
		const publishKey = ctx.key();
		ctx.readModel.failSlugs.push('studio');
		const pending = await ctx.writer.publish(ctx.creator, { expectedDraftVersion: version, idempotencyKey: publishKey });
		expect(pending).toMatchObject({ state: 'propagating', readModel: 'pending', publicationRevision: 1 });

		expect(await ctx.writer.suspend(ctx.creator, { idempotencyKey: ctx.key() })).toMatchObject({
			state: 'removed',
			publicationRevision: 2
		});
		expect(await ctx.writer.reconcile(ctx.creator)).toMatchObject({ op: 'suspend' });
		expect(await ctx.readModel.apply({ ...pendingRow(ctx.creator), revision: 1 })).toBe('stale');

		const retry = await ctx.writer.publish(ctx.creator, { expectedDraftVersion: version, idempotencyKey: publishKey });
		expect(retry).toMatchObject({ state: 'superseded', publicationRevision: 1 });
		expect(await ctx.readModel.get('studio')).toMatchObject({ state: 'suspended', revision: 2 });
	});

	it('a completed publish retried after a newer unpublish reports superseded', async () => {
		const ctx = setup();
		const version = await draftWithSelections(ctx);
		const key = ctx.key();
		expect(await ctx.writer.publish(ctx.creator, { expectedDraftVersion: version, idempotencyKey: key })).toMatchObject({
			state: 'live'
		});
		await ctx.writer.unpublish(ctx.creator, { idempotencyKey: ctx.key() });
		expect(await ctx.writer.publish(ctx.creator, { expectedDraftVersion: version, idempotencyKey: key })).toMatchObject({
			state: 'superseded'
		});
	});

	it('reconciles a pending publish with the same revision once the read model recovers', async () => {
		const ctx = setup();
		const version = await draftWithSelections(ctx);
		const key = ctx.key();
		ctx.readModel.failSlugs.push('studio');
		expect(await ctx.writer.publish(ctx.creator, { expectedDraftVersion: version, idempotencyKey: key })).toMatchObject({
			state: 'propagating'
		});
		expect(ctx.alarms.length).toBeGreaterThan(0);
		expect(await ctx.makeWriter().reconcile(ctx.creator)).toMatchObject({ state: 'live', publicationRevision: 1 });
		// Equal-revision retry is idempotent: same revision, no new allocation.
		expect(await ctx.writer.publish(ctx.creator, { expectedDraftVersion: version, idempotencyKey: key })).toMatchObject({
			state: 'live',
			publicationRevision: 1
		});
	});

	it('reconcile re-checks status: an outside suspension drops a pending publish', async () => {
		const ctx = setup();
		const version = await draftWithSelections(ctx);
		ctx.store.failNext('updateStorefront', 'before');
		expect(await ctx.writer.publish(ctx.creator, { expectedDraftVersion: version, idempotencyKey: ctx.key() })).toMatchObject({
			state: 'propagating'
		});
		const id = ctx.store.storefrontIdsFor(ctx.creator.id)[0];
		ctx.store.storefronts.get(id)!.status = PUBLICATION_STATUS.suspended;
		expect(await ctx.writer.reconcile(ctx.creator)).toMatchObject({ state: 'superseded' });
		expect(await ctx.readModel.get('studio')).toBeNull();
	});

	it('after a half-applied slug move, unpublish tombstones both slugs', async () => {
		const ctx = setup();
		const version = await draftWithSelections(ctx);
		await ctx.writer.publish(ctx.creator, { expectedDraftVersion: version, idempotencyKey: ctx.key() });

		const moved: CreatorRef = { ...ctx.creator, slug: 'studio-new' };
		ctx.store.creators.get(ctx.creator.id)!.slug = 'studio-new';
		ctx.readModel.failSlugs.push('studio'); // new slug goes live, old-slug tombstone fails
		expect(await ctx.writer.moveSlug(moved, { idempotencyKey: ctx.key() })).toMatchObject({ state: 'propagating' });
		expect(await ctx.readModel.get('studio-new')).toMatchObject({ state: 'live' });
		expect(await ctx.readModel.get('studio')).toMatchObject({ state: 'live' });

		expect(await ctx.writer.unpublish(moved, { idempotencyKey: ctx.key() })).toMatchObject({ state: 'removed' });
		expect(await ctx.readModel.get('studio')).toMatchObject({ state: 'unpublished' });
		expect(await ctx.readModel.get('studio-new')).toMatchObject({ state: 'unpublished' });
	});
});

function pendingRow(creator: CreatorRef): ReadModelRow {
	return {
		creatorSlug: 'studio',
		creatorId: creator.id,
		revision: 1,
		state: 'live',
		snapshot: {
			schema: 1,
			storefrontId: 'x',
			creatorId: creator.id,
			creatorSlug: 'studio',
			draftVersion: 2,
			publishedAt: '2026-10-29T00:00:00.000Z',
			positioning: null,
			cover: null,
			portfolioUrl: null,
			support: null,
			selections: []
		}
	};
}
