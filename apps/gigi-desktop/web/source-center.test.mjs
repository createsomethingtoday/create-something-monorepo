import assert from 'node:assert/strict';
import test from 'node:test';

test('verified source identity replaces redundant sign-in; admission denial does not imply pending consent', async () => {
 const listeners=new Map();
 const root={innerHTML:'',classList:{toggle(){}},addEventListener(n,h){listeners.set(n,h);},querySelector(){return null;}};
 const prior={document:globalThis.document,tauri:globalThis.__TAURI__};
 let mode='connected';const calls=[];
 globalThis.document={querySelector:s=>s==='#app'?root:null};
 globalThis.__TAURI__={core:{invoke:async(_,{operation,input})=>{
  calls.push({operation,input});
  if(operation==='workspace.get')return{id:'synthetic-w',name:'Synthetic'};
  if(operation==='records.list')return{items:input.entity==='profile'?[{id:'profile'}]:[],count:0};
  if(operation==='records.get')return{id:'profile',fields:{Currency:'USD'}};
  if((operation==='connections.status'||operation==='sources.status'))return mode==='connected'?{provider:input.provider,state:'connected',connectedAccountId:'synthetic-'+input.provider,accountLabel:{value:'artist@example.invalid'}}:mode==='pending'?{provider:input.provider,state:'pending'}:{provider:input.provider,state:'attention',detail:'access_denied'};
  return {};
 }}};
 const settle=()=>new Promise(r=>setImmediate(r));
 const click=dataset=>listeners.get('click')({target:{closest:()=>({dataset})}});
 try{
  await import(`./app.mjs?source-center=${Date.now()}`);await settle();
  click({page:'settings'});await settle();
  assert.match(root.innerHTML,/Google-verified Gmail address/);
  assert.match(root.innerHTML,/artist@example.invalid/);
  assert.doesNotMatch(root.innerHTML,/data-sign-in="1"/);
  mode='denied';click({sourceRefresh:'gmail'});await settle();
  assert.match(root.innerHTML,/Access not enabled/);
  assert.match(root.innerHTML,/operator/);
  assert.doesNotMatch(root.innerHTML,/The account ID is not available yet/);
  assert.doesNotMatch(root.innerHTML,/data-sign-in="1"/);
  assert.doesNotMatch(root.innerHTML,/data-source-reconcile|data-source-begin|data-source-import/);
  mode='pending';click({sourceRefresh:'gmail'});await settle();
  assert.match(root.innerHTML,/The account ID is not available yet/);
  assert.equal(calls.filter(c=>['auth.login','connections.import','connections.begin'].includes(c.operation)).length,0);
 }finally{globalThis.document=prior.document;globalThis.__TAURI__=prior.tauri;}
});

test('source preview reads without import, then imports only the reviewed revision and shows durable counts', async () => {
 const listeners=new Map();const calls=[];let receiptReads=0;
 const root={innerHTML:'',classList:{toggle(){}},addEventListener(n,h){listeners.set(n,h);},querySelector(){return null;}};
 const prior={document:globalThis.document,tauri:globalThis.__TAURI__};
 globalThis.document={querySelector:s=>s==='#app'?root:null};
 const preview={previewId:'preview-1',revision:'revision-1',scope:{workspaceId:'w1',provider:'gmail',connectedAccountId:'account-1',selection:{},maxPages:1,maxRecords:25},records:[{entity:'interactions',title:'Synthetic <booking>',fields:{},source:{}}],newCount:1,existingCount:0,scannedCount:2,selectedCount:1,excludedCount:1,unknownDateCount:0,nextCursor:'scoped-next',coverage:'bounded',expiresAt:'2030-01-01T00:00:00Z'};
 const receipt={jobId:'preview-1',previewId:'preview-1',state:'complete',createdCount:1,existingCount:0,failedCount:0,records:[{id:'record-1',entity:'interactions',title:'Synthetic booking'}],failures:[],nextCursor:'scoped-next'};
 globalThis.__TAURI__={core:{invoke:async(_,{operation,input})=>{
  calls.push({operation,input});
  if(operation==='workspace.get')return{id:'w1',name:'Synthetic'};
  if(operation==='records.list')return{items:input.entity==='profile'?[{id:'profile'}]:[],count:0};
  if(operation==='records.get')return{id:'profile',fields:{Currency:'USD'}};
  if((operation==='connections.status'||operation==='sources.status')||operation==='sources.status')return{provider:input.provider,state:'connected',connectedAccountId:'account-1',accountLabel:{value:'artist@example.invalid'}};
  if(operation==='sources.preview')return preview;
  if(operation==='imports.commit')return receipt;
  if(operation==='imports.status'){receiptReads++;return receipt;}
  return {};
 }}};
 const settle=()=>new Promise(r=>setImmediate(r));const click=dataset=>listeners.get('click')({target:{closest:()=>({dataset})}});
 try{
  await import(`./app.mjs?source-preview=${Date.now()}`);await settle();click({page:'settings'});await settle();
  assert.match(root.innerHTML,/data-source-preview="gmail"/);
  assert.doesNotMatch(root.innerHTML,/data-source-import="gmail"/);
  click({sourcePreview:'gmail'});await settle();
  assert.equal(calls.filter(c=>c.operation==='imports.commit').length,0);
  assert.equal(calls.filter(c=>c.operation==='connections.import').length,0);
  assert.match(root.innerHTML,/Synthetic &lt;booking&gt;/);
  assert.match(root.innerHTML,/2 scanned/);assert.match(root.innerHTML,/1 selected/);
  assert.match(root.innerHTML,/more source pages|More source pages/);
  assert.match(root.innerHTML,/data-source-commit="gmail"/);
  click({sourceCommit:'gmail'});click({sourceCommit:'gmail'});await settle();
  const committed=calls.filter(c=>c.operation==='imports.commit');assert.equal(committed.length,1);
  assert.deepEqual({...committed[0].input,idempotencyKey:'stable'}, {workspaceId:'w1',previewId:'preview-1',expectedRevision:'revision-1',idempotencyKey:'stable',confirmed:true});
  assert.match(root.innerHTML,/1 created/);assert.match(root.innerHTML,/0 existing/);assert.match(root.innerHTML,/0 failed/);
  click({sourceReceipt:'gmail'});await settle();assert.equal(receiptReads,1);
  click({sourcePreview:'gmail'});await settle();
  assert.equal(calls.filter(c=>c.operation==='sources.preview').at(-1).input.cursor,'scoped-next');
 }finally{globalThis.document=prior.document;globalThis.__TAURI__=prior.tauri;}
});

