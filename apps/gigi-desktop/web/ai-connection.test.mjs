import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { AiConnection, aiConnectionView, connectionError, messageBudget, updateAiDraft } from './ai-connection.mjs';
const status={available:true,busy:false,activeClientId:'a',accounts:[{clientId:'a',email:'inez@example.test',connected:true,planEnabled:true}],pendingClientIds:[],error:null};
function fixture(fn=()=>structuredClone(status)){const calls=[];const c=new AiConnection({call:async(op,input)=>{calls.push([op,input]);return fn(op,input);}});return {c,calls};}

test('unavailable status fails closed, source permissions and Codex remain distinct',()=>{
 const view=aiConnectionView();assert.match(view,/data-ai-action="connect" disabled/);assert.match(view,/installed Codex/);assert.match(view,/cannot read records/);assert.match(view,/no automatic API billing fallback/);
});
test('all untrusted account, model, draft and reply content is escaped',()=>{
 const {c}=fixture();c.status=structuredClone(status);c.status.accounts[0].email='<img src=x onerror=alert(1)>';c.models=[{slug:'" onfocus="bad',displayName:'<script>bad</script>'}];c.draft='</textarea><script>bad</script>';c.reply='<img src=x>';
 const view=aiConnectionView(c);assert.doesNotMatch(view,/<script>|<img/);assert.match(view,/&lt;\/textarea&gt;/);assert.match(view,/data-ai-action="usage"/);
});
test('connect/select/disconnect use separate operations without source or Codex changes',async()=>{
 const {c,calls}=fixture();await c.refresh();await c.action('connect');await c.action('select','missing');await c.action('disconnect','a');
 assert.deepEqual(calls.map(x=>x[0]),['ai.connection.status','ai.connection.connect','ai.connection.disconnect']);assert.equal(c.model,'');
});
test('typed text only, model must be catalog member, no implicit source context',async()=>{
 const {c,calls}=fixture(op=>op.endsWith('models')?[{slug:'allowed',displayName:'Allowed'}]:op.endsWith('ask')?{text:'answer'}:structuredClone(status));
 await c.refresh();c.draft='synthetic question';c.model='injected';await c.action('ask');assert.equal(calls.length,1);
 await c.action('models');assert.deepEqual(calls.at(-1),['ai.connection.models',{expectedClientId:'a'}]);await c.action('ask');assert.deepEqual(calls.at(-1),['ai.connection.ask',{expectedClientId:'a',model:'allowed',text:'synthetic question'}]);assert.equal(c.reply,'answer');assert.equal(c.draft,'synthetic question');
});
test('cancel invalidates in-flight output and prevents overlapping action',async()=>{
 let resolve;const {c,calls}=fixture(op=>op.endsWith('ask')?new Promise(r=>resolve=r):structuredClone(status));c.status=structuredClone(status);c.models=[{slug:'m',displayName:'M'}];c.model='m';c.draft='keep';
 const pending=c.action('ask');await c.action('connect');await c.action('cancel');resolve({text:'stale'});await pending;assert.equal(c.reply,'');assert.equal(c.draft,'keep');assert.equal(c.busy,false);assert.deepEqual(calls.map(x=>x[0]),['ai.connection.ask','ai.connection.cancel']);
});
test('unknown provider errors never expose raw values or erase draft',async()=>{
 const {c}=fixture(()=>{throw new Error('secret-token-body');});c.draft='keep';await c.action('connect');assert.equal(c.draft,'keep');assert.doesNotMatch(c.error,/secret/);assert.doesNotMatch(connectionError('credential=secret'),/secret/);
});
test('incomplete sign-in is actionable and plan-disabled account cannot send',()=>{
 const {c}=fixture();c.status={...structuredClone(status),pendingClientIds:['p']};c.status.accounts[0].planEnabled=false;const view=aiConnectionView(c);assert.match(view,/Incomplete sign-in/);assert.match(view,/data-ai-action="connect" data-ai-client="p"/);assert.doesNotMatch(view,/Retry disconnect/);assert.match(view,/plan usage disabled/);assert.doesNotMatch(view,/id="ai-message"/);
});
test('reconnect binds to selected account while ordinary connect stays unbound',async()=>{
 const {c,calls}=fixture();await c.refresh();await c.action('connect','a');assert.deepEqual(calls.at(-1),['ai.connection.connect',{clientId:'a'}]);
});

