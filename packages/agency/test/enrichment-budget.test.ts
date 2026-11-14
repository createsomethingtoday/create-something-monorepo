import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import {
  enrichmentReadiness,
  reserveEnrichment,
  claimEnrichment,
  recordEnrichment
} from '../src/lib/server/enrichment-budget';
function fixture() {
  const sql = new DatabaseSync(':memory:');
  sql.exec(readFileSync('migrations/0064_enrichment_budget.sql', 'utf8'));
  class Statement {
    constructor(
      readonly q: string,
      readonly args: any[] = []
    ) {}
    bind(...args: any[]) {
      return new Statement(this.q, args);
    }
    async first() {
      return sql.prepare(this.q).get(...this.args) ?? null;
    }
    async run() {
      return { meta: { changes: Number(sql.prepare(this.q).run(...this.args).changes) } };
    }
  }
  const db = { prepare: (q: string) => new Statement(q) } as unknown as D1Database;

  return { sql, db };
}
test('tracking admits distinct requests without known prices or historical USD', async () => {
  const f = fixture();
  try {
    const ready = await enrichmentReadiness(f.db, 'pdl');
    assert.equal(ready.ready, true);
    assert.equal(ready.spend.historical_usd, null);
    assert.equal(ready.spend.confirmed_usd, 0);
    const a = await reserveEnrichment(f.db, 'complete', 'd'.repeat(64), '1234567893');
    const b = await reserveEnrichment(f.db, 'complete', 'e'.repeat(64), '1234567893');
    assert.ok(a.grants.apify);
    assert.ok(b.grants.pdl);
    assert.equal((await enrichmentReadiness(f.db, 'pdl')).spend.pending_count, 8);
    await assert.rejects(reserveEnrichment(f.db, 'complete', 'd'.repeat(64), '1234567893'));
  } finally {
    f.sql.close();
  }
});
test('four one-use candidate grants retain replay protection without a financial hold', async () => {
  const f = fixture();
  try {
    const r = await reserveEnrichment(f.db, 'complete', 'c'.repeat(64), '1234567893');
    const grant = r.grants.pdl!;
    await assert.rejects(claimEnrichment(f.db, { ...grant, npi: '1234567894' }));
    await claimEnrichment(f.db, grant);
    await assert.rejects(claimEnrichment(f.db, grant));
    for (const p of ['clay', 'exa', 'apify'] as const) await claimEnrichment(f.db, r.grants[p]!);
    assert.throws(() => f.sql.exec('DELETE FROM npg_enrichment_requests'));
    assert.throws(() => f.sql.exec('UPDATE npg_enrichment_grants SET consumed=0'));
  } finally {
    f.sql.close();
  }
});
test('actual USD, estimates and credit units remain separate and receipts append once', async () => {
  const f = fixture();
  try {
    const r = await reserveEnrichment(f.db, 'complete', 'a'.repeat(64), '1234567893');
    const pdl = r.grants.pdl!,
      exa = r.grants.exa!;
    await assert.rejects(recordEnrichment(f.db, pdl, { event_id: 'before', status: 'pending' }));
    await claimEnrichment(f.db, pdl);
    await claimEnrichment(f.db, exa);
    const receipt = {
      event_id: 'pdl:receipt-1',
      status: 'complete' as const,
      credits: 1,
      credit_unit: 'pdl_credit',
      receipt_ref: 'receipt-1'
    };
    await recordEnrichment(f.db, pdl, receipt);
    await recordEnrichment(f.db, pdl, receipt);
    assert.equal(f.sql.prepare('SELECT COUNT(*) AS n FROM npg_enrichment_receipts').get()!.n, 1);
    await assert.rejects(recordEnrichment(f.db, pdl, { ...receipt, actual_usd: 1 }));
    await recordEnrichment(f.db, exa, {
      event_id: 'exa:estimate',
      status: 'pending',
      estimated_usd: 0.102
    });
    let sum = (await enrichmentReadiness(f.db, 'exa')).spend;
    assert.equal(sum.confirmed_usd, 0);
    assert.deepEqual(sum.by_provider.find((p) => p.provider === 'pdl')!.credits, [
      { unit: 'pdl_credit', amount: 1 }
    ]);
    assert.equal(sum.estimated_usd, 0.102);
    assert.equal(sum.pending_count, 4);
    await recordEnrichment(f.db, exa, {
      event_id: 'exa:receipt',
      status: 'complete',
      actual_usd: 0.17,
      receipt_ref: 'run-1'
    });
    sum = (await enrichmentReadiness(f.db, 'exa')).spend;
    assert.equal(sum.confirmed_usd, 0.17);
    assert.equal(sum.estimated_usd, null);
    assert.equal(sum.pending_count, 3);
    assert.equal(sum.historical_usd, null);
    await recordEnrichment(f.db, exa, {
      event_id: 'exa:refresh',
      status: 'complete',
      receipt_ref: 'run-1'
    });
    assert.equal((await enrichmentReadiness(f.db, 'exa')).spend.confirmed_usd, 0.17);
    assert.throws(() => f.sql.exec('DELETE FROM npg_enrichment_receipts'));
    assert.throws(() => f.sql.exec('UPDATE npg_enrichment_receipts SET actual_micros=0'));
    await assert.rejects(
      recordEnrichment(f.db, exa, { event_id: 'private@example.com', status: 'complete' })
    );
  } finally {
    f.sql.close();
  }
});

test('standalone PDL supports its existing non-NPI identity without a fabricated NPI', async () => {
  const f = fixture();
  try {
    const r = await reserveEnrichment(f.db, 'pdl', 'b'.repeat(64), '');
    await claimEnrichment(f.db, r.grants.pdl!);
    await assert.rejects(reserveEnrichment(f.db, 'complete', 'f'.repeat(64), ''));
    await assert.rejects(reserveEnrichment(f.db, 'exa', 'f'.repeat(64), ''));
  } finally {
    f.sql.close();
  }
});
