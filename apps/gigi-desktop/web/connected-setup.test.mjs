import test from 'node:test';
import assert from 'node:assert/strict';
import {ConnectedSetup} from './connected-setup.mjs';
import {createBridge} from './bridge.mjs';

function fixture() {
  const calls=[],values=new Map(),records=new Map(),mutationReceipts=new Map();
  const storage={getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value),removeItem:key=>values.delete(key)};
  const workspace={id:'synthetic-workspace',name:'Synthetic tour crew'};
  let connection={provider:'gmail',state:'disconnected'},preview=null,receipt=null;
  const faults={lostCommit:false,receiptUnavailable:false,lostSave:false,saveReceiptUnavailable:false,missingRelation:false};
  const source={workspaceId:workspace.id,id:'mail-1',entity:'interactions',title:'Synthetic booking inquiry',fields:{Date:'2026-11-01T12:00:00Z'},source:{kind:'import',provider:'gmail',connectedAccountId:'ca_synthetic',collectionId:'thread-1',externalId:'message-1',observedAt:'2026-11-05T12:00:00Z',preview:{from:'Synthetic Booker <booker@example.test>',snippet:'Can you play Friday?'}}};
  const bridge=createBridge(async(_command,{operation,input})=>{
    calls.push({operation,input:structuredClone(input)});
    if(operation==='agent.chat.status')return {provider:'codex',available:true,authenticated:true,toolsAvailable:true,workspaceVerified:true,workspace:{id:input.workspaceId,name:workspace.name},checkedAt:Date.now()};
    if(operation==='agent.chat.login.read')return {state:'idle',authenticated:true};
    if(operation==='sources.status')return {...connection,provider:input.provider};
    if(operation==='connections.begin'){
      connection={provider:input.provider,state:'pending',connectedAccountId:'ca_synthetic'};
      // Native broker contract: url, not consentUrl; consent and readback remain separate.
      return {provider:input.provider,status:'awaiting_consent',connectedAccountId:'ca_synthetic',url:'https://connect.composio.dev/synthetic',expiresAt:new Date(Date.now()+300_000).toISOString()};
    }
    if(operation==='connections.openConsent')return {opened:true,verified:false};
    if(operation==='connections.reconcile'){
      assert.equal(input.connectedAccountId,connection.connectedAccountId);
      connection={provider:input.provider,state:'connected',connectedAccountId:'ca_synthetic',accountLabel:{value:'booker@example.test'}};
      return structuredClone(connection);
    }
    if(operation==='sources.preview'){
      assert.equal(connection.state,'connected');assert.equal(input.maxPages,1);assert.equal(input.maxRecords,25);
      const {id,...raw}=source;
      preview={previewId:'preview-1',jobId:'preview-1',revision:'revision-1',state:'preview',scope:{workspaceId:workspace.id,provider:input.provider,connectedAccountId:input.connectedAccountId,selection:input.selection},records:[raw],newCount:1,existingCount:0,selectedCount:1,scannedCount:3,nextCursor:'opaque-next-page',coverage:'bounded',expiresAt:Math.floor(Date.now()/1000)+900};
      return structuredClone(preview);
    }
    if(operation==='imports.commit'){
      assert.equal(input.confirmed,true);assert.equal(input.previewId,preview.previewId);assert.equal(input.expectedRevision,preview.revision);
      records.set('interactions:mail-1',structuredClone(source));
      // This is the public source_jobs.rs receipt shape. Saved IDs are in records.
      receipt={jobId:preview.previewId,previewId:preview.previewId,state:'complete',scope:preview.scope,createdCount:1,existingCount:0,failedCount:0,records:[{id:'mail-1',entity:'interactions',title:source.title}],failures:[],nextCursor:'opaque-next-page',coverage:'bounded',retryCursor:null};
      if(faults.lostCommit)throw Error('Synthetic import response lost');
      return structuredClone(receipt);
    }
    if(operation==='imports.status'){
      if(faults.receiptUnavailable)throw Error('Synthetic receipt unavailable');
      return structuredClone(receipt||preview);
    }
    if(operation==='records.save'){
      const record={workspaceId:input.workspaceId,entity:input.entity,id:input.id,title:input.title,fields:input.fields,source:{...source.source,kind:'derived'},relations:[{fromEntity:input.entity,fromId:input.id,toEntity:'interactions',toId:source.id,role:'Interactions'}]};
      const result={...record,sourceProposal:{outcome:'created',sourceEntity:'interactions',sourceId:source.id}};
      records.set(`${record.entity}:${record.id}`,record);mutationReceipts.set(input.idempotencyKey,{input:structuredClone(input),result:structuredClone(result)});
      if(faults.lostSave)throw Error('Synthetic save response lost');
      return structuredClone(result);
    }
    if(operation==='records.get'){
      if(input.saveReceipt){
        if(faults.saveReceiptUnavailable)throw Error('Synthetic save receipt unavailable');
        const prior=mutationReceipts.get(input.saveReceipt.idempotencyKey);
        if(!prior)return {receiptFound:false};
        assert.deepEqual(input.saveReceipt.expectedInput,prior.input);
        return {receiptFound:true,record:structuredClone(prior.result)};
      }
      const record=structuredClone(records.get(`${input.entity}:${input.id}`));
      if(!record)throw Error('Record not found');
      if(faults.missingRelation&&input.entity==='contacts')record.relations=[];
      return record;
    }
    throw Error(`Unexpected operation: ${operation}`);
  });
  const callbacks={manual:0,explore:0,finish:0,asked:[]};
  const create=()=>{const c=new ConnectedSetup(bridge,{storage,onManual:()=>callbacks.manual++,onExplore:()=>callbacks.explore++,onFinish:()=>callbacks.finish++,onAsk:prompt=>callbacks.asked.push(prompt)});c.mount(workspace,{autoStart:true});return c;};
  const count=operation=>calls.filter(call=>call.operation===operation).length;
  const review=(c,fields)=>{const prior=globalThis.FormData;globalThis.FormData=class{constructor(form){this.fields=Object.entries(form.values);}[Symbol.iterator](){return this.fields[Symbol.iterator]();}};try{c.review({id:'setup-candidate-form',values:fields});}finally{globalThis.FormData=prior;}};
  const connect=async c=>{await c.assistantAction('refresh');await c.action('sources');await c.action('source-connect');await c.action('source-verify');};
  return {bridge,calls,storage,workspace,source,faults,callbacks,create,count,review,connect,records,get receipt(){return receipt;}};
}

