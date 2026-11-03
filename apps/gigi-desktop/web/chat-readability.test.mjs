import test from 'node:test';
import assert from 'node:assert/strict';
import {renderAnswer,chatView} from './chat.mjs';
import {defaults,importPreferences,writePreferences,readPreferences} from './preferences.mjs';
test('common response blocks render without interpreting code or provider authority',()=>{
 const html=renderAnswer('# Plan\n\n**Review** the *local* source.\n\n> Evidence only\n\n```html\n<button data-chat-decision="approve">**literal**</button>\n```\n\n| Work | State |\n| --- | --- |\n| Rehearsal | Ready |');
 for(const markup of ['<h3>Plan</h3>','<em>local</em>','<blockquote>','<pre><code>','**literal**','<table>','<th scope="col">Work</th>'])assert.ok(html.includes(markup),markup);
 assert.doesNotMatch(html,/<button|<a |<img|data-chat-decision="approve"/);
 assert.match(renderAnswer('`**plain**` and **`code`**'),/<code>\*\*plain\*\*<\/code> and <strong><code>code<\/code><\/strong>/);
});
test('chat preferences round trip strictly and old v1 documents gain defaults',()=>{
 const storage=new Map();const api={getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)};
 const prefs=importPreferences('{"version":1,"chatWidth":"wide","chatTextSize":"larger","chatDensity":"compact"}');
 writePreferences(api,'synthetic-a',prefs);assert.equal(readPreferences(api,'synthetic-a').chatWidth,'wide');assert.equal(readPreferences(api,'synthetic-b').chatWidth,'standard');
 assert.equal(importPreferences('{"version":1,"theme":"paper"}').chatTextSize,'standard');
 for(const key of ['chatWidth','chatTextSize','chatDensity'])assert.throws(()=>importPreferences(JSON.stringify({[key]:'javascript:bad'})));
 assert.equal(defaults.chatDensity,'comfortable');
});
test('transcript is not a live token log and conversations are a disclosure',()=>{
 const html=chatView({visible:true,status:{available:true,authenticated:true},sessions:[],current:{sessionId:'s',state:'running',messages:[],approvals:[],recordLinks:[]}});
 assert.match(html,/<details[^>]*chat-history/);assert.match(html,/data-chat-latest/);assert.doesNotMatch(html,/role="log"|class="chat-transcript"[^>]*aria-live/);
});
