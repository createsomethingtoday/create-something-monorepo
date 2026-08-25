import assert from 'node:assert/strict';
import test from 'node:test';

import worker from '../src/index.ts';
import type { MapMonitorEnv } from '../src/monitor.ts';

const SOURCE_SHA = 'b'.repeat(40);
type WorkerRequest = Parameters<typeof worker.fetch>[0];

function workerRequest(url: string, init?: RequestInit): WorkerRequest {
  return new Request(url, init) as unknown as WorkerRequest;
}

function env(sourceSha = SOURCE_SHA): MapMonitorEnv {
  return {
    DB: {} as D1Database,
    BROWSER: {} as Fetcher,
    MAP_MONITOR_SOURCE_SHA: sourceSha,
    MAP_MONITOR_BASE_URL: 'https://createsomething.agency',
    MAP_MONITOR_RECEIPT_RETENTION_DAYS: '30',
    CF_VERSION_METADATA: { id: 'worker-version' },
  };
}

test('health reports a non-cacheable ready receipt lane only with required provenance', async () => {
  const response = await worker.fetch(
    workerRequest('https://map-production-monitor.createsomething.workers.dev/health'),
    env(),
  );

  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.deepEqual(await response.json(), {
    schemaVersion: 1,
    status: 'ready',
    worker: 'map-production-monitor',
    receiptStore: 'cloudflare-d1',
    scheduledOnly: true,
  });
});

test('health fails closed and exposes no manual execution route', async () => {
  const degraded = await worker.fetch(
    workerRequest('https://map-production-monitor.createsomething.workers.dev/health'),
    env('not-a-commit'),
  );
  assert.equal(degraded.status, 503);
  assert.equal((await degraded.json() as { status: string }).status, 'degraded');

  for (const request of [
    workerRequest('https://map-production-monitor.createsomething.workers.dev/__scheduled'),
    workerRequest('https://map-production-monitor.createsomething.workers.dev/health', { method: 'POST' }),
  ]) {
    const response = await worker.fetch(request, env());
    assert.equal(response.status, 404);
  }
});
