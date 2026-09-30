import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { packageAgent } from './package-agent.mjs';

test('packages an installed companion using exact paths and fails before writing when absent', async () => {
 const root=await mkdtemp(join(tmpdir(),'gigi-agent-'));
 try {
  const bundle=join(root,'GiGi.app'), output=join(root,'agent');
  await assert.rejects(packageAgent({bundle,output}), /companion/);
  const binary=join(bundle,'Contents','Resources','gigi-mcp');
  await mkdir(join(bundle,'Contents','Resources'),{recursive:true});
  await writeFile(binary,'#!/bin/sh\nexit 0\n',{mode:0o755});
  await packageAgent({bundle,output});
  const config=JSON.parse(await readFile(join(output,'.mcp.json'),'utf8'));
  assert.equal(config.mcpServers.gigi.command,binary);
  assert.deepEqual(config.mcpServers.gigi.args,[]);
  assert.ok((await readFile(join(output,'skills','gigi','SKILL.md'),'utf8')).includes('SQLite'));
  const manifest=JSON.parse(await readFile(join(output,'.codex-plugin','plugin.json'),'utf8'));
  assert.equal(manifest.mcpServers,'./.mcp.json');
 } finally {await rm(root,{recursive:true,force:true});}
});
