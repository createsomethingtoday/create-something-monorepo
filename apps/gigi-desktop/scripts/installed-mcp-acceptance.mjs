import assert from 'node:assert/strict';
import {execFile} from 'node:child_process';
import {createHash} from 'node:crypto';
import {createReadStream} from 'node:fs';
import {mkdtemp,rm,stat} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {promisify} from 'node:util';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StdioClientTransport} from '@modelcontextprotocol/sdk/client/stdio.js';

const run=promisify(execFile);
const binaryInput=process.argv[2] || process.env.GIGI_INSTALLED_MCP;
if(!binaryInput)throw new Error('Pass the installed gigi-mcp path or set GIGI_INSTALLED_MCP.');
const binary=resolve(binaryInput);
const data=await mkdtemp(join(tmpdir(),'gigi-installed-mcp-'));
const otherData=await mkdtemp(join(tmpdir(),'gigi-installed-other-'));
const hash=createHash('sha256');
for await (const chunk of createReadStream(binary))hash.update(chunk);
const binarySha256=hash.digest('hex');
let client;

async function connect(root=data){
  const next=new Client({name:'gigi-installed-acceptance',version:'0.1.0'});
  await next.connect(new StdioClientTransport({command:binary,env:{PATH:process.env.PATH??'/usr/bin:/bin',HOME:root,GIGI_DATA_DIR:root}}));
  return next;
}
async function call(name,args={}){
  const response=await client.callTool({name,arguments:args});
  assert.notEqual(response.isError,true,`${name}: ${JSON.stringify(response.content)}`);
  const text=response.content.find(item=>item.type==='text')?.text;
  assert.equal(typeof text,'string',`${name} returned no text`);
  return JSON.parse(text);
}

