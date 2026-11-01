import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runBackups } from './backup-loop.mjs';

test('does no work before interval and exits on cancellation', async () => {
  const controller = new AbortController();
  let calls = 0;
  const work = runBackups({ signal: controller.signal, intervalMs: 10000, backup: async () => { calls++; } });
  controller.abort();
  await work;
  assert.equal(calls, 0);
});

test('serializes backups and aborts in-flight work without retry', async () => {
  const controller = new AbortController();
  let calls = 0;
  const work = runBackups({ signal: controller.signal, intervalMs: 1, backup: async (signal) => {
    calls++;
    await new Promise(resolve => signal.addEventListener('abort', resolve, { once: true }));
  } });
  await new Promise(resolve => setTimeout(resolve, 20));
  assert.equal(calls, 1);
  controller.abort();
  await work;
  assert.equal(calls, 1);
});

test('failed backup waits next interval; cancellation ends loop', async () => {
  const controller = new AbortController();
  let calls = 0;
  await runBackups({ signal: controller.signal, intervalMs: 1, onError: () => {}, backup: async () => {
    calls++;
    if (calls === 2) controller.abort();
    throw new Error('mount unavailable');
  } });
  assert.equal(calls, 2);
});
