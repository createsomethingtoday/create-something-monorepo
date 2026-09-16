import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { install } from '../zellij-cockpit-install.mjs';

test('immutable install, second release and verified rollback preserve state', (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cs-zellij-install-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const source = path.join(dir, 'source'),
    destination = path.join(dir, 'app with spaces'),
    binaries = path.join(dir, 'bin');
  for (const file of ['scripts/zellij-cockpit.mjs', 'scripts/zellij-cockpit-hook.mjs']) {
    fs.mkdirSync(path.dirname(path.join(source, file)), { recursive: true });
    fs.copyFileSync(
      fileURLToPath(new URL(`../${path.basename(file)}`, import.meta.url)),
      path.join(source, file)
    );
  }
  const wasm = path.join(
    source,
    'packages/zellij-cockpit/target/wasm32-wasip1/release/create-something-zellij-cockpit.wasm'
  );
  fs.mkdirSync(path.dirname(wasm), { recursive: true });
  fs.writeFileSync(wasm, Buffer.from([0, 97, 115, 109, 1, 0, 0, 0]));
  const first = install({ source, destination, binaries });
  const invocation = spawnSync(first.bin, [], { encoding: 'utf8' });
  assert.equal(invocation.status, 1);
  assert.match(invocation.stderr, /Use launch/);
  const eventDir = path.join(destination, 'tasks', 'hook-test', 'events');
  const hookRun = spawnSync(
    process.execPath,
    [path.join(first.release, 'scripts/zellij-cockpit-hook.mjs'), eventDir],
    { input: JSON.stringify({ hook_event_name: 'Stop', session_id: 'fixture' }), encoding: 'utf8' }
  );
  assert.equal(hookRun.status, 0);
  assert.equal(fs.readdirSync(eventDir).length, 1);
  fs.writeFileSync(path.join(source, 'scripts/zellij-cockpit.mjs'), '// second');
  const second = install({ source, destination, binaries });
  assert.notEqual(first.releaseId, second.releaseId);
  assert.equal(second.previous, first.release);
  const rollback = install({ destination, binaries, rollback: first.releaseId });
  assert.equal(fs.readlinkSync(path.join(destination, 'current')), first.release);
  assert.equal(rollback.previous, second.release);
  fs.writeFileSync(path.join(first.release, 'scripts/zellij-cockpit.mjs'), 'corrupt');
  assert.throws(() => install({ destination, binaries, rollback: first.releaseId }), /checksum/);
});
