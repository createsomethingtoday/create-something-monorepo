import test from 'node:test';
import assert from 'node:assert/strict';
import { AiConnection, aiConnectionView, connectionError } from './ai-connection.mjs';
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
 await c.action('models');await c.action('ask');assert.deepEqual(calls.at(-1),['ai.connection.ask',{model:'allowed',text:'synthetic question'}]);assert.equal(c.reply,'answer');assert.equal(c.draft,'synthetic question');
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
 const {c,calls}=fixture();c.reply='existing';await c.action('usage');assert.deepEqual(calls,[['ai.connection.usage',undefined]]);assert.equal(c.reply,'existing');
});

test('action-returned revocation warning is immediate and never hidden as success',async()=>{
 const {c}=fixture(()=>({...structuredClone(status),error:'revocation_unconfirmed'}));c.status=structuredClone(status);await c.action('disconnect','a');assert.match(c.error,/Revocation could not be confirmed/);assert.match(aiConnectionView(c),/role="alert"/);
});
test('incomplete sign-in uses reconnect, never attempts unverified disconnect',async()=>{
 const {c,calls}=fixture();c.status={...structuredClone(status),pendingClientIds:['p']};await c.action('connect','p');assert.deepEqual(calls[0],['ai.connection.connect',{clientId:'p'}]);
});
