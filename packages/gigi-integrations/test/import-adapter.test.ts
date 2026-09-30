import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mapSourcePage } from '../src/import-adapter.ts';

test('Gmail metadata maps to a sourced interaction without inferred contacts or money', () => {
  const output = mapSourcePage('workspace-1', {
    provider: 'gmail', connectedAccountId: 'ca_123', nextCursor: null,
    records: [{ externalId: 'msg-1', kind: 'message', observedAt: '2026-09-30T12:00:00Z', data: {
      subject: 'Show inquiry', from: 'Venue <venue@example.test>', date: 'Wed, 30 Sep 2026 12:00:00 GMT',
      threadId: 'thread-1', snippet: 'Can you play Friday?',
    } }],
  });
  assert.equal(output.length, 1);
  assert.deepEqual(output[0], {
    workspaceId: 'workspace-1', entity: 'interactions', title: 'Show inquiry',
    fields: { Date: '2026-09-30T12:00:00.000Z', Source: 'Gmail', 'Thread ID': 'thread-1' },
    source: { kind: 'import', provider: 'gmail', connectedAccountId: 'ca_123', collectionId: 'thread-1', externalId: 'msg-1', observedAt: '2026-09-30T12:00:00.000Z',
      preview: { from: 'Venue <venue@example.test>', snippet: 'Can you play Friday?' } },
  });
});

test('Calendar event maps to schedule with exact provenance and all-day date', () => {
  const output = mapSourcePage('workspace-1', {
    provider: 'googlecalendar', connectedAccountId: 'ca_123', nextCursor: null,
    records: [{ externalId: 'event-1', kind: 'event', observedAt: '2026-09-30T12:00:00Z', data: {
      calendarId: 'primary@example.test', summary: 'Soundcheck', start: { date: '2026-10-02' }, end: { date: '2026-10-03' }, location: 'Venue', description: 'Load-in 4pm',
    } }],
  });
  assert.equal(output[0]?.entity, 'schedule');
  assert.equal(output[0]?.title, 'Soundcheck');
  assert.deepEqual(output[0]?.fields, { Date: '2026-10-02/2026-10-03', 'All Day': true, 'External Calendar ID': 'primary@example.test' });
  assert.deepEqual(output[0]?.source, { kind: 'import', provider: 'googlecalendar', connectedAccountId: 'ca_123', collectionId: 'primary@example.test', externalId: 'event-1', observedAt: '2026-09-30T12:00:00.000Z', preview: { location: 'Venue', description: 'Load-in 4pm' } });
});

test('mismatched kind and missing provenance reject a page before any database write', () => {
  assert.throws(() => mapSourcePage('workspace-1', { provider: 'gmail', connectedAccountId: 'ca_123', nextCursor: null, records: [{ externalId: 'x', kind: 'event', observedAt: '2026-09-30T12:00:00Z', data: {} }] }), /invalid_source_page/);
  assert.throws(() => mapSourcePage('workspace-1', { provider: 'gmail', connectedAccountId: '', nextCursor: null, records: [] }), /invalid_source_page/);
});