test('status account change drops prior model and reply while preserving typed draft',async()=>{
 const {c}=fixture(()=>({...structuredClone(status),activeClientId:'b',accounts:[{clientId:'b',connected:true,planEnabled:true}]}));c.status=structuredClone(status);c.model='old';c.models=[{slug:'old',displayName:'Old'}];c.reply='private reply';c.draft='keep';await c.refresh();assert.equal(c.reply,'');assert.equal(c.model,'');assert.equal(c.draft,'keep');
});
test('usage settings are a fixed native operation and preserve existing response',async()=>{
 const {c,calls}=fixture();c.status=structuredClone(status);c.reply='existing';await c.action('usage');assert.deepEqual(calls,[['ai.connection.usage',undefined]]);assert.equal(c.reply,'existing');
});

test('action-returned revocation warning is immediate and never hidden as success',async()=>{
 const {c}=fixture(()=>({...structuredClone(status),error:'revocation_unconfirmed'}));c.status=structuredClone(status);await c.action('disconnect','a');assert.match(c.error,/Revocation could not be confirmed/);assert.match(aiConnectionView(c),/role="alert"/);
});
test('incomplete sign-in uses reconnect, never attempts unverified disconnect',async()=>{
 const {c,calls}=fixture();c.status={...structuredClone(status),pendingClientIds:['p']};await c.action('connect','p');assert.deepEqual(calls[0],['ai.connection.connect',{clientId:'p'}]);
});

test('native usage opens only the verified fixed usage URL with output suppressed',()=>{
 const source=readFileSync(new URL('../src-tauri/src/ai_connection.rs',import.meta.url),'utf8');assert.match(source,/const USAGE_URL: &str = "https:\/\/chatgpt.com\/settings\/usage"/);assert.match(source,/browser\(USAGE_URL\)/);assert.match(source,/stdout\(Stdio::null\(\)\)/);assert.match(source,/stderr\(Stdio::null\(\)\)/);
});

test('disconnect distinguishes local removal and all four remote receipts without claiming invalidation',async()=>{
 const expected={no_refresh_token:'No refresh token was present',not_attempted_unverifiable:'was not attempted',request_succeeded:'request acknowledged',request_failed_or_unverifiable:'failed or could not be verified'};
 for(const [remoteRevocation,message] of Object.entries(expected)){
  const {c}=fixture(()=>({...structuredClone(status),accounts:[],activeClientId:null,disconnectOutcome:{localTokensRemoved:true,remoteRevocation}}));c.status=structuredClone(status);await c.action('disconnect','a');
  assert.match(c.disconnectNotice,/Local account tokens removed/);assert.ok(c.disconnectNotice.includes(message));const view=aiConnectionView(c);assert.match(view,/role="status"/);assert.doesNotMatch(view,/successfully revoked|invalidation confirmed/);
  if(remoteRevocation==='request_succeeded')assert.match(view,/does not prove server-side token invalidation/);
 }
});
test('missing receipt or failed operation never implies local removal or remote success',async()=>{
 for(const failure of [false,true]){
  const {c}=fixture(op=>{if(failure&&op.endsWith('disconnect'))throw new Error('secret provider body');return {...structuredClone(status),accounts:[],activeClientId:null};});c.status=structuredClone(status);await c.action('disconnect','a');assert.match(c.disconnectNotice,/Local token removal is unconfirmed/);assert.match(c.disconnectNotice,/outcome is unknown/);assert.doesNotMatch(c.disconnectNotice,/secret/);if(failure)assert.ok(c.error);
 }
});
test('disconnect error and receipt stay visible together, subsequent status cannot recreate receipt',async()=>{
 const {c}=fixture(()=>({...structuredClone(status),error:'revocation_unconfirmed',disconnectOutcome:{localTokensRemoved:true,remoteRevocation:'request_failed_or_unverifiable'}}));c.status=structuredClone(status);await c.action('disconnect','a');assert.match(c.error,/Revocation could not be confirmed/);assert.match(c.disconnectNotice,/Local account tokens removed/);await c.refresh();assert.equal(c.disconnectNotice,'');assert.match(c.error,/Revocation could not be confirmed/);
});
test('new action clears old receipt and hostile receipt fields cannot enter UI',async()=>{
 const {c}=fixture(()=>({...structuredClone(status),disconnectOutcome:{localTokensRemoved:'true',remoteRevocation:'<script>secret</script>'}}));c.status=structuredClone(status);await c.action('disconnect','a');assert.match(c.disconnectNotice,/unconfirmed/);assert.match(c.disconnectNotice,/unknown/);assert.doesNotMatch(aiConnectionView(c),/<script>|secret/);await c.action('select','a');assert.equal(c.disconnectNotice,'');
});

