import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const context=vm.createContext({});
vm.runInContext(fs.readFileSync(new URL('../src/publication-guard.js',import.meta.url),'utf8')+';globalThis.guard=PublicationGuard;',context);
const guard=context.guard;
test('failed live readback cannot become a baseline reset',async()=>{
 let writes=0;
 await assert.rejects(()=>guard.publishExisting({expectedVersion:1,readLatest:async()=>({latest_version:1}),readRaw:async()=>({ok:false,status:503,text:async()=>'<html>error</html>'}),transform:x=>x,write:async()=>{writes++;}}),/readback/);
 assert.equal(writes,0);
});
const good='<script id="wfgr-data" type="application/json">'+JSON.stringify({working:{pages:[{slug:'x',sections:[{id:'x',raw:'saved'}]}],registry:{},changelog:[]}})+'</script>';
for(const [name,versions,html] of [['stale snapshot',[2],good],['intervening update',[1,2],good],['missing island',[1],'<html>login</html>'],['invalid data',[1],'<script id="wfgr-data" type="application/json">{}</script>']]) test(`${name} preserves drafts and performs no PUT`,async()=>{
 let writes=0,index=0;
 await assert.rejects(()=>guard.publishExisting({expectedVersion:1,readLatest:async()=>({latest_version:versions[index++]}),readRaw:async()=>({ok:true,text:async()=>html}),transform:({data})=>data,write:async()=>{writes++;}}));
 assert.equal(writes,0);
});
test('unchanged version publishes preserved working content',async()=>{
 let sent;
 await guard.publishExisting({expectedVersion:1,readLatest:async()=>({latest_version:1}),readRaw:async()=>({ok:true,text:async()=>good}),transform:({data})=>data,write:async data=>{sent=data;}});
 assert.equal(sent.working.pages[0].sections[0].raw,'saved');
});
