import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync, type SQLInputValue } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { reserveEnrichment, enrichmentReadiness } from '../src/lib/server/enrichment-budget';
import {
  requestClayJob,
  completeClayJob,
  readClayJob,
  ClayQuotaError
} from '../src/lib/server/abundance-clay-jobs';
function fixture() {
  const sql = new DatabaseSync(':memory:');
  sql.exec(readFileSync('migrations/0054_abundance_clay_jobs.sql', 'utf8'));
  sql.exec(readFileSync('migrations/0064_enrichment_budget.sql', 'utf8'));
  sql.exec(
    'CREATE TABLE abundance_healthcare_nationwide_memberships(run_id TEXT,provider_npi TEXT,provider_snapshot_json TEXT,PRIMARY KEY(run_id,provider_npi));'
  );
  for (let i = 0; i < 7; i++)
    sql.prepare('INSERT INTO abundance_healthcare_nationwide_memberships VALUES(?,?,?)').run(
      'run',
      String(1000000000 + i),
      JSON.stringify({
        name: 'Synthetic professional',
        source_payload_hash: String(i),
        practice_city: 'Albany',
        practice_state: 'NY'
      })
    );
  class Statement {
    constructor(
      readonly query: string,
      readonly args: unknown[] = []
    ) {}
    bind(...args: unknown[]) {
      return new Statement(this.query, args);
    }
    async first() {
      if (this.query.includes('FROM abundance_healthcare_nationwide_runs')) return { id: 'run' };
      return sql.prepare(this.query).get(...(this.args as SQLInputValue[])) ?? null;
    }
    async run() {
      const r = sql.prepare(this.query).run(...(this.args as SQLInputValue[]));
      return { success: true, meta: { changes: Number(r.changes) } };
    }
  }
  return { sql, db: { prepare: (q: string) => new Statement(q) } as unknown as D1Database };
}
const config = { webhookUrl: 'https://api.clay.com/v3/sources/webhook/test', webhookToken: 'test' };
test('duplicate request dispatches once; callback is scoped, immutable and reviewed', async () => {
  const f = fixture();
  let payload: any;
  let calls = 0;
  const fetchFn = (async (_url: any, init: any) => {
    calls++;
    payload = JSON.parse(init.body);
    return new Response('{}');
  }) as typeof fetch;
  try {
    const input = { npi: '1000000000', confirm_paid_enrichment: true };
    const job = await requestClayJob(f.db, input, config, fetchFn);
    assert.equal(job.status, 'pending');
    assert.equal('callback_hash' in job, false);
    const repeated = await requestClayJob(f.db, input, config, fetchFn);
    assert.equal(repeated.id, job.id);
    assert.equal(calls, 1);
    const result = {
      outcome: 'candidate',
      identity_evidence: 'Synthetic official directory lists this NPI',
      contacts: [
        {
          type: 'phone',
          value: '+15185550100',
          source_url: 'https://clinic.example/staff',
          publication_context: 'professional_contact',
          evidence_quote: 'Appointments: 518-555-0100'
        }
      ]
    };
    await assert.rejects(
      completeClayJob(f.db, { request_id: job.id, callback_token: 'wrong', result })
    );
    const callback = { request_id: job.id, callback_token: payload.callback_token, result };
    await completeClayJob(f.db, callback);
    await completeClayJob(f.db, callback);
    assert.equal((await readClayJob(f.db, job.id)).status, 'review_required');
    const receipts = f.sql
      .prepare(
        'SELECT status,actual_micros FROM npg_enrichment_receipts WHERE receipt_ref=? ORDER BY id'
      )
      .all(job.id);
    assert.deepEqual(
      receipts.map((r) => r.status),
      ['pending', 'complete']
    );
    assert.equal(receipts[1].actual_micros, null);
    assert.equal(f.sql.prepare('SELECT COUNT(*) AS n FROM npg_enrichment_requests').get()!.n, 1);
    await assert.rejects(
      completeClayJob(f.db, {
        ...callback,
        result: { outcome: 'no_match', identity_evidence: 'Changed claim', contacts: [] }
      })
    );
  } finally {
    f.sql.close();
  }
});
test('uncertain delivery deduplicates its job without blocking unrelated requests or imposing daily quota', async () => {
  const f = fixture();
  let calls = 0;
  const fetchFn = (async () => {
    calls++;
    throw Error('timeout');
  }) as typeof fetch;
  try {
    for (let i = 0; i < 5; i++) {
      assert.equal(
        (
          await requestClayJob(
            f.db,
            { npi: String(1000000000 + i), confirm_paid_enrichment: true },
            config,
            fetchFn
          )
        ).status,
        'delivery_unknown'
      );
    }
    await requestClayJob(
      f.db,
      { npi: '1000000000', confirm_paid_enrichment: true },
      config,
      fetchFn
    );
    assert.equal(calls, 5);
    await requestClayJob(
      f.db,
      { npi: '1000000005', confirm_paid_enrichment: true },
      config,
      fetchFn
    );
    assert.equal(calls, 6);
  } finally {
    f.sql.close();
  }
});
test('missing historical USD never blocks direct Clay dispatch', async () => {
  const f = fixture();
  let calls = 0;
  try {
    const r = await requestClayJob(
      f.db,
      { npi: '1000000000', confirm_paid_enrichment: true },
      config,
      (async () => {
        calls++;
        return new Response('{}');
      }) as typeof fetch
    );
    assert.equal(r.status, 'pending');
    assert.equal(calls, 1);
  } finally {
    f.sql.close();
  }
});

test('bundle Clay cache hit records zero new charge against its own grant', async () => {
  const f = fixture();
  let calls = 0;
  try {
    const fetchFn = (async () => {
      calls++;
      return new Response('{}');
    }) as typeof fetch;
    const input = { npi: '1000000000', confirm_paid_enrichment: true };
    const original = await requestClayJob(f.db, input, config, fetchFn);
    const bundle = await reserveEnrichment(f.db, 'complete', 'a'.repeat(64), input.npi);
    const cached = await requestClayJob(
      f.db,
      input,
      { ...config, budgetGrant: bundle.grants.clay },
      fetchFn
    );
    assert.equal(cached.id, original.id);
    assert.equal(cached.cache_hit, true);
    assert.equal(calls, 1);
    const receipt = f.sql
      .prepare('SELECT actual_micros,status FROM npg_enrichment_receipts WHERE request_id=?')
      .get(bundle.id);
    assert.equal(receipt!.actual_micros, 0);
    assert.equal(receipt!.status, 'complete');
    assert.equal(
      (await enrichmentReadiness(f.db, 'clay')).spend.by_provider.find(
        (p) => p.provider === 'clay'
      )!.pending_count,
      1
    );
  } finally {
    f.sql.close();
  }
});
