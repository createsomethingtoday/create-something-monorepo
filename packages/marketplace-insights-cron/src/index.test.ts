import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { DAILY_SNAPSHOT_CRON, captureSnapshot, publishInsights } from './index.ts';

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
    return Response.json({ success: true, captured: 2, date: '2026-11-10', marketplace: { success: true, leaderboard: { captured: 50 } }, assets: [{ name: 'x' }] });
  }) as typeof fetch);
  assert.equal(seen, 'GET https://dashboard.test/api/cron/snapshot');
  assert.deepEqual(result, { captured: 2, date: '2026-11-10', marketplace: { success: true, leaderboard: { captured: 50 } } });
});

test('a 200 with a failed marketplace capture still fails the run', async () => {
  await assert.rejects(
    captureSnapshot(env, (async () => Response.json({ success: true, marketplace: { success: false, error: 'no rows' } })) as typeof fetch),
    /trend capture failed: no rows/
  );
});

test('a successful capture with zero leaderboard rows still fails the run', async () => {
  await assert.rejects(
    captureSnapshot(env, (async () => Response.json({ success: true, marketplace: { success: true, leaderboard: { captured: 0 } } })) as typeof fetch),
    /wrote 0 rows/
  );
});

/** Cloudflare counts cron weekdays from 1 = Sunday to 7 = Saturday (standard cron: 0 = Sunday). */
const CLOUDFLARE_WEEKDAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const cloudflareWeekday = (field: string) =>
  /^[1-7]$/.test(field) ? CLOUDFLARE_WEEKDAYS[Number(field) - 1] : field.toUpperCase();

test('the weekly publication crons fire on Tuesday, after the window closes on Monday 16:00 UTC', () => {
  const config = readFileSync(new URL('../wrangler.jsonc', import.meta.url), 'utf8');
  const crons = [...config.matchAll(/^\s*"([^"]+)",?\s*$/gm)].map((match) => match[1]);
  assert.ok(crons.includes(DAILY_SNAPSHOT_CRON), 'daily snapshot cron is configured');
  const weekly = crons.filter((cron) => cron !== DAILY_SNAPSHOT_CRON);
  assert.equal(weekly.length, 2);
  for (const cron of weekly) assert.equal(cloudflareWeekday(cron.split(' ')[4]), 'TUE', cron);
});
