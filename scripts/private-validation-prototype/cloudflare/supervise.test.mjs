import { test } from 'node:test';
import assert from 'node:assert/strict';
import { supervise } from './supervise.mjs';
test('preserves normal exit and bounded output', async () => {
  const r = await supervise(process.execPath, ['-e', 'console.log("ok");process.exitCode=7']);
  assert.equal(r.exitCode, 7); assert.equal(r.reason, null); assert.equal(r.stdout, 'ok\n');
});
test('terminates combined stdout/stderr flood before returning a bounded envelope', async () => {
  const r = await supervise(process.execPath, ['-e', 'const fs=require("fs");for(let i=0;i<10000;i++)fs.writeSync(i%2?1:2,Buffer.alloc(4096,120))']);
  assert.equal(r.reason, 'output-limit'); assert.equal(r.exitCode, 125);
  assert.ok(Buffer.byteLength(r.stdout) <= 8192); assert.ok(Buffer.byteLength(r.stderr) <= 1024);
  assert.ok(r.bytes > 65536);
});
test('deadline kills a quiet process and inherited-pipe descendants', async () => {
  const r = await supervise(process.execPath, ['-e', 'require("child_process").spawn(process.execPath,["-e","setInterval(()=>{},1000)"],{stdio:"inherit"});setInterval(()=>{},1000)'], {deadlineMs:300});
  assert.equal(r.reason, 'deadline'); assert.equal(r.exitCode, 137);
});
