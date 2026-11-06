import test from 'node:test';
import assert from 'node:assert/strict';
import {WorkspaceSearch, workspaceSearchView, workspaceSearchKey, workspaceSearchShortcut, updateWorkspaceSearchHost} from './workspace-search.mjs';

test('late results after query changes or closing cannot replace a newer workspace search',async()=>{
  const pending=[],calls=[];
  const search=new WorkspaceSearch(input=>{calls.push(input);return new Promise(resolve=>pending.push(resolve));},()=>{});
  search.open('w1');search.update('Micah');const old=search.search();
  search.update('Johnson');const current=search.search();
  pending[1]({groups:[{entity:'contacts',label:'People',items:[{id:'new',title:'Johnson'}],count:1}]});await current;
  pending[0]({groups:[{entity:'contacts',label:'People',items:[{id:'old',title:'Micah'}],count:1}]});await old;
  assert.equal(search.groups[0].items[0].id,'new');
  search.update('Again');const closing=search.search();search.close();pending[2]({groups:[]});await closing;
  assert.equal(search.visible,false);assert.equal(workspaceSearchView(search),'');
  search.open('w2');assert.equal(search.query,'');assert.deepEqual(search.groups,[]);
  search.update('Other');const next=search.search();pending[3]({groups:[]});await next;
  assert.deepEqual(calls.map(call=>call.workspaceId),['w1','w1','w1','w2']);search.close();
});

test('buckets page independently, escape stored titles and clear stale results on a failed new query',async()=>{
  const calls=[];
  const search=new WorkspaceSearch(async input=>{
    calls.push(input);if(input.query==='broken')throw Error('private transport details');
    return {groups:input.entity?[{entity:'tasks',label:'Tasks',count:3,items:[{id:'t2',title:'Micah second'}],nextCursor:null}]:[
      {entity:'contacts',label:'People',count:1,items:[{id:'c1',title:'<Micah Johnson>'}]},
      {entity:'tasks',label:'Tasks',count:3,items:[{id:'t1',title:'Micah first'}],nextCursor:'1'}
    ]};
  },()=>{});
  search.open('w');search.update('Micah');await search.search();await search.search('tasks');
  assert.deepEqual(search.groups.map(g=>g.items.length),[1,2]);
  assert.equal(calls[1].entity,'tasks');assert.equal(calls[1].cursor,'1');
  const html=workspaceSearchView(search);assert.match(html,/role="dialog" aria-modal="true"/);assert.match(html,/&lt;Micah Johnson&gt;/);
  assert.match(html,/data-search-record="t2" data-search-entity="tasks"/);
  search.update('broken');await search.search();assert.match(workspaceSearchView(search),/Couldn’t finish/);
  assert.doesNotMatch(workspaceSearchView(search),/Micah Johnson|private transport/);search.close();
});

test('an unresolved read times out and late completion cannot replace a successful retry',async()=>{
  const original=globalThis.setTimeout;
  globalThis.setTimeout=(fn,ms,...args)=>original(fn,ms===10000?15:ms,...args);
  let finish;const search=new WorkspaceSearch(()=>new Promise(resolve=>{finish=resolve;}),()=>{});
  try{
    search.open('w');search.update('Micah');await search.search();assert.equal(search.error,true);assert.equal(search.busy,false);
    search.read=async()=>({groups:[{entity:'gigs',label:'Gigs',count:1,items:[{id:'g',title:'Micah show'}]}]});
    await search.search();finish({groups:[]});await Promise.resolve();assert.equal(search.error,false);assert.equal(search.groups[0].items[0].id,'g');
  }finally{search.close();globalThis.setTimeout=original;}
});