try{
  client=await connect();
  const tools=(await client.listTools()).tools;
  assert.ok(tools.length<=12);
  const names=new Set(tools.map(tool=>tool.name));
  for(const required of ['gigi_workspace_create','gigi_records_save','gigi_records_get','gigi_records_list','gigi_relations_link','gigi_gigs_summary','gigi_backup_create'])assert.ok(names.has(required),`missing ${required}`);
  const restoreExposed=[...names].some(name=>name.includes('restore'));
  assert.equal(restoreExposed,false);
  assert.equal(await call('gigi_workspace_get'),null);

  const workspace=await call('gigi_workspace_create',{name:'Installed acceptance'});
  const workspaceId=workspace.id;
  assert.equal(typeof workspaceId,'string');
  const roles=(await call('gigi_schema_describe',{entity:'gigs'})).relationFields;
  assert.ok(roles.some(role=>role.name==='Booked Through'&&role.targetEntity==='contacts'));
  assert.ok(roles.some(role=>role.name==='Tasks'&&role.targetEntity==='tasks'));

  const profile=await call('gigi_records_save',{workspaceId,entity:'profile',title:'Acceptance operator',fields:{Currency:'USD'},idempotencyKey:'profile-usd'});
  const gig=await call('gigi_records_save',{workspaceId,entity:'gigs',title:'Friday saxophone set',fields:{Fee:12500,Status:'Confirmed'},idempotencyKey:'gig-create'});
  const contact=await call('gigi_records_save',{workspaceId,entity:'contacts',title:'Booking contact',idempotencyKey:'contact-create'});
  const task=await call('gigi_records_save',{workspaceId,entity:'tasks',title:'Confirm Friday call time',idempotencyKey:'task-create'});
  assert.equal(profile.fields.Currency,'USD');
  assert.equal(gig.fields.Fee,12500);
  await call('gigi_relations_link',{workspaceId,fromEntity:'gigs',fromId:gig.id,toEntity:'contacts',toId:contact.id,role:'Booked Through',idempotencyKey:'gig-contact'});
  await call('gigi_relations_link',{workspaceId,fromEntity:'gigs',fromId:gig.id,toEntity:'tasks',toId:task.id,role:'Tasks',idempotencyKey:'gig-task'});
  await call('gigi_relations_link',{workspaceId,fromEntity:'tasks',fromId:task.id,toEntity:'contacts',toId:contact.id,role:'Waiting On',idempotencyKey:'task-contact'});
  const linked=await call('gigi_records_get',{workspaceId,entity:'gigs',id:gig.id});
  assert.equal(linked.relationCount,2);
  assert.deepEqual(new Set(linked.relations.map(relation=>relation.role)),new Set(['Booked Through','Tasks']));
  assert.ok(linked.relations.some(relation=>relation.toTitle==='Booking contact'));
  assert.ok(linked.relations.some(relation=>relation.toTitle==='Confirm Friday call time'));

  const edited=await call('gigi_records_save',{workspaceId,entity:'gigs',id:gig.id,title:'Friday saxophone set — confirmed',fields:{Fee:14000,Status:'Confirmed'},idempotencyKey:'gig-edit'});
  assert.equal(edited.fields.Fee,14000);
  assert.equal(edited.relationCount,2);
  const summary=await call('gigi_gigs_summary',{workspaceId,gigId:gig.id});
  assert.equal(summary.currency,'USD');
  assert.equal(summary.feeCents,14000);
  assert.equal(summary.balanceDueCents,14000);
  assert.equal(summary.financialsComplete,true);

  const renamed=await call('gigi_records_save',{workspaceId,entity:'gigs',id:gig.id,title:'Friday saxophone set — confirmed',idempotencyKey:'gig-title-only'});
  assert.equal(renamed.fields.Fee,14000,'title-only update must preserve the fee');
  assert.equal(renamed.fields.Status,'Confirmed','title-only update must preserve status');
  assert.equal(renamed.relationCount,2,'title-only update must preserve links');
  const renamedSummary=await call('gigi_gigs_summary',{workspaceId,gigId:gig.id});
  assert.equal(renamedSummary.feeCents,14000);
  assert.equal(renamedSummary.balanceDueCents,14000);

  const cleared=await call('gigi_records_save',{workspaceId,entity:'gigs',id:gig.id,title:renamed.title,fields:{},fieldsMode:'replace',idempotencyKey:'gig-clear-fields'});
  assert.deepEqual(cleared.fields,{},'explicit editor replacement must clear omitted fields');
  assert.equal(cleared.relationCount,2);
  const clearedSummary=await call('gigi_gigs_summary',{workspaceId,gigId:gig.id});
  assert.equal(clearedSummary.feeCents,null,'cleared fee must remain unknown');
  await call('gigi_records_save',{workspaceId,entity:'gigs',id:gig.id,title:renamed.title,fields:{Fee:14000,Status:'Confirmed'},fieldsMode:'replace',idempotencyKey:'gig-restore-fields'});

  const backup=await call('gigi_backup_create',{workspaceId});
  assert.match(backup.backupId,/^[a-f0-9-]{36}$/);
  const backupPath=join(data,'backups',`${backup.backupId}.sqlite`);
  assert.equal((await stat(backupPath)).mode&0o077,0);
  // SQLite backup retains WAL mode; immutable read-only access needs no sidecar files.
  const backupUri=`file:${backupPath}?immutable=1`;
  const {stdout:integrity}=await run('sqlite3',['-readonly',backupUri,'PRAGMA integrity_check;'],{timeout:10_000});
  assert.equal(integrity.trim(),'ok');
  const {stdout:backupRows}=await run('sqlite3',['-readonly',backupUri,'SELECT count(*) FROM gigs;'],{timeout:10_000});
  assert.equal(backupRows.trim(),'1');

  await client.close();client=undefined;
  client=await connect(otherData);
  assert.equal(await call('gigi_workspace_get'),null);
  const foreign=await client.callTool({name:'gigi_records_get',arguments:{workspaceId,entity:'gigs',id:gig.id}});
  assert.equal(foreign.isError,true);
  await client.close();client=undefined;
  client=await connect();
  const reopened=await call('gigi_workspace_get');
  assert.equal(reopened.id,workspaceId);
  const readback=await call('gigi_records_get',{workspaceId,entity:'gigs',id:gig.id});
  assert.equal(readback.title,'Friday saxophone set — confirmed');
  assert.equal(readback.fields.Fee,14000);
  assert.equal(readback.relationCount,2);
  const taskReadback=await call('gigi_records_get',{workspaceId,entity:'tasks',id:task.id});
  assert.equal(taskReadback.title,'Confirm Friday call time');
  assert.equal(taskReadback.relationCount,2);
  const counts=await Promise.all(['profile','gigs','contacts','tasks'].map(async entity=>(await call('gigi_records_list',{workspaceId,entity,limit:5})).count));
  assert.deepEqual(counts,[1,1,1,1]);
  const repeatSummary=await call('gigi_gigs_summary',{workspaceId,gigId:gig.id});
  assert.equal(repeatSummary.feeCents,14000);
  console.log(JSON.stringify({passed:true,binarySha256,workspaceCount:1,recordCount:counts.reduce((a,b)=>a+b,0),linkCount:3,currency:repeatSummary.currency,feeCents:repeatSummary.feeCents,backupIntegrity:integrity.trim(),restoreExposed,restartReadback:true,isolationReadback:true}));
}finally{
  await client?.close();
  if(process.env.GIGI_KEEP_ACCEPTANCE_DATA==='1')console.error(`Isolated acceptance data retained at ${data} and ${otherData}`);
  else await Promise.all([rm(data,{recursive:true,force:true}),rm(otherData,{recursive:true,force:true})]);
}
