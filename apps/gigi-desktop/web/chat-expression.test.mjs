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
