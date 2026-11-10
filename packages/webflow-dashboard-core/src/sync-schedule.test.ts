import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getLastSyncTime, getNextSyncTime, getSyncMetadata } from './sync-schedule';

const at = (iso: string) => new Date(iso);

test('the Monday window is not expected until Tuesday 16:00 UTC', () => {
	// Monday after the window closes: last week's snapshot is still current.
	assert.equal(getLastSyncTime(at('2026-11-09T20:00:00Z')).toISOString(), '2026-11-02T16:00:00.000Z');
	assert.equal(getNextSyncTime(at('2026-11-09T20:00:00Z')).toISOString(), '2026-11-10T16:00:00.000Z');
	// Tuesday after publication: this week's window is current.
	assert.equal(getLastSyncTime(at('2026-11-10T16:00:00Z')).toISOString(), '2026-11-09T16:00:00.000Z');
	assert.equal(getNextSyncTime(at('2026-11-10T16:00:00Z')).toISOString(), '2026-11-17T16:00:00.000Z');
	// Sunday.
	assert.equal(getLastSyncTime(at('2026-11-15T10:00:00Z')).toISOString(), '2026-11-09T16:00:00.000Z');
});

test('a snapshot for the expected window is not stale on Monday evening', () => {
	const meta = getSyncMetadata(
		{ actualLastSyncTime: '2026-11-02T16:00:00.000Z', actualSource: 'field' },
		at('2026-11-09T20:00:00Z')
	);
	assert.equal(meta.isStale, false);
	assert.equal(meta.timeUntilNextSync, 'in 20 hours');
});

test('a missed Tuesday publication is reported as stale', () => {
	const meta = getSyncMetadata(
		{ actualLastSyncTime: '2026-11-02T16:00:00.000Z', actualSource: 'field' },
		at('2026-11-11T09:00:00Z')
	);
	assert.equal(meta.isStale, true);
});
