import assert from 'node:assert/strict';
import test from 'node:test';

const tick=()=>new Promise(resolve=>setTimeout(resolve,10));
async function until(predicate){for(let i=0;i<60;i++){if(predicate())return;await tick();}throw new Error('UI did not reach expected state');}

test('restore requires visible in-app confirmation before native mutation',async()=>{
  const handlers={};const calls=[];
  const root={innerHTML:'',classList:{toggle(){}},addEventListener(name,handler){handlers[name]=handler;}};
  const original={document:globalThis.document,FormData:globalThis.FormData,confirm:globalThis.confirm,__TAURI__:globalThis.__TAURI__};
  globalThis.document={querySelector(selector){return selector==='#app'?root:null;}};
  globalThis.FormData=class{constructor(form){this.form=form;}get(name){return this.form[name];}};
  globalThis.confirm=()=>{throw new Error('native confirm must not be used');};
  globalThis.__TAURI__={core:{invoke:async(_command,{operation,input})=>{
    calls.push({operation,input});
    if(operation==='workspace.overview')return {counts:{gigs:0,tasks:0,contacts:0,finances:0},gigs:{items:[],count:0},tasks:{items:[],count:0},finances:{items:[],count:0}};
    if(operation==='workspace.get')return {id:'w1',name:'Acceptance'};
    if(operation==='records.list')return input.entity==='profile'?{items:[{id:'p1'}],count:1}:{items:[],count:0};
    if(operation==='records.get')return {id:'p1',fields:{Currency:'USD'}};
    if(operation==='connections.status')return {state:'disconnected'};
    if(operation==='agent.status')return {};
    if(operation==='backup.restore')return {restored:true,safetyBackupId:'safety-1'};
    throw new Error(`unexpected ${operation}`);
  }}};
  try{
    await import('./app.mjs?restore-flow-test');
    await until(()=>root.innerHTML.includes('Your work at a glance'));
    handlers.click({target:{closest:()=>({dataset:{page:'settings'}})}});
    await until(()=>root.innerHTML.includes('Backup & restore'));
    handlers.submit({preventDefault(){},target:{id:'restore-form',backupId:'64cad020-db32-49e9-8e85-581ed3172dbb'}});
    await until(()=>root.innerHTML.includes('Confirm restore'));
    assert.equal(calls.filter(call=>call.operation==='backup.restore').length,0);
    assert.match(root.innerHTML,/64cad020-db32-49e9-8e85-581ed3172dbb/);
    handlers.click({target:{closest:()=>({dataset:{restoreToggle:'1'}})}});
    assert.ok(!root.innerHTML.includes('Confirm restore'));
    handlers.submit({preventDefault(){},target:{id:'restore-form',backupId:'64cad020-db32-49e9-8e85-581ed3172dbb'}});
    await until(()=>root.innerHTML.includes('Confirm restore'));
    handlers.click({target:{closest:()=>({dataset:{confirmRestore:'1'}})}});
    await until(()=>calls.some(call=>call.operation==='backup.restore'));
    assert.deepEqual(calls.filter(call=>call.operation==='backup.restore'),[{operation:'backup.restore',input:{backupId:'64cad020-db32-49e9-8e85-581ed3172dbb'}}]);
    await until(()=>root.innerHTML.includes('Backup restored'));
  }finally{
    globalThis.document=original.document;globalThis.FormData=original.FormData;
    globalThis.confirm=original.confirm;globalThis.__TAURI__=original.__TAURI__;
  }
});
