import test from 'node:test';
import assert from 'node:assert/strict';
import { access, mkdtemp, mkdir, writeFile, readFile, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { packageAgent } from './package-agent.mjs';

test('requires an explicit existing profile and packages its exact data root', async () => {
 const root=await mkdtemp(join(tmpdir(),'gigi-agent-'));
 try {
  const bundle=join(root,'GiGi.app'), output=join(root,'agent'), dataRoot=join(root,'second-profile');
  const binary=join(bundle,'Contents','Resources','gigi-mcp');
  await mkdir(join(bundle,'Contents','Resources'),{recursive:true});
  await writeFile(binary,'#!/bin/sh\nexit 0\n',{mode:0o755});
  await assert.rejects(packageAgent({bundle,output}), /data root/i);
  await assert.rejects(packageAgent({bundle,output,dataRoot:'relative-profile'}), /absolute/i);
  await assert.rejects(packageAgent({bundle,output,dataRoot}), /data root/i);
  await mkdir(dataRoot);
  await assert.rejects(packageAgent({bundle,output,dataRoot}), /GiGi database/i);
  await writeFile(join(dataRoot,'gigi.sqlite'),'SQLite format 3\0');
  const linkedRoot=join(root,'linked-profile');
  await symlink(dataRoot,linkedRoot);
  await assert.rejects(packageAgent({bundle,output,dataRoot:linkedRoot}), /symlink/i);
  await rm(binary);
  await assert.rejects(packageAgent({bundle,output,dataRoot}), /companion/i);
  await writeFile(binary,'#!/bin/sh\nexit 0\n',{mode:0o755});
  await packageAgent({bundle,output,dataRoot});
  const config=JSON.parse(await readFile(join(output,'.mcp.json'),'utf8'));
  assert.equal(config.mcpServers.gigi.command,binary);
  assert.deepEqual(config.mcpServers.gigi.args,[]);
  assert.equal(config.mcpServers.gigi.env.GIGI_DATA_DIR,dataRoot);
  assert.ok((await readFile(join(output,'skills','gigi','SKILL.md'),'utf8')).includes('SQLite'));
  const manifest=JSON.parse(await readFile(join(output,'.codex-plugin','plugin.json'),'utf8'));
  assert.equal(manifest.mcpServers,'./.mcp.json');
 } finally {await rm(root,{recursive:true,force:true});}
});

test('packaged MCP opens the selected installed profile, not another local profile', async (t) => {
 const installedBinary=process.env.GIGI_INSTALLED_MCP;
 if(!installedBinary){t.skip('Set GIGI_INSTALLED_MCP to run the installed-companion verifier.');return;}
 await access(installedBinary);
 const root=await mkdtemp(join(tmpdir(),'gigi-packaged-profile-'));
 const firstRoot=join(root,'first'), secondRoot=join(root,'second');
 await mkdir(firstRoot);await mkdir(secondRoot);
 async function connect(command,dataRoot){
  const client=new Client({name:'gigi-agent-package-test',version:'0.1.0'},{capabilities:{}});
  await client.connect(new StdioClientTransport({command,env:{PATH:process.env.PATH??'/usr/bin:/bin',HOME:dataRoot,GIGI_DATA_DIR:dataRoot}}));
  return client;
 }
 async function call(client,name,args={}){
  const result=await client.callTool({name,arguments:args});
  assert.equal(result.isError,false);
  return result.structuredContent??JSON.parse(result.content[0].text);
 }
 let client;
 try{
  client=await connect(installedBinary,firstRoot);
  const first=await call(client,'gigi_workspace_create',{name:'First profile'});
  await client.close();client=undefined;
  client=await connect(installedBinary,secondRoot);
  const second=await call(client,'gigi_workspace_create',{name:'Second profile'});
  await client.close();client=undefined;
  assert.notEqual(first.id,second.id);
  const bundle=dirname(dirname(dirname(resolve(installedBinary))));
  const output=join(root,'agent');
  await packageAgent({bundle,output,dataRoot:secondRoot});
  const config=JSON.parse(await readFile(join(output,'.mcp.json'),'utf8')).mcpServers.gigi;
  client=await connect(config.command,config.env.GIGI_DATA_DIR);
  const selected=await call(client,'gigi_workspace_get');
  assert.equal(selected.id,second.id);
  assert.notEqual(selected.id,first.id);
 }finally{
  if(client)await client.close();
  await rm(root,{recursive:true,force:true});
 }
});
