import { test } from 'node:test';
import assert from 'node:assert/strict';
import worker, { CourtStateManager } from '../src/index.ts';

function fixture() {
 const values = new Map<string, unknown>(); let alarm: number | null = null; let allocated = 0;
 const sockets: unknown[] = [];
 const reservations: unknown[] = [];
 const storage: any = {
  transaction: async (fn: (tx: any) => Promise<unknown>) => fn(storage),
  async get(key: string) { return structuredClone(values.get(key)); },
  async put(key: string, value: unknown) { values.set(key, structuredClone(value)); },
  async setAlarm(at: number) { alarm = at; }, async deleteAlarm() { alarm = null; }
 };
 const state = { storage, id: { toString: () => 'f1' }, blockConcurrencyWhile: (fn: () => Promise<unknown>) => fn(), getWebSockets: () => sockets };
 const env = { DB: { prepare: (sql: string) => ({ bind: (id: string) => ({ first: async () => ['f1', 'c1'].includes(id) ? { id } : null, all: async () => ({ results: sql.includes('FROM reservations') ? reservations : [] }) }) }) }, COURT_STATE: {
  idFromName: (id: string) => ({ toString: () => id }), get: () => { allocated++; return { fetch: async () => new Response('ok') }; }
 }};
 const create = async () => { const obj = new CourtStateManager(state as any, env as any); await Promise.resolve(); await Promise.resolve(); return obj; };
 return { state, env, create, values, sockets, reservations, get alarm() { return alarm; }, get allocated() { return allocated; } };
}
const request = (path: string, body?: unknown, facility = 'f1') => new Request(`https://test/${path}?facilityId=${facility}`, body ? { method: 'POST', body: JSON.stringify(body) } : undefined);
const slot = { courtId: 'c1', startTime: '2026-10-09T10:30:00Z', memberId: 'm1' };

test('empty construction and read do not create repeating work', async () => {
 const f = fixture(); const obj = await f.create();
 assert.equal(f.alarm, null);
 await obj.fetch(request('availability'));
 assert.equal(f.alarm, null);
});
test('hold survives restart, expires exactly once, preserves ISO timestamp and stops alarms', async () => {
 const f = fixture(); const obj = await f.create();
 const before = Date.now(); await obj.fetch(request('attempt', slot));
 assert.ok(f.alarm! >= before + 15_000);
 const restarted = await f.create();
 assert.equal((await (await restarted.fetch(request('availability'))).json() as any).slots[0].startTime, slot.startTime);
 const oldNow = Date.now; Date.now = () => before + 16_000;
 try { await restarted.alarm(); } finally { Date.now = oldNow; }
 assert.equal(f.alarm, null); assert.deepEqual(f.values.get('availability'), []);
 await restarted.alarm(); assert.equal(f.alarm, null);
});
test('confirm and release remove pending alarm; expired hold cannot confirm', async () => {
 const f = fixture(); const obj = await f.create();
 await obj.fetch(request('attempt', slot)); await obj.fetch(request('confirm', { ...slot, reservationId: 'r1' }));
 assert.equal(f.alarm, null);
 await obj.fetch(request('cancel', slot)); await obj.fetch(request('attempt', slot));
 await obj.fetch(request('release', slot)); assert.equal(f.alarm, null);
 await obj.fetch(request('attempt', slot)); const expiry = f.alarm!;
 const oldNow = Date.now; Date.now = () => expiry;
 try { assert.equal((await (await obj.fetch(request('confirm', { ...slot, reservationId: 'r1' }))).json() as any).success, false); }
 finally { Date.now = oldNow; }
 assert.equal(f.alarm, null);
});
test('unknown facility rejected before namespace allocation; mismatched named object rejected', async () => {
 const f = fixture();
 assert.equal((await worker.fetch(request('availability', undefined, 'unknown'), f.env as any)).status, 404);
 assert.equal(f.allocated, 0);
 const obj = await f.create();
 assert.equal((await obj.fetch(request('availability', undefined, 'other'))).status, 400);
 assert.equal(f.alarm, null);
});

test('court from another facility is rejected without scheduling work', async () => {
 const f = fixture(); const obj = await f.create();
 assert.equal((await obj.fetch(request('attempt', { ...slot, courtId: 'elsewhere' }))).status, 404);
 assert.equal(f.alarm, null);
});

