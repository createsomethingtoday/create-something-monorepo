import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { validateLiveHealthPayload } from '../mcp-hub-named-lane-hardening.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const SCRIPT = path.join(REPO_ROOT, 'scripts', 'mcp-hub-named-lane-hardening.mjs');

test('named-lane hardening matrix is internally consistent', () => {
  const result = spawnSync(process.execPath, [SCRIPT, 'check'], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    env: process.env,
  });

  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /Hub named-lane hardening check passed/);
});

test('live health validation accepts the current unauthenticated contract', () => {
  const errors = [];
  const warnings = [];

  validateLiveHealthPayload({
    laneId: 'viv-blondish',
    lane: {
      runtime: 'hub',
      publicToolContract: 'composio_meta',
      identityMode: 'compat',
      discoveryMode: 'compact',
      discoveryPack: 'viv-blondish-named-lane',
      enabledServers: ['composio-toolkit-exa', 'composio-toolkit-gmail', 'notion-halfdozen-blondish'],
    },
    health: {
      auth_required: true,
      identity_mode: 'compat',
      enabled_servers: ['notion-halfdozen-blondish', 'composio-toolkit-gmail', 'composio-toolkit-exa'],
      failed_servers: [],
      policy: {
        quota: {
          telemetryDbConfigured: true,
        },
      },
    },
    errors,
    warnings,
  });

  assert.deepEqual(errors, []);
  assert.deepEqual(warnings, []);
});

test('live health validation still enforces legacy discovery metadata when present', () => {
  const errors = [];
  const warnings = [];

  validateLiveHealthPayload({
    laneId: 'viv-blondish',
    lane: {
      runtime: 'hub',
      publicToolContract: 'composio_meta',
      identityMode: 'compat',
      discoveryMode: 'compact',
      discoveryPack: 'viv-blondish-named-lane',
      enabledServers: ['composio-toolkit-exa', 'composio-toolkit-gmail', 'notion-halfdozen-blondish'],
    },
    health: {
      runtime_mode: 'hub',
      public_tool_contract: 'composio_meta',
      auth_required: true,
      identity_mode: 'compat',
      enabled_servers: ['composio-toolkit-exa', 'composio-toolkit-gmail', 'notion-halfdozen-blondish'],
      failed_servers: [],
      managed_discovery: {
        mode: 'compact',
        shared_pack: 'shared-auth-core',
        active_servers: ['composio-toolkit-exa', 'composio-toolkit-gmail', 'notion-halfdozen-blondish'],
      },
      policy: {
        quota: {
          telemetryDbConfigured: true,
        },
      },
    },
    errors,
    warnings,
  });

  assert.match(errors.join('\n'), /live managed_discovery\.shared_pack mismatch/);
  assert.deepEqual(warnings, []);
});
