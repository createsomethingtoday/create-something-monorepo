import assert from 'node:assert/strict';
import {mkdtemp,rm,readFile,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {test} from 'node:test';
import {createCodexAdapter,type AppServer} from '../src/codex.ts';
const names=['gigi_workspace_get','gigi_schema_describe','gigi_records_list','gigi_records_get','gigi_gigs_summary','gigi_history_list','gigi_records_save','gigi_agenda_list'];
class Server implements AppServer {
 events:Array<(message:any)=>void>=[]; replies:any[]=[];
 async request(method:string,_params:any):Promise<any>{
  if(method==='account/read')return {account:{type:'chatgpt'}};
  if(['thread/start','thread/resume','thread/read'].includes(method))return {thread:{id:'thread-1',status:{type:'idle'},turns:[]}};
  if(method==='thread/turns/list')return {data:[],nextCursor:null};
  if(method==='plugin/installed')return {marketplaces:[]};
  if(method==='turn/start')return {turn:{id:'turn-1'}};
  throw new Error(method);
 }
 onMessage(handler:(message:any)=>void){this.events.push(handler);return()=>{};}
 reply(id:string|number,result:unknown){this.replies.push({id,result});}
}
async function fixture(){
 const dataDir=await mkdtemp(join(tmpdir(),'gigi-source-links-'));const server=new Server();let result:any={};
 const mcp:AppServer={request:async(method,p)=>{
  if(method==='tools/list')return {tools:names.map(name=>({name,description:name,inputSchema:{type:'object'}}))};
  if(p.name==='gigi_workspace_get')return {content:[{type:'text',text:JSON.stringify({id:p.arguments.workspaceId})}]};
  return result;
 },onMessage:()=>()=>{},reply:()=>{}};
 const options={dataDir,mcpBinary:'/fixture/mcp',skillPath:'/fixture/SKILL.md',server,mcp};const adapter=createCodexAdapter(options);
 const {sessionId}=await adapter.start({workspaceId:'w',message:'Help me plan'});
 const emit=async(tool:string,args:any,value:any)=>{result=value;await Promise.all(server.events.map(fn=>fn({id:123,method:'item/tool/call',params:{threadId:'thread-1',tool,arguments:{workspaceId:'w',...args}}})));};
 return {adapter,server,sessionId,emit,dataDir,options};
}
test('workspace chat exposes links only from successful scoped tool reads and keeps them after restart',async()=>{
 const f=await fixture();try{
 await f.emit('gigi_records_get',{entity:'tasks',id:'t1'},{structuredContent:{workspaceId:'w',entity:'tasks',id:'t1',title:'Call venue'}});
 await f.emit('gigi_records_list',{entity:'contacts'},{content:[{type:'text',text:JSON.stringify({items:[{workspaceId:'w',entity:'contacts',id:'c1',title:'Venue contact'}]})}]});
 await f.emit('gigi_agenda_list',{today:'2026-10-30',timeZone:'UTC'},{structuredContent:{items:[{workspaceId:'w',entity:'schedule',id:'e1',title:'Rehearsal'}]}});
 const expected=[{entity:'tasks',id:'t1',title:'Call venue'},{entity:'contacts',id:'c1',title:'Venue contact'},{entity:'schedule',id:'e1',title:'Rehearsal'}];
 assert.deepEqual((await f.adapter.read({workspaceId:'w',sessionId:f.sessionId})).recordLinks,expected);
 const restarted=createCodexAdapter({...f.options,server:new Server()});assert.deepEqual((await restarted.read({workspaceId:'w',sessionId:f.sessionId})).recordLinks,expected);
 await assert.rejects(restarted.read({workspaceId:'foreign',sessionId:f.sessionId}),/session_not_found/);
 }finally{await rm(f.dataDir,{recursive:true,force:true});}
});
test('failed, mismatched, malformed or model-supplied references never become source controls',async()=>{
 const f=await fixture();try{
 for(const result of [{isError:true,structuredContent:{id:'t1',title:'No'}},{structuredContent:{workspaceId:'foreign',entity:'tasks',id:'t1',title:'No'}},{structuredContent:{workspaceId:'w',entity:'contacts',id:'t1',title:'No'}},{structuredContent:{workspaceId:'w',entity:'tasks',id:'wrong',title:'No'}}])await f.emit('gigi_records_get',{entity:'tasks',id:'t1'},result);
 await f.emit('gigi_agenda_list',{}, {structuredContent:{items:[{entity:'javascript:alert(1)',id:'evil',title:'No'},{entity:'gigs',id:'',title:'No'},{workspaceId:'foreign',entity:'gigs',id:'foreign',title:'No'}]}});
 await f.emit('gigi_context_search',{query:'help'},{structuredContent:{items:[{entity:'tasks',id:'from-prose',title:'Not a record read'}]}});
 assert.deepEqual((await f.adapter.read({workspaceId:'w',sessionId:f.sessionId})).recordLinks,[]);
 }finally{await rm(f.dataDir,{recursive:true,force:true});}
});
test('record source controls are deduplicated and bounded, and old ledgers remain readable',async()=>{
 const f=await fixture();try{
 const items=Array.from({length:40},(_,i)=>({workspaceId:'w',entity:'tasks',id:`t${i}`,title:`Task ${i}`}));
 await f.emit('gigi_records_list',{entity:'tasks'},{structuredContent:{items}});
 await f.emit('gigi_records_get',{entity:'tasks',id:'t0'},{structuredContent:items[0]});
 const links=(await f.adapter.read({workspaceId:'w',sessionId:f.sessionId})).recordLinks;assert.equal(links.length,20);assert.equal(new Set(links.map(x=>`${x.entity}:${x.id}`)).size,20);assert(links.some(x=>x.id==='t0'));
 const ledger=join(f.dataDir,'codex-chat','sessions.jsonl');const entries=(await readFile(ledger,'utf8')).trim().split('\n').map(line=>{const entry=JSON.parse(line);delete entry.recordLinks;return entry;});await writeFile(ledger,entries.map(x=>JSON.stringify(x)).join('\n')+'\n');
 const old=createCodexAdapter({...f.options,server:new Server()});assert.deepEqual((await old.read({workspaceId:'w',sessionId:f.sessionId})).recordLinks,[]);
 }finally{await rm(f.dataDir,{recursive:true,force:true});}
});
