import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';

const path=process.argv[2];
const listeners=new Map();
let replacements=0, finishOverview, overviewStarted=false;
const input={id:'workspace-search-input',value:'Miか',tagName:'INPUT',dataset:{},focus(){document.activeElement=this;}};
const results={innerHTML:'',scrollTop:0,setAttribute(){}};
const host={contains:node=>node===input,querySelector(s){return s==='#workspace-search-input'?input:s==='.workspace-search-results'?results:null;},querySelectorAll(){return[input];},set innerHTML(_){}};
const root={classList:{toggle(){}},addEventListener(name,fn){listeners.set(name,fn);},querySelector(s){return s==='#workspace-search-host'?host:s==='#workspace-search-input'?input:null;},querySelectorAll(){return[];},get innerHTML(){return'';},set innerHTML(_){replacements++;document.activeElement=null;}};
globalThis.document={activeElement:input,querySelector:()=>root};
globalThis.__TAURI__={core:{invoke:async(_,{operation,input})=>{
  if(operation==='workspace.get')return{id:'synthetic',name:'Synthetic search'};
  if(operation==='records.list')return{items:input.entity==='profile'?[{id:'profile'}]:[],count:0};
  if(operation==='records.get')return{id:input.id,title:'Synthetic',fields:{Currency:'USD'},relations:[]};
  if(operation==='workspace.overview'){overviewStarted=true;return new Promise(resolve=>{finishOverview=resolve;});}
  return{};
}}};
await import(pathToFileURL(path));
for(let n=0;n<100&&!overviewStarted;n++)await new Promise(r=>setTimeout(r,5));
assert.equal(overviewStarted,true,'must hold a real async overview read');
listeners.get('click')({target:{closest:()=>({dataset:{workspaceSearch:'1'}})}});
input.focus();
const before=replacements;
finishOverview({});
await new Promise(r=>setTimeout(r,30));
assert.equal(replacements,before,'async page completion must not replace the composing input ancestor');
assert.equal(document.activeElement,input,'async page completion must keep native input focus');
assert.equal(input.value,'Miか');
console.log('PASS: actual app async overview completion retains search input ancestor, focus, unfinished text.');
