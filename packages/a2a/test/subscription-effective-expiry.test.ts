import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import {effectiveSubscriptionStatus} from '../src/subscription-status';
import {fixture} from './auth-expiry-fixture';

test('public subscription API derives expiry without cron or stored-state mutation',async()=>{
 const f=await fixture();try{
  const a=(await f.value('/api/v1/agents',f.alice,'POST',{name:'A'})).agent;
  const now=Date.now();
  for(const [id,status,expiry] of [['past','active',now-100],['future','active',now+60000],['revoked','revoked',now+60000],['invalid','active','malformed']] as const)
   f.storage.sqlite.prepare("INSERT INTO subscriptions(id,owner_subject,agent_id,event_name,callback_url,secret_ciphertext,status,created_at,expires_at,verified_at) VALUES(?,'alice',?,'inbox.message.created','https://fixture.example/callback','fixture',?,?,?,1)").run(id,a.id,status,now,expiry);
  const rows=(await f.value(`/api/v1/subscriptions?agentId=${a.id}`,f.alice)).subscriptions;
  assert.equal(rows.find((s:any)=>s.id==='past').status,'expired');assert.equal(rows.find((s:any)=>s.id==='future').status,'active');assert.equal(rows.find((s:any)=>s.id==='revoked').status,'revoked');assert.equal(rows.find((s:any)=>s.id==='invalid').status,'unknown');
  assert.equal(f.storage.sqlite.prepare("SELECT status FROM subscriptions WHERE id='past'").get()!.status,'active');assert.equal(f.jobs.length,0);
 }finally{f.storage.close();}
});

test('actual connection ledger computes expiry and preserves revoked/paused precedence',async()=>{
 const {effectiveSubscriptionStatus}=await import('../src/subscription-status');
 const now=10000;
 for(const [status,expiresAt,want] of [['active',now-1,'expired'],['active',now,'expired'],['active',now+1,'active'],['revoked',now-1,'revoked'],['paused',now-1,'paused'],['active',null,'unknown'],['active','bad','unknown'],['active',0,'expired'],['active',Infinity,'unknown']] as const)
  assert.equal(effectiveSubscriptionStatus({status,expiresAt},now),want);
 const source=readFileSync(new URL('../web/app.ts',import.meta.url),'utf8');
 const render=source.slice(source.indexOf('function renderConnect()'),source.indexOf('function renderGrants()'));
 const tags:string[]=[];const node=()=>({dataset:{},append(){},replaceChildren(){},textContent:''});
 vm.runInNewContext(render+'\nrenderConnect();',{state:{agentId:'a',agents:[{id:'a',paused:false}],failedSections:new Set(),subscriptions:[{id:'past',status:'active',expiresAt:1},{id:'revoked',status:'revoked',expiresAt:1}]},selectedAgent:()=>({paused:false}),effectiveSubscriptionStatus,$:node,el:node,instructions:()=>'',date:()=>'',statusTag:(s:string)=>{tags.push(s);return node();},table:()=>({node:node(),body:node()}),actionButton:node});
 assert.deepEqual(tags,['expired','revoked']);
});

test('deadline and foreground update only badges, preserving conversation focus and composer',()=>{
 const source=readFileSync(new URL('../web/app.ts',import.meta.url),'utf8');
 const start=source.indexOf('function refreshSubscriptionDeadlines()');
 let now=1000,callback:(()=>void)|undefined,delay=0;
 const summary={dataset:{} as Record<string,string>,textContent:'',className:''},ledger={dataset:{subscriptionId:'s',tone:'success'},textContent:'',className:''};
 const focused={id:'thread-button'},composer={value:'unsent draft'},details={open:true};
 const context={state:{failedSections:new Set(),subscriptions:[{id:'s',status:'active',expiresAt:2000}]},subscriptionDeadline:undefined,Date:{now:()=>now},effectiveSubscriptionStatus:(sub:any)=>effectiveSubscriptionStatus(sub,now),selectedAgent:()=>({paused:false}),statusTag:(s:string,p='')=>({textContent:p+s,className:s,dataset:{tone:s==='active'?'success':'warning'}}),renderInbox:()=>assert.fail('must preserve conversation DOM'),renderConnect:()=>assert.fail('must preserve controls'),clearTimeout:()=>{},setTimeout:(fn:()=>void,ms:number)=>{callback=fn;delay=ms;return 1;},window:{addEventListener:(event:string,fn:()=>void)=>{if(event==='focus')context.focus=fn;}},document:{activeElement:focused,composer,details,querySelector:()=>summary,querySelectorAll:()=>[ledger],visibilityState:'visible',addEventListener:(event:string,fn:()=>void)=>{if(event==='visibilitychange')context.visible=fn;}},focus:()=>{},visible:()=>{}};
 vm.runInNewContext(ts.transpileModule(source.slice(start)+'\nrefreshSubscriptionDeadlines();',{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,context);
 assert.equal(delay,1000);assert.equal(ledger.textContent,'active');now=2000;callback!();assert.equal(ledger.textContent,'expired');assert.equal(ledger.dataset.tone,'warning');context.focus();context.visible();
 assert.equal(context.document.activeElement,focused);assert.equal(context.document.composer.value,'unsent draft');assert.equal(context.document.details.open,true);
});
