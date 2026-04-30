#!/usr/bin/env node

import { basename } from 'node:path';

const DEFAULT_ORIGIN = 'https://ink.createsomething.agency';
const DEFAULT_SURFACE = 'core-ink';
const DEFAULT_DEVICE_ID = 'core-ink';
const REQUEST_TIMEOUT_MS = 15000;

function usage() {
  return [
    'Usage:',
    `  node ${basename(process.argv[1])}`,
    '',
    'Options:',
    '  --origin <url>        Defaults to https://ink.createsomething.agency',
    '  --token <token>       Defaults to INK_DEVICE_TOKEN, INK_SOURCE_TOKEN, or CALM_OPERATOR_BRIDGE_TOKEN',
    '  --surface <name>      Defaults to core-ink',
    '  --device-id <id>      Defaults to core-ink',
    '  --json                Print machine-readable result',
    '  --help                Show this help'
  ].join('\n');
}

function parseArgs(argv, env = process.env) {
  const args = {
    origin: DEFAULT_ORIGIN,
    token: env.INK_DEVICE_TOKEN ?? env.INK_SOURCE_TOKEN ?? env.CALM_OPERATOR_BRIDGE_TOKEN,
    surface: DEFAULT_SURFACE,
    deviceId: DEFAULT_DEVICE_ID,
    json: false
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
    } else if (item === '--surface') {
      args.surface = argv[++index];
    } else if (item === '--device-id') {
      args.deviceId = argv[++index];
    } else if (item === '--json') {
      args.json = true;
    } else {
      throw new Error(`Unknown argument: ${item}`);
    }
  }

  return args;
}

function bridgeUrl(origin, path, params = {}) {
  const url = new URL(path, origin.endsWith('/') ? origin : `${origin}/`);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value));
    }
  }
  return url;
}

function assertString(value, label) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`${label} must be a non-empty string`);
  }
}

function assertArray(value, label) {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error(`${label} must be a non-empty array`);
  }
}

async function requestJson({ name, url, token }) {
  const headers = token ? { 'x-ink-token': token } : undefined;
  const response = await fetch(url, {
    headers,
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
  });
  const text = await response.text();
  let body = null;

  try {
    body = text.length ? JSON.parse(text) : null;
  } catch {
    throw new Error(`${name} returned non-JSON response (${response.status})`);
  }

  if (!response.ok) {
    throw new Error(`${name} returned HTTP ${response.status}`);
  }

  return body;
}

async function runCheck(name, fn) {
  const startedAt = Date.now();
  try {
    const detail = await fn();
    return {
      name,
      ok: true,
      duration_ms: Date.now() - startedAt,
      detail
    };
  } catch (error) {
    return {
      name,
      ok: false,
      duration_ms: Date.now() - startedAt,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

async function smoke(args) {
  if (!args.token) {
    throw new Error('Missing token. Set INK_DEVICE_TOKEN, INK_SOURCE_TOKEN, or CALM_OPERATOR_BRIDGE_TOKEN.');
  }

  const checks = [];

  checks.push(
    await runCheck('healthz', async () => {
      const body = await requestJson({
        name: 'healthz',
        url: bridgeUrl(args.origin, '/healthz')
      });
      if (body?.ok !== true) throw new Error('healthz ok must be true');
      assertString(body.service, 'healthz service');
      return body.service;
    })
  );

  checks.push(
    await runCheck('clock', async () => {
      const body = await requestJson({
        name: 'clock',
        url: bridgeUrl(args.origin, '/ink/clock'),
        token: args.token
      });
      if (body?.ok !== true) throw new Error('clock ok must be true');
      assertString(body.clock?.display_time, 'clock.display_time');
      assertString(body.clock?.display_date, 'clock.display_date');
      return `${body.clock.display_time} ${body.clock.display_date}`;
    })
  );

  checks.push(
    await runCheck('brief', async () => {
      const body = await requestJson({
        name: 'brief',
        url: bridgeUrl(args.origin, '/ink/brief', { surface: args.surface }),
        token: args.token
      });
      assertString(body?.headline, 'brief.headline');
      assertString(body?.line1, 'brief.line1');
      assertString(body?.line2, 'brief.line2');
      assertString(body?.action, 'brief.action');
      if (typeof body.urgent !== 'boolean') throw new Error('brief.urgent must be boolean');
      return `${body.headline}: ${body.line1}`;
    })
  );

  checks.push(
    await runCheck('navigation', async () => {
      const body = await requestJson({
        name: 'navigation',
        url: bridgeUrl(args.origin, '/ink/navigation', { surface: args.surface }),
        token: args.token
      });
      if (body?.ok !== true) throw new Error('navigation ok must be true');
      assertArray(body.navigation?.buckets, 'navigation.buckets');
      const actionCount = body.navigation.buckets.reduce(
        (total, bucket) => total + (Array.isArray(bucket.actions) ? bucket.actions.length : 0),
        0
      );
      if (actionCount <= 0) throw new Error('navigation must include actions');
      return `${body.navigation.buckets.length} buckets / ${actionCount} actions`;
    })
  );

  checks.push(
    await runCheck('device', async () => {
      const body = await requestJson({
        name: 'device',
        url: bridgeUrl(args.origin, '/ink/device', { device_id: args.deviceId }),
        token: args.token
      });
      if (body?.ok !== true) throw new Error('device ok must be true');
      return body.device ? 'heartbeat present' : 'no heartbeat yet';
    })
  );

  const ok = checks.every((check) => check.ok);
  return {
    ok,
    origin: args.origin,
    surface: args.surface,
    device_id: args.deviceId,
    checked_at: new Date().toISOString(),
    checks
  };
}

const args = parseArgs(process.argv);
if (args.help) {
  console.log(usage());
  process.exit(0);
}

const result = await smoke(args);
if (args.json || !result.ok) {
  console.log(JSON.stringify(result, null, 2));
} else {
  for (const check of result.checks) {
    console.log(`ok ${check.name} (${check.duration_ms}ms): ${check.detail}`);
  }
}

if (!result.ok) process.exit(1);
