import test from 'node:test';
import assert from 'node:assert/strict';
import {SetupImports} from './setup-imports.mjs';

const now=()=>Date.parse('2026-11-05T12:00:00Z');
const storage=()=>{const values=new Map();return {getItem:key=>values.get(key) || null,setItem:(key,value)=>values.set(key,value),removeItem:key=>values.delete(key)};};
function fixture() {
  const calls=[];const local=storage();let saved;
  const source={workspaceId:'w1',id:'mail-1',entity:'interactions',title:'Synthetic inquiry',fields:{Date:'2026-11-01T12:00:00Z'},source:{kind:'import',provider:'gmail',connectedAccountId:'ca_one',collectionId:'thread-1',externalId:'message-1',observedAt:'2026-11-05T12:00:00Z',preview:{from:'Synthetic Booker <booker@example.test>',snippet:'Can you play Friday?'}}};
  const preview={previewId:'p1',jobId:'p1',revision:'r1',scope:{workspaceId:'w1',provider:'gmail',connectedAccountId:'ca_one'},records:[source],selectedCount:1,scannedCount:2,newCount:1,existingCount:0,nextCursor:'opaque-next',coverage:'bounded',expiresAt:now()/1000+900};
  const receipt={jobId:'p1',previewId:'p1',state:'complete',createdCount:1,existingCount:0,failedCount:0,records:[{id:'mail-1',entity:'interactions'}],scope:preview.scope,nextCursor:'opaque-next',coverage:'bounded'};
  const bridge={
    async sourceStatus(w,p){calls.push(['status',w,p]);return {provider:p,state:'connected',connectedAccountId:'ca_one'};},
    async previewSource(...args){calls.push(['preview',...args]);return structuredClone(preview);},
    async commitSource(...args){calls.push(['commit',...args]);return structuredClone(receipt);},
    async importStatus(...args){calls.push(['receipt',...args]);return structuredClone(receipt);},
    async cancelImport(...args){calls.push(['cancel',...args]);return {...receipt,state:'cancelled',records:[],nextCursor:null};},
    async getRecord(w,e,id){calls.push(['get',w,e,id]);return structuredClone(e===source.entity?source:saved);},
    async call(op,input){calls.push([op,structuredClone(input)]);if(op==='records.get')return {receiptFound:!!saved,...(saved?{record:saved}:{})};if(op==='records.save'){saved={...input,source:{...source.source,kind:'derived'},sourceProposal:{outcome:'created',sourceEntity:'interactions',sourceId:'mail-1'},relations:[{fromEntity:input.entity,fromId:input.id,role:'Interactions',toEntity:'interactions',toId:'mail-1'}]};return structuredClone(saved);}}
  };
  return {calls,local,source,preview,receipt,bridge,get saved(){return saved;}};
}

test('setup imports reviewed source separately from a verified contact first win',async()=>{
  const f=fixture(),flow=new SetupImports(f.bridge,'w1',{storage:f.local,now});
  await flow.restore('contacts');assert.equal(flow.state.wins.length,0);
  await flow.preview('contacts');assert.equal(f.calls.some(c=>c[0]==='commit'),false);
  assert.deepEqual(f.calls.find(c=>c[0]==='preview')[4],{from:'2025-11-05T12:00:00.000Z',to:'2026-11-05T12:00:00.000Z'});
  assert.equal(flow.state.preview.coverage,'bounded');
  await flow.importReviewed();assert.equal(flow.state.candidates[0].id,'mail-1');
  assert.equal(flow.state.wins.length,0);assert.equal(f.calls.some(c=>c[0]==='records.save'),false);
  flow.selectCandidate('mail-1');flow.reviewCandidate({title:'Reviewed Booker',email:'booker@example.test'});
  await flow.saveReviewed();assert.equal(flow.state.wins.length,1);
  assert.equal(flow.state.wins[0].id,f.saved.id);assert.equal(flow.state.wins[0].verifiedAt,'2026-11-05T12:00:00.000Z');
  assert.equal(f.calls.filter(c=>c[0]==='records.save').length,1);
  const reopened=new SetupImports(f.bridge,'w1',{storage:f.local,now});await reopened.restore('contacts');
  assert.equal(reopened.state.wins.length,1);assert.equal(f.calls.filter(c=>c[0]==='records.save').length,1);
});

test('an uncertain save survives restart and recovers read-only without a duplicate write',async()=>{
  const f=fixture(),flow=new SetupImports(f.bridge,'w1',{storage:f.local,now});
  await flow.restore('tasks');await flow.preview('tasks');await flow.importReviewed();
  flow.selectCandidate('mail-1');flow.reviewCandidate({title:'Reply to synthetic inquiry',date:'2026-11-06'});
  const original=f.bridge.call;let outage=true;
  f.bridge.call=async(op,input)=>{if(op==='records.get'&&outage)throw new Error('Synthetic receipt outage');const result=await original(op,input);if(op==='records.save'&&outage)throw new Error('Synthetic response lost');return result;};
  assert.equal(await flow.saveReviewed(),null);assert.equal(flow.state.proposal.phase,'submitted');assert.equal(flow.state.wins.length,0);
  const exact=structuredClone(flow.state.proposal.payload);outage=false;
  const reopened=new SetupImports(f.bridge,'w1',{storage:f.local,now});await reopened.restore('tasks');
  assert.equal(reopened.state.proposal,null);assert.equal(reopened.state.wins[0].id,f.saved.id);
  assert.equal(f.calls.filter(c=>c[0]==='records.save').length,1);
  assert.deepEqual(f.calls.find(c=>c[0]==='records.get')[1].saveReceipt.expectedInput,exact);
  const foreign=new SetupImports(f.bridge,'other-workspace',{storage:f.local,now});foreign.setIntent('tasks');assert.equal(foreign.state.proposal,null);assert.equal(foreign.state.wins.length,0);
});