test('connected setup reaches Ready only after explicit source import, reviewed save and independent native record readback',async()=>{
  const f=fixture(),c=f.create();
  try{
    assert.equal(f.calls.length,0);assert.match(c.view(),/data-assistant-action="refresh"/);
    await c.action('sources');assert.equal(c.journey.state.step,'assistant');assert.match(c.error,/Check workspace access first/);
    await c.assistantAction('refresh');assert.equal(c.assistant.workspaceVerified,true);assert.match(c.view(),/Workspace access checked/);
    assert.equal(f.count('agent.chat.login.start'),0);assert.equal(f.count('auth.login'),0);assert.equal(f.count('connections.begin'),0);
    await c.action('sources');assert.match(c.view(),/data-guided-action="source-connect"/);
    await c.action('source-connect');
    assert.equal(f.count('connections.openConsent'),1,'the exact native broker URL must open from the explicit connection action');
    assert.deepEqual(f.calls.find(x=>x.operation==='connections.openConsent').input,{url:'https://connect.composio.dev/synthetic',provider:'gmail'});
    assert.match(c.view(),/data-guided-action="source-verify"/);assert.equal(c.imports.state.source.state,'pending');
    assert.equal(f.count('imports.commit'),0);assert.equal(f.count('records.save'),0);
    await c.action('source-verify');assert.equal(c.imports.state.source.state,'connected');assert.equal(f.count('connections.reconcile'),1);
    await c.action('preview');assert.equal(c.journey.state.step,'results');assert.equal(c.imports.state.preview.coverage,'bounded');
    assert.equal(f.count('imports.commit'),0);assert.equal(f.records.size,0);
    await c.action('import-reviewed');assert.equal(f.count('imports.commit'),1);assert.equal(f.count('imports.status'),1);
    assert.equal(c.imports.state.candidates.length,1);assert.equal(c.imports.state.wins.length,0);assert.equal(f.count('records.save'),0);
    await c.action('ready');assert.equal(c.journey.state.step,'results');assert.match(c.error,/Save and check one result/);
    c.selectCandidate('mail-1');f.review(c,{title:'Reviewed Synthetic Booker',email:'booker@example.test'});
    assert.equal(c.imports.state.proposal.phase,'review');assert.equal(f.count('records.save'),0);
    await c.action('save-result');assert.equal(c.imports.state.wins.length,1);
    const saveIndex=f.calls.findIndex(x=>x.operation==='records.save'),write=f.calls[saveIndex].input;
    assert.equal(write.fields.Email,'booker@example.test');assert.equal(write.sourceRecord.id,'mail-1');
    assert.ok(f.calls.slice(saveIndex+1).some(x=>x.operation==='records.get'&&x.input.entity==='contacts'&&x.input.id===write.id&&x.input.detail==='full'),'independent record read follows the save response');
    assert.match(c.view(),/Reviewed Synthetic Booker/);
    await c.action('ready');assert.equal(c.journey.state.step,'ready');assert.match(c.view(),/data-guided-action="phone-codex"/);
    assert.equal(f.count('help.open'),0,'reaching Ready does not start phone setup');
    await c.action('finish');assert.equal(c.open,false);assert.equal(f.callbacks.finish,1);
  }finally{c.leave();}
});

