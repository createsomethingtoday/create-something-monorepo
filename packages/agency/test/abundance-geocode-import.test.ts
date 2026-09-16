import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync,type SQLInputValue} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {readGeocodeSource,importGeocodes} from '../src/lib/server/abundance-geocode-import.ts';
function fixture(){
 const plans:string[]=[];
 const sqlite=new DatabaseSync(':memory:');
 sqlite.exec(`CREATE TABLE abundance_healthcare_nationwide_runs(id TEXT,status TEXT,taxonomy_scope TEXT);
 CREATE TABLE abundance_healthcare_nationwide_memberships(run_id TEXT,provider_npi TEXT,provider_snapshot_json TEXT,PRIMARY KEY(run_id,provider_npi));
 INSERT INTO abundance_healthcare_nationwide_runs VALUES('abnationalrun_test','succeeded','all_np_taxonomies');`);
 for(const file of ['0048_abundance_sourcing_geocodes.sql','0049_abundance_sourcing_geocode_versions.sql'])sqlite.exec(readFileSync(new URL('../migrations/'+file,import.meta.url),'utf8'));
 for(let i=1;i<=2;i++)sqlite.prepare('INSERT INTO abundance_healthcare_nationwide_memberships VALUES(?,?,?)').run('abnationalrun_test',String(1000000000+i),JSON.stringify({source_payload_hash:'a'.repeat(64),practice_address_1:'12 Main St',practice_city:'Albany',practice_state:'NY',practice_postal_code:'12201',practice_country:'US',name:'Must not export',practice_phone:'Must not export'}));
 class Statement{constructor(readonly sql:string,readonly args:unknown[]=[] ){}bind(...args:unknown[]){return new Statement(this.sql,args);}async first(){if(this.sql.includes('json_each'))plans.push(...sqlite.prepare('EXPLAIN QUERY PLAN '+this.sql).all(...this.args as SQLInputValue[]).map(r=>String(r.detail)));return sqlite.prepare(this.sql).get(...this.args as SQLInputValue[])??null;}async all(){return {results:sqlite.prepare(this.sql).all(...this.args as SQLInputValue[])};}async run(){if(this.sql.includes('json_each'))plans.push(...sqlite.prepare('EXPLAIN QUERY PLAN '+this.sql).all(...this.args as SQLInputValue[]).map(r=>String(r.detail)));const r=sqlite.prepare(this.sql).run(...this.args as SQLInputValue[]);return {success:true,meta:{changes:Number(r.changes)}};}}
 return {sqlite,plans,db:{prepare:(sql:string)=>new Statement(sql)} as unknown as D1Database};
}
const geo=(npi:string)=>({npi,source_payload_hash:'a'.repeat(64),status:'matched' as const,latitude:42.65,longitude:-73.75,matched_address:'12 MAIN ST, ALBANY NY',fetched_at:'2026-09-11T00:00:00Z'});
test('backfill reads only pinned source addresses and imports retries atomically by source version',async()=>{
 const f=fixture();try{
 const page=await readGeocodeSource(f.db,'abnationalrun_test','');
 assert.equal(page.total,2);assert.equal(page.records.length,2);assert.equal(page.records[0].practice_address_1,'12 Main St');
 assert.doesNotMatch(JSON.stringify(page),/Must not export/);
 const input={run_id:'abnationalrun_test',results:[geo('1000000001'),geo('1000000002')]};
 await assert.rejects(importGeocodes(f.db,{...input,results:[geo('1000000001'),{...geo('1000000002'),source_payload_hash:'b'.repeat(64)}]}),/source version/);
 assert.equal(f.sqlite.prepare('SELECT count(*) AS n FROM abundance_healthcare_geocodes').get()?.n,0);
 await importGeocodes(f.db,input);await importGeocodes(f.db,input);
 assert.equal(f.sqlite.prepare('SELECT count(*) AS n FROM abundance_healthcare_geocodes').get()?.n,2);
 assert.ok(Number(f.sqlite.prepare('SELECT unit_x AS x FROM abundance_healthcare_geocodes LIMIT 1').get()?.x)>0);
 await assert.rejects(importGeocodes(f.db,{...input,results:[{...geo('1000000001'),latitude:999}]}));
 }finally{f.sqlite.close();}
});
test('unresolved backfill records have no coordinates and failed snapshots cannot be imported',async()=>{
 const f=fixture();try{
 await importGeocodes(f.db,{run_id:'abnationalrun_test',results:[{npi:'1000000001',source_payload_hash:'a'.repeat(64),status:'unmatched',fetched_at:'2026-09-11T00:00:00Z'}]});
 assert.equal(f.sqlite.prepare('SELECT latitude FROM abundance_healthcare_geocodes').get()?.latitude,null);
 f.sqlite.exec("UPDATE abundance_healthcare_nationwide_runs SET status='failed'");
 await assert.rejects(readGeocodeSource(f.db,'abnationalrun_test',''),/completed snapshot/);
 await assert.rejects(importGeocodes(f.db,{run_id:'abnationalrun_test',results:[geo('1000000002')]}),/completed snapshot/);
 }finally{f.sqlite.close();}
});

test('batch validation probes each NPI instead of scanning the nationwide snapshot',async()=>{
 const f=fixture();try{
 await importGeocodes(f.db,{run_id:'abnationalrun_test',results:[geo('1000000001'),geo('1000000002')]});
 const membershipSearches=f.plans.filter(p=>p.includes('SEARCH m '));
 assert.equal(membershipSearches.length,2);
 for(const plan of membershipSearches)assert.match(plan,/run_id=\? AND provider_npi=\?/);
 }finally{f.sqlite.close();}
});
