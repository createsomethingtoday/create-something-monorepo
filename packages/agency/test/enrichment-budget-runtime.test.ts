import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import {
  enrichmentReadiness,
  reserveEnrichment,
  claimEnrichment
} from '../src/lib/server/enrichment-budget';
const require = createRequire(import.meta.url);
const { Miniflare } = createRequire(require.resolve('wrangler/package.json'))('miniflare');
test('workerd D1 tracks independent bundles without caps while rejecting request and grant replay', async () => {
  const mf = new Miniflare({
    modules: true,
    script: 'export default {fetch(){return new Response("ok")}}',
    compatibilityDate: '2026-06-01',
    d1Databases: ['DB']
  });
  try {
    const db = await mf.getD1Database('DB');
    const sql = readFileSync('migrations/0064_enrichment_budget.sql', 'utf8').replace(
      /^--.*$/gm,
      ''
    );
    // Each complete CREATE TRIGGER must remain one statement.
    const statements = sql.match(/\s*CREATE TRIGGER[\s\S]*?END;|[^;]+;/g)!;
    await db.batch(statements.map((s: string) => db.prepare(s)));
    assert.equal((await enrichmentReadiness(db, 'pdl')).ready, true);
    const results = await Promise.allSettled(
      ['a', 'b'].map((c) => reserveEnrichment(db, 'complete', c.repeat(64), '1234567893'))
    );
    assert.equal(results.filter((r) => r.status === 'fulfilled').length, 2);
    const reservation = (results[0] as PromiseFulfilledResult<any>).value;
    await assert.rejects(reserveEnrichment(db, 'complete', 'a'.repeat(64), '1234567893'));
    assert.equal((await enrichmentReadiness(db, 'clay')).spend.pending_count, 8);
    const claims = await Promise.allSettled([
      claimEnrichment(db, reservation.grants.pdl),
      claimEnrichment(db, reservation.grants.pdl)
    ]);
    assert.equal(claims.filter((r) => r.status === 'fulfilled').length, 1);
    await assert.rejects(claimEnrichment(db, { ...reservation.grants.clay, npi: '1234567894' }));
    await claimEnrichment(db, reservation.grants.clay);
    await claimEnrichment(db, reservation.grants.exa);
    await assert.rejects(db.prepare('DELETE FROM npg_enrichment_requests').run());
  } finally {
    await mf.dispose();
  }
});
