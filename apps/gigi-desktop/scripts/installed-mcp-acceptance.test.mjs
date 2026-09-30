import assert from 'node:assert/strict';
import {execFile} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {dirname,join} from 'node:path';
import {promisify} from 'node:util';
import test from 'node:test';

const run=promisify(execFile);
const binary=process.env.GIGI_INSTALLED_MCP;
const script=join(dirname(fileURLToPath(import.meta.url)),'installed-mcp-acceptance.mjs');

test('installed MCP roundtrip persists a linked gig and private backup', {skip:!binary}, async()=>{
  const {stdout}=await run(process.execPath,[script,binary],{timeout:120_000,maxBuffer:32_768});
  const result=JSON.parse(stdout.trim());
  assert.equal(result.passed,true);
  assert.equal(result.workspaceCount,1);
  assert.equal(result.recordCount,4);
  assert.equal(result.linkCount,3);
  assert.equal(result.currency,'USD');
  assert.equal(result.feeCents,14000);
  assert.equal(result.backupIntegrity,'ok');
  assert.equal(result.restoreExposed,false);
  assert.equal(result.restartReadback,true);
  assert.equal(result.isolationReadback,true);
  assert.match(result.binarySha256,/^[a-f0-9]{64}$/);
});
