import test from 'node:test';
import assert from 'node:assert/strict';
import { musicView, musicEditView } from './music-view.mjs';
test('music workspace escapes private names and presents reconnect without implying upload',()=>{
 const html=musicView({items:[{id:'one',title:'<script>',filename:'song.mp4',kind:'video',availability:'missing',bytes:24}],total:1});
 assert.ok(html.includes('&lt;script&gt;'));
 assert.ok(html.includes('Reconnect'));
 assert.ok(html.includes('not uploaded'));
 assert.ok(!html.includes('data-music-preview="one"'));
});
test('projects have honest preview limits and organization fields survive escaped values',()=>{
 const item={id:'project',title:'Draft & Session',filename:'song.als',kind:'project',availability:'available',project:'Night Drive',version:'Mix 03',collection:'References',tags:'ambient'};
 const html=musicView({items:[item],total:1});
 assert.ok(html.includes('Indexed · no in-app preview'));
 assert.ok(!html.includes('data-music-preview="project"'));
 const editor=musicEditView({...item,title:'"quoted" <title>'});
 for(const field of ['title','artist','project','version','collection','tags']) assert.ok(editor.includes(`name="${field}"`));
 assert.ok(editor.includes('&quot;quoted&quot; &lt;title&gt;'));
});
test('bounded paging and cancellation are explicit',()=>{
 const html=musicView({items:Array.from({length:100},(_,i)=>({id:String(i),title:'Track',kind:'audio',availability:'available'})),total:205,offset:100,hasMore:true,busy:true,importing:true});
 assert.ok(html.includes('101–200 of 205'));
 assert.ok(html.includes('Cancel import'));
 assert.ok(html.includes('up to 1,000'));
 assert.ok(!musicView({busy:true}).includes('Cancel import'));
});

test('unsupported video containers retain music organization without a preview action',()=>{
 const html=musicView({items:[{id:'mkv',title:'Reference',filename:'reference.mkv',kind:'video',previewable:false,availability:'available'}],total:1});
 assert.ok(html.includes('Music video'));assert.ok(html.includes('Indexed · no in-app preview'));assert.ok(!html.includes('data-music-preview="mkv"'));assert.ok(html.includes('data-music-edit="mkv"'));
});

test('fresh music library offers an import action without false no-results or pagination',()=>{
 const html=musicView({items:[],total:0});
 assert.doesNotMatch(html,/No matching entries/);
 assert.doesNotMatch(html,/aria-label="Music pages"/);
 assert.match(html,/<div class="music-empty">[\s\S]*data-music-import="files"/);
 assert.match(musicView({query:'missing'}),/Nothing matches this view/);
});
test('available music keeps recovery secondary while missing music leads with reconnect',()=>{
 const available=musicView({items:[{id:'a',title:'Song',kind:'audio',availability:'available'}],total:1});
 assert.match(available,/<details class="music-more">/);
 assert.match(available,/<summary[^>]*>More/);
 const missing=musicView({items:[{id:'b',title:'Song',kind:'audio',availability:'missing'}],total:1});
 assert.match(missing,/class="btn primary" data-music-reconnect="b"/);
});

test('opening and closing a local player moves focus and never overlays the library',async()=>{
 const {mountMusic}=await import('./music.mjs');
 const previous=globalThis.document;let focused='',content,player;
 const item={id:'track',title:'Demo',kind:'audio',availability:'available'};
 const trigger={dataset:{musicPreview:'track'},focus(){focused='trigger';}};
 const node=tag=>({tag,children:[],listeners:{},innerHTML:'',dataset:{},className:'',setAttribute(){},removeAttribute(){},load(){},pause(){},play(){return Promise.resolve();},focus(){focused=tag;},scrollIntoView(){},append(...children){this.children.push(...children);},replaceChildren(...children){this.children=children;},addEventListener(name,fn){this.listeners[name]=fn;},removeEventListener(name){delete this.listeners[name];},querySelector(selector){return selector==='audio,video'?this.children.find(child=>['audio','video'].includes(child.tag)):null;},querySelectorAll(){return [trigger];}});
 globalThis.document={createElement:node};const container=node('container');
 try{
  const mounted=mountMusic(container,{workspaceId:'w',call:async operation=>operation==='music.list'?{items:[item],total:1}:item});
  [player,content]=container.children;await new Promise(resolve=>setImmediate(resolve));
  await content.listeners.click({target:{closest:()=>({dataset:{musicPreview:'track'},hasAttribute:()=>false})}});
  assert.equal(focused,'audio');assert.equal(container.children[0],player,'player occupies its own layout space before the list');
  let prevented=false;container.listeners.keydown({key:'Escape',preventDefault(){prevented=true;}});
  assert.equal(prevented,true);assert.equal(focused,'trigger');assert.equal(player.children.length,0);
  mounted.dispose();assert.equal(container.listeners.keydown,undefined);
 }finally{globalThis.document=previous;}
});

