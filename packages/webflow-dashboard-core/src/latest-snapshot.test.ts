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