test('Command-F and Control-F open search and keyboard focus stays within the popover',()=>{
  assert.equal(Boolean(workspaceSearchShortcut({key:'f',metaKey:true})),true);
  assert.equal(Boolean(workspaceSearchShortcut({key:'F',ctrlKey:true})),true);
  assert.equal(Boolean(workspaceSearchShortcut({key:'f',metaKey:true,altKey:true})),false);
  const previous=globalThis.document,doc={activeElement:null};globalThis.document=doc;
  let opened=0,closed=0;const input={focus(){doc.activeElement=this;}};
  const results=[0,1].map(()=>({focus(){doc.activeElement=this;},click(){opened++;}}));
  const dialog={querySelector:()=>input,querySelectorAll:selector=>selector.includes('workspace-search-result')?results:[input,...results],contains:node=>[input,...results].includes(node)};
  const root={querySelector:()=>dialog};const key=(key,shiftKey=false)=>workspaceSearchKey(root,{key,shiftKey,preventDefault(){}},()=>closed++);
  try{
    input.focus();key('Enter');assert.equal(opened,1);key('ArrowDown');assert.equal(doc.activeElement,results[0]);
    key('ArrowDown');assert.equal(doc.activeElement,results[1]);key('Tab');assert.equal(doc.activeElement,input);
    key('Tab',true);assert.equal(doc.activeElement,results[1]);key('ArrowUp');key('ArrowUp');assert.equal(doc.activeElement,input);
    results[1].focus();workspaceSearchKey(root,{key:'f',metaKey:true,preventDefault(){}},()=>closed++);assert.equal(doc.activeElement,input);
    key('Escape');assert.equal(closed,1);
  }finally{globalThis.document=previous;}
});

test('opening global search does not navigate, and grouped results open the selected record through guarded navigation',async()=>{
  const listeners=new Map(),calls=[];
  const root={innerHTML:'',classList:{toggle(){}},addEventListener(name,fn){listeners.set(name,fn);},querySelector(){return null;}};
  const before={document:globalThis.document,tauri:globalThis.__TAURI__};globalThis.document={querySelector:()=>root};
  globalThis.__TAURI__={core:{invoke:async(_,{operation,input})=>{
    calls.push({operation,input});if(operation==='workspace.get')return{id:'w',name:'Synthetic search'};
    if(operation==='records.list')return{items:input.entity==='profile'?[{id:'profile'}]:[],count:0};
    if(operation==='records.get')return{id:input.id,title:'Micah Johnson',fields:input.entity==='profile'?{Currency:'USD'}:{},relations:[]};
    return{};
  }}};
  const settle=()=>new Promise(resolve=>setTimeout(resolve,30));const click=dataset=>listeners.get('click')({target:{closest:()=>({dataset})}});
  try{
    await import(`./app.mjs?workspace-search=${Date.now()}`);await settle();const reads=calls.length;
    click({workspaceSearch:'1'});await settle();assert.equal(calls.length,reads);
    click({searchRecord:'c1',searchEntity:'contacts'});await settle();
    assert.ok(calls.some(call=>call.operation==='records.get'&&call.input.entity==='contacts'&&call.input.id==='c1'));
    assert.match(root.innerHTML,/Micah Johnson/);assert.equal(calls.some(call=>/save|delete|import/.test(call.operation)),false);
  }finally{globalThis.document=before.document;globalThis.__TAURI__=before.tauri;}
});

test('pagination retains keyboard focus while loading and restores input when the last More button disappears',()=>{
  const previous=globalThis.document,doc={activeElement:null,body:{}};globalThis.document=doc;
  let controls=[];
  const node=(id,dataset,tagName='BUTTON')=>({id,dataset,tagName,focus(){doc.activeElement=this;}});
  const host={contains:node=>controls.includes(node),querySelector(selector){return selector==='#workspace-search-input'?controls[0]:null;},querySelectorAll(selector){return selector.includes('input, select')?controls:[];},set innerHTML(html){
    doc.activeElement=doc.body;
    controls=[node('workspace-search-input',{},'INPUT')];
    if(html.includes('data-search-more="tasks"'))controls.push(node('',{searchMore:'tasks'}));
  }};
  const search={visible:true,query:'Micah',groups:[{entity:'tasks',label:'Tasks',count:2,items:[{id:'one',title:'Micah'}],nextCursor:'1'}]};
  try{
    updateWorkspaceSearchHost(host,search);controls[1].focus();
    updateWorkspaceSearchHost(host,{...search,busy:true});assert.equal(doc.activeElement.dataset.searchMore,'tasks');
    updateWorkspaceSearchHost(host,{...search,groups:[{...search.groups[0],nextCursor:null}]});
    assert.equal(doc.activeElement.id,'workspace-search-input');
  }finally{globalThis.document=previous;}
});