test('draft edits persist without rerendering and a missing source relation never counts as a win',async()=>{
  const f=fixture();let renders=0;
  const flow=new SetupImports(f.bridge,'w1',{storage:f.local,now,onChange:()=>renders++});
  await flow.restore('contacts');await flow.preview('contacts');await flow.importReviewed();flow.selectCandidate('mail-1');
  const before=renders;flow.updateDraft({title:'My reviewed name',email:'booker@example.test'});assert.equal(renders,before);
  const reopened=new SetupImports(f.bridge,'w1',{storage:f.local,now});await reopened.restore('contacts');
  assert.equal(reopened.state.proposal.title,'My reviewed name');assert.equal(reopened.state.proposal.phase,'draft');
  reopened.reviewCandidate({title:'My reviewed name',email:'booker@example.test'});
  const get=f.bridge.getRecord;
  f.bridge.getRecord=async(...args)=>{const result=await get(...args);if(args[1]==='contacts')result.relations=[];return result;};
  assert.equal(await reopened.saveReviewed(),null);assert.equal(reopened.state.wins.length,0);assert.equal(reopened.state.proposal.phase,'submitted');
});

test('continuation uses the frozen scope and expiry requires an explicit fresh preview',async()=>{
  const f=fixture(),flow=new SetupImports(f.bridge,'w1',{storage:f.local,now});
  await flow.restore('contacts');await flow.preview('contacts');await flow.importReviewed();
  await flow.preview('contacts');assert.equal(f.calls.filter(c=>c[0]==='preview').at(-1)[5],'opaque-next');
  const read=f.bridge.previewSource;
  f.bridge.previewSource=async(...args)=>{if(args[4])throw new Error('Source cursor scope changed or expired. Start a fresh preview.');return read(...args);};
  await flow.preview('contacts');assert.equal(flow.state.needsFreshPreview,true);
  const calls=f.calls.length;await flow.preview('contacts');assert.equal(f.calls.length,calls);
  await flow.preview('contacts',{fresh:true});assert.equal(flow.state.needsFreshPreview,false);assert.equal(f.calls.filter(c=>c[0]==='preview').at(-1)[5],undefined);
  assert.equal(flow.state.preview.coverage,'bounded');
});

test('changed source accounts block old imports and permit only an explicit new preview',async()=>{
  const f=fixture(),flow=new SetupImports(f.bridge,'w1',{storage:f.local,now});
  await flow.restore('contacts');await flow.preview('contacts');
  f.bridge.sourceStatus=async(w,p)=>({provider:p,state:'connected',connectedAccountId:'ca_two'});
  await flow.refreshSource('gmail');assert.equal(flow.state.sourceMismatch,true);
  await flow.importReviewed();assert.equal(f.calls.filter(c=>c[0]==='commit').length,0);
  f.preview.scope.connectedAccountId='ca_two';f.source.source.connectedAccountId='ca_two';
  await flow.preview('contacts',{fresh:true});assert.equal(flow.state.sourceMismatch,false);assert.equal(flow.state.preview.scope.connectedAccountId,'ca_two');
});

test('calendar first wins require reviewed Work kind and retain exact dates',async()=>{
  const f=fixture();
  f.source.entity='schedule';f.source.id='event-1';f.source.source.provider='googlecalendar';f.source.source.collectionId='primary@example.test';f.source.fields={Date:'2026-11-06T18:00:00-06:00/2026-11-06T19:00:00-06:00'};
  f.preview.scope.provider='googlecalendar';f.receipt.records=[{entity:'schedule',id:'event-1'}];
  const flow=new SetupImports(f.bridge,'w1',{storage:f.local,now});await flow.restore('gigs');await flow.preview('gigs');await flow.importReviewed();flow.selectCandidate('event-1');
  assert.equal(flow.state.proposal.date,f.source.fields.Date);
  assert.equal(flow.reviewCandidate({title:'Reviewed commitment',date:f.source.fields.Date}),null);
  assert.match(flow.error,/work kind/);
  flow.reviewCandidate({title:'Reviewed commitment',date:f.source.fields.Date,workKind:'Crew / work'});
  // This fixture models the native atomic save and independently reopened link.
  const original=f.bridge.call;
  f.bridge.call=async(op,input)=>{const result=await original(op,input);if(op==='records.save'){result.sourceProposal.sourceEntity='schedule';result.sourceProposal.sourceId='event-1';result.relations=[{fromEntity:'gigs',fromId:result.id,role:'Schedule',toEntity:'schedule',toId:'event-1'}];f.saved.sourceProposal=result.sourceProposal;f.saved.relations=result.relations;}return result;};
  await flow.saveReviewed();assert.equal(flow.state.wins.length,1);assert.equal(f.saved.fields['Work kind'],'Crew / work');
  assert.deepEqual(f.calls.find(c=>c[0]==='preview')[4],{from:'2026-11-05T12:00:00.000Z',to:'2027-02-05T12:00:00.000Z',calendarId:'primary'});
});

