import assert from 'node:assert/strict';
import { test } from 'node:test';
import { latestSnapshotRecords } from './latest-snapshot';

const row = (snapshotAt: string | undefined, name: string) => ({
	fields: snapshotAt === undefined ? { NAME: name } : { NAME: name, SNAPSHOT_AT: snapshotAt }
});

test('keeps only rows from the newest snapshot', () => {
	const rows = [
		row('2026-09-21T16:00:00.000Z', 'old-a'),
		row('2026-10-12T16:03:35.000Z', 'new-a'),
		row('2026-09-28T16:01:35.000Z', 'mid'),
		row('2026-10-12T16:03:35.000Z', 'new-b')
	];
	assert.deepEqual(
		latestSnapshotRecords(rows).map((r) => r.fields.NAME),
		['new-a', 'new-b']
	);
});

test('drops unstamped rows once any stamped row exists', () => {
	const rows = [row(undefined, 'legacy'), row('2026-10-12T16:03:35.000Z', 'new')];
	assert.deepEqual(latestSnapshotRecords(rows).map((r) => r.fields.NAME), ['new']);
});

test('returns an unstamped table unchanged', () => {
	const rows = [row(undefined, 'a'), row(undefined, 'b')];
	assert.deepEqual(latestSnapshotRecords(rows).map((r) => r.fields.NAME), ['a', 'b']);
});

test('treats the same instant written with different precision as one snapshot', () => {
	const rows = [row('2026-10-12T16:03:35Z', 'a'), row('2026-10-12T16:03:35.000Z', 'b')];
	assert.equal(latestSnapshotRecords(rows).length, 2);
});

import { selectLatestSnapshotRecords } from './latest-snapshot';

function pagedQuery<T>(pages: T[][], onPage?: (index: number) => void) {
	return {
		eachPage(cb: (records: readonly T[], next: () => void) => void, done: (e?: Error | null) => void) {
			let index = 0;
			const step = () => {
				if (index >= pages.length) return done();
				onPage?.(index);
				cb(pages[index++], step);
			};
			step();
		}
	};
}

test('stops paging at the first row from an older snapshot', async () => {
	const fetched: number[] = [];
	const query = pagedQuery(
		[
			[row('2026-10-12T16:03:35.000Z', 'a'), row('2026-10-12T16:03:35.000Z', 'b')],
			[row('2026-10-12T16:03:35.000Z', 'c'), row('2026-10-05T16:04:52.000Z', 'old')],
			[row('2026-09-21T16:00:00.000Z', 'older')]
		],
		(i) => fetched.push(i)
	);
	const rows = await selectLatestSnapshotRecords(query);
	assert.deepEqual(rows.map((r) => r.fields.NAME), ['a', 'b', 'c']);
	assert.deepEqual(fetched, [0, 1]);
});

test('reads every page when the whole table is one snapshot', async () => {
	const query = pagedQuery([[row('2026-10-12T16:03:35.000Z', 'a')], [row('2026-10-12T16:03:35.000Z', 'b')]]);
	assert.deepEqual((await selectLatestSnapshotRecords(query)).map((r) => r.fields.NAME), ['a', 'b']);
});

test('keeps an unstamped legacy table unchanged', async () => {
	const query = pagedQuery([[row(undefined, 'a')], [row(undefined, 'b')]]);
	assert.deepEqual((await selectLatestSnapshotRecords(query)).map((r) => r.fields.NAME), ['a', 'b']);
});

test('rejects when the query fails', async () => {
	const query = { eachPage(_cb: unknown, done: (e?: Error) => void) { done(new Error('boom')); } };
	await assert.rejects(() => selectLatestSnapshotRecords(query as never), /boom/);
});
