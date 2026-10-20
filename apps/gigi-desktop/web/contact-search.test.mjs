import test from 'node:test';
import assert from 'node:assert/strict';

test('People filters locally, clears, preserves search on detail/back, and ignores stale responses', async () => {
 const listeners=new Map(), calls=[], pending=[];
 const root={innerHTML:'',classList:{toggle(){}},addEventListener(n,h){listeners.set(n,h);},querySelector(){return null;}};
 const previous={document:globalThis.document,tauri:globalThis.__TAURI__};
 globalThis.document={querySelector:()=>root};
 globalThis.__TAURI__={core:{invoke:async(_,{operation,input})=>{
  calls.push({operation,input});
  if(operation==='workspace.get')return{id:'w1',name:'Synthetic'};
  if(operation==='records.list'){
   if(input.entity==='profile')return{items:[{id:'p1'}]};
   if(input.entity==='contacts'&&input.query==='broken')throw Error('local database unavailable');
   if(input.entity==='contacts'&&input.query==='slow')return new Promise(resolve=>pending.push(resolve));
   return{items:input.query==='none'?[]:input.query?[{id:'a',title:'Alice'}]:[{id:'a',title:'Alice'},{id:'b',title:'Bob'}],count:input.query==='none'?0:input.query?1:2};
  }
  if(operation==='records.get')return{id:input.id,title:'Alice',fields:input.entity==='profile'?{Currency:'USD'}:{Email:'alice@example.test'},relations:[]};
  return{};
 }}};
 const settle=()=>new Promise(r=>setTimeout(r,180));
 const click=dataset=>listeners.get('click')({target:{closest:()=>({dataset})}});
 const input=value=>listeners.get('input')({target:{id:'contact-search',value}});
 try {
  await import(`./app.mjs?contacts=${Date.now()}`);await settle();click({page:'contacts'});await settle();
  assert.match(root.innerHTML,/label for="contact-search">Search people/);assert.match(root.innerHTML,/Bob/);
  input('Alice');await settle();assert.doesNotMatch(root.innerHTML,/>Bob</);assert.match(root.innerHTML,/1 matching contacts/);
  click({open:'a',entity:'contacts'});await settle();assert.match(root.innerHTML,/alice@example.test/);
  click({back:'1'});await settle();assert.match(root.innerHTML,/value="Alice"/);
  input('none');await settle();assert.match(root.innerHTML,/No people match/);
  click({clearContacts:'1'});await settle();assert.match(root.innerHTML,/>Bob</);assert.match(root.innerHTML,/value=""/);
  input('broken');await settle();assert.match(root.innerHTML,/Couldn’t search people/);assert.doesNotMatch(root.innerHTML,/>Alice</);
  listeners.get('keydown')({target:{id:'contact-search'},key:'Escape',preventDefault(){}});await settle();assert.match(root.innerHTML,/>Bob</);
  input('slow');await settle();input('none');await settle();pending[0]({items:[{id:'stale',title:'STALE'}],count:1});await settle();assert.doesNotMatch(root.innerHTML,/STALE/);
  input('slow');await settle();click({new:'contacts'});await settle();click({cancel:'1'});await settle();
  assert.equal(pending.length,3);pending[1]({items:[],count:0});pending[2]({items:[{id:'a',title:'Alice'}],count:1});await settle();assert.doesNotMatch(root.innerHTML,/Searching people/);
  input('slow');await settle();click({page:'tasks'});await settle();pending[3]({items:[{id:'stale',title:'STALE'}],count:1});await settle();assert.doesNotMatch(root.innerHTML,/STALE/);assert.doesNotMatch(root.innerHTML,/id="contact-search"/);
  assert.equal(calls.some(c=>/save|delete|connection|import/.test(c.operation)),false);
 }finally{globalThis.document=previous.document;globalThis.__TAURI__=previous.tauri;}
});

test('People exits an unresolved search, ignores late completion, and retries without stale page replacement',async()=>{
 const listeners=new Map(),pending=[],calls=[];let holdOpening=false;
 const root={innerHTML:'',classList:{toggle(){}},addEventListener(n,h){listeners.set(n,h);},querySelector(){return null;}};
 const previous={document:globalThis.document,tauri:globalThis.__TAURI__,setTimeout:globalThis.setTimeout};
 globalThis.setTimeout=(fn,delay,...args)=>previous.setTimeout(fn,delay===150?0:delay===10000?30:delay,...args);
 globalThis.document={querySelector:()=>root};globalThis.__TAURI__={core:{invoke:async(_,{operation,input})=>{
  calls.push({operation,input});if(operation==='workspace.get')return{id:'w',name:'Synthetic'};
  if(operation==='records.list'){if(input.entity==='profile')return{items:[{id:'p'}]};if(input.entity==='contacts'){
   if(input.query==='hang'||holdOpening||input.cursor)return new Promise(resolve=>pending.push(resolve));
   return{items:[{id:'new',title:input.query||'Initial'}],count:1,nextCursor:'more'};
  }return{items:[]};}if(operation==='records.get')return{id:'p',fields:{Currency:'USD'}};return{};
 }}};
 const settle=(ms=12)=>new Promise(resolve=>previous.setTimeout(resolve,ms));const click=dataset=>listeners.get('click')({target:{closest:()=>({dataset})}});const input=value=>listeners.get('input')({target:{id:'contact-search',value}});
 try{
  await import(`./app.mjs?contact-hang=${Date.now()}`);await settle();click({page:'contacts'});await settle();
  input('hang');await settle();assert.match(root.innerHTML,/Searching people/);await settle(45);
  assert.doesNotMatch(root.innerHTML,/Searching people/);assert.match(root.innerHTML,/stopped waiting/);assert.match(root.innerHTML,/data-retry-contacts/);
  input('Fresh');await settle();pending.shift()({items:[{id:'late',title:'LATE'}],count:1});await settle();assert.match(root.innerHTML,/Fresh/);assert.doesNotMatch(root.innerHTML,/LATE/);
  click({page:'tasks'});await settle();holdOpening=true;click({page:'contacts'});await settle();holdOpening=false;input('Newest');await settle();pending.shift()({items:[{id:'old',title:'OLD OPENING'}],count:1});await settle();assert.match(root.innerHTML,/Newest/);assert.doesNotMatch(root.innerHTML,/OLD OPENING/);
  click({more:'1'});await settle();input('New page query');await settle();pending.shift()({items:[{id:'oldpage',title:'OLD PAGE'}],count:2});await settle();assert.match(root.innerHTML,/New page query/);assert.doesNotMatch(root.innerHTML,/OLD PAGE/);
  click({more:'1'});await settle(45);assert.match(root.innerHTML,/stopped waiting/);assert.doesNotMatch(root.innerHTML,/Searching people/);click({retryContacts:'1'});await settle();assert.match(root.innerHTML,/New page query/);
  pending.shift()({items:[{id:'latepage',title:'LATE PAGE'}],count:2});await settle();assert.doesNotMatch(root.innerHTML,/LATE PAGE/);
  input('hang');await settle();const before=calls.length;click({more:'1'});await settle();assert.equal(calls.length,before,'queued pagination must not invalidate active search');
  click({page:'tasks'});await settle();await settle(45);assert.doesNotMatch(root.innerHTML,/stopped waiting|Searching people/);
 }finally{globalThis.document=previous.document;globalThis.__TAURI__=previous.tauri;globalThis.setTimeout=previous.setTimeout;}
});