test('reopening Sources restores receipt scope and continues its scoped cursor without importing', async () => {
 const listeners=new Map(),calls=[];
 const root={innerHTML:'',classList:{toggle(){}},addEventListener(n,h){listeners.set(n,h);},querySelector(){return null;}};
 const prior={document:globalThis.document,tauri:globalThis.__TAURI__};
 const selection={from:'2026-10-01T12:30:00Z',to:'2026-10-20T12:30:00Z'};
 const receipt={jobId:'persisted-job',state:'complete',createdCount:2,existingCount:1,failedCount:0,nextCursor:'scoped-resume',scope:{workspaceId:'w1',provider:'gmail',connectedAccountId:'account-1',selection,maxPages:1,maxRecords:25}};
 globalThis.document={querySelector:s=>s==='#app'?root:null};
 globalThis.__TAURI__={core:{invoke:async(_,{operation,input})=>{
  calls.push({operation,input});
  if(operation==='workspace.get')return{id:'w1',name:'Synthetic'};
  if(operation==='records.list')return{items:input.entity==='profile'?[{id:'profile'}]:[],count:0};
  if(operation==='records.get')return{id:'profile',fields:{Currency:'USD'}};
  if(operation==='sources.status')return{provider:input.provider,state:'connected',connectedAccountId:'account-1',...(input.provider==='gmail'?{latestImport:receipt}:{})};
  if(operation==='sources.preview')return{previewId:'resume-preview',revision:'r2',records:[],scannedCount:0,selectedCount:0,newCount:0,existingCount:0,coverage:'complete',nextCursor:null};
  return {};
 }}};
 const settle=()=>new Promise(r=>setImmediate(r));const click=dataset=>listeners.get('click')({target:{closest:()=>({dataset})}});
 try{
  await import(`./app.mjs?source-resume=${Date.now()}`);await settle();click({page:'settings'});await settle();
  assert.match(root.innerHTML,/2 created/);
  assert.match(root.innerHTML,/id="source-gmail-from"[^>]+value="2026-10-01"/);
  assert.match(root.innerHTML,/id="source-gmail-to"[^>]+value="2026-10-20"/);
  click({sourcePreview:'gmail'});await settle();
  const request=calls.filter(c=>c.operation==='sources.preview').at(-1).input;
  assert.equal(request.cursor,'scoped-resume');assert.deepEqual(request.selection,selection);
  assert.equal(calls.filter(c=>c.operation==='imports.commit').length,0);
  assert.match(root.innerHTML,/data-source-fresh="gmail"/);
  click({sourceFresh:'gmail'});await settle();
  const fresh=calls.filter(c=>c.operation==='sources.preview').at(-1).input;
  assert.equal(fresh.cursor,undefined);assert.deepEqual(fresh.selection,selection);
 }finally{globalThis.document=prior.document;globalThis.__TAURI__=prior.tauri;}
});

