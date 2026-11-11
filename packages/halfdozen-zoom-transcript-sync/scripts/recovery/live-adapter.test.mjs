import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {createLiveAdapter} from './live-adapter.mjs';
import {sha} from './pending.mjs';

test('installed trigger admission and release tolerate trigger-inclusive change counts', {skip:!process.env.RECOVERY_SCHEMA}, async()=>{
  const schema=JSON.parse(readFileSync(process.env.RECOVERY_SCHEMA,'utf8'));
  const db=new DatabaseSync(':memory:');
  for(const row of schema) if(row.name!=='sqlite_sequence')db.exec(row.sql);
  const p={pageId:'page',archiveId:'archive',version:'version',manifest:'{}',meetingKey:'meeting',selectedKey:'selected',owner:'owner',expiresAt:new Date(Date.now()+1200000).toISOString(),deadline:Date.now()+900000,oldKey:'old',oldReservedAt:'reserved',journal:[{operation_key:'old',reserved_at:'reserved'}],schemaSha256:sha(JSON.stringify(schema))};
  // Historical key must be inside the journal's bounded page/archive selector.
  p.oldKey='page:old';p.journal[0].operation_key=p.oldKey;
  db.prepare('INSERT INTO transcript_ingestion(meeting_key,selected_key,version) VALUES(?,?,?)').run(p.meetingKey,p.selectedKey,p.version);
  db.prepare('INSERT INTO transcript_inline_projection VALUES(?,?,1,?,?)').run(p.pageId,p.version,'writing',p.manifest);
  db.prepare('INSERT INTO transcript_write_journal VALUES(?,?)').run(p.oldKey,p.oldReservedAt);
  const cf=async(path,method,body)=>{
    if(path.endsWith('/deployments'))return {deployments:[{versions:[{version_id:'2e353253-b882-4acb-93fc-05a4eec80c83',percentage:100}]}]};
    const before=db.prepare('SELECT total_changes() AS n').get().n;
    const stmt=db.prepare(body.sql);let results=[];
    if(/^SELECT/i.test(body.sql)||/RETURNING/i.test(body.sql))results=stmt.all(...body.params).map(r=>({...r}));else stmt.run(...body.params);
    return [{success:true,results,meta:{changes:db.prepare('SELECT total_changes() AS n').get().n-before}}];
  };
  const adapter=createLiveAdapter({cf,notion:async()=>{},secret:()=>'',account:'5c3e9cf4d55ce171b844fad0931607f9',database:'685613a0-05da-4d0c-a932-579d51db7fb8',profile:p,schema});
  await adapter.admit();assert.equal((await adapter.guard()).exclusive,true);
  const key='archive:version:repair-inline:test',fingerprint='a'.repeat(64);
  assert.equal(await adapter.reserveAttempt({key,fingerprint,request:{},proof:{}}),true);
  assert.equal(await adapter.markInFlight(key,fingerprint),true);
  assert.equal(await adapter.markInFlight(key,fingerprint),false);
  await adapter.recordReceipt(key,'unknown',{fingerprint,reason:'lost response'});
  assert.equal(await adapter.markInFlight(key,fingerprint),false);
  await assert.rejects(adapter.release());
  await adapter.recordReceipt(key,'verified',{fingerprint,ids:['positive-readback']});
  await adapter.release();assert.equal(db.prepare('SELECT phase FROM recovery_pilot_control').get().phase,'released');
  db.close();
});
