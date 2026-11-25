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
    const sql = (readFileSync('migrations/0064_enrichment_budget.sql', 'utf8') + '\n' + readFileSync('migrations/0068_npg_treg_enrichment_provider.sql', 'utf8')).replace(
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
    await assert.rejects(claimEnrichment(db, { ...reservation.grants.apify, npi: '1234567894' }));
    await claimEnrichment(db, reservation.grants.apify);
    await claimEnrichment(db, reservation.grants.exa);
    await assert.rejects(db.prepare('DELETE FROM npg_enrichment_requests').run());
  } finally {
    await mf.dispose();
  }
});

test('workerd D1 sums separate Treg call receipts and preserves pending and no-dispatch units', async () => {
  const mf = new Miniflare({ modules:true, script:'export default {fetch(){return new Response("ok")}}', compatibilityDate:'2026-06-01', d1Databases:['DB'] });
  try {
    const db = await mf.getD1Database('DB');
    const sql = ['0064_enrichment_budget.sql','0068_npg_treg_enrichment_provider.sql'].map(file=>readFileSync(`migrations/${file}`,'utf8')).join('\n').replace(/^--.*$/gm,'');
    await db.batch(sql.match(/\s*CREATE TRIGGER[\s\S]*?END;|[^;]+;/g)!.map((s:string)=>db.prepare(s)));
    const {recordEnrichment} = await import('../src/lib/server/enrichment-budget');
    const r = await reserveEnrichment(db,'treg','c'.repeat(64),'1234567893');
    const grant = r.grants.treg!;
    await claimEnrichment(db,grant);
    await recordEnrichment(db,grant,{event_id:`${grant.id}:treg:phone`,status:'complete',actual_usd:0.12});
    let spend = (await enrichmentReadiness(db,'treg')).spend;
    assert.equal(spend.confirmed_usd,0.12);
    assert.equal(spend.pending_count,1,'missing email receipt stays pending');
    await recordEnrichment(db,grant,{event_id:`${grant.id}:treg:email`,status:'uncertain',actual_usd:null});
    spend = (await enrichmentReadiness(db,'treg')).spend;
    assert.equal(spend.confirmed_usd,0.12);
    assert.equal(spend.pending_count,1,'unknown email price cannot be masked by phone actual');
    const second = await reserveEnrichment(db,'treg','d'.repeat(64),'1234567893');
    await claimEnrichment(db,second.grants.treg!);
    for(const [kind,cost] of [['phone',0.12],['email',0.04]] as const)
      await recordEnrichment(db,second.grants.treg!,{event_id:`${second.id}:treg:${kind}`,status:'complete',actual_usd:cost});
    spend = (await enrichmentReadiness(db,'treg')).spend;
    assert.equal(spend.confirmed_usd,0.28,'both settled calls contribute once');
    assert.equal(spend.pending_count,1);
    const noDispatch = await reserveEnrichment(db,'treg','e'.repeat(64),'1234567893');
    await claimEnrichment(db,noDispatch.grants.treg!);
    await recordEnrichment(db,noDispatch.grants.treg!,{event_id:`${noDispatch.id}:treg:identity-unavailable`,status:'failed',actual_usd:0});
    spend = (await enrichmentReadiness(db,'treg')).spend;
    assert.equal(spend.pending_count,1,'known no-dispatch zero is settled');
    assert.equal(spend.confirmed_usd,0.28);
    const legacy = await reserveEnrichment(db,'treg','f'.repeat(64),'1234567893');
    await claimEnrichment(db,legacy.grants.treg!);
    await recordEnrichment(db,legacy.grants.treg!,{event_id:`${legacy.id}:legacy-unknown`,status:'uncertain',actual_usd:null});
    spend = (await enrichmentReadiness(db,'treg')).spend;
    assert.equal(spend.pending_count,2,'unknown legacy event remains tracked');
    assert.equal(spend.by_provider.find((p:any)=>p.provider==='treg')!.request_count,4);
  } finally {await mf.dispose();}
});