test('sign out clears local source session and previews while preserving imported records and provider consent', async () => {
 const listeners=new Map(),calls=[];let signedOut=false;
 const root={innerHTML:'',classList:{toggle(){}},addEventListener(n,h){listeners.set(n,h);},querySelector(){return null;}};
 const prior={document:globalThis.document,tauri:globalThis.__TAURI__};
 globalThis.document={querySelector:s=>s==='#app'?root:null};
 globalThis.__TAURI__={core:{invoke:async(_,{operation,input})=>{
  calls.push({operation,input});
  if(operation==='workspace.get')return{id:'w1',name:'Synthetic'};
  if(operation==='records.list')return{items:input.entity==='profile'?[{id:'profile'}]:[],count:0};
  if(operation==='records.get')return{id:'profile',fields:{Currency:'USD'}};
  if(operation==='sources.status')return signedOut?{provider:input.provider,state:'unavailable',detail:'reauthentication_required'}:{provider:input.provider,state:'connected',connectedAccountId:'account-1'};
  if(operation==='sources.preview')return{previewId:'preview-signout',revision:'r1',records:[{entity:'interactions',title:'Synthetic preview to discard'}],newCount:1,existingCount:0,scannedCount:1,selectedCount:1,coverage:'complete'};
  if(operation==='auth.logout'){signedOut=true;return{signedOut:true,localOnly:true};}
  return {};
 }}};
 const settle=()=>new Promise(r=>setImmediate(r));const click=dataset=>listeners.get('click')({target:{closest:()=>({dataset})}});
 try{
  await import(`./app.mjs?source-signout=${Date.now()}`);await settle();click({page:'settings'});await settle();
  click({sourcePreview:'gmail'});await settle();assert.match(root.innerHTML,/Synthetic preview to discard/);
  assert.match(root.innerHTML,/data-source-sign-out="1"/);
  click({sourceSignOut:'1'});await settle();
  assert.deepEqual(calls.filter(c=>c.operation==='auth.logout'),[{operation:'auth.logout',input:{}}]);
  assert.match(root.innerHTML,/Signed out of GiGi sources on this Mac/);
  assert.match(root.innerHTML,/Google consent and imported records are unchanged/);
  assert.doesNotMatch(root.innerHTML,/Synthetic preview to discard|data-source-commit="gmail"/);
  assert.equal(calls.filter(c=>['records.save','connections.import','imports.commit','connections.begin','auth.login'].includes(c.operation)).length,0);
 }finally{globalThis.document=prior.document;globalThis.__TAURI__=prior.tauri;}
});

test('discarding a source preview cancels that preview and removes its contents without importing', async () => {
 const listeners=new Map(),calls=[];
 const root={innerHTML:'',classList:{toggle(){}},addEventListener(n,h){listeners.set(n,h);},querySelector(){return null;}};
 const prior={document:globalThis.document,tauri:globalThis.__TAURI__};
 globalThis.document={querySelector:s=>s==='#app'?root:null};
 globalThis.__TAURI__={core:{invoke:async(_,{operation,input})=>{
  calls.push({operation,input});
  if(operation==='workspace.get')return{id:'w1',name:'Synthetic'};
  if(operation==='records.list')return{items:input.entity==='profile'?[{id:'profile'}]:[],count:0};
  if(operation==='records.get')return{id:'profile',fields:{Currency:'USD'}};
  if(operation==='sources.status')return{provider:input.provider,state:'connected',connectedAccountId:'account-1'};
  if(operation==='sources.preview')return{previewId:'discard-me',revision:'r1',records:[{entity:'interactions',title:'Synthetic discarded source text'}],newCount:1,existingCount:0,scannedCount:1,selectedCount:1,coverage:'complete'};
  if(operation==='imports.cancel')return{previewId:'discard-me',jobId:'discard-me',state:'cancelled',createdCount:0,existingCount:0,failedCount:0};
  return {};
 }}};
 const settle=()=>new Promise(r=>setImmediate(r));const click=dataset=>listeners.get('click')({target:{closest:()=>({dataset})}});
 try{
  await import(`./app.mjs?source-discard=${Date.now()}`);await settle();click({page:'settings'});await settle();
  click({sourcePreview:'gmail'});await settle();assert.match(root.innerHTML,/Synthetic discarded source text/);
  click({sourceImportCancel:'gmail'});await settle();
  assert.deepEqual(calls.filter(c=>c.operation==='imports.cancel').at(-1).input,{workspaceId:'w1',previewId:'discard-me'});
  assert.doesNotMatch(root.innerHTML,/Synthetic discarded source text|data-source-commit="gmail"/);
  assert.match(root.innerHTML,/Import stopped/);
  assert.equal(calls.filter(c=>['connections.import','imports.commit','records.save'].includes(c.operation)).length,0);
 }finally{globalThis.document=prior.document;globalThis.__TAURI__=prior.tauri;}
});

