import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { fileURLToPath } from 'node:url';

async function fixture(source, run) {
  const directory = await mkdtemp(join(tmpdir(), 'relay-gateway-test-'));
  try {
    await writeFile(join(directory, 'clawdbot'), `#!${process.execPath}\n${source}`, { mode: 0o700 });
    await run(directory);
  } finally { await rm(directory, { recursive: true, force: true }); }
}
function launch(directory) {
  return spawn(process.execPath, [fileURLToPath(new URL('./run-gateway.mjs', import.meta.url)), 'gateway'], {
    env: { ...process.env, PATH: directory }, stdio: ['ignore', 'pipe', 'pipe'],
  });
}
test('gateway exit cancels backup wait and preserves exit code', { timeout: 5000 }, async () => {
  await fixture('process.exit(7);', async directory => {
    const child = launch(directory);
    try {
      const [code] = await once(child, 'exit');
      assert.equal(code, 7);
    } finally { child.kill('SIGKILL'); }
  });
});
test('termination is forwarded and wrapper exits without waiting five minutes', { timeout: 5000 }, async () => {
  await fixture("process.on('SIGTERM', () => process.exit(0)); console.log('ready'); setInterval(() => {}, 1000);", async directory => {
    const child = launch(directory);
    try {
      await once(child.stdout, 'data');
      const exit = once(child, 'exit');
      child.kill('SIGTERM');
      const [code] = await exit;
      assert.equal(code, 0);
    } finally { child.kill('SIGKILL'); }
  });
});
