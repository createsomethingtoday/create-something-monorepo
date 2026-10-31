import { test } from 'node:test';
import assert from 'node:assert/strict';
import { backupToMountedR2 } from './container-backup.mjs';

function setup(mounts = 's3fs /data/moltbot fuse.s3fs rw 0 0\n') {
  const calls = [];
  return { calls, io: {
    readFile: async () => mounts,
    access: async () => {},
    execute: async (...args) => { calls.push(args); },
    writeFile: async (...args) => { calls.push(args); },
  } };
}
test('idle or unmounted container does no backup work', async () => {
  const { calls, io } = setup('tmpfs /data/moltbot tmpfs rw 0 0\n');
  await backupToMountedR2(new AbortController().signal, io);
  assert.equal(calls.length, 0);
});
test('missing source refuses to overwrite backup', async () => {
  const { calls, io } = setup();
  io.access = async () => { throw new Error('missing'); };
  await assert.rejects(backupToMountedR2(new AbortController().signal, io), /missing/);
  assert.equal(calls.length, 0);
});
test('each sync has kill timeout and signal; timestamp only after success', async () => {
  const { calls, io } = setup();
  const signal = new AbortController().signal;
  await backupToMountedR2(signal, io);
  assert.equal(calls.length, 3);
  for (const call of calls.slice(0, 2)) {
    assert.equal(call[0], 'rsync');
    assert.equal(call[2].timeout, 30000);
    assert.equal(call[2].killSignal, 'SIGKILL');
    assert.equal(call[2].signal, signal);
  }
  assert.equal(calls[2][0], '/data/moltbot/.last-sync');
});
test('shutdown between operations does not resume work or mark success', async () => {
  const { calls, io } = setup();
  const controller = new AbortController();
  io.execute = async (...args) => { calls.push(args); controller.abort(); };
  await assert.rejects(backupToMountedR2(controller.signal, io), { name: 'AbortError' });
  assert.equal(calls.length, 1);
});
test('failed sync does not record stale timestamp as success', async () => {
  const { calls, io } = setup();
  io.execute = async () => { throw new Error('timeout'); };
  await assert.rejects(backupToMountedR2(new AbortController().signal, io), /timeout/);
  assert.equal(calls.length, 0);
});
