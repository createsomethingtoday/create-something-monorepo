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
    await db.prepare('CREATE TABLE contact_submissions (id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL, message TEXT NOT NULL, service TEXT, company TEXT, assessment_id TEXT, submitted_at TEXT)').run();
    const migration = readFileSync(new URL('../migrations/0058_contact_request_receipts.sql', import.meta.url), 'utf8');
    for (const statement of migration.replace(/--[^\n]*/g, '').split(';').filter(s => s.trim())) await db.prepare(statement).run();
    const repository = createD1ContactRepository(db);
    const input = { name: 'Fixture', email: 'fixture@example.invalid', message: 'Local only' };
    let sends = 0;
    const mailer = { async send() { sends++; return { state: 'accepted' as const, providerId: `receipt-${sends}` }; } };
    await Promise.all(Array.from({ length: 4 }, () => Effect.runPromise(contactIntake(input, 'workerd-request', repository, mailer))));
    assert.equal(sends, 2);
    assert.equal((await db.prepare('SELECT count(*) AS n FROM contact_submissions').first<{ n: number }>())!.n, 1);
    assert.equal((await Effect.runPromise(contactIntake(input, 'workerd-request', createD1ContactRepository(db), mailer))).success, true);
    assert.equal(sends, 2);
    await db.prepare("CREATE TRIGGER fail_submission BEFORE INSERT ON contact_submissions BEGIN SELECT RAISE(ABORT, 'fixture'); END").run();
    await assert.rejects(repository.create('rolled-back', 'hash', 'owner', input));
    assert.equal(await repository.read('rolled-back'), null);
  } finally { await mf.dispose(); }
});
