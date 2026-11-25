import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync, type SQLInputValue } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { reserveEnrichment, enrichmentReadiness } from '../src/lib/server/enrichment-budget';
import {
  completeClayJob,
  readClayJob,
  ClayQuotaError
} from '../src/lib/server/abundance-clay-jobs';
function fixture() {
  const sql = new DatabaseSync(':memory:');
  sql.exec(readFileSync('migrations/0054_abundance_clay_jobs.sql', 'utf8'));
  sql.exec(readFileSync('migrations/0064_enrichment_budget.sql', 'utf8'));
  sql.exec(readFileSync('migrations/0068_npg_treg_enrichment_provider.sql', 'utf8'));
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
test('historical job remains readable; scoped audit reconciliation preserves immutable result and unknown USD',async()=>{
 const f=fixture();const id='npgclay_12345678-1234-1234-1234-123456789abc',token='original-job-token';
 const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token))),b=>b.toString(16).padStart(2,'0')).join('');
 try{
 f.sql.prepare('INSERT INTO abundance_clay_jobs(id,cache_key,npi,source_run_id,source_payload_hash,status,callback_hash,created_at) VALUES(?,?,?,?,?,?,?,?)').run(id,'historical-cache','1000000000','run','hash','pending',hash,new Date().toISOString());
 const result={outcome:'no_match',identity_evidence:'Historical approved source had no match',contacts:[]};
 assert.equal((await readClayJob(f.db,id)).status,'pending');
 await assert.rejects(completeClayJob(f.db,{request_id:id,callback_token:'wrong',result}));
 await completeClayJob(f.db,{request_id:id,callback_token:token,result});
 await completeClayJob(f.db,{request_id:id,callback_token:token,result});
 assert.equal((await readClayJob(f.db,id)).status,'no_match');
 await assert.rejects(completeClayJob(f.db,{request_id:id,callback_token:token,result:{...result,outcome:'ambiguous'}}));
 assert.equal(f.sql.prepare('SELECT COUNT(*) AS n FROM npg_enrichment_requests').get()!.n,0);
 await assert.rejects(reserveEnrichment(f.db,'clay','a'.repeat(64),'1000000000'));
 }finally{f.sql.close();}
});
