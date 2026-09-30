import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {resolve,dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
const app=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const {Client}=await import('@modelcontextprotocol/sdk/client/index.js');
const {StdioClientTransport}=await import('@modelcontextprotocol/sdk/client/stdio.js');
const data=await mkdtemp(join(tmpdir(),'gigi-mcp-smoke-'));
const binary=process.argv[2] ? resolve(process.argv[2]) : join(app,'src-tauri/resources/gigi-mcp');
const client=new Client({name:'gigi-interoperability-test',version:'0.1.0'});
let calls=0;
try {
 await client.connect(new StdioClientTransport({command:binary,env:{PATH:process.env.PATH,HOME:process.env.HOME,GIGI_DATA_DIR:data}}));
 const catalog=await client.listTools();
 assert.ok(catalog.tools.length<=12);
 assert.ok(!catalog.tools.some(t=>t.name.includes('restore')));
 async function call(name,args={}) {
  const response=await client.callTool({name,arguments:args}); calls++;
  assert.notEqual(response.isError,true,JSON.stringify(response.content));
  return JSON.parse(response.content.find(x=>x.type==='text').text);
 }
 assert.equal(await call('gigi_workspace_get'),null);
 const workspace=await call('gigi_workspace_create',{name:'Protocol test'});
 const input={workspaceId:workspace.id,entity:'tasks',title:'Confirm Friday door shift',fields:{},idempotencyKey:'mcp-smoke-task'};
 const saved=await call('gigi_records_save',input);
 assert.equal((await call('gigi_records_save',input)).id,saved.id);
 const list=await call('gigi_records_list',{workspaceId:workspace.id,entity:'tasks',limit:5});
 assert.equal(list.count,1);
 assert.equal((await call('gigi_records_get',{workspaceId:workspace.id,entity:'tasks',id:saved.id})).title,input.title);
 assert.ok(Buffer.byteLength(JSON.stringify(list))<6000);
 console.log(JSON.stringify({passed:true,toolCount:catalog.tools.length,calls,checks:['fresh empty workspace','typed writes','idempotent retry','bounded list','record readback']}));
} finally {await client.close(); await rm(data,{recursive:true,force:true});}
