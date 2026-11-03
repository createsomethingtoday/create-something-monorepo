// Seed a brand-new disposable profile through the candidate's typed MCP only.
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
assert.ok(process.argv[2], 'Pass an explicit candidate gigi-mcp binary');
const profile=await mkdtemp(join(tmpdir(),'gigi-daily-polish-native-'));
const data=join(profile,'data'), home=join(profile,'home');await mkdir(home);
const client=new Client({name:'gigi-daily-polish-synthetic',version:'1.0.0'});
try {
 await client.connect(new StdioClientTransport({command:resolve(process.argv[2]),env:{PATH:process.env.PATH,HOME:home,GIGI_DATA_DIR:data}}));
 const call=async(name,args={})=>{const r=await client.callTool({name,arguments:args});assert.notEqual(r.isError,true,JSON.stringify(r.content));return JSON.parse(r.content.find(c=>c.type==='text').text);};
 assert.equal(await call('gigi_workspace_get'),null);
 const workspace=await call('gigi_workspace_create',{name:'Synthetic daily polish'});
 const save=(entity,title,fields)=>call('gigi_records_save',{workspaceId:workspace.id,entity,title,fields});
 await save('profile','Synthetic owner',{Currency:'USD'});
 const today=new Intl.DateTimeFormat('en-CA').format(new Date());
 await save('tasks','Confirm the revised rehearsal time',{Status:'Open','Due Date':today});
 await save('tasks','Send the stage plan to the crew',{Status:'Open'});
 await save('gigs','Soundcheck and rehearsal · autumn showcase',{Date:today,Status:'Confirmed','Work kind':'Performance'});
 await save('gigs','Late set at the studio',{Date:today,Status:'Confirmed'});
 const receipt={profile,data,home,workspaceId:workspace.id,binary:resolve(process.argv[2])};
 await writeFile(join(profile,'profile.json'),JSON.stringify(receipt,null,2)+'\n');console.log(JSON.stringify(receipt));
}finally{await client.close();}