test('prototype property names are unknown outcomes, not receipt text or error functions',async()=>{
 const {c}=fixture(()=>({...structuredClone(status),disconnectOutcome:{localTokensRemoved:true,remoteRevocation:'constructor'}}));c.status=structuredClone(status);await c.action('disconnect','a');assert.match(c.disconnectNotice,/outcome is unknown/);assert.equal(typeof connectionError('toString'),'string');assert.doesNotMatch(connectionError('toString'),/function/);
});

test('in-flight disconnect ignores cancel and reentry, hides Cancel, and retains actual outcome',async()=>{
 for(const [remoteRevocation,error] of [['request_succeeded',null],['request_failed_or_unverifiable','revocation_unconfirmed']]){
  let resolve;const {c,calls}=fixture(()=>new Promise(r=>{resolve=r;}));c.status=structuredClone(status);
  const pending=c.action('disconnect','a');const epoch=c.epoch;
  assert.equal(c.busy,true);assert.doesNotMatch(aiConnectionView(c),/data-ai-action="cancel"/);
  await c.action('cancel');await c.action('disconnect','a');
  assert.equal(c.epoch,epoch);assert.equal(c.busy,true);assert.deepEqual(calls,[['ai.connection.disconnect',{clientId:'a'}]]);
  resolve({...structuredClone(status),accounts:[],activeClientId:null,error,disconnectOutcome:{localTokensRemoved:true,remoteRevocation}});await pending;
  assert.equal(c.busy,false);assert.equal(c.operation,'');assert.match(c.disconnectNotice,/Local account tokens removed/);
  if(error){assert.match(c.error,/Revocation could not be confirmed/);assert.match(c.disconnectNotice,/failed or could not be verified/);}else{assert.equal(c.error,'');assert.match(c.disconnectNotice,/request acknowledged/);assert.match(c.disconnectNotice,/does not prove/);}
 }
});

test('unknown native busy after remount cannot cancel and read-only status can observe completion',async()=>{
 let completed=false;const {c,calls}=fixture(()=>({...structuredClone(status),busy:!completed}));
 await c.refresh();assert.equal(c.busy,false);assert.equal(c.operation,'');assert.equal(c.status.busy,true);
 const view=aiConnectionView(c);assert.doesNotMatch(view,/data-ai-action="cancel"/);assert.match(view,/data-ai-action="refresh">Check status/);
 const epoch=c.epoch;await c.action('cancel');assert.equal(c.epoch,epoch);assert.deepEqual(calls.map(x=>x[0]),['ai.connection.status']);
 completed=true;await c.action('refresh');assert.equal(c.status.busy,false);assert.deepEqual(calls.map(x=>x[0]),['ai.connection.status','ai.connection.status']);
});

test('UTF-8 byte boundaries reject oversized drafts before IPC and preserve their text',async()=>{
 for(const [unit,under,over] of [['a',65536,65537],['界',21845,21846],['😀',16384,16385]]){
  const {c,calls}=fixture(()=>({text:'answer'}));c.status=structuredClone(status);c.models=[{slug:'m',displayName:'M'}];c.model='m';c.draft=unit.repeat(under);
  assert.doesNotMatch(aiConnectionView(c),/data-ai-action="ask" disabled/);await c.action('ask');assert.equal(calls.length,1);assert.equal(calls[0][1].text,unit.repeat(under));
  c.draft=unit.repeat(over);await c.action('ask');assert.equal(calls.length,1);assert.equal(c.draft,unit.repeat(over));assert.match(c.error,/Shorten/);const view=aiConnectionView(c);assert.match(view,/data-ai-action="ask" disabled/);assert.match(view,/Shorten it before sending/);
 }
});

test('actual draft input helper updates Send, UTF-8 help and accessibility without rerendering',()=>{
 let renders=0;const c=new AiConnection({},()=>renders++);c.model='m';const send={},help={},error={},attrs={};const input={setAttribute:(key,value)=>attrs[key]=value};const root={querySelector:q=>({'[data-ai-action="ask"]':send,'#ai-message-budget':help,'#ai-message':input,'#ai-connection-error':error}[q])};
 updateAiDraft(c,'界'.repeat(21846),root);assert.equal(send.disabled,true);assert.match(help.textContent,/Shorten/);assert.equal(attrs['aria-invalid'],'true');assert.equal(c.draft,'界'.repeat(21846));
 c.error=help.textContent;updateAiDraft(c,'😀'.repeat(16384),root);assert.equal(send.disabled,false);assert.equal(attrs['aria-invalid'],'false');assert.doesNotMatch(help.textContent,/Shorten/);assert.equal(c.error,'');assert.equal(error.hidden,true);assert.equal(renders,0);
 c.error='Other connection problem';updateAiDraft(c,'ok',root);assert.equal(c.error,'Other connection problem');assert.equal(messageBudget('😀'.repeat(16384)).bytes,65536);
});

