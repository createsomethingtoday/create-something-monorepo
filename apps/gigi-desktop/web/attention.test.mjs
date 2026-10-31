import test from 'node:test';
import assert from 'node:assert/strict';
import { AttentionController } from './attention.mjs';
import { attentionView, attentionSettingsView } from './attention-view.mjs';

const item = {id:'a1', revision:'r1',kind:'task_due',title:'Call <venue>',body:'Due today',entity:'tasks',recordId:'t1',unread:true,createdAt:1};
function fixture(options={}) {
 const calls=[]; const timers=[];
 const bridge={call:async(op,input)=>{calls.push([op,input]);if(op==='attention.claimDelivery') return {item:null};if(op==='attention.settings') return {settings:{enabled:input.patch.enabled,reminders:input.patch.reminders,detailedPreviews:false,quietStart:22,quietEnd:8}};return {items:[item],unreadCount:1,settings:{enabled:false,reminders:false,detailedPreviews:false,quietStart:22,quietEnd:8}};},chatList:async()=>({sessions:[]}),chatRead:async()=>{},chatPoll:async()=>{}};
 const controller=new AttentionController(bridge,'w1',{changed:()=>{},schedule:fn=>{timers.push(fn);return timers.length;},clear:()=>{},now:()=>new Date('2026-10-30T15:00:00Z'),...options});
 return {controller,bridge,calls,timers};
}

test('attention loads persisted source-linked items and revalidates before navigation',async()=>{
 let opened;const {controller,calls}=fixture({onOpen:x=>{opened=x;}});
 await controller.refresh(); assert.equal(controller.unreadCount,1);
 await controller.open('a1','review');assert.equal(opened.recordId,'t1');
 assert(calls.some(([op,x])=>op==='attention.update'&&x.id==='a1'&&x.expectedRevision==='r1'&&x.action==='read'));
 const html=attentionView(controller);assert.match(html,/Needs your attention/);assert.match(html,/Call &lt;venue&gt;/);assert.doesNotMatch(html,/<venue>/);assert.match(html,/data-attention-open="a1"/);
});

test('closed drawer observer reads existing sessions without starting or approving work',async()=>{
 const {controller,bridge,calls}=fixture({getChat:()=>({visible:false})});let state='running';let polls=0;
 bridge.chatList=async()=>({sessions:[{sessionId:'s1',state,title:'Venue'}]});
 bridge.chatRead=async()=>({sessionId:'s1',state:'running',approvals:[],recordLinks:[]});
 bridge.chatPoll=async()=>{polls++;return {sessionId:'s1',state:'approval',approvals:[{id:'p1'}],recordLinks:[]};};
 await controller.refresh();assert.equal(polls,1);
 const snapshot=calls.find(([op,x])=>op==='attention.refresh'&&x.sessions?.length)?.[1];assert.equal(snapshot.sessions[0].state,'approval');
 assert(!calls.some(([op])=>/start|send|approve/.test(op)));
});

test('observer does not compete with an open drawer and refresh is single flight',async()=>{
 const current={sessionId:'s1',state:'approval',approvals:[{id:'p1'}],recordLinks:[]};
 const {controller,bridge}=fixture({getChat:()=>({visible:true,current,pending:false,reading:false})});
 let reads=0,release;bridge.chatList=async()=>({sessions:[{sessionId:'s1',state:'approval'}]});bridge.chatRead=async()=>{reads++;};
 const call=bridge.call;bridge.call=async(op,x)=>{if(op==='attention.refresh') await new Promise(r=>{release=r;});return call(op,x);};
 const first=controller.refresh(); await new Promise(r=>setImmediate(r));const duplicate=controller.refresh();release();await Promise.all([first,duplicate]);assert.equal(reads,0);
});

test('a stale or removed item never navigates and notification delivery is foreground-aware',async()=>{
 let opened=0,delivered=0;const {controller,bridge}=fixture({onOpen:()=>opened++,onDelivery:()=>delivered++,isForeground:()=>true});
 await controller.refresh();bridge.call=async()=>({items:[],unreadCount:0,settings:{enabled:true}});
 await controller.open('a1');assert.equal(opened,0);assert.equal(delivered,2,'native reconciliation owns foreground suppression');
});

