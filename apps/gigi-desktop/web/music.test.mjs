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
