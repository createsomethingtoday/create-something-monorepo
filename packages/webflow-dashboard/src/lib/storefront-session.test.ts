import { describe, expect, it } from 'vitest';
import { IdempotencyKeys, readCreatorChoices, storefrontPostBody, storefrontQuery } from './storefront-session';

const A = { id: 'recCREATORAAAAAA1', slug: 'studio-a' };
const B = { id: 'recCREATORBBBBBB2', slug: null };

describe('storefront creator selection', () => {
	it('names the selected creator on reads and previews, and nothing when none is selected', () => {
		expect(storefrontQuery(null)).toBe('');
		expect(storefrontQuery(A)).toBe(`?creator=${A.id}`);
		expect(storefrontQuery(A, { preview: '1' })).toBe(`?preview=1&creator=${A.id}`);
		expect(storefrontQuery(null, { preview: '1' })).toBe('?preview=1');
	});

	it('puts the selected creator on every write action, from state and not from the payload', () => {
		for (const action of ['save', 'selections', 'publish', 'unpublish']) {
			expect(storefrontPostBody(B, action, { expectedDraftVersion: 2 })).toEqual({
				action,
				creatorId: B.id,
				expectedDraftVersion: 2
			});
		}
		expect(storefrontPostBody(null, 'publish', { expectedDraftVersion: 2 })).toEqual({ action: 'publish', expectedDraftVersion: 2 });
		// A payload cannot smuggle a different creator or action past the selection.
		expect(storefrontPostBody(A, 'publish', { creatorId: B.id, action: 'unpublish', expectedDraftVersion: 1 })).toEqual({
			action: 'publish',
			creatorId: A.id,
			expectedDraftVersion: 1
		});
		expect(storefrontPostBody(null, 'publish', { creatorId: B.id })).toEqual({ action: 'publish' });
	});

	it('reads choices only from an ambiguity response', () => {
		expect(
			readCreatorChoices({ error: 'ambiguous_creator', details: { choices: [{ id: A.id, slug: 'studio-a' }, { id: B.id }, { slug: 'x' }, null] } })
		).toEqual([A, B]);
		expect(readCreatorChoices({ error: 'forbidden', details: { choices: [{ id: A.id }] } })).toEqual([]);
		expect(readCreatorChoices({ error: 'ambiguous_creator' })).toEqual([]);
		expect(readCreatorChoices(null)).toEqual([]);
	});
});

describe('idempotency isolation', () => {
	const counter = () => {
		let n = 0;
		return () => `key-${(n += 1)}`;
	};

	it('scopes keys to the selected creator', () => {
		const keys = new IdempotencyKeys(counter());
		const a = keys.acquire(keys.scope(A, 'save:3'));
		const b = keys.acquire(keys.scope(B, 'save:3'));
		expect(a).not.toBe(b);
		expect(keys.acquire(keys.scope(A, 'save:3'))).toBe(a); // a retry for the same creator replays the key
	});

	it('drops every key on a switch, so a prior creator key is never reused', () => {
		const keys = new IdempotencyKeys(counter());
		const before = keys.acquire(keys.scope(A, 'save:3'));
		keys.reset();
		expect(keys.acquire(keys.scope(A, 'save:3'))).not.toBe(before);
	});

	it('releases a key once the request settled', () => {
		const keys = new IdempotencyKeys(counter());
		const scope = keys.scope(A, 'publish:2');
		const first = keys.acquire(scope);
		keys.release(scope);
		expect(keys.acquire(scope)).not.toBe(first);
	});

	it('marks requests that started before a switch as stale', () => {
		const keys = new IdempotencyKeys();
		const started = keys.generation;
		expect(keys.isStale(started)).toBe(false);
		keys.reset();
		expect(keys.isStale(started)).toBe(true);
		expect(keys.isStale(keys.generation)).toBe(false);
	});
});
