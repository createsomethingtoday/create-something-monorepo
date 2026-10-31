import {test} from 'node:test';
import assert from 'node:assert/strict';
import {sections} from './model.mjs';
import {referenceHeader,referenceCards,createWorkspaceHistory} from './reference-layout.mjs';
test('reference shell retains every destination and labels its real search scope',()=>{
 const history=createWorkspaceHistory(); const html=referenceHeader({page:'social',sections,workspace:'<private>',history});
 for(const section of sections) assert.ok(html.includes(`data-page="${section.id}"`),section.id);
 assert.match(html,/aria-label="Find people"/); assert.match(html,/Find people/); assert.doesNotMatch(html,/Search GiGi/); assert.match(html,/&lt;private&gt;/);
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
 assert.match(html,/<summary data-nav-overflow="1" class="selected"[^>]*>Schedule /);
 assert.match(html,/aria-label="Previous page"/);
 assert.match(html,/aria-label="Workspace pages"/);
});

test('appearance preferences extend the product theme after reference geometry',async()=>{
 const {readFile}=await import('node:fs/promises');
 const html=await readFile(new URL('./index.html',import.meta.url),'utf8');
 const sheets=[...html.matchAll(/rel="stylesheet" href="([^"]+)"/g)].map(match=>match[1]);
 assert.equal(sheets.at(-1),'preferences.css');
 assert.ok(sheets.indexOf('studio.css')<sheets.indexOf('preferences.css'));
 assert.ok(sheets.indexOf('reference-layout.css')<sheets.indexOf('studio.css'));
});

test('More groups supporting pages and workspace controls without duplicating destinations',()=>{
 const html=referenceHeader({page:'schedule',sections,workspace:'Synthetic studio',history:createWorkspaceHistory()});
 for(const label of ['Work','Library','Workspace']) assert.match(html,new RegExp(`<h2[^>]*>${label}</h2>`));
 assert.match(html,/aria-label="More workspace pages"/);
 assert.match(html,/data-page="appearance"[^>]*>[\s\S]*?Appearance &amp; views/);
 const menu=html.match(/<nav class="reference-menu-grid"[\s\S]*?<\/nav>/)?.[0] || '';
 for(const id of ['schedule','tasks','finances','social','companies','locations','notes','documents','interactions','services','tags','profile','history']) assert.equal((menu.match(new RegExp(`data-page="${id}"`,'g'))||[]).length,1,id);
 assert.match(html,/data-icon=/);
});

test('navigation dismissal and keyboard movement work independently of data actions',async()=>{
 const {installReferenceMenu}=await import('./reference-layout.mjs');
 const listeners=new Map(),rootListeners=new Map();
 const doc={activeElement:null,addEventListener(name,fn){listeners.set(name,fn);}};
 const buttons=Array.from({length:3},(_,i)=>({id:`page${i}`,dataset:{page:`page${i}`},focus(){doc.activeElement=this;}}));
 const summary={focus(){doc.activeElement=this;}};
 const menu={open:false,contains(node){return node===summary||buttons.includes(node);},querySelector(){return summary;},querySelectorAll(){return buttons;}};
 const root={addEventListener(name,fn){rootListeners.set(name,fn);},querySelector(selector){return selector.includes('[open]')&&!menu.open?null:menu;}};
 installReferenceMenu(root,doc);
 const key=key=>listeners.get('keydown')({key,target:doc.activeElement,preventDefault(){},stopImmediatePropagation(){}});
 doc.activeElement=summary;key('ArrowDown');assert.equal(menu.open,true);assert.equal(doc.activeElement,buttons[0]);
 key('ArrowDown');assert.equal(doc.activeElement,buttons[1]);key('End');assert.equal(doc.activeElement,buttons[2]);
 key('Home');assert.equal(doc.activeElement,buttons[0]);key('Escape');assert.equal(menu.open,false);assert.equal(doc.activeElement,summary);
 menu.open=true;listeners.get('pointerdown')({target:{}});assert.equal(menu.open,false);
 menu.open=true;listeners.get('click')({target:{}});assert.equal(menu.open,false,'assistive click outside closes navigation');
 menu.open=true;listeners.get('focusin')({target:{}});assert.equal(menu.open,false);
 menu.open=true;rootListeners.get('click')({target:{closest(){return buttons[1];}}});assert.equal(menu.open,false);
});
