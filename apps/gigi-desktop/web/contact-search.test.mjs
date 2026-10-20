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
