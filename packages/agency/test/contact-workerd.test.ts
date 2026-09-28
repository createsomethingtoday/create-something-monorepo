import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';
import { Effect } from 'effect';
import { contactIntake, createD1ContactRepository } from '../src/lib/server/contact-intake.ts';
// Use the runtime owned by Agency's pinned Wrangler, not a second emulator version.
const require = createRequire(import.meta.url);
const { Miniflare } = createRequire(require.resolve('wrangler/package.json'))('miniflare');
test('workerd D1 atomic batch/concurrency and reconciliation', async () => {
  const mf = new Miniflare({ modules: true, script: 'export default { fetch() { return new Response("fixture"); } }', compatibilityDate: '2025-11-15', d1Databases: ['DB'] });
  try {
    const db: D1Database = await mf.getD1Database('DB');
    await db.prepare(readFileSync(new URL('./contact-production-schema.sql', import.meta.url), 'utf8')).run();
    await db.prepare("INSERT INTO contact_submissions (name,email,message,submitted_at) VALUES ('Legacy','fixture@example.invalid','legacy',datetime('now'))").run();
    const migration = readFileSync(new URL('../migrations/0058_contact_request_receipts.sql', import.meta.url), 'utf8');
    for (const statement of migration.replace(/--[^\n]*/g, '').split(';').filter(s => s.trim())) await db.prepare(statement).run();
    const repository = createD1ContactRepository(db);
    const input = { name: 'Fixture', email: 'fixture@example.invalid', message: 'Local only' };
    let sends = 0;
    const mailer = { async send() { sends++; return { state: 'accepted' as const, providerId: `receipt-${sends}` }; } };
    await Promise.all(Array.from({ length: 4 }, () => Effect.runPromise(contactIntake(input, 'workerd-request', repository, mailer))));
    assert.equal(sends, 2);
    assert.equal((await db.prepare('SELECT count(*) AS n FROM contact_submissions').first<{ n: number }>())!.n, 2);
    assert.equal((await Effect.runPromise(contactIntake(input, 'workerd-request', createD1ContactRepository(db), mailer))).success, true);
    assert.equal(sends, 2);
    const linked = await db.prepare(`SELECT c.id, c.status, typeof(r.submission_id) AS id_type
      FROM contact_request_receipts r JOIN contact_submissions c ON c.id = r.submission_id
      WHERE r.request_id = 'workerd-request'`).first<{ id: number; status: string; id_type: string }>();
    assert.equal(linked!.id, 2); assert.equal(linked!.status, 'new'); assert.equal(linked!.id_type, 'integer');
    // Distinct concurrent batches must link each receipt to its own generated ID.
    await Promise.all(Array.from({ length: 4 }, (_, i) => repository.create(
      `distinct-${i}`, `hash-${i}`, `owner-${i}`, { ...input, name: `distinct-${i}` }
    )));
    const distinct = await db.prepare(`SELECT r.request_id, c.name, c.id
      FROM contact_request_receipts r JOIN contact_submissions c ON c.id = r.submission_id
      WHERE r.request_id LIKE 'distinct-%'`).all<{ request_id: string; name: string; id: number }>();
    assert.equal(distinct.results.length, 4);
    assert.equal(new Set(distinct.results.map(row => row.id)).size, 4);
    assert.ok(distinct.results.every(row => row.request_id === row.name && Number.isInteger(row.id)));
    await db.prepare("CREATE TRIGGER fail_submission BEFORE INSERT ON contact_submissions BEGIN SELECT RAISE(ABORT, 'fixture'); END").run();
    await assert.rejects(repository.create('rolled-back', 'hash', 'owner', input));
    assert.equal(await repository.read('rolled-back'), null);
  } finally { await mf.dispose(); }
});
