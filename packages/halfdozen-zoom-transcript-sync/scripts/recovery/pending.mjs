// One frozen pending operation only. The native writer owns projection adoption/readiness.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
export const sha = value => createHash('sha256').update(value).digest('hex');
export const WEEKLY = Object.freeze({
  pageId:'41301918-7ac5-815d-9613-c25a28db67a8',
  version:'52f15b9565328f7dc797612a576e1bd93400b94c00f2bdeeef3204ed6472c6e9',
  generation:1, offset:800, count:80,
  oldKey:'inline:41301918-7ac5-815d-9613-c25a28db67a8:1:append:800',
  oldReservedAt:'2026-11-09T19:05:37.530Z',
  requestId:'770fcead-196b-44ff-b897-3cbdc09e90b3',
});
export async function listAll(adapter,id) {
  const rows=[], seen=new Set(); let cursor;
  for(let n=0;n<100;n++) {
    const page=await adapter.listBlockChildren(id,cursor);
    assert.ok(Array.isArray(page.results)); rows.push(...page.results);
    if(!page.has_more) {
      assert.ok(!page.next_cursor); assert.equal(new Set(rows.map(b=>b.id)).size,rows.length);
      return rows;
    }
    assert.ok(page.next_cursor&&!seen.has(page.next_cursor),'Repeated pagination cursor');
    seen.add(page.next_cursor); cursor=page.next_cursor;
  }
  throw Error('Pagination bound exceeded');
}
export function validateEvidence(profile,evidence) {
  assert.equal(sha(JSON.stringify(evidence)),profile.evidenceSha256,'Frozen terminal evidence changed');
  assert.equal(evidence.oldKey,WEEKLY.oldKey); assert.equal(evidence.reservedAt,WEEKLY.oldReservedAt);
  assert.equal(evidence.provider.status,409); assert.equal(evidence.provider.code,'conflict_error');
  assert.equal(evidence.provider.requestId,WEEKLY.requestId);
  assert.equal(evidence.provider.path,`/v1/blocks/${WEEKLY.pageId}/children`);
  assert.equal(evidence.provider.query,''); assert.equal(evidence.methodInference,true);
  assert.equal(evidence.historicalBodyFingerprintRecorded,false);
  assert.equal(evidence.coverage.complete,true); assert.equal(evidence.coverage.abr,1);
  assert.ok(evidence.coverage.total>0); assert.equal(evidence.coverage.total,evidence.coverage.returned);
  assert.equal(evidence.matches,1); assert.equal(evidence.event.selectedKeyMatches,true);
  assert.equal(evidence.event.scriptVersion,profile.historicalScriptVersion);
  assert.equal(evidence.event.at,Date.parse('2026-11-09T19:05:38.819Z'));
  assert.ok(evidence.event.id&&evidence.event.invocation);
}
function sourceGate(page,p) {
  assert.equal(page.id,p.pageId); assert.ok(!page.archived&&!page.in_trash);
  // Notion updates these system-generated payloads when our append edits the page.
  // Preserve names, property IDs, types, and every other field from the original baseline.
  const stable=properties=>Object.fromEntries(Object.entries(properties).map(([name,value])=>{
    const copy=structuredClone(value);
    if(copy.type==='last_edited_time')copy.last_edited_time='[generated]';
    if(copy.type==='last_edited_by')copy.last_edited_by='[generated]';
    return [name,copy];
  }));
  assert.deepEqual(stable(page.properties),stable(JSON.parse(p.properties)),'Human/source fields changed');
  const props=page.properties, text=name=>(props[name]?.rich_text??[]).map(x=>x.plain_text??x.text?.content??'').join('');
  assert.equal(text('Transcript Version'),`${p.version}:1`);
  for(const name of ['Transcript Ready Version','Categorized Transcript Version']) assert.equal(text(name),'');
  assert.equal(props['Transcript Retrieval Index'].url,null);
  assert.equal(props.Reviewed.checkbox,false); assert.equal(props.Categorized.checkbox,false);
  assert.deepEqual(props['Agent Tag'].multi_select,[]);
}
export async function inspectPending({profile:p,raw,planner:x,adapter:a}) {
  assert.equal(Buffer.byteLength(raw),p.sourceBytes); assert.equal(sha(raw),p.sourceSha256);
  const parsed=x.parseTranscript(raw,'vtt'), plan=await x.planTranscript(parsed,'indexed-transcript-pages-v2');
  assert.equal(plan.version,p.version); const desired=x.inlineBlocks(parsed),batch=desired.slice(p.offset,p.offset+p.count);
  assert.equal(batch.length,80); const m=JSON.parse(p.manifest), pending=m.pending;
  assert.equal(m.slots.length,800); assert.ok(!m.finishing);
  assert.equal(pending.key,p.oldKey); assert.equal(pending.after,m.slots.at(-1).id);
  assert.deepEqual(pending.hashes,await Promise.all(batch.map(b=>x.fingerprint(b))));
  const known=[m.heading,...m.slots.map(s=>s.id),m.archive];
  assert.equal(new Set(known).size,known.length); assert.deepEqual(pending.known,known);
  assert.equal(m.readerIndexes.length,1);
  sourceGate(await a.getPage(p.pageId),p);
  const rows=await listAll(a,p.pageId), readers=rows.filter(b=>m.readerIndexes.includes(b.id));
  assert.equal(readers.length,1); assert.equal(readers[0].type,'child_page');
  assert.equal(readers[0].child_page.title,`Transcript Retrieval Index | indexed-transcript-pages-v2 | ${p.version}`);
  const physical=rows.filter(b=>!m.readerIndexes.includes(b.id)), added=physical.filter(b=>!known.includes(b.id));
  assert.ok(added.length===0||added.length===80,'Partial, duplicate, or unowned root blocks');
  assert.deepEqual(physical.map(b=>b.id),[...known.slice(0,801),...added.map(b=>b.id),m.archive]);
  assert.equal(physical[0].type,'heading_3'); assert.equal(x.blockText(physical[0]),'📝 FULL TRANSCRIPT (updating)');
  assert.equal(physical.at(-1).type,'toggle'); assert.equal(x.blockText(physical.at(-1)),'Source archive');
  for(const b of physical) assert.ok(!b.archived&&!b.in_trash);
  for(let i=0;i<800+added.length;i++) {
    const b=physical[i+1]; assert.ok(!b.has_children); assert.equal(b.type,desired[i].type);
    assert.equal(x.blockText(b),x.blockText(desired[i]));
    assert.equal(await x.fingerprint(b),i<800?m.slots[i].hash:pending.hashes[i-800]);
  }
  const meta=blocks=>blocks.map(b=>({id:b.id,type:b.type,text:b.type==='child_page'?b.child_page.title:x.blockText(b),has_children:b.has_children,archived:b.archived??false,in_trash:b.in_trash??false}));
  for(const [parent,metadata,prefix] of [[m.archive,p.archiveMetadata,'original:'],[m.readerIndexes[0],p.readerMetadata,'part:']]) {
    const children=await listAll(a,parent); assert.deepEqual(meta(children),metadata,'Immutable source/index metadata changed');
    for(const artifact of plan.artifacts.filter(b=>b.key.startsWith(prefix))) {
      const matches=children.filter(b=>(b.type==='child_page'?b.child_page.title:x.blockText(b))===x.artifactMarker(p.version,artifact));
      assert.equal(matches.length,1); const holder=matches[0];
      assert.equal(holder.type,prefix==='original:'?'toggle':'child_page'); assert.ok(!holder.archived&&!holder.in_trash);
      const content=await listAll(a,holder.id);
      assert.ok(content.every(b=>b.type==='paragraph'&&!b.has_children&&!b.archived&&!b.in_trash));
      assert.deepEqual(content.map(b=>x.blockText(b)),artifact.chunks);
    }
  }
  sourceGate(await a.getPage(p.pageId),p);
  return {status:added.length?'present-exact':'absent',ids:added.map(b=>b.id),batch,after:pending.after};
}
export async function runPendingRecovery(input) {
  // Freeze caller data before the first await; adapters are trusted reviewed capabilities.
  const p=structuredClone(input.profile), evidence=structuredClone(input.evidence), a=input.adapter;
  for(const [key,value] of Object.entries(WEEKLY)) if(key!=='requestId') assert.equal(p[key],value);
  validateEvidence(p,evidence);
  assert.equal(sha(p.manifest),p.manifestSha256);
  assert.ok(p.owner&&p.meetingKey&&p.selectedKey);
  const now=input.now??Date.now, deadline=p.deadline;
  assert.ok(Number.isSafeInteger(deadline)&&deadline>now()&&deadline<=now()+900000);
  const key=`${p.archiveId}:${p.version}:repair-inline:${sha(p.oldKey)}`;
  const guard=async()=>{
    assert.ok(now()<deadline,'Dispatch deadline expired');
    const s=await a.guard(p);
    assert.equal(s.exclusive,true); assert.equal(s.owner,p.owner);
    assert.deepEqual(s.projection,{version:p.version,generation:1,phase:'writing',manifest:p.manifest});
    assert.equal(s.oldReservation,p.oldReservedAt);
  };
  const inventory=async()=>{await guard(); const r=await inspectPending({...input,profile:p}); await guard(); return r;};
  let observed=await inventory();
  const request={method:'PATCH',path:`/v1/blocks/${p.pageId}/children`,body:{children:observed.batch,after:observed.after}};
  const fingerprint=sha(JSON.stringify(request)), prior=await a.getAttempt(key);
  if(prior) assert.equal(prior.fingerprint,fingerprint);
  if(input.settleOnly) {
    assert.ok(prior&&['unknown','verified'].includes(prior.status),'Settlement requires an existing unknown or verified attempt');
    assert.equal(observed.status,'present-exact','Settlement requires exact positive readback; append forbidden');
  }
  if(prior&&observed.status==='absent') return {status:'held-existing-attempt',mayPublishReady:false};
  if(!prior) { await guard(); assert.equal(await a.reserveAttempt({key,fingerprint,request,proof:evidence,profile:p}),true,'Atomic reservation refused'); }
  const record=async(status,receipt)=>{await a.recordReceipt(key,status,receipt); return {status,receipt,oldJournalPreserved:true,checkpointMutationPerformed:false,mayPublishReady:false};};
  const verified=ids=>record('verified',{fingerprint,ids,provenance:'positive-readback',methodInference:true,historicalBodyFingerprintRecorded:false});
  if(observed.status==='present-exact') return verified(observed.ids);
  assert.ok(!input.settleOnly,'Settlement cannot dispatch');
  observed=await inventory(); if(observed.status==='present-exact') return verified(observed.ids);
  await guard(); assert.equal(await a.markInFlight(key,fingerprint,p),true,'Atomic dispatch transition refused'); await guard();
  try { await a.append(p.pageId,structuredClone(request.body)); }
  catch { return record('unknown',{fingerprint,reason:'append-response-unknown-no-resend'}); }
  try { observed=await inventory(); assert.equal(observed.status,'present-exact'); return await verified(observed.ids); }
  catch { return record('unknown',{fingerprint,reason:'positive-readback-unqualified-no-resend'}); }
}
