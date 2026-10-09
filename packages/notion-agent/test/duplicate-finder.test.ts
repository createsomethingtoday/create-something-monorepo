import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DuplicateFinderDO } from '../src/lib/durable/DuplicateFinderDO.js';

function fixture(config = { DUPLICATE_SCAN_MAX_PAGES: '10', DUPLICATE_SCAN_MAX_DURATION_MS: '60000' }) {
 const data = new Map<string, any>(); let alarm: number | null = null; let queue = Promise.resolve();
 const storage: any = {
  get: async (key: string) => structuredClone(data.get(key)),
  put: async (key: string, value: unknown) => { data.set(key, structuredClone(value)); },
  delete: async (key: string) => data.delete(key),
  setAlarm: async (at: number) => { alarm = at; }, deleteAlarm: async () => { alarm = null; },
  transaction: (fn: (tx: any) => Promise<unknown>) => { const result = queue.then(() => fn(storage)); queue = result.then(() => {}, () => {}); return result; }
 };
 const create = () => new DuplicateFinderDO({ storage } as any, config);
 return { data, create, get alarm() { return alarm; } };
}
const start = (obj: DuplicateFinderDO) => obj.fetch(new Request('https://test/start', { method: 'POST', body: JSON.stringify({ database_id: 'db', access_token: 'test-only', keep_strategy: 'oldest' }) }));
const page = (id: string, title = id) => ({ id, created_time: '2026-01-01', properties: { title: { type: 'title', title: [{ plain_text: title }] } } });
const response = (results: unknown[], has_more: boolean, next_cursor: string | null) => Response.json({ results, has_more, next_cursor });

test('requires explicit limits and rejects concurrent starts', async () => {
 assert.equal((await start(fixture({} as any).create())).status, 503);
 const f = fixture(); const obj = f.create();
 const results = await Promise.all([start(obj), start(obj)]);
 assert.deepEqual(results.map(r => r.status).sort(), [200, 409]);
});
test('idle alarm performs no provider work', async () => {
 const original = globalThis.fetch; globalThis.fetch = async () => { throw Error('unexpected traffic'); };
 try { const f = fixture(); await f.create().alarm(); assert.equal(f.alarm, null); } finally { globalThis.fetch = original; }
});
test('missing and repeated cursors stop without rearming', async () => {
 const original = globalThis.fetch;
 try {
  for (const cursor of [null, 'same']) {
   const f = fixture(); const obj = f.create(); await start(obj); let calls = 0;
   globalThis.fetch = async () => response([page(`p${++calls}`)], true, cursor);
   await obj.alarm(); assert.equal(f.data.get('job').status, 'failed'); assert.equal(f.alarm, null);
   assert.match(f.data.get('job').error, /cursor/); assert.equal(calls, cursor ? 2 : 1);
   await f.create().alarm(); assert.equal(calls, cursor ? 2 : 1);
  }
 } finally { globalThis.fetch = original; }
});
test('page budget and deadline are durable terminal stops', async () => {
 const original = globalThis.fetch;
 try {
  const f = fixture({ DUPLICATE_SCAN_MAX_PAGES: '1', DUPLICATE_SCAN_MAX_DURATION_MS: '60000' }); const obj = f.create(); await start(obj);
  let calls = 0; globalThis.fetch = async () => { calls++; return response([page('1')], true, 'next'); };
  await obj.alarm(); assert.equal(calls, 1); assert.equal(f.data.get('job').status, 'failed'); assert.equal(f.alarm, null);
  const g = fixture(); await start(g.create()); g.data.get('job').deadline_at = Date.now() - 1;
  await g.create().alarm(); assert.equal(calls, 1); assert.match(g.data.get('job').error, /deadline/);
 } finally { globalThis.fetch = original; }
});
test('cancel during provider wait survives late result and restart', async () => {
 const original = globalThis.fetch; const f = fixture(); const obj = f.create(); await start(obj);
 let resolve!: (r: Response) => void; let entered!: () => void; const called = new Promise<void>(r => entered = r);
 globalThis.fetch = async () => { entered(); return new Promise<Response>(r => resolve = r); };
 try {
  const running = obj.alarm(); await called;
  await obj.fetch(new Request('https://test/cancel', { method: 'POST' }));
  resolve(response([page('1')], true, 'next')); await running;
  assert.equal(f.data.get('job').error, 'Cancelled by user'); assert.equal(f.alarm, null);
  await f.create().alarm(); assert.equal(f.data.get('job').error, 'Cancelled by user');
 } finally { globalThis.fetch = original; }
});
test('interrupted provider outcome is never replayed after restart', async () => {
 const f = fixture(); await start(f.create()); f.data.get('job').in_flight = 'archive';
 const original = globalThis.fetch; globalThis.fetch = async () => { throw Error('unexpected traffic'); };
 try { await f.create().alarm(); assert.equal(f.data.get('job').status, 'failed'); assert.equal(f.alarm, null); }
 finally { globalThis.fetch = original; }
});
test('new scan clears old accumulated pages and completes bounded empty database', async () => {
 const f = fixture(); f.data.set('pages', [page('stale')]); const obj = f.create(); await start(obj);
 assert.equal(f.data.has('pages'), false);
 const original = globalThis.fetch; globalThis.fetch = async () => response([], false, null);
 try { await obj.alarm(); assert.equal(f.data.get('job').status, 'completed'); assert.equal(f.data.get('job').pages_scanned, 0); assert.equal(f.alarm, null); }
 finally { globalThis.fetch = original; }
});