test('refreshing results preserves the active input node and unfinished composition text',()=>{
  const previous=globalThis.document;
  const input={id:'workspace-search-input',value:'Miか',tagName:'INPUT',dataset:{},focus(){globalThis.document.activeElement=this;}};
  const results={innerHTML:'',scrollTop:12,setAttribute(){}};
  let replacements=0;
  const host={contains:node=>node===input,querySelector(selector){return selector==='#workspace-search-input'?input:selector==='.workspace-search-results'?results:selector==='.workspace-search-dialog'?{}:null;},querySelectorAll(){return[input];},set innerHTML(_){replacements++;globalThis.document.activeElement=null;}};
  globalThis.document={activeElement:input};
  try{
    updateWorkspaceSearchHost(host,{visible:true,query:'Mi',groups:[],busy:true,error:false});
    assert.equal(replacements,0,'result refresh must retain the composing input');
    assert.equal(input.value,'Miか');
    assert.equal(globalThis.document.activeElement,input);
    assert.equal(results.scrollTop,12);
  }finally{globalThis.document=previous;}
});

test('finishing a page read clears pointer blocking without replacing the active search input',async()=>{
  const previous={document:globalThis.document,tauri:globalThis.__TAURI__};
  const listeners=new Map();let loading=false,replacements=0,finishOverview,overviewStarted=false,holdOverview=false;
  const input={id:'workspace-search-input',value:'Miか',tagName:'INPUT',dataset:{},focus(){globalThis.document.activeElement=this;}};
  const results={innerHTML:'',scrollTop:0,setAttribute(){}};
  const host={contains:node=>node===input,querySelector(selector){return selector==='#workspace-search-input'?input:selector==='.workspace-search-results'?results:null;},querySelectorAll(){return[input];},set innerHTML(_){}};
  const root={classList:{toggle(name,value){if(name==='loading')loading=value;}},addEventListener(name,fn){listeners.set(name,fn);},querySelector(selector){return selector==='#workspace-search-host'?host:selector==='#workspace-search-input'?input:null;},querySelectorAll(){return[];},get innerHTML(){return'';},set innerHTML(_){replacements++;globalThis.document.activeElement=null;}};
  globalThis.document={activeElement:null,querySelector:()=>root};
  globalThis.__TAURI__={core:{invoke:async(_,{operation,input})=>{
    if(operation==='workspace.get')return{id:'synthetic',name:'Synthetic search'};
    if(operation==='records.list')return{items:input.entity==='profile'?[{id:'profile'}]:[],count:0};
    if(operation==='records.get')return{id:input.id,title:'Synthetic',fields:{Currency:'USD'},relations:[]};
    if(operation==='workspace.overview' && holdOverview){overviewStarted=true;return new Promise(resolve=>{finishOverview=resolve;});}
    return{};
  }}};
  try{
    await import(`./app.mjs?workspace-search-loading=${Date.now()}`);
    await new Promise(resolve=>setTimeout(resolve,30));holdOverview=true;
    listeners.get('click')({target:{closest:()=>({dataset:{page:'overview'}})}});
    for(let n=0;n<100&&!overviewStarted;n++)await new Promise(resolve=>setTimeout(resolve,5));
    assert.equal(overviewStarted,true,'hold the actual page read');
    assert.equal(loading,true);
    listeners.get('click')({target:{closest:()=>({dataset:{workspaceSearch:'1'}})}});
    input.focus();const before=replacements;
    finishOverview({});await new Promise(resolve=>setTimeout(resolve,30));
    assert.equal(loading,false,'completed page reads must release pointer events while Search stays open');
    assert.equal(replacements,before,'keep the active input ancestor');
    assert.equal(globalThis.document.activeElement,input);assert.equal(input.value,'Miか');
  }finally{globalThis.document=previous.document;globalThis.__TAURI__=previous.tauri;}
});