test('returning from an agent refreshes music without replacing active organization edits',async()=>{
 const {mountMusic}=await import('./music.mjs');let lists=0;const windowListeners={};
 const previous={document:globalThis.document,window:globalThis.window};
 const node=()=>({children:[],listeners:{},innerHTML:'',addEventListener(type,fn){this.listeners[type]=fn;},removeEventListener(type){delete this.listeners[type];},replaceChildren(...children){this.children=children;},querySelector(){return {focus(){}};},querySelectorAll(){return [];}});
 globalThis.document={createElement:node};globalThis.window={addEventListener(type,fn){windowListeners[type]=fn;},removeEventListener(type){delete windowListeners[type];}};
 try{const container=node();const controller=mountMusic(container,{workspaceId:'w',call:async()=>{lists++;return {items:[{id:'one',title:'Demo'}],total:1};}});const content=container.children[1];await new Promise(resolve=>setImmediate(resolve));
  windowListeners.focus();await new Promise(resolve=>setImmediate(resolve));assert.equal(lists,2);
  await content.listeners.click({target:{closest:()=>({dataset:{musicEdit:'one'},hasAttribute:()=>false})}});
  content.listeners.input({target:{closest:()=>true,name:'title',value:'Unsaved title'}});
  windowListeners.focus();await new Promise(resolve=>setImmediate(resolve));assert.equal(lists,2,'unsaved organization must not be refreshed away');
  // Disposal also releases the global listener and never leaves a background watcher.
  container.children[0].querySelector=()=>null;controller.dispose();assert.equal(windowListeners.focus,undefined);
 }finally{globalThis.document=previous.document;globalThis.window=previous.window;}
});

test('music save sends the original revision and preserves edits when another writer changed the entry',async()=>{
 const {mountMusic}=await import('./music.mjs');const previous={document:globalThis.document,FormData:globalThis.FormData};let submitted,lists=0,decide;
 const item={id:'one',title:'Original',artist:'',project:'',collection:'Old collection',version:'',tags:'',organizationRevision:'a'.repeat(64)};
 const node=()=>({children:[],listeners:{},innerHTML:'',addEventListener(type,fn){this.listeners[type]=fn;},removeEventListener(type){delete this.listeners[type];},replaceChildren(...children){this.children=children;},querySelector(){return {focus(){}};},querySelectorAll(){return [];}});
 globalThis.document={createElement:node};globalThis.FormData=class{constructor(form){return Object.entries(form.values);}};
 try{const container=node();const controller=mountMusic(container,{workspaceId:'w',confirm:()=>new Promise(resolve=>{decide=resolve;}),call:async(operation,input)=>{if(operation==='music.list'){lists++;return {items:[lists>1?{...item,collection:'New agent collection',organizationRevision:'b'.repeat(64)}:item],total:1};}submitted=input;throw Error('This music entry changed elsewhere. Your edits have not been saved.');}});const content=container.children[1];await new Promise(resolve=>setImmediate(resolve));
  await content.listeners.click({target:{closest:()=>({dataset:{musicEdit:'one'},hasAttribute:()=>false})}});
  content.listeners.input({target:{closest:()=>true,name:'title',value:'My unsaved title'}});
  await content.listeners.submit({preventDefault(){},target:{values:{...item,title:'My unsaved title'},hasAttribute:name=>name==='data-music-edit-form'}});
  assert.equal(submitted.expectedRevision,item.organizationRevision);assert.match(content.innerHTML,/My unsaved title/);assert.match(content.innerHTML,/changed elsewhere/);
  const cancelEvent={target:{closest:()=>({dataset:{},hasAttribute:name=>name==='data-music-edit-cancel'})}};
  const rejected=content.listeners.click(cancelEvent);assert.equal(lists,1,'must wait for the dialog choice');decide(false);await rejected;assert.match(content.innerHTML,/My unsaved title/);assert.equal(lists,1);
  const leave=controller.canLeave();decide(false);assert.equal(await leave,false,'sidebar navigation respects rejection');
  const accepted=content.listeners.click(cancelEvent);assert.equal(lists,1);decide(true);await accepted;
  assert.equal(lists,2,'cancel/reopen must load the current metadata after a conflict');assert.match(content.innerHTML,/New agent collection/);
  container.children[0].querySelector=()=>null;controller.dispose();
 }finally{globalThis.document=previous.document;globalThis.FormData=previous.FormData;}
});

test('music loading and read errors do not pretend the library is empty',()=>{
 for(const state of [{loading:true},{error:'Read unavailable'}]){
  const html=musicView(state);
  assert.doesNotMatch(html,/Make room for your next idea|Add your first files|Nothing matches this view/);
 }
 assert.match(musicView({loading:true}),/aria-busy="true"/);
 assert.match(musicView({error:'Read unavailable'}),/class="music-error"[^>]*[\s\S]*data-music-retry/);
 assert.match(musicView({query:'missing'}),/data-music-reset/);
});
