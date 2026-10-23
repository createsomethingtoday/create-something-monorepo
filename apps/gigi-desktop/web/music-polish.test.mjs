import test from 'node:test';
import assert from 'node:assert/strict';
import {mountMusic} from './music.mjs';

// A bounded form DOM: replacing markup detaches focus, as a WebView does.
// It intentionally models controls and selection rather than visual geometry.
const attributes = text => Object.fromEntries([...text.matchAll(/([\w-]+)="([^"]*)"/g)].map(match => [match[1], match[2]]));
function node() {
 return {
  children:[], listeners:{}, forms:[], controls:[],
  replaceChildren(...children){this.children=children;},
  addEventListener(type,listener){this.listeners[type]=listener;},
  removeEventListener(type){delete this.listeners[type];},
  contains(control){return this.controls.includes(control);},
  querySelector(selector){return this.controls.find(control=>selector===`[name="${control.name}"]`)||null;},
  querySelectorAll(selector){return selector==='form'?this.forms:selector==='input, select, textarea, button, a, summary'?this.controls:[];},
  set innerHTML(html){
   if(this.contains(document.activeElement))document.activeElement=document.body;
   this.html=html;
   const control=(tag,text,body='')=>{
    const attrs=attributes(text),dataset={};
    for(const match of text.matchAll(/\b(data-[\w-]+)(?:="([^"]*)")?/g))dataset[match[1].slice(5).replace(/-([a-z])/g,(_,c)=>c.toUpperCase())]=match[2]||'';
    const selected=tag==='select'?[...body.matchAll(/<option([^>]*)>/g)].find(match=>/\bselected\b/.test(match[1])):null;
    return {...attrs,tagName:tag.toUpperCase(),dataset,disabled:/\bdisabled\b/.test(text),value:tag==='select'?(selected?attributes(selected[1]).value:''):attrs.value||'',
     focus(){document.activeElement=this;},setSelectionRange(start,end,direction){this.selectionStart=start;this.selectionEnd=end;this.selectionDirection=direction;}};
   };
   this.controls=[...html.matchAll(/<(input|button)\b([^>]*)>|<(select)\b([^>]*)>([\s\S]*?)<\/select>/g)].map(match=>control(match[1]||match[3],match[1]?match[2]:match[4],match[5]));
   this.forms=[...html.matchAll(/<form\b([^>]*)>([\s\S]*?)<\/form>/g)].map(match=>{
    const attrs=attributes(match[1]);
    const ids=[...match[2].matchAll(/<(?:input|select)\b[^>]*id="([^"]+)"/g)].map(entry=>entry[1]);
    return {...attrs,elements:this.controls.filter(entry=>ids.includes(entry.id))};
   });
  },
  get innerHTML(){return this.html;}
 };
}
const tick=()=>new Promise(resolve=>setImmediate(resolve));
async function fixture(run){
 const previous={document:globalThis.document,FormData:globalThis.FormData};
 globalThis.document={createElement:node,body:{},documentElement:{}};
 document.activeElement=document.body;
 globalThis.FormData=class{constructor(form){return form.elements.filter(control=>control.name).map(control=>[control.name,control.value]);}};
 const items=[{id:'a',title:'Track A'},{id:'b',title:'Track B'}];
 const requests=[];let nextList,confirmations=0;
 const container=node();
 const controller=mountMusic(container,{workspaceId:'fixture',confirm:async()=>{confirmations++;return true;},call:async(operation,input)=>{
  requests.push({operation,...input});
  if(operation==='music.import')return {cancelled:true};
  if(nextList){const result=nextList;nextList=null;return result;}
  return {items:input.query?[]:items,total:input.query?0:items.length};
 }});
 const content=container.children[1];
 const click=async(key,value='')=>{
  const button=content.controls.find(control=>control.tagName==='BUTTON'&&control.dataset[key]===value);
  assert.ok(button,`button ${key}=${value} exists`);assert.equal(button.disabled,false);
  button.focus();
  await content.listeners.click({target:{closest:()=>({...button,hasAttribute:name=>name===`data-${key.replace(/[A-Z]/g,c=>'-'+c.toLowerCase())}`})}});
 };
 try{await tick();await run({content,requests,click,get confirmations(){return confirmations;},deferList(){let resolve;nextList=new Promise(done=>{resolve=done;});return resolve;}});}
 finally{controller.dispose();globalThis.document=previous.document;globalThis.FormData=previous.FormData;}
}

test('clear music filters aligns visible controls with the next request',async()=>fixture(async({content,requests,click})=>{
 content.controls.find(control=>control.id==='music-query').value='missing';
 content.controls.find(control=>control.id==='music-kind').value='audio';
 const form=content.forms.find(form=>form.id==='music-search-form');
 await content.listeners.submit({preventDefault(){},target:{...form,hasAttribute:name=>name==='data-music-search'}});
 await click('musicReset');
 assert.equal(requests.at(-1).query,'');assert.equal(requests.at(-1).kind,'');
 assert.equal(content.controls.find(control=>control.id==='music-query').value,'');
 assert.equal(content.controls.find(control=>control.id==='music-kind').value,'');
}));

test('discarding Track A edits then opening Track B does not transfer values',async()=>fixture(async(context)=>{
 const {content,click}=context;
 await click('musicEdit','a');
 const title=content.controls.find(control=>control.id==='music-edit-title');title.value='Unsaved A';
 content.listeners.input({target:{...title,closest:()=>true}});
 await click('musicEditCancel');await click('musicEdit','b');
 assert.equal(context.confirmations,1);
 assert.equal(content.controls.find(control=>control.id==='music-edit-title').value,'Track B');
}));

test('deferred music results preserve typed search text, focus and selection',async()=>fixture(async({content,deferList})=>{
 const resolve=deferList();
 const loading=content.listeners.submit({preventDefault(){},target:{...content.forms[0],hasAttribute:name=>name==='data-music-search'}});
 // submit awaits canLeave before starting its list request.
 await tick();
 const query=content.controls.find(control=>control.id==='music-query');
 query.value='Draft search';query.setSelectionRange(2,5,'forward');query.focus();
 resolve({items:[],total:0});await loading;
 assert.equal(document.activeElement.id,'music-query');assert.equal(document.activeElement.value,'Draft search');
 assert.equal(document.activeElement.selectionStart,2);assert.equal(document.activeElement.selectionEnd,5);
}));

test('canceling a native import picker restores its triggering button focus',async()=>fixture(async({click})=>{
 await click('musicImport','files');
 assert.equal(document.activeElement.dataset.musicImport,'files');
 assert.equal(document.activeElement.disabled,false);
}));
