import assert from 'node:assert/strict';
import {sha} from './pending.mjs';

// All credentials remain in the supplied local credential reader. No HTTP retries for writes.
export function createLiveAdapter({cf,notion,secret,account,database,profile:p,schema}) {
  assert.equal(account,'5c3e9cf4d55ce171b844fad0931607f9');
  assert.equal(database,'685613a0-05da-4d0c-a932-579d51db7fb8');
  assert.equal(sha(JSON.stringify(schema)),p.schemaSha256);
  const execute=async(sql,params=[])=>{
    const result=await cf(`/accounts/${account}/d1/database/${database}/query`,'POST',{sql,params});
    assert.equal(result.length,1); assert.equal(result[0].success,true); return result[0];
  };
  const first=async(sql,params)=>(await execute(sql,params)).results[0]??null;
  const scope=`EXISTS(SELECT 1 FROM transcript_inline_projection WHERE page_id=? AND version=? AND generation=1 AND phase='writing' AND CAST(manifest AS BLOB)=CAST(? AS BLOB)) AND EXISTS(SELECT 1 FROM transcript_write_journal WHERE operation_key=? AND reserved_at=?) AND EXISTS(SELECT 1 FROM recovery_pilot_control c JOIN transcript_ingestion i ON i.meeting_key=c.meeting_key WHERE c.meeting_key=? AND c.selected_key=? AND c.version=? AND c.archive_id=? AND c.page_id=? AND c.owner=? AND c.phase='active' AND c.expires_at=? AND c.expires_at>strftime('%Y-%m-%dT%H:%M:%fZ','now') AND i.owner=c.owner AND i.expires_at=c.expires_at AND i.selected_key=c.selected_key AND i.version=c.version AND i.ready_version IS NULL AND i.index_block_id IS NULL AND i.verified_at IS NULL AND (i.page_id IS NULL OR i.page_id=c.page_id))`;
  const params=()=>[p.pageId,p.version,p.manifest,p.oldKey,p.oldReservedAt,p.meetingKey,p.selectedKey,p.version,p.archiveId,p.pageId,p.owner,p.expiresAt];
  const staticGuard=async()=>{
    assert.ok(Date.now()<p.deadline&&Date.now()<Date.parse(p.expiresAt));
    const deployment=await cf(`/accounts/${account}/workers/scripts/halfdozen-zoom-transcript-sync/deployments`);
    assert.deepEqual(deployment.deployments[0].versions,[{version_id:'2e353253-b882-4acb-93fc-05a4eec80c83',percentage:100}],'Native writer deployment changed');
    const live=(await execute("SELECT name,sql FROM sqlite_schema WHERE type IN ('table','trigger') ORDER BY name")).results;
    const sorted=value=>[...value].sort((a,b)=>a.name.localeCompare(b.name));
    assert.deepEqual(sorted(live),sorted(schema),'Fence/audit schema changed');
    const journal=(await execute('SELECT operation_key,reserved_at FROM transcript_write_journal WHERE instr(operation_key,?)>0 OR instr(operation_key,?)>0 ORDER BY operation_key',[p.pageId,p.archiveId])).results;
    assert.deepEqual(journal,p.journal,'Historical journal changed');
  };
  const guard=async()=>{
    await staticGuard();
    assert.equal((await first(`SELECT (${scope}) AS matches`,params())).matches,1,'Exclusive ownership/checkpoint lost');
    return {exclusive:true,owner:p.owner,oldReservation:p.oldReservedAt,projection:{version:p.version,generation:1,phase:'writing',manifest:p.manifest}};
  };
  const effect=key=>first('SELECT * FROM recovery_pilot_effect WHERE meeting_key=? AND operation_key=?',[p.meetingKey,key]);
  return {
    preflight:staticGuard,
    guard,
    getPage:id=>notion('pages/'+id),
    listBlockChildren:(id,cursor)=>notion('blocks/'+id+'/children?page_size=100'+(cursor?'&start_cursor='+encodeURIComponent(cursor):'')),
    getAttempt:key=>first('SELECT * FROM pilot_attempt WHERE operation_key=?',[key]),
    async admit() {
      assert.ok(Date.now()<p.deadline); assert.ok(Date.parse(p.expiresAt)>p.deadline);
      await staticGuard();
      const r=await execute(`INSERT INTO recovery_pilot_control(meeting_key,selected_key,version,archive_id,page_id,owner,expires_at,phase,admitted_at,released_at) SELECT ?,?,?,?,?,?,?,'active',?,NULL WHERE EXISTS(SELECT 1 FROM transcript_inline_projection WHERE page_id=? AND version=? AND generation=1 AND phase='writing' AND CAST(manifest AS BLOB)=CAST(? AS BLOB)) AND EXISTS(SELECT 1 FROM transcript_write_journal WHERE operation_key=? AND reserved_at=?) RETURNING meeting_key`,[p.meetingKey,p.selectedKey,p.version,p.archiveId,p.pageId,p.owner,p.expiresAt,new Date().toISOString(),p.pageId,p.version,p.manifest,p.oldKey,p.oldReservedAt]);
      assert.equal(r.results.length,1); await guard();
    },
    async reserveAttempt({key,fingerprint,request,proof}) {
      await guard();
      const r=await execute(`INSERT INTO pilot_attempt(operation_key,id,fingerprint,request,proof,status,receipt) SELECT ?,?,?,?,?,'reserved',NULL WHERE ${scope}`,[key,sha(JSON.stringify([key,fingerprint])),fingerprint,JSON.stringify(request),JSON.stringify(proof),...params()]);
      if(r.meta.changes!==1)return false;
      await execute(`INSERT INTO recovery_pilot_effect(meeting_key,operation_key,status,fingerprint) SELECT ?,?,'reserved',? WHERE ${scope}`,[p.meetingKey,key,fingerprint,...params()]);
      return true;
    },
    async markInFlight(key,fingerprint) {
      await guard();
      const e=await execute(`UPDATE recovery_pilot_effect SET status='in-flight' WHERE meeting_key=? AND operation_key=? AND fingerprint=? AND status='reserved' AND ${scope}`,[p.meetingKey,key,fingerprint,...params()]);
      if(e.meta.changes!==1)return false;
      const r=await execute(`UPDATE pilot_attempt SET status='in-flight' WHERE operation_key=? AND fingerprint=? AND status='reserved' AND ${scope}`,[key,fingerprint,...params()]);
      return r.meta.changes===1;
    },
    async recordReceipt(key,status,receipt) {
      const e=await effect(key); assert.ok(e); assert.equal(e.fingerprint,receipt.fingerprint);
      // Positive adoption can resolve an existing exact batch without issuing an append.
      if(e.status==='reserved'&&status==='verified') {
        await guard(); await execute("UPDATE recovery_pilot_effect SET status='in-flight' WHERE meeting_key=? AND operation_key=? AND status='reserved'",[p.meetingKey,key]);
      }
      await execute('INSERT INTO pilot_receipt(operation_key,status,payload) VALUES(?,?,?)',[key,status,JSON.stringify(receipt)]);
      await execute('UPDATE pilot_attempt SET status=?,receipt=? WHERE operation_key=? AND fingerprint=?',[status,JSON.stringify(receipt),key,receipt.fingerprint]);
      if(e.status!==status) await execute('UPDATE recovery_pilot_effect SET status=? WHERE meeting_key=? AND operation_key=?',[status,p.meetingKey,key]);
    },
    async append(id,body) {
      assert.equal(id,p.pageId); await guard();
      const key=`${p.archiveId}:${p.version}:repair-inline:${sha(p.oldKey)}`;
      const attempt=await first('SELECT * FROM pilot_attempt WHERE operation_key=?',[key]);
      const e=await effect(key), request={method:'PATCH',path:`/v1/blocks/${id}/children`,body};
      assert.equal(attempt?.status,'in-flight'); assert.equal(e?.status,'in-flight');
      assert.equal(attempt.request,JSON.stringify(request)); assert.equal(attempt.fingerprint,sha(JSON.stringify(request)));
      assert.equal(e.fingerprint,attempt.fingerprint);
      const token=secret('HALFDOZEN_ZOOM_TRANSCRIPT_SYNC_NOTION_API_KEY');
      await guard();
      const response=await fetch(`https://api.notion.com/v1/blocks/${id}/children`,{method:'PATCH',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json','Notion-Version':'2022-06-28'},body:JSON.stringify(body),redirect:'error',signal:AbortSignal.timeout(30000)});
      if(!response.ok) throw Error(`Append outcome held: ${response.status}`);
      return response.json();
    },
    async release() {
      await guard(); const r=await execute("UPDATE recovery_pilot_control SET phase='released',released_at=? WHERE meeting_key=? AND owner=? AND phase='active' RETURNING meeting_key",[new Date().toISOString(),p.meetingKey,p.owner]);
      assert.equal(r.results.length,1);
      const i=await first('SELECT owner,expires_at FROM transcript_ingestion WHERE meeting_key=?',[p.meetingKey]);
      assert.deepEqual(i,{owner:null,expires_at:null});
    },
  };
}
