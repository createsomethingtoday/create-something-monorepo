#!/usr/bin/env node

import { basename } from 'node:path';
import { pathToFileURL } from 'node:url';

import { bridgeUrl } from '../src/producers.ts';

const DEFAULT_ORIGIN = 'https://ink.createsomething.agency';
const DEFAULT_DEVICE_ID = 'production-smoke';
const DEFAULT_SURFACE = 'core-ink';

function usage() {
  return [
    'Usage:',
    `  pnpm smoke:production`,
    `  infisical run --env=prod --path=/ -- pnpm --dir packages/calm-operator-ink-bridge smoke:production`,
    '',
    'Options:',
    '  --origin <url>        Defaults to https://ink.createsomething.agency',
    '  --token <token>       Defaults to INK_DEVICE_TOKEN or CALM_OPERATOR_BRIDGE_TOKEN',
    '  --device-id <id>      Defaults to production-smoke',
    '  --surface <surface>   Defaults to core-ink',
    '  --public-only         Only check GET /healthz; does not require a token',
    '  --skip-heartbeat      Skip the harmless POST /ink/device-heartbeat write',
    '  --help                Show this help'
  ].join('\n');
}

export function parseArgs(argv, env = process.env) {
  const args = {
    origin: DEFAULT_ORIGIN,
    token: env.INK_DEVICE_TOKEN ?? env.CALM_OPERATOR_BRIDGE_TOKEN,
    deviceId: DEFAULT_DEVICE_ID,
    surface: DEFAULT_SURFACE,
    publicOnly: false,
    skipHeartbeat: false
  };

  for (let index = 2; index < argv.length; index += 1) {
    const item = argv[index];
    if (item === '--') continue;
    if (item === '--help' || item === '-h') {
      args.help = true;
    } else if (item === '--origin') {
      args.origin = argv[++index];
    } else if (item === '--token') {
      args.token = argv[++index];
    } else if (item === '--device-id') {
      args.deviceId = argv[++index];
    } else if (item === '--surface') {
      args.surface = argv[++index];
    } else if (item === '--public-only') {
      args.publicOnly = true;
    } else if (item === '--skip-heartbeat') {
      args.skipHeartbeat = true;
    } else {
      throw new Error(`Unknown argument: ${item}`);
    }
  }

  return args;
}

function assertObject(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${label} must be a JSON object`);
  }
  return value;
}

function assertString(value, label) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`${label} must be a non-empty string`);
  }
  return value;
}

async function readJson(response, label) {
  const text = await response.text();
  let payload;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    throw new Error(`${label} returned non-JSON response: ${text.slice(0, 160)}`);
  }

  if (!response.ok) {
    throw new Error(`${label} failed with HTTP ${response.status}: ${JSON.stringify(payload).slice(0, 300)}`);
  }

  return assertObject(payload, label);
}

function authHeaders(token) {
  const headers = new Headers();
  headers.set('x-ink-token', token);
  return headers;
}

async function getJson(fetchImpl, origin, path, label, token) {
  const init = token ? { headers: authHeaders(token) } : undefined;
  return readJson(await fetchImpl(bridgeUrl(origin, path), init), label);
}

async function postJson(fetchImpl, origin, path, label, token, body) {
  const headers = authHeaders(token);
  headers.set('content-type', 'application/json');
  return readJson(
    await fetchImpl(bridgeUrl(origin, path), {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    }),
    label
  );
}

function checkHealth(payload) {
  assertObject(payload, 'GET /healthz payload');
  if (payload.ok !== true) throw new Error('GET /healthz did not return ok: true');
  if (payload.service !== 'calm-operator-ink-bridge') {
    throw new Error(`GET /healthz returned unexpected service: ${String(payload.service)}`);
  }
  return {
    name: 'GET /healthz',
    ok: true,
    service: payload.service
  };
}

function checkClock(payload) {
  const clock = assertObject(payload.clock ?? payload, 'GET /ink/clock clock');
  assertString(clock.generated_at, 'clock.generated_at');
  assertString(clock.local_date, 'clock.local_date');
  assertString(clock.display_time, 'clock.display_time');
  return {
    name: 'GET /ink/clock',
    ok: true,
    generated_at: clock.generated_at,
    local_date: clock.local_date,
    display_time: clock.display_time
  };
}

function checkBrief(payload) {
  const clock = assertObject(payload.clock, 'brief.clock');
  return {
    name: 'GET /ink/brief',
    ok: true,
    state: assertString(payload.state, 'brief.state'),
    headline: assertString(payload.headline, 'brief.headline'),
    generated_at: assertString(payload.generated_at, 'brief.generated_at'),
    clock_time: assertString(clock.display_time, 'brief.clock.display_time')
  };
}

function checkHeartbeat(payload, deviceId) {
  const device = assertObject(payload.device, 'heartbeat.device');
  if (payload.ok !== true) throw new Error('POST /ink/device-heartbeat did not return ok: true');
  if (device.device_id !== deviceId) {
    throw new Error(`POST /ink/device-heartbeat returned device_id ${String(device.device_id)}`);
  }
  return {
    name: 'POST /ink/device-heartbeat',
    ok: true,
    device_id: device.device_id,
    received_at: device.received_at
  };
}

export async function runProductionSmoke(argsInput, options = {}) {
  const args = {
    origin: DEFAULT_ORIGIN,
    deviceId: DEFAULT_DEVICE_ID,
    surface: DEFAULT_SURFACE,
    publicOnly: false,
    skipHeartbeat: false,
    ...argsInput
  };
  const fetchImpl = options.fetch ?? globalThis.fetch;
  if (typeof fetchImpl !== 'function') throw new Error('fetch is not available');

  const origin = args.origin.replace(/\/+$/, '');
  const checkedAt = new Date(options.now ?? Date.now()).toISOString();
  const checks = [];

  const health = await getJson(fetchImpl, origin, '/healthz', 'GET /healthz');
  checks.push(checkHealth(health));

  if (args.publicOnly) {
    return { ok: true, origin, checked_at: checkedAt, checks };
  }

  const token = args.token?.trim();
  if (!token) {
    throw new Error('INK_DEVICE_TOKEN or CALM_OPERATOR_BRIDGE_TOKEN is required');
  }

  const clock = await getJson(fetchImpl, origin, '/ink/clock', 'GET /ink/clock', token);
  checks.push(checkClock(clock));

  const briefPath =
    `/ink/brief?surface=${encodeURIComponent(args.surface)}` +
    `&device_id=${encodeURIComponent(args.deviceId)}`;
  const brief = await getJson(fetchImpl, origin, briefPath, 'GET /ink/brief', token);
  checks.push(checkBrief(brief));

  if (!args.skipHeartbeat) {
    const heartbeat = await postJson(fetchImpl, origin, '/ink/device-heartbeat', 'POST /ink/device-heartbeat', token, {
      device_id: args.deviceId,
      surface: args.surface,
      firmware_version: 'production-smoke',
      battery_percent: 0,
      battery_mv: 0,
      charging: false,
      power_mode: 'smoke',
      payload: {
        kind: 'production_smoke',
        checked_at: checkedAt
      }
    });
    checks.push(checkHeartbeat(heartbeat, args.deviceId));
  }

  return { ok: true, origin, checked_at: checkedAt, checks };
}

export async function main(argv = process.argv, env = process.env) {
  const args = parseArgs(argv, env);
  if (args.help) {
    console.log(usage());
    return 0;
  }

  const result = await runProductionSmoke(args);
  console.log(JSON.stringify(result, null, 2));
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().then((code) => {
    process.exitCode = code;
  }).catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