test('abnormal/disconnected sockets cannot interrupt expiry persistence', async () => {
 const f = fixture(); const obj = await f.create(); let closeCode = 0;
 obj.webSocketClose({ close: (code: number) => { closeCode = code; } } as any, 1005, '');
 assert.equal(closeCode, 1000);
 const broken = { send() { throw Error('closed'); }, close() { throw Error('already closed'); } };
 f.sockets.push(broken);
 await obj.fetch(request('attempt', slot));
 const oldNow = Date.now; const expiry = f.alarm!; Date.now = () => expiry;
 try { await obj.alarm(); } finally { Date.now = oldNow; }
 assert.equal(f.alarm, null); assert.deepEqual(f.values.get('availability'), []);
 obj.webSocketError(broken as any); obj.webSocketClose(broken as any, 1005, '');
});

test('past cache entries are pruned after restart and many future slots stay bounded', async () => {
 const f = fixture();
 f.values.set('availability', Array.from({ length: 600 }, (_, i) => [`c1:2020-01-01T${String(i % 24).padStart(2, '0')}:00:00Z`, { status: 'reserved', reservationId: String(i) }]));
 const obj = await f.create(); await obj.fetch(request('availability')); assert.deepEqual(f.values.get('availability'), []);
 // Seed a full bounded cache rather than performing hundreds of fixture requests.
 f.values.set('availability', Array.from({ length: 512 }, (_, i) => [`c1:${new Date(Date.now() + i * 60000).toISOString()}`, { status: 'reserved', reservationId: 'r' }]));
 const full = await f.create();
 assert.equal((await full.fetch(request('attempt', { ...slot, startTime: '2099-01-01T00:00:00Z' }))).status, 503);
 assert.equal(f.alarm, null); assert.equal((f.values.get('availability') as any[]).length, 512);
});

const pendingReservation = (memberId = 'm1', id = 'r1') => ({ court_id: slot.courtId, start_time: slot.startTime, end_time: slot.startTime, id, member_id: memberId, status: 'pending' });

test('sync preserves matching checkout hold deadline through restart and payment confirmation', async () => {
 const f = fixture(); const obj = await f.create();
 await obj.fetch(request('attempt', slot)); const expiry = f.alarm;
 f.reservations.push(pendingReservation());
 assert.equal((await obj.fetch(request('sync', { date: '2026-10-09' }))).status, 200);
 assert.equal(f.alarm, expiry);
 const restarted = await f.create();
 assert.equal((await (await restarted.fetch(request('confirm', { ...slot, reservationId: 'r1' }))).json() as any).success, true);
 assert.equal(f.alarm, null);
});

test('sync preserves an unpersisted hold but cannot extend it or revive an expired hold', async () => {
 const f = fixture(); const obj = await f.create();
 await obj.fetch(request('attempt', slot)); const expiry = f.alarm!;
 await obj.fetch(request('sync', { date: '2026-10-09' })); assert.equal(f.alarm, expiry);
 f.reservations.push(pendingReservation());
 const oldNow = Date.now; Date.now = () => expiry;
 try {
  await obj.fetch(request('sync', { date: '2026-10-09' }));
  assert.equal((await (await obj.fetch(request('confirm', { ...slot, reservationId: 'r1' }))).json() as any).success, false);
  assert.equal(f.alarm, null);
 } finally { Date.now = oldNow; }
});

test('sync never transfers a live hold to another member or reservation', async () => {
 for (const mismatch of ['member', 'reservation']) {
  const f = fixture(); const obj = await f.create(); await obj.fetch(request('attempt', slot));
  f.reservations.push(pendingReservation()); await obj.fetch(request('sync', { date: '2026-10-09' }));
  // Once a reservation is associated, confirmation must use that same identity.
  assert.equal((await (await obj.fetch(request('confirm', { ...slot, reservationId: 'other' }))).json() as any).success, false);
  f.reservations.splice(0, 1, pendingReservation(mismatch === 'member' ? 'other' : 'm1', mismatch === 'reservation' ? 'other' : 'r1'));
  await obj.fetch(request('sync', { date: '2026-10-09' }));
  assert.equal(f.alarm, null);
  assert.equal((await (await obj.fetch(request('confirm', { ...slot, reservationId: mismatch === 'reservation' ? 'other' : 'r1' }))).json() as any).success, false);
 }
});
