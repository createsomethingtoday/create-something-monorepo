import { describe, expect, it } from 'vitest';
import { D1ReadModel } from '../src/read-model';
import type { ReadModelRow, StorefrontSnapshotV1 } from '../src/types';
import { SqliteD1 } from './fakes';

const A = 'recCREATORAAAAAAA';
const B = 'recCREATORBBBBBBB';

function snapshot(creatorId: string, slug: string, positioning: string): StorefrontSnapshotV1 {
	return {
		schema: 1,
		storefrontId: 'recSTOREFRONT0001',
		creatorId,
		creatorSlug: slug,
		draftVersion: 1,
		publishedAt: '2026-10-29T00:00:00.000Z',
		positioning,
		cover: null,
		portfolioUrl: null,
		support: null,
		selections: []
	};
}

function live(creatorId: string, slug: string, revision: number, positioning = 'v'): ReadModelRow {
	return { creatorSlug: slug, creatorId, revision, state: 'live', snapshot: snapshot(creatorId, slug, positioning) };
}

function tomb(creatorId: string, slug: string, revision: number, state: ReadModelRow['state'] = 'unpublished'): ReadModelRow {
	return { creatorSlug: slug, creatorId, revision, state, snapshot: null };
}

describe('D1ReadModel (real SQLite)', () => {
	it('applies newer revisions and classifies equal and older ones', async () => {
		const model = new D1ReadModel(new SqliteD1().asD1());
		expect(await model.apply(live(A, 'studio', 1, 'one'))).toBe('applied');
		expect(await model.apply(live(A, 'studio', 1, 'one'))).toBe('idempotent');
		expect(await model.apply(live(A, 'studio', 1, 'different'))).toBe('stale');
		expect(await model.apply(live(A, 'studio', 2, 'two'))).toBe('applied');
		expect(await model.apply(live(A, 'studio', 1, 'one'))).toBe('stale');
		expect((await model.get('studio'))?.snapshot?.positioning).toBe('two');
	});

	it('keeps tombstones: a delayed older publish cannot resurrect them', async () => {
		const model = new D1ReadModel(new SqliteD1().asD1());
		await model.apply(live(A, 'studio', 1));
		expect(await model.apply(tomb(A, 'studio', 3, 'suspended'))).toBe('applied');
		expect(await model.apply(live(A, 'studio', 2))).toBe('stale');
		const row = await model.get('studio');
		expect(row).toMatchObject({ state: 'suspended', revision: 3, snapshot: null });
	});

	it('fails closed on any creator mismatch, live or tombstone, regardless of revision', async () => {
		const model = new D1ReadModel(new SqliteD1().asD1());
		await model.apply(live(B, 'shared', 1));
		expect(await model.apply(live(A, 'shared', 50))).toBe('conflict');

		await model.apply(tomb(B, 'shared', 2, 'suspended'));
		expect(await model.apply(live(A, 'shared', 99))).toBe('conflict');
		expect(await model.apply(tomb(A, 'shared', 99, 'moved'))).toBe('conflict');
		expect(await model.get('shared')).toMatchObject({ creatorId: B, state: 'suspended', revision: 2 });
	});

	it('enforces live ⇔ snapshot at the schema level', async () => {
		const model = new D1ReadModel(new SqliteD1().asD1());
		await expect(model.apply({ creatorSlug: 'x', creatorId: A, revision: 1, state: 'live', snapshot: null })).rejects.toMatchObject({
			code: 'upstream_unavailable'
		});
	});
});