test('settings are explicit and do not request native permission on load',async()=>{
 const {controller,calls}=fixture();await controller.refresh();assert(!calls.some(([op])=>op==='attention.settings'));
 await controller.saveSettings({enabled:true,reminders:true,detailedPreviews:false,quietStart:22,quietEnd:8});
 assert(calls.some(([op,x])=>op==='attention.settings'&&x.patch.enabled===true));
 assert.match(attentionSettingsView(controller),/id="attention-settings"/);assert.match(attentionSettingsView(controller),/quietStart/);assert.match(attentionSettingsView(controller),/while GiGi is running/);
});


test('desktop delivery delegates permission and durable claiming to native code',async()=>{
 let callsToNative=0;const {controller,calls}=fixture({isForeground:()=>false,onDelivery:async(...args)=>{callsToNative++;assert.deepEqual(args,[]);return {status:'submitted'};}});
 controller.settings.enabled=true;await controller.deliver();assert.equal(callsToNative,1);
 assert(!calls.some(([op])=>op==='attention.claimDelivery'||op==='attention.recordDelivery'));
});

test('unchanged background snapshots do not repaint the workspace',async()=>{
 let changes=0;const {controller}=fixture({changed:()=>changes++});await controller.refresh();const initial=changes;await controller.refresh();assert.equal(changes,initial);
});


test('a save finishing while hidden still enters the workspace attention snapshot',async()=>{
 const current={sessionId:'s1',state:'idle',decisionReceipt:{approvalId:'a1',outcome:'verified'},recordLinks:[]};
 const {controller,bridge,calls}=fixture({getChat:()=>({visible:false,current,pending:false,reading:false})});bridge.chatList=async()=>({sessions:[{sessionId:'s1',state:'idle'}]});
 await controller.refresh();const snapshot=calls.find(([op])=>op==='attention.refresh')[1];assert.equal(snapshot.sessions[0].decisionReceipt.outcome,'verified');
});

test('bounded observation rotates through unseen sessions without invalid approval placeholders',async()=>{
 const {controller,bridge,calls}=fixture();const sessions=Array.from({length:120},(_,i)=>({sessionId:'s'+i,state:i<12?'approval':'idle'}));
 bridge.chatList=async()=>({sessions});
 bridge.chatRead=async(_wid,id)=>({sessionId:id,state:Number(id.slice(1))<12?'approval':'idle',approvals:[{id:'a'+id}],decisionReceipt:{outcome:'verified',approvalId:'r'+id}});
 await controller.refresh();await controller.refresh();
 const snapshots=calls.filter(([op])=>op==='attention.refresh').map(([,input])=>input.sessions);
 assert(snapshots.every(items=>items.length<=100 && items.every(x=>x.state!=='approval'||x.approvals?.length)));
 assert(snapshots.flat().some(x=>x.sessionId==='s12'&&x.decisionReceipt?.outcome==='verified'),'a completion first seen after restart must eventually be read');
});

test('native stale-alert reconciliation runs when disabled and foreground',async()=>{
 let reconciled=0;const {controller}=fixture({isForeground:()=>true,onDelivery:()=>{reconciled++;return {submitted:false,reason:'foreground'};}});
 controller.settings.enabled=false;await controller.deliver();assert.equal(reconciled,1);
});

test('workspace observer resumes a visible conversation after drawer polling pauses',async()=>{
 let accepted;const active={visible:true,pending:false,reading:false,observationPaused:true,current:{sessionId:'long',state:'running'},accept:value=>{accepted=value;}};
 const {controller,bridge}=fixture({getChat:()=>active});bridge.chatList=async()=>({sessions:[{sessionId:'long',state:'running'}]});bridge.chatPoll=async()=>({sessionId:'long',state:'approval',approvals:[{id:'a1'}]});
 await controller.refresh();assert.equal(accepted?.state,'approval');
});
