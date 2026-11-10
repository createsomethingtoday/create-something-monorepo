import assert from 'node:assert/strict';
import { test } from 'node:test';
import { publishInsights } from './index.ts';

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
    /failed \(500\): not ready/
  );
});

test('refuses to run without the cron secret', async () => {
  await assert.rejects(publishInsights({ ...env, CRON_SECRET: '' }), /CRON_SECRET/);
});
