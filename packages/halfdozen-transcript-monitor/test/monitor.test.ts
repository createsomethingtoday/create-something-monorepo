import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assess } from '../src/report.ts';
const now = Date.parse('2026-11-11T18:00:00Z');
const healthy = { key:'k', status:'synced', updated_at:'2026-11-11T16:00:00Z', page_id:'0123456789abcdef0123456789abcdef', version:'v',ready_version:'v',phase:'complete',projection_version:'v',index_block_id:'index',verified_at:'2026-11-11T16:00:00Z',owner:null,expires_at:null };
test('healthy completed publication has no alert',()=> assert.deepEqual(assess(healthy,now,1800),[]));
test('failed job remains visible with page from ingestion',()=>{const alerts=assess({...healthy,status:'failed'},now,1800);assert.ok(alerts.some(a=>a.code==='failed_job'));assert.match(alerts[0].page_url!,/^https:\/\/www.notion.so\//);});
test('stale writing and missing readiness are reported',()=>{const codes=assess({...healthy,phase:'writing',ready_version:null},now,1800).map(a=>a.code);assert.ok(codes.includes('stale_writing'));assert.ok(codes.includes('unready'));});
test('version mismatch reported',()=>assert.ok(assess({...healthy,ready_version:'old'},now,1800).some(a=>a.code==='readiness_mismatch')));
test('active valid lease and recent queue work avoid false alerts',()=>{assert.deepEqual(assess({...healthy,status:'queued',phase:'writing',ready_version:null,owner:'owner',expires_at:'2026-11-11T18:05:00Z'},now,1800),[]);assert.deepEqual(assess({...healthy,status:'queued',phase:'writing',ready_version:null,updated_at:'2026-11-11T17:55:00Z'},now,1800),[]);});
test('stale queue and missing ingestion are reported',()=>assert.ok(assess({...healthy,status:'queued',version:null,ready_version:null},now,1800).some(a=>a.code==='stalled_job')));
test('missing age is explicitly unknown rather than silently healthy',()=>assert.ok(assess({...healthy,updated_at:null,verified_at:null,ready_version:null},now,1800).some(a=>a.code==='age_unknown')));
import worker from '../src/index.ts';
import { report,SELECT_ROWS } from '../src/report.ts';
test('report only issues SELECT with bound scope and exposes no original URLs',async()=>{
 const seen:string[]=[];
 const db={prepare(sql:string){seen.push(sql);assert.match(sql,/^SELECT /);assert.doesNotMatch(sql,/\b(INSERT|UPDATE|DELETE|CREATE|ALTER|DROP|REPLACE)\b/i);return {bind(...args:unknown[]){assert.equal(args.length,3);return {async all(){return {success:true,results:[{...healthy,status:'failed',original_source_url:'secret',last_error:'token=secret'}]};}};}};}};
 const result=await report(db as never,'2026-11-06T00:00:00Z',1800,now);
 assert.equal(seen.length,1);assert.equal(result.alerts[0].code,'failed_job');assert.doesNotMatch(JSON.stringify(result),/secret/);
 assert.doesNotMatch(SELECT_ROWS,/original_source_url|transcript_download_url|last_error/);
});
test('public and wrong token requests return no data and never read DB',async()=>{
 const env={MONITOR_API_TOKEN:'private-token',DB:{prepare(){throw Error('must not read');}}};
 for(const auth of [null,'Bearer wrong']) {
  const headers=auth?{Authorization:auth}:{};
  const response=await worker.fetch(new Request('https://monitor/status',{headers}),env as never,{} as never);
  assert.equal(response.status,401);assert.deepEqual(await response.json(),{error:'unauthorized'});
 }
});
test('authenticated status and scheduled alert log use same read-only report',async()=>{
 const env={MONITOR_API_TOKEN:'private-token',MONITOR_NOT_BEFORE:'2026-11-06T00:00:00Z',GRACE_SECONDS:'1800',DB:{prepare(){return{bind(){return{async all(){return{success:true,results:[{...healthy,status:'failed'}]};}};}};}}};
 const response=await worker.fetch(new Request('https://monitor/status',{headers:{Authorization:'Bearer private-token'}}),env as never,{} as never);
 assert.equal(response.status,200);assert.equal((await response.json() as {ok:boolean}).ok,false);
 const logs:string[]=[];const old=console.error;console.error=(message:string)=>logs.push(message);
 try{await worker.scheduled({} as never,env as never,{} as never);}finally{console.error=old;}
 assert.equal(JSON.parse(logs[0]).event,'transcript_monitor_alert');
});
import { DatabaseSync } from 'node:sqlite';
test('actual SQLite joins ingestion page when ledger page is null and excludes historical rows',()=>{
 const db=new DatabaseSync(':memory:');
 db.exec(`CREATE TABLE transcript_sync_ledger(dedup_key TEXT,status TEXT,updated_at TEXT,notion_page_id TEXT,first_seen_at TEXT,recording_start_time TEXT);
 CREATE TABLE transcript_ingestion(meeting_key TEXT,selected_key TEXT,page_id TEXT,version TEXT,ready_version TEXT,index_block_id TEXT,verified_at TEXT,owner TEXT,expires_at TEXT);
 CREATE TABLE transcript_inline_projection(page_id TEXT,phase TEXT,version TEXT,manifest TEXT);
 CREATE TABLE transcript_write_journal(operation_key TEXT,reserved_at TEXT);
 INSERT INTO transcript_sync_ledger VALUES('new','failed','2026-11-11T16:00:00Z',NULL,'2026-11-11T16:00:00Z','2026-11-11T15:00:00Z'),('old','failed','2026-11-11T16:00:00Z',NULL,'2026-10-01T16:00:00Z','2026-10-01T15:00:00Z');
 INSERT INTO transcript_ingestion VALUES('["meeting","2026-11-11"]','new','0123456789abcdef0123456789abcdef','v',NULL,NULL,NULL,NULL,NULL);
 INSERT INTO transcript_inline_projection VALUES('0123456789abcdef0123456789abcdef','writing','v',NULL);`);
 const rows=db.prepare(SELECT_ROWS).all(...Array(3).fill('2026-11-06T00:00:00Z'));
 assert.equal(rows.length,1);assert.equal(rows[0].page_id,healthy.page_id);assert.equal(rows[0].phase,'writing');db.close();
});
import { cutoffValue } from '../src/report.ts';
test('scope rejects absent and normalized invalid calendar dates',()=>{
 for(const value of ['', '2026-02-31T00:00:00Z','yesterday']) assert.throws(()=>cutoffValue(value),/invalid_scope/);
 assert.equal(cutoffValue('2026-11-06T00:00:00Z'),'2026-11-06T00:00:00.000Z');
});
test('actual-shaped missing page IDs resolve only unique version; old pending reservation defeats retry freshness',()=>{
 const db=new DatabaseSync(':memory:');
 db.exec(`CREATE TABLE transcript_sync_ledger(dedup_key TEXT,status TEXT,updated_at TEXT,notion_page_id TEXT,first_seen_at TEXT,recording_start_time TEXT);
 CREATE TABLE transcript_ingestion(meeting_key TEXT,selected_key TEXT,page_id TEXT,version TEXT,ready_version TEXT,index_block_id TEXT,verified_at TEXT,owner TEXT,expires_at TEXT);
 CREATE TABLE transcript_inline_projection(page_id TEXT,phase TEXT,version TEXT,manifest TEXT);
 CREATE TABLE transcript_write_journal(operation_key TEXT,reserved_at TEXT);
 INSERT INTO transcript_sync_ledger VALUES('weekly','failed','2026-11-11T17:59:00Z',NULL,'2026-11-10T16:00:00Z','2026-11-10T15:00:00Z');
 INSERT INTO transcript_ingestion VALUES('["weekly","2026-11-10"]','weekly',NULL,'52f15',NULL,NULL,NULL,NULL,NULL);
 INSERT INTO transcript_inline_projection VALUES('413019187ac580009876543210abcdef','writing','52f15','{"pending":{"key":"append-key"}}');
 INSERT INTO transcript_write_journal VALUES('append-key','2026-11-10T16:05:00Z');`);
 const select=()=>db.prepare(SELECT_ROWS).all(...Array(3).fill('2026-11-06T00:00:00Z'));
 let row=select()[0];assert.equal(row.page_id,'413019187ac580009876543210abcdef');assert.equal(row.unresolved_at,'2026-11-10T16:05:00Z');
 const alerts=assess(row as never,now,1800);assert.ok(alerts.some(a=>a.code==='stale_writing'));assert.ok(alerts.some(a=>a.page_url?.includes('41301918')));
 assert.equal(assess({...row,owner:'active',expires_at:'2026-11-11T18:05:00Z'} as never,now,1800).some(a=>a.code==='stale_writing'),false);
 db.exec(`INSERT INTO transcript_inline_projection VALUES('513019187ac580009876543210abcdef','writing','52f15',NULL)`);
 row=select()[0];assert.equal(row.page_id,null);assert.equal(row.phase,null);assert.equal(row.unresolved_at,'2026-11-10T16:00:00Z');db.close();
});
