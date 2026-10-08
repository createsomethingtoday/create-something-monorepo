import test from 'node:test';
import assert from 'node:assert/strict';
import { scheduleEntry, scheduleAgenda, readSchedulePages } from './schedule.mjs';
const record = (id, date, fields = {}) => ({ id, title: id, date, fields });

test('agenda sorts all pages, groups calendar dates and keeps unknown dates inspectable', async () => {
  const calls = [];
  const records = await readSchedulePages(async cursor => {
    calls.push(cursor);
    return cursor ? { items: [record('earliest', '2026-10-07')], nextCursor: null } : { items: [record('future', '2026-10-09'), record('old', '2021-05-31'), record('unknown', '2026-02-30')], nextCursor: 'second' };
  });
  assert.deepEqual(calls, [undefined, 'second']);
  const all = scheduleAgenda(records, 'all', '2026-10-07');
  assert.deepEqual(all.groups.flatMap(g => g.entries.map(e => e.record.id)), ['old', 'earliest', 'future', 'unknown']);
  assert.deepEqual(all.counts, { upcoming: 2, past: 1, all: 4 });
  assert.match(all.groups[1].title, /^Today/);
  assert.equal(scheduleAgenda(records, 'upcoming', '2026-10-07').groups.length, 2);
});
test('timestamp intervals use local times and span midnight without hiding ongoing events', () => {
  const entry = scheduleEntry(record('event', '2026-10-07T19:00:00Z/2026-10-07T19:30:00Z'));
  assert.match(entry.time, / – /);
  assert.doesNotMatch(entry.time, /T19|\.000|UTC/);
  const spanning = record('ongoing', '2026-10-06/2026-10-08');
  assert.equal(scheduleAgenda([spanning], 'upcoming', '2026-10-07').counts.upcoming, 1);
  assert.equal(scheduleEntry(record('day', '2026-10-07')).time, 'All day');
  assert.equal(scheduleEntry(record('bad', '2026-10-08/2026-10-07')).key, null);
});
test('pagination aborts stale navigation and rejects repeated cursors', async () => {
  assert.equal(await readSchedulePages(async () => ({ items: [], nextCursor: 'next' }), () => false), null);
  await assert.rejects(readSchedulePages(async () => ({ items: [], nextCursor: 'same' })), /finish loading/);
});
test('schedule navigation renders both pages and switches between past and upcoming without writes', async () => {
  const listeners = new Map(), calls = [];
  const root = { innerHTML: '', classList: { toggle() {} }, addEventListener(name, handler) { listeners.set(name, handler); }, querySelector() { return null; } };
  const prior = { document: globalThis.document, tauri: globalThis.__TAURI__ };
  globalThis.document = { querySelector: () => root };
  globalThis.__TAURI__ = { core: { invoke: async (_, { operation, input }) => {
    calls.push(operation);
    if (operation === 'workspace.get') return { id: 'synthetic', name: 'Synthetic' };
    if (operation === 'records.list') return input.entity === 'profile' ? { items: [{ id: 'profile' }] } : input.entity === 'schedule' ? input.cursor ? { items: [record('early', '2098-10-07')], count: 3 } : { items: [record('late', '2099-10-07'), record('history', '2021-05-31')], count: 3, nextCursor: 'second' } : { items: [] };
    if (operation === 'records.get') return { fields: { Currency: 'USD' } };
    return {};
  } } };
  const click = dataset => listeners.get('click')({ target: { closest: () => ({ dataset }) } });
  const settle = () => new Promise(resolve => setImmediate(resolve));
  try {
    await import(`./app.mjs?schedule-test=${Date.now()}`); await settle();
    click({ page: 'schedule' }); await settle();
    assert.match(root.innerHTML, /Upcoming \(2\)/);
    assert.ok(root.innerHTML.indexOf('>early<') < root.innerHTML.indexOf('>late<'));
    assert.doesNotMatch(root.innerHTML, />history</);
    click({ scheduleView: 'past' });
    assert.match(root.innerHTML, />history</);
    assert.doesNotMatch(root.innerHTML, />early</);
    click({ scheduleToday: '1' });
    assert.match(root.innerHTML, />early</);
    assert.equal(calls.includes('records.save'), false);
  } finally { globalThis.document = prior.document; globalThis.__TAURI__ = prior.tauri; }
});
