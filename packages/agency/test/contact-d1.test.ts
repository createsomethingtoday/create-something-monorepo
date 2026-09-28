import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import test from 'node:test';
import { Effect } from 'effect';
import { createD1ContactRepository, contactIntake } from '../src/lib/server/contact-intake.ts';
import { POST } from '../src/routes/api/contact/+server.ts';
const migration = readFileSync(new URL('../migrations/0058_contact_request_receipts.sql', import.meta.url), 'utf8');
const input = { name: 'Fixture', email: 'fixture@example.invalid', message: 'Fixture inquiry' };
function fixture() {
  const sql = new DatabaseSync(':memory:');
  sql.exec('PRAGMA foreign_keys=ON;');
  sql.exec(readFileSync(new URL('./contact-production-schema.sql', import.meta.url), 'utf8'));
  const original = sql.prepare("SELECT sql FROM sqlite_master WHERE name='contact_submissions'").get();
  sql.exec(migration); sql.exec(migration);
  assert.deepEqual(sql.prepare("SELECT sql FROM sqlite_master WHERE name='contact_submissions'").get(), original);
  function prepare(query: string) {
    let values: any[] = [];
    return { bind(...args: any[]) { values = args; return this; },
      async first() { return sql.prepare(query).get(...values) ?? null; },
      async all() { return { success: true, results: sql.prepare(query).all(...values) }; },
      async run() { return { success: true, meta: { changes: Number(sql.prepare(query).run(...values).changes) } }; }
    };
  }
  const session = { prepare, async batch(statements: ReturnType<typeof prepare>[]) {
    sql.exec('BEGIN');
    try { const results = []; for (const statement of statements) results.push(await statement.run()); sql.exec('COMMIT'); return results; }
    catch (error) { sql.exec('ROLLBACK'); throw error; }
  } };
  const db = { ...session, withSession(constraint: string) { assert.equal(constraint, 'first-primary'); return session; } } as unknown as D1Database;
  return { sql, db, repository: createD1ContactRepository(db) };
}
test('real SQLite batch, rollback, unique receipt and owner claims', async () => {
  const f = fixture();
  try {
    f.sql.exec("INSERT INTO contact_submissions (name,email,message,submitted_at) VALUES ('Legacy','fixture@example.invalid','legacy',datetime('now'));");
    await f.repository.create('request-1', 'hash', 'owner', input);
    const linked = f.sql.prepare(`SELECT c.id, c.status, typeof(r.submission_id) AS id_type
      FROM contact_request_receipts r JOIN contact_submissions c ON c.id = r.submission_id
      WHERE r.request_id = 'request-1'`).get()!;
    assert.equal(linked.id, 2); assert.equal(linked.id_type, 'integer'); assert.equal(linked.status, 'new');
    await assert.rejects(f.repository.create('request-1', 'hash', 'other', input));
    assert.equal(f.sql.prepare('SELECT count(*) n FROM contact_submissions').get()!.n, 2);
    assert.equal(await f.repository.claim('request-1', 'confirmation', 'other'), false);
    assert.equal(await f.repository.claim('request-1', 'confirmation', 'owner'), true);
    assert.equal(await f.repository.claim('request-1', 'confirmation', 'owner'), false);
    assert.throws(() => f.sql.exec("UPDATE contact_email_receipts SET state='accepted' WHERE kind='confirmation'"));
    await f.repository.record('request-1', 'confirmation', { state: 'accepted', providerId: 'receipt' });
    assert.equal((await f.repository.read('request-1'))!.emails.find(e => e.kind === 'confirmation')!.provider_id, 'receipt');
    f.sql.exec("CREATE TRIGGER fail_submission BEFORE INSERT ON contact_submissions BEGIN SELECT RAISE(ABORT, 'fixture'); END;");
    await assert.rejects(f.repository.create('request-2', 'hash', 'owner', input));
    assert.equal(await f.repository.read('request-2'), null);
  } finally { f.sql.close(); }
});
test('Effect state machine on real SQL persists across repository recreation', async () => {
  const f = fixture(); let sends = 0;
  const mailer = { async send() { sends++; return { state: 'accepted' as const, providerId: `receipt-${sends}` }; } };
  try {
    assert.equal((await Effect.runPromise(contactIntake(input, 'request-1', f.repository, mailer))).success, true);
    assert.equal((await Effect.runPromise(contactIntake(input, 'request-1', createD1ContactRepository(f.db), mailer))).success, true);
    assert.equal(sends, 2);
  } finally { f.sql.close(); }
});
test('route JSON contract, duplicate and legacy caller limit with fake provider', async () => {
  const f = fixture(); const originalFetch = globalThis.fetch; let sends = 0;
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
  } finally { globalThis.fetch = originalFetch; f.sql.close(); }
});
test('partial provider failure exposes saved message over HTTP and duplicate never sends', async () => {
  const f = fixture(); const originalFetch = globalThis.fetch; let sends = 0;
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
  } finally { globalThis.fetch = originalFetch; f.sql.close(); }
});
test('HTTP cancellation interrupts provider and duplicate only reconciles', async () => {
  const f = fixture(); const originalFetch = globalThis.fetch;
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
  } finally { globalThis.fetch = originalFetch; f.sql.close(); }
});
for (const changed of [false, true]) test(`lost response, reload, invalid correction retains identity (changed=${changed})`, async () => {
  const { createContactRequest } = await import('../src/lib/contact/request.ts');
  const f = fixture(); const originalFetch = globalThis.fetch; let sends = 0;
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
    assert.equal(f.sql.prepare('SELECT count(*) AS n FROM contact_submissions').get()!.n, 1);
    assert.equal(values.size, changed ? 1 : 0);
  } finally { globalThis.fetch = originalFetch; f.sql.close(); }
});
