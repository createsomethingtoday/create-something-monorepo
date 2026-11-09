import test from 'node:test';
import assert from 'node:assert/strict';
import { AssistantSetup, assistantSetupView, ASSISTANT_FIRST_PROMPT } from './setup-assistant.mjs';

const receipt = (id='w') => ({provider:'codex',available:true,authenticated:true,toolsAvailable:true,workspaceVerified:true,workspace:{id,name:'Tour crew'},checkedAt:Date.now()});

test('assistant setup refresh verifies exact workspace and never starts a provider turn', async () => {
  const calls=[];
  const c=new AssistantSetup({chatStatus:async id=>{calls.push(id);return receipt(id);}},'w');
  await c.refresh();
  assert.deepEqual(calls,['w']); assert.equal(c.workspaceVerified,true);
  const html=assistantSetupView(c);
  assert.match(html,/Workspace access checked/);
  assert.match(html,/Tour crew/);
  assert.match(html,/data-assistant-action="ask"/);
  assert.doesNotMatch(html,/First answer verified|Phone connected/);
  assert.match(ASSISTANT_FIRST_PROMPT,/Do not change any records/);
});

test('assistant setup fails closed on malformed or old readiness and refresh failure clears earlier verification', async () => {
  for(const value of [{available:true,authenticated:true},receipt('foreign'),{...receipt(),checkedAt:0},{...receipt(),workspace:{id:'w',name:''}}]){
    const c=new AssistantSetup({chatStatus:async()=>value},'w');await c.refresh();assert.equal(c.workspaceVerified,false);
  }
  let fail=false;
  const c=new AssistantSetup({chatStatus:async()=>{if(fail)throw Error('secret provider response');return receipt();}},'w');
  await c.refresh();fail=true;await c.refresh();
  assert.equal(c.workspaceVerified,false);assert.equal(c.status,null);
  assert.match(c.error,/could not check/i);assert.doesNotMatch(c.error,/secret/);
});

test('assistant setup ignores a late status after workspace change or disposal', async () => {
  let finish; const c=new AssistantSetup({chatStatus:()=>new Promise(resolve=>{finish=resolve;})},'w');
  const pending=c.refresh();await Promise.resolve();c.setWorkspace('other');finish(receipt());await pending;
  assert.equal(c.status,null);assert.equal(c.workspaceId,'other');assert.equal(c.busy,false);
  const next=c.refresh();await Promise.resolve();c.dispose();finish(receipt('other'));await next;assert.equal(c.status,null);
});

test('external preparation remains explicit and never claims installation or workspace verification', async () => {
  let calls=0;const c=new AssistantSetup({prepareAgent:async()=>{calls++;return {state:'prepared',installed:false,codexCommand:'exact codex',claudeCommand:'exact claude',starterPrompt:'Read only'};}},'w');
  assert.equal(calls,0);await c.prepareExternal('claude');
  assert.equal(calls,1);assert.equal(c.provider,'claude');assert.equal(c.external.installed,false);assert.equal(c.workspaceVerified,false);
  assert.match(assistantSetupView(c),/Prepared.*Not verified/);
  assert.match(assistantSetupView(c),/exact claude/);
});

test('managed sign-in is explicit, uses its exact job id and rechecks workspace after completion', async () => {
  const calls=[];const bridge={call:async(op,input)=>{calls.push({op,input});if(op==='agent.chat.login.start')return {state:'pending',loginId:'login-1'};if(op==='agent.chat.login.read')return {state:'completed',loginId:'login-1',authenticated:true};if(op==='agent.chat.login.open')return {opened:true};},chatStatus:async()=>receipt()};
  const c=new AssistantSetup(bridge,'w');assert.equal(calls.length,0);await c.startLogin();
  assert.equal(c.login.state,'pending');assert.equal(c.workspaceVerified,false);
  assert.equal(calls[1].op,'agent.chat.login.open');
  await c.readLogin();assert.equal(c.workspaceVerified,true);
  assert.deepEqual(calls.find(x=>x.op==='agent.chat.login.read').input,{workspaceId:'w',loginId:'login-1'});
});

test('cancel preserves uncertain login outcome and never treats it as signed out', async () => {
  const c=new AssistantSetup({call:async(op)=>op==='agent.chat.login.start'?{state:'pending',loginId:'login-1'}:op==='agent.chat.login.open'?{opened:true}:Promise.reject(Error('offline'))},'w');
  await c.startLogin();await c.cancelLogin();
  assert.equal(c.login.state,'pending');assert.match(c.error,/Check sign-in status/);assert.equal(c.workspaceVerified,false);assert.equal(c.pollTimer,null);
});

test('refresh resumes a pending workspace sign-in through read-only polling without reopening its browser', async () => {
  const calls=[];const c=new AssistantSetup({chatStatus:async()=>({...receipt(),authenticated:false,workspaceVerified:false}),call:async(op,input)=>{calls.push({op,input});return {state:'pending',loginId:'existing',expiresAt:Date.now()+600_000};}},'w');
  await c.refresh();assert.equal(c.login.loginId,'existing');
  assert.deepEqual(calls,[{op:'agent.chat.login.read',input:{workspaceId:'w'}}]);
  c.dispose();assert.equal(c.pollTimer,null);
});

test('missing GiGi tools never sends a signed-in user to reinstall Codex', async()=>{
  const c=new AssistantSetup({chatStatus:async()=>({provider:'codex',available:false,authenticated:true,toolsAvailable:false,workspaceVerified:false,reason:'gigi_tools_unavailable',checkedAt:Date.now()})},'w');
  await c.refresh();assert.match(assistantSetupView(c),/workspace tools are unavailable/);assert.doesNotMatch(assistantSetupView(c),/Install the Codex CLI/);
});