test('restored agent import stays visibly in progress and can be stopped from Sources', async () => {
 const listeners=new Map(),calls=[];
 const root={innerHTML:'',classList:{toggle(){}},addEventListener(n,h){listeners.set(n,h);},querySelector(){return null;}};
 const prior={document:globalThis.document,tauri:globalThis.__TAURI__};
 const receipt={jobId:'agent-job',previewId:'agent-preview',state:'committing',createdCount:1,existingCount:0,failedCount:0,scope:{selection:{}}};
 globalThis.document={querySelector:s=>s==='#app'?root:null};
 globalThis.__TAURI__={core:{invoke:async(_,{operation,input})=>{
  calls.push({operation,input});
  if(operation==='workspace.get')return{id:'w1',name:'Synthetic'};
  if(operation==='records.list')return{items:input.entity==='profile'?[{id:'profile'}]:[],count:0};
  if(operation==='records.get')return{id:'profile',fields:{Currency:'USD'}};
  if(operation==='sources.status')return{provider:input.provider,state:'connected',connectedAccountId:'account-1',...(input.provider==='gmail'?{latestImport:receipt}:{})};
  if(operation==='imports.cancel')return{...receipt,state:'cancelling'};
  if(operation==='imports.status')return{...receipt,state:'cancelled',createdCount:2};
  return {};
 }}};
 const settle=()=>new Promise(r=>setImmediate(r));const click=dataset=>listeners.get('click')({target:{closest:()=>({dataset})}});
 try{
  await import(`./app.mjs?source-agent-active=${Date.now()}`);await settle();click({page:'settings'});await settle();
  assert.match(root.innerHTML,/Import in progress/);
  assert.match(root.innerHTML,/data-source-import-cancel="gmail"/);
  click({sourceImportCancel:'gmail'});await settle();
  assert.deepEqual(calls.filter(c=>c.operation==='imports.cancel').at(-1).input,{workspaceId:'w1',previewId:'agent-preview'});
  assert.match(root.innerHTML,/Stopping import/);
  click({sourceReceipt:'gmail'});await settle();
  assert.match(root.innerHTML,/Import stopped/);assert.match(root.innerHTML,/2 created/);
  assert.equal(calls.filter(c=>['connections.import','imports.commit','records.save'].includes(c.operation)).length,0);
 }finally{globalThis.document=prior.document;globalThis.__TAURI__=prior.tauri;}
});

test('an unresolved source session blocks cached connect, verify and import controls while status remains available', async () => {
 const listeners=new Map(),calls=[];
 const root={innerHTML:'',classList:{toggle(){}},addEventListener(n,h){listeners.set(n,h);},querySelector(){return null;}};
 const prior={document:globalThis.document,tauri:globalThis.__TAURI__};
 let detail='session_lock_unverified', sourceState='connected';
 globalThis.document={querySelector:s=>s==='#app'?root:null};
 globalThis.__TAURI__={core:{invoke:async(_,{operation,input})=>{
  calls.push({operation,input});
  if(operation==='workspace.get')return{id:'w1',name:'Synthetic'};
  if(operation==='records.list')return{items:input.entity==='profile'?[{id:'profile'}]:[],count:0};
  if(operation==='records.get')return{id:'profile',fields:{Currency:'USD'}};
  if(operation==='sources.status')return{provider:input.provider,state:sourceState,detail,connectedAccountId:'cached-account',reconnectable:true,url:'https://connect.composio.dev/synthetic',expiresAt:'2030-01-01T00:00:00Z'};
  return {};
 }}};
 const settle=()=>new Promise(r=>setImmediate(r));const click=dataset=>listeners.get('click')({target:{closest:()=>({dataset})}});
 try{
  await import(`./app.mjs?source-session-guard=${Date.now()}`);await settle();
  for(const code of ['session_lock_unverified','session_busy'])for(const cached of ['connected','attention','pending']){
   detail=code;sourceState=cached;click({page:'settings'});await settle();
   assert.match(root.innerHTML,/data-source-refresh="gmail"/);
   assert.doesNotMatch(root.innerHTML,/data-source-preview=|data-source-commit=|data-source-begin=|data-source-reconcile=|data-open-consent=|data-sign-in="1"/);
   assert.doesNotMatch(root.innerHTML,/session_lock_unverified|session_busy/);
   click({sourcePreview:'gmail'});await settle();
   click({sourceBegin:'gmail'});await settle();
   click({sourceReconcile:'gmail'});await settle();
   click({openConsent:'gmail'});await settle();
   click({signIn:'1'});await settle();
  }
  assert.equal(calls.filter(c=>['sources.preview','imports.commit','connections.begin','connections.reconcile','connections.openConsent','auth.login'].includes(c.operation)).length,0);
 }finally{globalThis.document=prior.document;globalThis.__TAURI__=prior.tauri;}
});
