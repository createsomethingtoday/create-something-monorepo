import test from 'node:test';
import assert from 'node:assert/strict';

import { formatTerseStatus, parseAdminArgs } from '../dist/admin.js';

test('parseAdminArgs returns null when there are no admin tokens (server mode)', () => {
  assert.equal(parseAdminArgs([]), null);
});

test('parseAdminArgs recognizes --status', () => {
  const result = parseAdminArgs(['--status']);
  assert.ok(result);
  assert.equal(result.status, true);
  assert.equal(result.help, false);
});

test('parseAdminArgs collects multiple bundle/server toggles', () => {
  const result = parseAdminArgs([
    '--enable-bundle', 'core',
    '--enable-bundle', 'ops',
    '--disable-server', 'cs-telemetry',
  ]);
  assert.deepEqual(result.enableBundles, ['core', 'ops']);
  assert.deepEqual(result.disableServers, ['cs-telemetry']);
});

test('parseAdminArgs --write-codex and --no-write-codex toggle explicit flag', () => {
  const writeOn = parseAdminArgs(['--write-codex']);
  assert.equal(writeOn.writeCodex, true);
  assert.equal(writeOn.writeCodexExplicit, true);

  const writeOff = parseAdminArgs(['--no-write-codex']);
  assert.equal(writeOff.writeCodex, false);
  assert.equal(writeOff.writeCodexExplicit, true);
});

test('parseAdminArgs --help sets help and admin mode', () => {
  const result = parseAdminArgs(['--help']);
  assert.ok(result);
  assert.equal(result.help, true);
});

test('parseAdminArgs throws on missing value for flag', () => {
  assert.throws(() => parseAdminArgs(['--enable-bundle']), /Missing value for --enable-bundle/);
});

test('parseAdminArgs throws on unknown flag', () => {
  assert.throws(() => parseAdminArgs(['--frobnicate']), /Unknown argument: --frobnicate/);
});

test('parseAdminArgs supports -h alias', () => {
  const result = parseAdminArgs(['-h']);
  assert.ok(result);
  assert.equal(result.help, true);
});

test('parseAdminArgs recognizes --terse alongside --status', () => {
  const result = parseAdminArgs(['--status', '--terse']);
  assert.ok(result);
  assert.equal(result.status, true);
  assert.equal(result.terse, true);
});

test('formatTerseStatus emits a one-line operator summary', () => {
  const status = {
    enabledServerNames: ['a', 'b', 'c'],
    proxyToolCount: 144,
    routing: { tenantId: 'acme', allowPendingOauthApprovals: false, aliasCount: 1 },
    warnings: ['minor: x', 'minor: y'],
    connectionSummary: {
      enabledServerNames: ['a', 'b', 'c'],
      totalConfiguredServers: 100,
      connected: 2,
      failed: 1,
      idle: 97,
    },
  };
  const out = formatTerseStatus(status, { name: 'create-something-hub', version: '0.1.0' });
  assert.equal(
    out,
    '[create-something-hub@0.1.0] enabled=3 connected=2 failed=1 idle=97 tools=144 tenant=acme warnings=2',
  );
});

test('formatTerseStatus falls back gracefully when fields are missing', () => {
  const out = formatTerseStatus({}, { name: 'hub', version: '0.0.1' });
  assert.equal(
    out,
    '[hub@0.0.1] enabled=0 connected=0 failed=0 idle=0 tools=0 tenant=default warnings=0',
  );
});