test('native expired-session rejection becomes a recoverable source status',async()=>{
 const f=fixture();f.bridge.sourceStatus=async()=>{throw 'reauthentication_required';};
 const flow=new SetupImports(f.bridge,'w1',{storage:f.local,now});await flow.restore('contacts');
 assert.equal(flow.state.source?.detail,'reauthentication_required');assert.equal(flow.state.source?.state,'unavailable');assert.equal(flow.error,null);
 const {setupJourneyView}=await import('./setup-journey-view.mjs');
 const html=setupJourneyView({journey:{state:{step:'source'}},workspace:{id:'w1',name:'Synthetic'},imports:flow});
 assert.match(html,/data-guided-action="source-signin"/);assert.doesNotMatch(html,/reauthentication_required/);
});

for (const failedRead of ['receipt', 'candidate']) test(`an unconfirmed import survives ${failedRead} read failures until continuation reconciles its exact job`, async()=>{
  const f=fixture(),flow=new SetupImports(f.bridge,'w1',{storage:f.local,now});
  await flow.restore('contacts');await flow.preview('contacts');
  let outage=true;
  const status=f.bridge.importStatus,get=f.bridge.getRecord;
  f.bridge.importStatus=async(...args)=>{if(outage&&failedRead==='receipt'){f.calls.push(['receipt',...args]);throw new Error('Synthetic receipt unavailable');}return status(...args);};
  f.bridge.getRecord=async(...args)=>{if(outage&&failedRead==='candidate'){f.calls.push(['get',...args]);throw new Error('Synthetic imported record unavailable');}return get(...args);};
  assert.equal(await flow.importReviewed(),null);
  const exact=structuredClone(flow.state.importInput);
  assert.ok(exact);assert.equal(f.calls.filter(c=>c[0]==='commit').length,1);
  for(const options of [{},{fresh:true}]) {
    assert.equal(await flow.preview('contacts',options),null);
    assert.equal(f.calls.filter(c=>c[0]==='preview').length,1,'failed recovery must not fetch another preview');
    assert.deepEqual(flow.state.importInput,exact);
  }
  const reopened=new SetupImports(f.bridge,'w1',{storage:f.local,now});await reopened.restore('contacts');
  assert.deepEqual(reopened.state.importInput,exact);assert.equal(f.calls.filter(c=>c[0]==='commit').length,1);
  outage=false;
  const before=f.calls.length;f.preview.previewId='p2';f.preview.jobId='p2';
  await reopened.preview('contacts');
  const continuation=f.calls.slice(before);
  assert.deepEqual(continuation.map(c=>c[0]),['receipt','get','preview']);
  assert.equal(continuation[0][2],exact.previewId);assert.equal(continuation[2][5],'opaque-next');
  assert.equal(reopened.state.preview.previewId,'p2');assert.equal(reopened.state.importInput,null);
  assert.equal(f.calls.filter(c=>c[0]==='commit').length,1,'receipt recovery never repeats the import');
});

test('a still-preview import blocks continuation but retains the exact approved retry key',async()=>{
  const f=fixture(),flow=new SetupImports(f.bridge,'w1',{storage:f.local,now});
  await flow.restore('contacts');await flow.preview('contacts');
  let committed=false;
  f.bridge.commitSource=async(...args)=>{f.calls.push(['commit',...args]);if(f.calls.filter(c=>c[0]==='commit').length===1)throw new Error('Synthetic request not confirmed');committed=true;return structuredClone(f.receipt);};
  f.bridge.importStatus=async(...args)=>{f.calls.push(['receipt',...args]);return structuredClone(committed?f.receipt:{...f.preview,state:'preview'});};
  await flow.importReviewed();const exact=structuredClone(flow.state.importInput);assert.ok(exact);
  assert.equal(await flow.preview('contacts'),null);assert.equal(f.calls.filter(c=>c[0]==='preview').length,1);
  assert.deepEqual(flow.state.importInput,exact);assert.equal(f.calls.filter(c=>c[0]==='commit').length,1);
  await flow.importReviewed();
  const commits=f.calls.filter(c=>c[0]==='commit');assert.equal(commits.length,2);assert.deepEqual(commits[0],commits[1]);
  assert.equal(flow.state.receipt.state,'complete');assert.equal(flow.state.candidates[0].id,'mail-1');
  assert.deepEqual(flow.state.importInput,exact);await flow.importReviewed();
  assert.equal(f.calls.filter(c=>c[0]==='commit').length,2,'a confirmed terminal import remains a read-only retry');
});
