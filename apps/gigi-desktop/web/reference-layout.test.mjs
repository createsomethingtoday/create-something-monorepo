import {test} from 'node:test';
import assert from 'node:assert/strict';
import {sections} from './model.mjs';
import {referenceHeader,referenceCards,createWorkspaceHistory} from './reference-layout.mjs';
test('reference shell retains every destination and labels its real search scope',()=>{
 const history=createWorkspaceHistory(); const html=referenceHeader({page:'social',sections,workspace:'<private>',history});
 for(const section of sections) assert.ok(html.includes(`data-page="${section.id}"`),section.id);
 assert.match(html,/Find people/); assert.doesNotMatch(html,/Search GiGi/); assert.match(html,/&lt;private&gt;/);
 assert.match(html,/class="selected"/); assert.match(html,/data-workspace-history="-1"[^>]*disabled/);
});
test('workspace history preserves forward destinations and truncates only on new navigation',()=>{
 const h=createWorkspaceHistory();h.visit('contacts');h.visit('music');
 assert.deepEqual(h.target(-1),{page:'contacts',index:1});h.visit('contacts',1);
 assert.deepEqual(h.target(1),{page:'music',index:2});h.visit('tasks');assert.equal(h.target(1),null);
 assert.deepEqual(h.target(-1),{page:'contacts',index:1});
});
test('Today cards preserve identifiers, escape stored text and never fabricate a decision',()=>{
 const html=referenceCards('tasks',[{id:'a"b',title:'<Plan>',date:null}],{status:()=>'',date:x=>x,money:()=>''});
 assert.match(html,/data-open="a&quot;b"/);assert.match(html,/&lt;Plan&gt;/);assert.match(html,/Saved task/);assert.match(html,/No date recorded/);assert.match(html,/Status not set/);assert.doesNotMatch(html,/Approve|Send|Fresh|Verified/);
});

test('overflow names the active destination and history describes page navigation',()=>{
 const html=referenceHeader({page:'schedule',sections,workspace:'QA',history:createWorkspaceHistory()});
 assert.match(html,/<summary data-nav-overflow="1" class="selected">Schedule /);
 assert.match(html,/aria-label="Previous page"/);
 assert.match(html,/aria-label="Workspace pages"/);
});

test('slate product theme is the final stylesheet after reference geometry',async()=>{
 const {readFile}=await import('node:fs/promises');
 const html=await readFile(new URL('./index.html',import.meta.url),'utf8');
 const sheets=[...html.matchAll(/rel="stylesheet" href="([^"]+)"/g)].map(match=>match[1]);
 assert.equal(sheets.at(-1),'studio.css');
 assert.ok(sheets.indexOf('reference-layout.css')<sheets.indexOf('studio.css'));
});
