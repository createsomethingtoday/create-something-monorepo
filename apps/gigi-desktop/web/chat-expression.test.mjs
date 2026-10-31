import test from 'node:test';
import assert from 'node:assert/strict';
import { chatView, renderAnswer, chatState } from './chat.mjs';
const chat={visible:true,status:{available:true,authenticated:true},record:{entity:'gigs',id:'g1',title:'Rehearsal'},sessions:[],draft:'',current:{sessionId:'s1',state:'idle',messages:[],recordLinks:[],approvals:[]}};
test('safe answers have readable paragraphs, lists and emphasis without executable markup',()=>{
 const html=renderAnswer('**Next step**\n\n- Call the venue\n- <img src=x onerror=alert(1)>\n\n[unsafe](javascript:alert(1))');
 assert.match(html,/<strong>Next step<\/strong>/);assert.match(html,/<ul>/);assert.match(html,/&lt;img/);assert.doesNotMatch(html,/<img|href=|onclick=/);
});
test('contextual suggestions are drafts rather than automatic work',()=>{
 const html=chatView(chat);assert.match(html,/data-chat-prompt=/);assert.match(html,/Summarize this record/);assert.match(html,/Nothing is sent until you choose Send/);
});
test('observed state never mistakes model reply for verified work',()=>{
 assert.equal(chatState(chat).label,'Ready to help');
 assert.equal(chatState({...chat,current:{...chat.current,state:'approval'}}).label,'Waiting for your review');
 assert.equal(chatState({...chat,current:{...chat.current,state:'idle',decisionReceipt:{outcome:'verified'}}}).label,'Result checked');
 assert.equal(chatState({...chat,current:{...chat.current,state:'idle',decisionReceipt:{outcome:'unknown'}}}).label,'Outcome needs checking');
});

test('answer hierarchy supports bounded headings and numbered steps without exposing HTML',()=>{
 const html=renderAnswer('### A useful plan\n\n1. Review **the rehearsal**\n2. Confirm `<script>`\n\n## <img src=x>');
 assert.match(html,/<h3>A useful plan<\/h3>/);assert.match(html,/<ol><li>Review <strong>the rehearsal<\/strong><\/li><li>Confirm <code>&lt;script&gt;<\/code><\/li><\/ol>/);assert.match(html,/<h3>&lt;img src=x&gt;<\/h3>/);assert.doesNotMatch(html,/<img|<script/);
 assert.match(renderAnswer('#### Leave unsupported syntax plain'),/^<p>####/);
});

test('conversation list reflects the latest observed terminal state',async()=>{
 const {ChatController}=await import('./chat.mjs');const controller=new ChatController({},'w1',()=>{},()=>{});
 controller.current={sessionId:'s1',state:'approval',messages:[]};controller.sessions=[{sessionId:'s1',state:'approval'}];
 controller.accept({sessionId:'s1',state:'idle',messages:[],approvals:[],recordLinks:[]});assert.equal(controller.sessions[0].state,'idle');
});