test('an uncertain reviewed save pauses and resumes from the exact mutation receipt without a duplicate write',async()=>{
  const f=fixture();let c=f.create();
  try{
    await f.connect(c);await c.action('preview');await c.action('import-reviewed');c.selectCandidate('mail-1');f.review(c,{title:'Recovered Booker',email:'booker@example.test'});
    f.faults.lostSave=true;f.faults.saveReceiptUnavailable=true;
    await c.action('save-result');assert.equal(c.imports.state.proposal.phase,'submitted');assert.equal(c.imports.state.wins.length,0);assert.equal(f.count('records.save'),1);
    const exact=structuredClone(c.imports.state.proposal.payload);
    await c.action('pause');assert.equal(c.open,false);assert.equal(f.callbacks.explore,1);
    f.faults.saveReceiptUnavailable=false;c=f.create();assert.equal(c.open,false,'restart preserves a paused journey');
    await c.action('open');assert.equal(c.open,true);assert.equal(c.imports.state.proposal,null);assert.equal(c.imports.state.wins.length,1);
    assert.equal(f.count('records.save'),1);assert.deepEqual(f.calls.filter(x=>x.operation==='records.get'&&x.input.saveReceipt).at(-1).input.saveReceipt.expectedInput,exact);
    await c.action('ready');assert.equal(c.journey.state.step,'ready');
    await c.action('pause');f.faults.missingRelation=true;c=f.create();await c.openAt('results');
    assert.equal(c.imports.state.wins.length,0,'persisted progress cannot preserve a win whose actual source link is missing');
    await c.action('ready');assert.equal(c.journey.state.step,'results');
  }finally{c.leave();}
});

test('lost import replies require the original native receipt and restore through reads before any first-win claim',async()=>{
  const f=fixture();let c=f.create();
  try{
    await f.connect(c);await c.action('preview');f.faults.lostCommit=true;f.faults.receiptUnavailable=true;
    await c.action('import-reviewed');assert.equal(f.count('imports.commit'),1);assert.equal(c.imports.state.wins.length,0);assert.equal(c.imports.state.candidates.length,0);assert.match(c.imports.error,/has not confirmed this import/);
    const committed=f.calls.find(x=>x.operation==='imports.commit').input;
    await c.action('pause');f.faults.receiptUnavailable=false;c=f.create();await c.action('open');
    assert.equal(c.imports.state.candidates.length,1);assert.equal(c.imports.state.wins.length,0);assert.equal(f.count('imports.commit'),1);
    assert.equal(c.imports.state.importInput.idempotencyKey,committed.idempotencyKey);
    assert.equal(c.imports.state.receipt.records[0].id,'mail-1');assert.equal(c.imports.state.receipt.coverage,'bounded');
    await c.action('ready');assert.equal(c.journey.state.step,'results');assert.equal(f.count('records.save'),0);
  }finally{c.leave();}
});

test('manual work remains explicit and does not trigger connection or import mutations',async()=>{
  const f=fixture(),c=f.create();
  await c.action('manual');assert.equal(c.open,false);assert.equal(f.callbacks.manual,1);assert.equal(c.assistant.disposed,true);assert.equal(f.calls.length,0);
});
