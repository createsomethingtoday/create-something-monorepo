import assert from 'node:assert/strict';
import { test } from 'node:test';

import { parseArgs, runProductionSmoke } from '../scripts/production-smoke.mjs';

function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    ...init,
    headers: {
      'content-type': 'application/json',
      ...Object.fromEntries(new Headers(init.headers ?? undefined))
    }
  });
}

test('parses production smoke options from env and args', () => {
  const args = parseArgs(
    [
      'node',
      'production-smoke.mjs',
      '--origin',
      'https://ink.example.test/',
      '--device-id',
      'core-ink-test',
      '--surface',
      'desk',
      '--skip-heartbeat'
    ],
    { INK_DEVICE_TOKEN: 'device-token' }
  );

  assert.equal(args.origin, 'https://ink.example.test/');
  assert.equal(args.token, 'device-token');
  assert.equal(args.deviceId, 'core-ink-test');
  assert.equal(args.surface, 'desk');
  assert.equal(args.skipHeartbeat, true);
});

test('checks production health, clock, brief, and heartbeat contracts', async () => {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  const fetch = async (url: string | URL | Request, init?: RequestInit) => {
    const href = String(url);
    calls.push({ url: href, init });

    if (href === 'https://ink.example.test/healthz') {
      return jsonResponse({ ok: true, service: 'calm-operator-ink-bridge' });
    }
    if (href === 'https://ink.example.test/ink/clock') {
      return jsonResponse({
        ok: true,
        clock: {
          timezone: 'America/Chicago',
          generated_at: '2026-04-30T17:00:00.000Z',
          local_date: '2026-04-30',
          local_time: '12:00',
          display_time: '12:00 PM',
          hour: 12,
          minute: 0
        }
      });
    }
    if (href === 'https://ink.example.test/ink/brief?surface=core-ink&device_id=core-ink-smoke') {
      return jsonResponse({
        state: 'clear',
        headline: 'CALM OPERATOR',
        line1: 'No decisions',
        line2: 'pending',
        detail: 'Live alerts only.',
        action: 'You can step away.',
        urgent: false,
        generated_at: '2026-04-30T17:00:00.000Z',
        clock: {
          display_time: '12:00 PM'
        }
      });
    }
    if (href === 'https://ink.example.test/ink/device-heartbeat') {
      assert.equal(new Headers(init?.headers).get('x-ink-token'), 'device-token');
      assert.equal(init?.method, 'POST');
      assert.equal(typeof init?.body, 'string');
      const body = JSON.parse(String(init?.body));
      assert.equal(body.device_id, 'core-ink-smoke');
      assert.equal(body.payload.kind, 'production_smoke');
      return jsonResponse({
        ok: true,
        device: {
          device_id: 'core-ink-smoke',
          received_at: 1777568400000
        }
      });
    }

    return jsonResponse({ ok: false, error: 'unexpected request' }, { status: 404 });
  };

  const result = await runProductionSmoke(
    {
      origin: 'https://ink.example.test/',
      token: 'device-token',
      deviceId: 'core-ink-smoke',
      surface: 'core-ink'
    },
    { fetch, now: Date.parse('2026-04-30T17:00:00.000Z') }
  );

  assert.equal(result.ok, true);
  assert.equal(result.origin, 'https://ink.example.test');
  assert.deepEqual(result.checks.map((check) => check.name), [
    'GET /healthz',
    'GET /ink/clock',
    'GET /ink/brief',
    'POST /ink/device-heartbeat'
  ]);
  assert.equal(calls.length, 4);
  assert.equal(new Headers(calls[1]?.init?.headers).get('x-ink-token'), 'device-token');
  assert.equal(new Headers(calls[2]?.init?.headers).get('x-ink-token'), 'device-token');
});

test('supports public-only health smoke without a token', async () => {
  const calls: string[] = [];
  const fetch = async (url: string | URL | Request) => {
    calls.push(String(url));
    return jsonResponse({ ok: true, service: 'calm-operator-ink-bridge' });
  };

  const result = await runProductionSmoke({ origin: 'https://ink.example.test', publicOnly: true }, { fetch });

  assert.equal(result.ok, true);
  assert.deepEqual(calls, ['https://ink.example.test/healthz']);
  assert.deepEqual(result.checks.map((check) => check.name), ['GET /healthz']);
});

test('requires a token for authenticated smoke checks', async () => {
  const fetch = async () => jsonResponse({ ok: true, service: 'calm-operator-ink-bridge' });

  await assert.rejects(
    runProductionSmoke({ origin: 'https://ink.example.test' }, { fetch }),
    /INK_DEVICE_TOKEN/
  );
});
