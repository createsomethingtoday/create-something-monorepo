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
  assert.deepEqual(output[0]?.source, { kind: 'import', provider: 'googlecalendar', connectedAccountId: 'ca_123', collectionId: 'primary@example.test', externalId: 'event-1', observedAt: '2026-09-30T12:00:00.000Z', preview: { location: 'Venue', description: 'Load-in 4pm' }, calendarTiming: { start: { date: '2026-10-02' }, end: { date: '2026-10-03' }, endExclusive: true } });
});

test('mismatched kind and missing provenance reject a page before any database write', () => {
  assert.throws(() => mapSourcePage('workspace-1', { provider: 'gmail', connectedAccountId: 'ca_123', nextCursor: null, records: [{ externalId: 'x', kind: 'event', observedAt: '2026-09-30T12:00:00Z', data: {} }] }), /invalid_source_page/);
  assert.throws(() => mapSourcePage('workspace-1', { provider: 'gmail', connectedAccountId: '', nextCursor: null, records: [] }), /invalid_source_page/);
});

function calendarRecord(data: Record<string, unknown>) {
  return mapSourcePage('workspace-1', { provider: 'googlecalendar', connectedAccountId: 'ca_123', nextCursor: null,
    records: [{ externalId: 'event-1', kind: 'event', observedAt: '2026-09-30T12:00:00Z', data: {
      calendarId: 'primary@example.test', start: { date: '2026-10-02' }, end: { date: '2026-10-03' }, ...data,
    } }],
  })[0]!;
}

test('both source titles respect the database UTF-8 byte limit without splitting characters', () => {
  for (const [title, expected] of [
    ['界'.repeat(200), '界'.repeat(166)],
    ['a'.repeat(497) + '🎸', 'a'.repeat(497)],
    ['🎸'.repeat(125), '🎸'.repeat(125)],
    ['a'.repeat(499) + 'é', 'a'.repeat(499)],
    ['é'.repeat(250), 'é'.repeat(250)],
  ]) {
    const gmail = mapSourcePage('workspace-1', {
      provider: 'gmail', connectedAccountId: 'ca_123', nextCursor: null,
      records: [{ externalId: 'message-1', kind: 'message', observedAt: '2026-09-30T12:00:00Z',
        data: { subject: title, threadId: 'thread-1' } }],
    })[0]!;
    for (const mapped of [gmail, calendarRecord({ summary: title })]) {
      assert.equal(mapped.title, expected);
      assert.ok(Buffer.byteLength(mapped.title, 'utf8') <= 500);
      assert.equal(Buffer.from(mapped.title, 'utf8').toString('utf8'), mapped.title);
    }
  }
});

test('DST repeated hour retains provider offsets and zone while normalizing the exact instants', () => {
  const start = { dateTime: '2026-11-01T01:30:00-05:00', timeZone: 'America/Chicago' };
  const end = { dateTime: '2026-11-01T01:30:00-06:00', timeZone: 'America/Chicago' };
  const htmlLink = 'https://calendar.google.com/calendar/event?eid=synthetic';
  const result = calendarRecord({ start, end, htmlLink });
  assert.equal(result.fields.Date, '2026-11-01T06:30:00.000Z/2026-11-01T07:30:00.000Z');
  assert.deepEqual(result.source.calendarTiming, { start, end, endExclusive: true });
  assert.equal(result.source.htmlLink, htmlLink);
});

test('all-day leap date retains explicit exclusive end without local timezone conversion', () => {
  const result = calendarRecord({ start: { date: '2028-02-29' }, end: { date: '2028-03-01' } });
  assert.equal(result.fields.Date, '2028-02-29/2028-03-01');
  assert.equal(result.source.calendarTiming?.endExclusive, true);
});

test('invalid days, offsetless or ambiguous times, and inverted intervals reject before persistence', () => {
  for (const start of [
    { date: '2026-02-29' }, { date: '2026-04-31' }, { dateTime: '2026-02-30T10:00:00Z' },
    { dateTime: '2026-10-02T10:00:00' }, { dateTime: '2026-10-02T24:00:00Z' },
    { date: '2026-10-02', dateTime: '2026-10-02T10:00:00Z' },
  ]) assert.throws(() => calendarRecord({ start }), /invalid_source_page/);
  assert.throws(() => calendarRecord({ end: { date: '2026-10-02' } }), /invalid_source_page/);
  assert.throws(() => calendarRecord({ end: { date: '2026-10-01' } }), /invalid_source_page/);
});

test('unsafe and oversized links are omitted without fabricating a replacement', () => {
  for (const htmlLink of ['javascript:alert(1)', 'http://calendar.google.com/calendar/event',
    'https://calendar.google.com.evil.test/calendar/event', 'https://evil.test/calendar/event',
    'https://user:pass@calendar.google.com/calendar/event', 'https://calendar.google.com:8443/calendar/event',
    'https://calendar.google.com/calendar/event\n', 'https://calendar.google.com/calendar/' + 'x'.repeat(512)]) {
    assert.equal(calendarRecord({ htmlLink }).source.htmlLink, undefined);
  }
  assert.equal(calendarRecord({}).source.htmlLink, undefined);
});

test('new provenance metadata stays within the existing 2000-byte source limit', () => {
  const result = calendarRecord({ description: '🎸'.repeat(1000), location: '🎸'.repeat(500),
    htmlLink: 'https://calendar.google.com/calendar/event?eid=' + 'x'.repeat(400),
    start: { dateTime: '2026-11-01T01:30:00-05:00', timeZone: 'America/Chicago' },
    end: { dateTime: '2026-11-01T01:30:00-06:00', timeZone: 'America/Chicago' },
  });
  assert.ok(Buffer.byteLength(JSON.stringify(result.source)) <= 2000);
  assert.equal(result.source.calendarTiming?.start.timeZone, 'America/Chicago');
  assert.ok(result.source.htmlLink);
});
