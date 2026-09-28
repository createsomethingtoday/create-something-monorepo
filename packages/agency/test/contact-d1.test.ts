import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';
import { Effect } from 'effect';
import { createD1ContactRepository, contactIntake } from '../src/lib/server/contact-intake.ts';
import { POST } from '../src/routes/api/contact/+server.ts';
const migration = readFileSync(new URL('../migrations/0058_contact_request_receipts.sql', import.meta.url), 'utf8');
const input = { name: 'Fixture', email: 'fixture@example.invalid', message: 'Fixture inquiry' };
// Use Agency's pinned Wrangler runtime on every supported Node version.
const require = createRequire(import.meta.url);
const { Miniflare } = createRequire(require.resolve('wrangler/package.json'))('miniflare');
async function fixture() {
  const mf = new Miniflare({ modules: true, script: 'export default { fetch() { return new Response("fixture"); } }',
    compatibilityDate: '2025-11-15', d1Databases: ['DB'] });
  try {
    const db: D1Database = await mf.getD1Database('DB');
    await db.prepare(readFileSync(new URL('./contact-production-schema.sql', import.meta.url), 'utf8')).run();
    const schema = () => db.prepare("SELECT sql FROM sqlite_master WHERE name='contact_submissions'").first();
    const original = await schema();
    for (let pass = 0; pass < 2; pass++) {
      for (const statement of migration.replace(/--[^\n]*/g, '').split(';').filter(s => s.trim())) {
        await db.prepare(statement).run();
      }
    }
    assert.deepEqual(await schema(), original);
    return { db, repository: createD1ContactRepository(db), dispose: () => mf.dispose() };
  } catch (error) {
    await mf.dispose();
    throw error;
  }
}
test('workerd D1 batch, rollback, unique receipt and owner claims', async () => {
  const f = await fixture();
  try {
    await f.db.prepare("INSERT INTO contact_submissions (name,email,message,submitted_at) VALUES ('Legacy','fixture@example.invalid','legacy',datetime('now'));").run();
    await f.repository.create('request-1', 'hash', 'owner', input);
    const linked = (await f.db.prepare(`SELECT c.id, c.status, typeof(r.submission_id) AS id_type
      FROM contact_request_receipts r JOIN contact_submissions c ON c.id = r.submission_id
      WHERE r.request_id = 'request-1'`).first<{ id: number; status: string; id_type: string }>())!;
    assert.equal(linked.id, 2); assert.equal(linked.id_type, 'integer'); assert.equal(linked.status, 'new');
    await assert.rejects(f.repository.create('request-1', 'hash', 'other', input));
    assert.equal((await f.db.prepare('SELECT count(*) n FROM contact_submissions').first<{ n: number }>())!.n, 2);
    assert.equal(await f.repository.claim('request-1', 'confirmation', 'other'), false);
    assert.equal(await f.repository.claim('request-1', 'confirmation', 'owner'), true);
    assert.equal(await f.repository.claim('request-1', 'confirmation', 'owner'), false);
    await assert.rejects(f.db.prepare("UPDATE contact_email_receipts SET state='accepted' WHERE kind='confirmation'").run());
    await f.repository.record('request-1', 'confirmation', { state: 'accepted', providerId: 'receipt' });
    assert.equal((await f.repository.read('request-1'))!.emails.find(e => e.kind === 'confirmation')!.provider_id, 'receipt');
    await f.db.prepare("CREATE TRIGGER fail_submission BEFORE INSERT ON contact_submissions BEGIN SELECT RAISE(ABORT, 'fixture'); END;").run();
    await assert.rejects(f.repository.create('request-2', 'hash', 'owner', input));
    assert.equal(await f.repository.read('request-2'), null);
  } finally { await f.dispose(); }
});
test('Effect state machine on real SQL persists across repository recreation', async () => {
  const f = await fixture(); let sends = 0;
  const mailer = { async send() { sends++; return { state: 'accepted' as const, providerId: `receipt-${sends}` }; } };
  try {
    assert.equal((await Effect.runPromise(contactIntake(input, 'request-1', f.repository, mailer))).success, true);
    assert.equal((await Effect.runPromise(contactIntake(input, 'request-1', createD1ContactRepository(f.db), mailer))).success, true);
    assert.equal(sends, 2);
  } finally { await f.dispose(); }
});
test('route JSON contract, duplicate and legacy caller limit with fake provider', async () => {
  const f = await fixture(); const originalFetch = globalThis.fetch; let sends = 0;
  globalThis.fetch = async () => { sends++; return new Response(JSON.stringify({ id: `receipt-${sends}` })); };
  const invoke = (id?: string, message = input.message) => POST({ request: new Request('https://example.invalid/api/contact', {
    method: 'POST', headers: { 'Content-Type': 'application/json', ...(id ? { 'Idempotency-Key': id } : {}) }, body: JSON.stringify({ ...input, message })
  }), platform: { env: { DB: f.db, RESEND_API_KEY: 'fake' } } } as any);
  try {
    let response = await invoke('request-0000000001'); assert.equal(response.status, 200); assert.equal((await response.json() as { success: boolean }).success, true);
    response = await invoke('request-0000000001'); assert.equal(response.status, 200); assert.equal(sends, 2);
    assert.equal((await invoke('request-0000000001', 'changed')).status, 409);
    assert.equal((await invoke('bad')).status, 400);
    await invoke(); await invoke(); assert.equal(sends, 6); // Legacy IDs are generated per call, not universal deduplication.
  } finally { globalThis.fetch = originalFetch; await f.dispose(); }
});
test('partial provider failure exposes saved message over HTTP and duplicate never sends', async () => {
  const f = await fixture(); const originalFetch = globalThis.fetch; let sends = 0;
  globalThis.fetch = async () => ++sends === 1
    ? new Response('{}', { status: 422 })
    : new Response(JSON.stringify({ id: 'owner-accepted' }));
  const invoke = () => POST({ request: new Request('https://example.invalid/api/contact', {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': 'partial-request-0001' }, body: JSON.stringify(input)
  }), platform: { env: { DB: f.db, RESEND_API_KEY: 'fake' } } } as any);
  try {
    for (let attempt = 0; attempt < 2; attempt++) {
      const response = await invoke(); assert.equal(response.status, 202);
      const body = await response.json() as { success: boolean; receipt: string; message: string }; assert.equal(body.success, false);
      assert.equal(body.receipt, 'saved');
      assert.equal(body.message, 'Your inquiry is saved, but email confirmation is not complete. Please do not submit it again.');
    }
    assert.equal(sends, 2);
    assert.equal((await f.repository.read('partial-request-0001'))!.emails.find(e => e.kind === 'notification')!.provider_id, 'owner-accepted');
  } finally { globalThis.fetch = originalFetch; await f.dispose(); }
});
test('HTTP cancellation interrupts provider and duplicate only reconciles', async () => {
  const f = await fixture(); const originalFetch = globalThis.fetch;
  const controller = new AbortController(); let sends = 0; let aborted = false;
  let started!: () => void;
  const ready = new Promise<void>(resolve => { started = resolve; });
  globalThis.fetch = async (_url, init) => {
    sends++; started();
    return new Promise<Response>((_resolve, reject) => {
      init!.signal!.addEventListener('abort', () => { aborted = true; reject(new Error('aborted')); }, { once: true });
    });
  };
  const invoke = (signal?: AbortSignal) => POST({ request: new Request('https://example.invalid/api/contact', {
    method: 'POST', signal, headers: { 'Content-Type': 'application/json', 'Idempotency-Key': 'aborted-request-0001' }, body: JSON.stringify(input)
  }), platform: { env: { DB: f.db, RESEND_API_KEY: 'fake' } } } as any);
  try {
    const running = invoke(controller.signal); await ready; controller.abort();
    assert.equal((await running).status, 503); assert.equal(aborted, true);
    assert.equal((await invoke()).status, 202); assert.equal(sends, 1);
    assert.equal((await f.repository.read('aborted-request-0001'))!.emails.find(e => e.kind === 'confirmation')!.state, 'sending');
  } finally { globalThis.fetch = originalFetch; await f.dispose(); }
});
for (const changed of [false, true]) test(`lost response, reload, invalid correction retains identity (changed=${changed})`, async () => {
  const { createContactRequest } = await import('../src/lib/contact/request.ts');
  const f = await fixture(); const originalFetch = globalThis.fetch; let sends = 0;
  globalThis.fetch = async () => new Response(JSON.stringify({ id: `provider-${++sends}` }));
  const values = new Map<string, string>();
  const storage = { getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
    removeItem: (key: string) => { values.delete(key); } };
  const ids: string[] = []; const statuses: number[] = [];
  const transport: typeof fetch = async (_url, init) => {
    ids.push(new Headers(init!.headers).get('Idempotency-Key')!);
    const response = await POST({ request: new Request('https://example.invalid/api/contact', init),
      platform: { env: { DB: f.db, RESEND_API_KEY: 'fake' } } } as any);
    statuses.push(response.status);
    if (ids.length === 1) { assert.equal(response.status, 200); throw new Error('response lost'); }
    return response;
  };
  try {
    assert.equal((await createContactRequest(storage)(input, transport)).success, false);
    assert.equal(sends, 2);
    const reloaded = createContactRequest(storage);
    assert.equal((await reloaded({ ...input, message: 'x'.repeat(5001) }, transport)).success, false);
    assert.equal(statuses[1], 400);
    assert.equal(values.size, 1); // Validation must not discard a potentially committed identity.
    const result = await reloaded({ ...input, message: changed ? 'Changed valid inquiry' : input.message }, transport);
    assert.equal(statuses[2], changed ? 409 : 200);
    assert.equal(result.success, !changed);
    assert.equal(new Set(ids).size, 1);
    assert.equal(sends, 2);
    assert.equal((await f.db.prepare('SELECT count(*) AS n FROM contact_submissions').first<{ n: number }>())!.n, 1);
    assert.equal(values.size, changed ? 1 : 0);
  } finally { globalThis.fetch = originalFetch; await f.dispose(); }
});
