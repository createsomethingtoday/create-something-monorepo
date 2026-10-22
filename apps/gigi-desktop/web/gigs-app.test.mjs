import test from 'node:test';import assert from 'node:assert/strict';
const tick=()=>new Promise(r=>setImmediate(r));
test('Gigs toolbar searches the current collection and Back restores list position',async()=>{
 const before={document:globalThis.document,tauri:globalThis.__TAURI__,scrollTo:globalThis.scrollTo,scrollY:globalThis.scrollY};
 const events=new Map(),keys=new Map(),calls=[];let focused=false,rowFocused=false;const gigId='g"1]';
 const search={id:'gigs-search',tagName:'INPUT',dataset:{},value:'',focus(){focused=true;},setSelectionRange(){}};
 const root={innerHTML:'',classList:{toggle(){}},addEventListener:(k,v)=>events.set(k,v),querySelector:s=>{if(s.includes('[data-open='))throw Error('Unsafe selector');return s==='#gigs-search'?search:null;},querySelectorAll:s=>s==='[data-open]'?[{dataset:{open:gigId},focus(){rowFocused=true;}}]:[],contains:v=>v===search};
 globalThis.document={querySelector:()=>root,addEventListener:(k,v)=>keys.set(k,v)};globalThis.scrollY=0;globalThis.scrollTo=(_x,y)=>{globalThis.scrollY=y;};
 globalThis.__TAURI__={core:{invoke:async(_,{operation,input})=>{calls.push({operation,input});if(operation==='workspace.get')return{id:'w1',name:'Synthetic'};
 if(operation==='records.list')return{items:input.entity==='profile'?[{id:'p1'}]:[{id:'g1',title:'Synthetic show',date:'2026-11-01'}],count:1,total:57,viewCounts:{upcoming:1,past:0,all:1},needsDateCount:0,statusOptions:['Confirmed']};
 if(operation==='records.get')return input.entity==='profile'?{fields:{Currency:'USD'}}:{id:'g1',title:'Synthetic show',fields:{Date:'2026-11-01'},relations:[]};return{};}}};
 const click=async dataset=>{events.get('click')({target:{closest:()=>({dataset})}});await tick();};
 try{
  await import(`./app.mjs?gigs=${Date.now()}`);await tick();await click({page:'gigs'});
  assert.match(root.innerHTML,/id="gigs-search"/);assert.match(root.innerHTML,/Showing 1 of 1 matching · 57 total/);
  keys.get('keydown')({key:'f',metaKey:true,preventDefault(){}});assert.equal(focused,true);assert.match(root.innerHTML,/Gigs &amp; shifts|Gigs & shifts/);
  await click({gigsView:'past'});assert.equal(calls.filter(c=>c.input.gigs).at(-1).input.gigs.view,'past');
  globalThis.scrollY=640;await click({open:gigId,entity:'gigs'});await click({back:'1'});assert.equal(globalThis.scrollY,640);assert.equal(rowFocused,true);assert.match(root.innerHTML,/data-gigs-view="past" aria-pressed="true"/);
 }finally{globalThis.document=before.document;globalThis.__TAURI__=before.tauri;globalThis.scrollTo=before.scrollTo;globalThis.scrollY=before.scrollY;}
});