test('changing cursors with empty/duplicate pages cannot extend scan indefinitely', async () => {
 const original = globalThis.fetch;
 try {
  for (const empty of [true, false]) {
   const f = fixture(); const obj = f.create(); await start(obj); let calls = 0;
   globalThis.fetch = async () => response(empty ? [] : [page('same-page')], true, `cursor-${++calls}`);
   await obj.alarm(); assert.equal(f.data.get('job').status, 'failed'); assert.match(f.data.get('job').error, /progress/);
   assert.equal(calls, empty ? 1 : 2); assert.equal(f.alarm, null);
  }
 } finally { globalThis.fetch = original; }
});
test('provider requests abort at configured deadline', async () => {
 const f = fixture({ DUPLICATE_SCAN_MAX_PAGES: '10', DUPLICATE_SCAN_MAX_DURATION_MS: '50' });
 const obj = f.create(); await start(obj); const original = globalThis.fetch; let aborted = false;
 globalThis.fetch = async (_url, init) => new Promise((_resolve, reject) => {
  init!.signal!.addEventListener('abort', () => { aborted = true; reject(Error('aborted')); });
 });
 try { await obj.alarm(); assert.ok(aborted); assert.equal(f.data.get('job').status, 'failed'); assert.equal(f.alarm, null); }
 finally { globalThis.fetch = original; }
});
test('completed archive checkpoints survive restart without duplicate provider calls', async () => {
 const f = fixture(); const obj = f.create(); await start(obj);
 const job = f.data.get('job'); job.pages_total = 7; job.pages_scanned = 7;
 job.duplicate_groups = [{ title: 'duplicate', keep_id: 'keep', archive_ids: ['a','b','c','d','e','f'] }];
 const original = globalThis.fetch; const ids: string[] = [];
 globalThis.fetch = async url => { ids.push(String(url).split('/').pop()!); return Response.json({}); };
 try {
  await obj.alarm(); assert.equal(f.data.get('job').archive_index, 5); assert.ok(f.alarm);
  await f.create().alarm(); assert.deepEqual(ids, ['a','b','c','d','e','f']);
  assert.equal(f.data.get('job').status, 'completed'); assert.equal(f.data.get('job').pages_archived, 6); assert.equal(f.alarm, null);
 } finally { globalThis.fetch = original; }
});

test('oversized persisted page data fails durably before another provider call', async () => {
 const f = fixture(); const obj = f.create(); await start(obj); const original = globalThis.fetch; let calls = 0;
 globalThis.fetch = async () => { calls++; return response([page('1', 'x'.repeat(100000))], true, 'next'); };
 try { await obj.alarm(); assert.equal(calls, 1); assert.equal(f.data.get('job').status, 'failed'); assert.match(f.data.get('job').error, /storage capacity/); assert.equal(f.alarm, null); }
 finally { globalThis.fetch = original; }
});
