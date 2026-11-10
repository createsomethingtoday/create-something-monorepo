import assert from 'node:assert/strict';
import { test } from 'node:test';
import { captureSnapshot, publishInsights } from './index.ts';

const env = { DASHBOARD_URL: 'https://dashboard.test', CRON_SECRET: 'cron-secret' };

test('calls the dashboard publish endpoint with the cron secret', async () => {
  let seen: { url: string; init?: RequestInit } | undefined;
  const result = await publishInsights(env, (async (url: URL, init?: RequestInit) => {
    seen = { url: String(url), init };
    return new Response(JSON.stringify({ success: true, recordId: 'rec' }), { status: 200 });
  }) as typeof fetch);
  assert.equal(seen?.url, 'https://dashboard.test/api/cron/insights');
  assert.equal(seen?.init?.method, 'POST');
  assert.deepEqual(seen?.init?.headers, { authorization: 'Bearer cron-secret' });
  assert.deepEqual(result, { success: true, recordId: 'rec' });
});

test('a failed publication throws so the cron run is marked failed', async () => {
  await assert.rejects(
    publishInsights(env, (async () => new Response('not ready', { status: 500 })) as typeof fetch),
    /insights failed \(500\): not ready/
  );
});

test('refuses to run without the cron secret', async () => {
  await assert.rejects(publishInsights({ ...env, CRON_SECRET: '' }), /CRON_SECRET/);
});

test('daily snapshot calls the snapshot endpoint and returns counts only', async () => {
  let seen = '';
  const result = await captureSnapshot(env, (async (url: URL, init?: RequestInit) => {
    seen = `${init?.method} ${url}`;
    return Response.json({ success: true, captured: 2, date: '2026-11-10', marketplace: { success: true }, assets: [{ name: 'x' }] });
  }) as typeof fetch);
  assert.equal(seen, 'GET https://dashboard.test/api/cron/snapshot');
  assert.deepEqual(result, { captured: 2, date: '2026-11-10', marketplace: { success: true } });
});

test('a 200 with a failed marketplace capture still fails the run', async () => {
  await assert.rejects(
    captureSnapshot(env, (async () => Response.json({ success: true, marketplace: { success: false, error: 'no rows' } })) as typeof fetch),
    /trend capture failed: no rows/
  );
});