test('cleared active selection retains explicit reconnect for an expired existing registration',async()=>{
 const clientId='existing-registration';const disconnected={...structuredClone(status),activeClientId:null,accounts:[{clientId,email:'inez@example.test',connected:false,planEnabled:false}]};
 const {c,calls}=fixture(()=>structuredClone(disconnected));await c.refresh();
 assert.equal(c.status.activeClientId,null);assert.deepEqual(calls,[['ai.connection.status',undefined]]);
 const view=aiConnectionView(c);const reconnect=view.match(/<button[^>]*data-ai-action="connect" data-ai-client="existing-registration"[^>]*>Reconnect<\/button>/)?.[0];
 assert.ok(reconnect);assert.doesNotMatch(reconnect,/disabled/);assert.match(view,/Disconnected\./);assert.doesNotMatch(view,/id="ai-message"/);
 await c.action('connect',clientId);assert.deepEqual(calls,[['ai.connection.status',undefined],['ai.connection.connect',{clientId}]]);
});

test('late cancelled-connect cleanup warning survives refresh and later actions without stale state',async()=>{
 let rejectConnect;const disconnected={...structuredClone(status),activeClientId:null,accounts:[]};
 const {c}=fixture(op=>op==='ai.connection.connect'?new Promise((_,reject)=>{rejectConnect=reject;}):structuredClone(disconnected));c.status=structuredClone(disconnected);c.draft='keep';
 const pending=c.action('connect');await c.action('cancel');rejectConnect(new Error('cancelled_revocation_unconfirmed'));await pending;
 assert.match(c.safetyWarning,/remote access is unconfirmed/);assert.match(aiConnectionView(c),/ai-connection-safety-warning/);assert.deepEqual(c.status,disconnected);assert.deepEqual(c.models,[]);assert.equal(c.reply,'');assert.equal(c.draft,'keep');
 const warning=c.safetyWarning;await c.refresh();await c.action('usage');assert.equal(c.safetyWarning,warning);assert.equal(c.cancelledConnectEpochs.size,0);assert.equal(c.operationEpoch,null);
});
test('ordinary late cancelled-connect errors stay ignored and repeated cancel markers are cleaned',async()=>{
 let rejectConnect;const disconnected={...structuredClone(status),activeClientId:null,accounts:[]};
 const {c}=fixture(op=>op==='ai.connection.connect'?new Promise((_,reject)=>{rejectConnect=reject;}):structuredClone(disconnected));c.status=structuredClone(disconnected);
 const pending=c.action('connect');await c.action('cancel');await c.action('cancel');rejectConnect(new Error('network_unavailable'));await pending;
 assert.equal(c.safetyWarning,'');assert.equal(c.error,'');assert.deepEqual(c.status,disconnected);assert.equal(c.cancelledConnectEpochs.size,0);assert.equal(c.operationEpoch,null);
});

test('models and ask bind selected account before provider work and refresh on external change',async()=>{
 for(const action of ['models','ask']){
  let provider=0;const next={...structuredClone(status),activeClientId:'b',accounts:[{clientId:'b',connected:true,planEnabled:true}]};
  const {c,calls}=fixture((op,input)=>{if(op.endsWith('status'))return next;if(op.endsWith(action)){assert.equal(input.expectedClientId,'a');if(input.expectedClientId!==next.activeClientId)throw 'account_changed';provider++;}return [];});c.status=structuredClone(status);c.models=[{slug:'m',displayName:'M'}];c.model='m';c.draft='keep draft';c.reply='old';await c.action(action);assert.equal(provider,0);assert.equal(c.status.activeClientId,'b');assert.equal(c.reply,'');assert.equal(c.model,'');assert.equal(c.draft,'keep draft');assert.match(c.error,/selected account changed/);assert.equal(calls.filter(([op])=>op.endsWith(action)).length,1);
 }
});
test('unselected account cannot request models or ask; usage updates current identity',async()=>{
 const {c,calls}=fixture(()=>({...structuredClone(status),activeClientId:'b',accounts:[{clientId:'b',connected:true,planEnabled:true}]}));c.status={...structuredClone(status),activeClientId:null};c.models=[{slug:'m',displayName:'M'}];c.model='m';c.draft='keep';await c.action('models');await c.action('ask');assert.deepEqual(calls,[]);c.status=structuredClone(status);c.reply='old';await c.action('usage');assert.equal(c.status.activeClientId,'b');assert.equal(c.reply,'');assert.equal(c.draft,'keep');
});
